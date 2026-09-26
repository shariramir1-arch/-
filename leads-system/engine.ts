// מנוע ניהול הלידים – מממש את "סדר פעולות" מ־SPEC.md.
import type { Classifier } from './classifier.ts';
import { UNSURE, parseClassification } from './classifier.ts';
import type { InboundMessage, RawInbound } from './normalize.ts';
import { firstName, normalizeInbound } from './normalize.ts';
import type {
  Clock,
  InteractionRepository,
  LeadRepository,
  Messenger,
  NotificationKind,
  Notifier,
  StaffNotification,
} from './ports.ts';
import {
  addHours,
  decideEscalation,
  decideFollowUp,
  decideMatch,
  handlingModeFor,
  isOptOut,
  validateInbound,
  withinMessagingWindow,
} from './rules.ts';
import type { ActionType, Classification, EscalationReason, Lead } from './schema.ts';

const SYSTEM = 'system';

export interface EngineConfig {
  /** קטגוריות הטיפול המותרות (גם רשימת הערכים לסיווג). */
  treatments: readonly string[];
  /** קישור לליד במערכת – ההתראה מכילה רק אותו, לא תוכן. */
  leadLink: (leadId: string) => string;
  /** טקסטים קבועים. ה־AI לא מנסח הודעות ללקוח – כך אין מחירים ואין מידע רפואי. */
  texts: {
    initial: (firstName: string, treatment: string) => string;
    holding: (firstName: string) => string;
    followUp: (firstName: string) => string;
    optOutConfirmation: string;
    appointmentConfirmation: (firstName: string, when: string) => string;
    reminder: (firstName: string, when: string) => string;
  };
  /** מזהי תבניות מאושרות אצל ספק ה־WhatsApp, לשליחה מחוץ לחלון 24 השעות. */
  templates: Partial<Record<'initial' | 'holding' | 'followUp' | 'optOutConfirmation' | 'appointmentConfirmation' | 'reminder', string>>;
  followUpDelayHours: number;
  retention: { months: number; mode: 'delete' | 'anonymize' };
  formatDate: (iso: string) => string;
}

export interface EngineDeps {
  leads: LeadRepository;
  interactions: InteractionRepository;
  classifier: Classifier;
  messenger: Messenger;
  notifier: Notifier;
  clock: Clock;
  config: EngineConfig;
}

export type InboundOutcome =
  | 'needs-review'
  | 'opted-out'
  | 'attached'
  | 'new-lead'
  | 'escalated'
  | 'suppressed';

export interface InboundResult {
  leadId: string;
  outcome: InboundOutcome;
  escalationReason?: EscalationReason;
}

type TemplateKey = keyof EngineConfig['templates'];

export class LeadsEngine {
  private readonly d: EngineDeps;

  constructor(deps: EngineDeps) {
    this.d = deps;
  }

  // ================= טריגר 1: הודעה נכנסת =================

  async handleInbound(raw: RawInbound): Promise<InboundResult> {
    const nowIso = this.d.clock.now().toISOString();
    // 1. קליטה ונרמול
    const msg = normalizeInbound(raw, nowIso);

    // 2. בדיקת תקינות – הליד נשמר לבדיקה, לא נמחק ולא נסגר.
    if (validateInbound(msg).length > 0) {
      const lead = await this.d.leads.create(
        this.newLead(msg, {
          Lead_Status: 'דורש בדיקה',
          Handling_Mode: 'מזכירה',
          Opt_Out: isOptOut(msg.text),
          Requested_Treatment: msg.requestedTreatment,
        }),
        SYSTEM,
      );
      await this.logInbound(lead, msg, false);
      await this.notify('דורש בדיקה', lead);
      return { leadId: lead.Lead_ID, outcome: 'needs-review' };
    }

    const samePhone = await this.d.leads.findByPhone(msg.phone, SYSTEM);

    // 3. Opt-Out
    if (isOptOut(msg.text)) return this.handleOptOut(msg, samePhone);

    // 5. סיווג AI – רץ לפני איתור ההתאמה, כי ההתאמה תלויה בטיפול המבוקש.
    const c = await this.classify(msg);
    const treatment = this.d.config.treatments.includes(msg.requestedTreatment) ? msg.requestedTreatment : c.treatment;
    const escalation = decideEscalation(msg.text, c);
    const suppressed = samePhone.some((l) => l.Opt_Out);

    // 4. איתור התאמה לפי טלפון
    const match = decideMatch(samePhone, treatment);

    if (match.kind === 'attach') {
      let lead = await this.d.leads.update(
        match.lead.Lead_ID,
        {
          Last_Inbound_At: msg.receivedAt,
          // הלקוח ענה – מאפסים את ספירת המעקבים.
          Follow_Up_Attempts: 0,
          Next_Follow_Up: match.lead.Lead_Status === 'בטיפול' ? addHours(nowIso, this.d.config.followUpDelayHours) : match.lead.Next_Follow_Up,
          Updated_At: nowIso,
        },
        SYSTEM,
      );
      await this.logInbound(lead, msg, escalation === 'רפואי');
      if (escalation && lead.Handling_Mode === 'AI') {
        lead = await this.escalate(lead, escalation);
        return { leadId: lead.Lead_ID, outcome: 'escalated', escalationReason: escalation };
      }
      // לא שולחים שוב הודעת פתיחה; ההמשך אצל הצוות.
      await this.notify('תגובת לקוח', lead);
      return { leadId: lead.Lead_ID, outcome: 'attached' };
    }

    // 6. יצירת רשומה
    const consentFromForm = msg.channel === 'form';
    let lead = await this.d.leads.create(
      this.newLead(msg, {
        Lead_Status: 'חדש',
        Handling_Mode: suppressed ? 'מזכירה' : 'AI',
        Opt_Out: suppressed,
        Requested_Treatment: treatment,
        Urgency: c.urgency,
        Notes: escalation === 'רפואי' ? '' : c.summary,
        Next_Follow_Up: addHours(nowIso, this.d.config.followUpDelayHours),
        Consent: consentFromForm ? msg.consentCheckbox === true : true,
        Consent_Scope: consentFromForm ? (msg.consentCheckbox ? 'מלאה' : '') : 'שיחה בלבד',
        Consent_Date: consentFromForm && !msg.consentCheckbox ? null : msg.receivedAt,
        Related_Lead_ID: match.kind === 'new-linked' ? match.previous.Lead_ID : '',
      }),
      SYSTEM,
    );
    await this.logInbound(lead, msg, escalation === 'רפואי');

    if (match.kind === 'new-linked') await this.notify('אישור קישור ללקוח קודם', lead);

    if (suppressed) {
      // הלקוח ביקש הסרה בעבר – לא שולחים דבר אוטומטית; המזכירה מחליטה.
      await this.notify('ליד חדש', lead);
      return { leadId: lead.Lead_ID, outcome: 'suppressed' };
    }

    if (escalation) {
      lead = await this.escalate(lead, escalation);
      return { leadId: lead.Lead_ID, outcome: 'escalated', escalationReason: escalation };
    }

    // 7. תגובה ראשונית
    const t = this.d.config.texts;
    const sent = await this.deliver(lead, 'תגובה אוטומטית', t.initial(firstName(lead.Name), treatment), 'initial', [
      firstName(lead.Name),
      treatment,
    ]);
    if (sent) lead = await this.d.leads.update(lead.Lead_ID, { Lead_Status: 'בטיפול', Updated_At: nowIso }, SYSTEM);

    // 8. התראה מצומצמת
    await this.notify('ליד חדש', lead);
    return { leadId: lead.Lead_ID, outcome: 'new-lead' };
  }

  // ================= טריגר 2: סריקה שעתית =================

  /** 9. מעקב אחרי 24 שעות + 10. תזכורת יום לפני התור. */
  async runHourlyScan(): Promise<{ followUps: number; closed: number; reminders: number }> {
    const now = this.d.clock.now();
    const nowIso = now.toISOString();
    const result = { followUps: 0, closed: 0, reminders: 0 };

    for (const lead of await this.d.leads.all(SYSTEM)) {
      const decision = decideFollowUp(lead, now);
      if (decision === 'send') {
        const sent = await this.deliver(lead, 'מעקב', this.d.config.texts.followUp(firstName(lead.Name)), 'followUp', [
          firstName(lead.Name),
        ]);
        await this.d.leads.update(
          lead.Lead_ID,
          {
            Follow_Up_Attempts: lead.Follow_Up_Attempts + (sent ? 1 : 0),
            Next_Follow_Up: addHours(nowIso, this.d.config.followUpDelayHours),
            Updated_At: nowIso,
          },
          SYSTEM,
        );
        if (sent) result.followUps++;
      } else if (decision === 'close-no-answer') {
        const closed = await this.d.leads.update(
          lead.Lead_ID,
          { Lead_Status: 'נסגר', Close_Reason: 'לא ענה', Next_Follow_Up: null, Updated_At: nowIso },
          SYSTEM,
        );
        await this.notify('נסגר – לא ענה', closed);
        result.closed++;
      }

      if (this.reminderDue(lead, now)) {
        const when = this.d.config.formatDate(lead.Appointment_Date!);
        const name = firstName(lead.Name);
        const sent = await this.deliver(lead, 'קביעת תור', this.d.config.texts.reminder(name, when), 'reminder', [name, when]);
        // מסמנים גם אם לא נשלח (Opt-Out / אין תבנית) – כדי לא לנסות שוב כל שעה.
        await this.d.leads.update(lead.Lead_ID, { Reminder_Sent: true, Updated_At: nowIso }, SYSTEM);
        if (sent) result.reminders++;
      }
    }
    return result;
  }

  // ================= טריגר 3: נקבע תור =================

  /** נקרא כשהסטטוס שונה ל־"נקבע תור" בגיליון או כשנוצר אירוע ביומן. */
  async onAppointmentBooked(leadId: string, appointmentIso: string, actor: string): Promise<Lead> {
    const nowIso = this.d.clock.now().toISOString();
    const lead = await this.d.leads.update(
      leadId,
      {
        Lead_Status: 'נקבע תור',
        Close_Reason: '',
        Appointment_Date: appointmentIso,
        // ביטול מעקבים ממתינים
        Next_Follow_Up: null,
        Follow_Up_Attempts: 0,
        Reminder_Sent: false,
        Updated_At: nowIso,
      },
      actor,
    );
    const when = this.d.config.formatDate(appointmentIso);
    const name = firstName(lead.Name);
    await this.deliver(lead, 'קביעת תור', this.d.config.texts.appointmentConfirmation(name, when), 'appointmentConfirmation', [
      name,
      when,
    ]);
    return lead;
  }

  // ================= מדיניות שמירה =================

  /** לידים סגורים שלא עודכנו X חודשים נמחקים או מוסתרים. רשומת Opt-Out נשמרת תמיד (מינימלית) לחסימת שליחה. */
  async runRetention(): Promise<{ deleted: number; anonymized: number }> {
    const cutoff = new Date(this.d.clock.now());
    cutoff.setMonth(cutoff.getMonth() - this.d.config.retention.months);
    const result = { deleted: 0, anonymized: 0 };

    for (const lead of await this.d.leads.all(SYSTEM)) {
      if (lead.Archived || lead.Lead_Status !== 'נסגר' || new Date(lead.Updated_At) > cutoff) continue;
      await this.d.interactions.deleteByLead(lead.Lead_ID, SYSTEM);
      if (this.d.config.retention.mode === 'delete' && !lead.Opt_Out) {
        await this.d.leads.delete(lead.Lead_ID, SYSTEM);
        result.deleted++;
      } else {
        await this.d.leads.update(
          lead.Lead_ID,
          {
            Name: '',
            Phone: lead.Opt_Out ? lead.Phone : '',
            Notes: '',
            Related_Lead_ID: '',
            Archived: true,
            Updated_At: this.d.clock.now().toISOString(),
          },
          SYSTEM,
        );
        result.anonymized++;
      }
    }
    return result;
  }

  // ================= פנימי =================

  private async handleOptOut(msg: InboundMessage, samePhone: Lead[]): Promise<InboundResult> {
    const nowIso = this.d.clock.now().toISOString();
    const alreadyOptedOut = samePhone.some((l) => l.Opt_Out);
    const live = samePhone.filter((l) => !l.Archived);

    let primary: Lead;
    if (live.length === 0) {
      // שומרים רשומה סגורה כדי לזכור את החסימה.
      primary = await this.d.leads.create(
        this.newLead(msg, { Lead_Status: 'נסגר', Close_Reason: 'ביקש הסרה', Handling_Mode: 'מזכירה', Opt_Out: true }),
        SYSTEM,
      );
    } else {
      for (const l of live) {
        // תור שכבר נקבע לא מבוטל בגלל הסרה מהודעות – רק השליחה נעצרת.
        const close = l.Lead_Status !== 'נקבע תור' && l.Lead_Status !== 'נסגר';
        await this.d.leads.update(
          l.Lead_ID,
          {
            Opt_Out: true,
            Next_Follow_Up: null,
            ...(close ? { Lead_Status: 'נסגר' as const, Close_Reason: 'ביקש הסרה' as const } : {}),
            Updated_At: nowIso,
          },
          SYSTEM,
        );
      }
      const latest = [...live].sort((a, b) => b.Inquiry_Date.localeCompare(a.Inquiry_Date))[0];
      primary = (await this.d.leads.get(latest.Lead_ID, SYSTEM))!;
    }
    await this.logInbound(primary, msg, false);

    // הודעת אישור הסרה אחת בלבד.
    if (!alreadyOptedOut) {
      await this.deliver(primary, 'תגובה אוטומטית', this.d.config.texts.optOutConfirmation, 'optOutConfirmation', [], true);
    }
    await this.notify('הסרה', primary);
    return { leadId: primary.Lead_ID, outcome: 'opted-out' };
  }

  private async classify(msg: InboundMessage): Promise<Classification> {
    try {
      const raw = await this.d.classifier.classify({
        text: msg.text,
        channel: msg.channel,
        treatmentHint: msg.requestedTreatment,
      });
      return parseClassification(raw, this.d.config.treatments);
    } catch {
      return UNSURE;
    }
  }

  /** הסלמה: Handling_Mode ו־Escalation_Reason משתנים, Lead_Status לא. */
  private async escalate(lead: Lead, reason: EscalationReason): Promise<Lead> {
    const updated = await this.d.leads.update(
      lead.Lead_ID,
      { Handling_Mode: handlingModeFor(reason), Escalation_Reason: reason, Updated_At: this.d.clock.now().toISOString() },
      SYSTEM,
    );
    const name = firstName(updated.Name);
    await this.deliver(updated, 'תגובה אוטומטית', this.d.config.texts.holding(name), 'holding', [name]);
    await this.notify('הסלמה', updated);
    return updated;
  }

  /**
   * שליחה ללקוח, כפופה ל־Opt-Out ולכללי הספק:
   * בתוך חלון 24 השעות – טקסט חופשי; מחוצה לו – רק תבנית מאושרת; אחרת – לא נשלח והמזכירה מקבלת התראה.
   */
  private async deliver(
    lead: Lead,
    action: ActionType,
    text: string,
    template: TemplateKey,
    params: string[],
    ignoreOptOut = false,
  ): Promise<boolean> {
    if (!lead.Phone) return false;
    if (!ignoreOptOut) {
      const samePhone = await this.d.leads.findByPhone(lead.Phone, SYSTEM);
      if (lead.Opt_Out || samePhone.some((l) => l.Opt_Out)) return false;
    }

    const now = this.d.clock.now();
    const channel = lead.Source === 'form' ? 'whatsapp' : lead.Source;
    const templateId = this.d.config.templates[template];
    if (withinMessagingWindow(lead, now)) {
      await this.d.messenger.send({ to: lead.Phone, channel, kind: 'text', text });
    } else if (templateId) {
      await this.d.messenger.send({ to: lead.Phone, channel, kind: 'template', templateId, params });
    } else {
      await this.notify('הודעה לא נשלחה', lead);
      return false;
    }

    await this.d.interactions.add(
      { Lead_ID: lead.Lead_ID, Channel: channel, Direction: 'יוצא', Content: text, Date: now.toISOString(), Action_Type: action, Sensitive: false },
      SYSTEM,
    );
    return true;
  }

  private async logInbound(lead: Lead, msg: InboundMessage, sensitive: boolean): Promise<void> {
    const content = msg.text || (msg.requestedTreatment ? `[טופס] ${msg.requestedTreatment}` : '');
    await this.d.interactions.add(
      { Lead_ID: lead.Lead_ID, Channel: msg.channel, Direction: 'נכנס', Content: content, Date: msg.receivedAt, Action_Type: 'פנייה', Sensitive: sensitive },
      SYSTEM,
    );
  }

  private async notify(kind: NotificationKind, lead: Lead): Promise<void> {
    const n: StaffNotification = {
      kind,
      audience: lead.Handling_Mode === 'צוות רפואי' ? 'צוות רפואי' : 'מזכירה',
      leadId: lead.Lead_ID,
      link: this.d.config.leadLink(lead.Lead_ID),
      firstName: firstName(lead.Name),
      treatmentCategory: lead.Requested_Treatment || 'לא ידוע',
      source: lead.Source,
    };
    if (lead.Escalation_Reason) n.escalationReason = lead.Escalation_Reason;
    if (kind === 'אישור קישור ללקוח קודם') n.relatedLeadId = lead.Related_Lead_ID;
    await this.d.notifier.notify(n);
  }

  private reminderDue(lead: Lead, now: Date): boolean {
    if (lead.Lead_Status !== 'נקבע תור' || lead.Reminder_Sent || !lead.Appointment_Date || lead.Archived) return false;
    const ms = new Date(lead.Appointment_Date).getTime() - now.getTime();
    return ms > 0 && ms <= 24 * 60 * 60 * 1000;
  }

  private newLead(msg: InboundMessage, fields: Partial<Omit<Lead, 'Lead_ID'>>): Omit<Lead, 'Lead_ID'> {
    return {
      Name: msg.name,
      Phone: msg.phone,
      Source: msg.channel,
      Requested_Treatment: '',
      Inquiry_Date: msg.receivedAt,
      Lead_Status: 'חדש',
      Close_Reason: '',
      Handling_Mode: 'AI',
      Escalation_Reason: '',
      Urgency: 'בינונית',
      Next_Follow_Up: null,
      Follow_Up_Attempts: 0,
      Appointment_Date: null,
      Reminder_Sent: false,
      Consent: false,
      Consent_Scope: '',
      Consent_Date: null,
      Opt_Out: false,
      Related_Lead_ID: '',
      Related_Lead_Approved: false,
      Notes: '',
      Last_Inbound_At: msg.channel === 'form' ? null : msg.receivedAt,
      Updated_At: this.d.clock.now().toISOString(),
      Archived: false,
      ...fields,
    };
  }
}
