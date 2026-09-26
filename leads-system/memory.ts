// מימוש בזיכרון של הממשקים – לבדיקות ולהדגמה. מימוש לגיליון/DB צריך לשמור על אותו חוזה, כולל לוג הגישה.
import type {
  Clock,
  InteractionRepository,
  LeadRepository,
  Messenger,
  Notifier,
  OutboundMessage,
  StaffNotification,
} from './ports.ts';
import type { AuditEntry, Interaction, Lead } from './schema.ts';

export class AuditLog {
  readonly entries: AuditEntry[] = [];
  private readonly clock: Clock;
  constructor(clock: Clock) {
    this.clock = clock;
  }
  record(e: Omit<AuditEntry, 'at'>): void {
    this.entries.push({ at: this.clock.now().toISOString(), ...e });
  }
}

export class MemoryLeads implements LeadRepository {
  readonly rows = new Map<string, Lead>();
  private seq = 0;
  private readonly audit: AuditLog;
  constructor(audit: AuditLog) {
    this.audit = audit;
  }

  async create(lead: Omit<Lead, 'Lead_ID'>, actor: string): Promise<Lead> {
    const row: Lead = { Lead_ID: `L-${String(++this.seq).padStart(5, '0')}`, ...lead };
    this.rows.set(row.Lead_ID, row);
    this.audit.record({ actor, action: 'create', table: 'Leads', recordId: row.Lead_ID });
    return { ...row };
  }
  async update(id: string, patch: Partial<Omit<Lead, 'Lead_ID'>>, actor: string): Promise<Lead> {
    const row = this.rows.get(id);
    if (!row) throw new Error(`Lead ${id} not found`);
    Object.assign(row, patch);
    this.audit.record({ actor, action: 'update', table: 'Leads', recordId: id, fields: Object.keys(patch) });
    return { ...row };
  }
  async get(id: string, actor: string): Promise<Lead | undefined> {
    const row = this.rows.get(id);
    if (row) this.audit.record({ actor, action: 'read', table: 'Leads', recordId: id });
    return row && { ...row };
  }
  async findByPhone(phone: string, _actor: string): Promise<Lead[]> {
    if (!phone) return [];
    return [...this.rows.values()].filter((l) => l.Phone === phone).map((l) => ({ ...l }));
  }
  async all(_actor: string): Promise<Lead[]> {
    return [...this.rows.values()].map((l) => ({ ...l }));
  }
  async delete(id: string, actor: string): Promise<void> {
    this.rows.delete(id);
    this.audit.record({ actor, action: 'delete', table: 'Leads', recordId: id });
  }
}

export class MemoryInteractions implements InteractionRepository {
  readonly rows: Interaction[] = [];
  private seq = 0;
  private readonly audit: AuditLog;
  constructor(audit: AuditLog) {
    this.audit = audit;
  }

  async add(i: Omit<Interaction, 'Interaction_ID'>, actor: string): Promise<Interaction> {
    const row: Interaction = { Interaction_ID: `I-${String(++this.seq).padStart(6, '0')}`, ...i };
    this.rows.push(row);
    this.audit.record({ actor, action: 'create', table: 'Interactions', recordId: row.Interaction_ID });
    return { ...row };
  }
  async listByLead(leadId: string, actor: string): Promise<Interaction[]> {
    const list = this.rows.filter((r) => r.Lead_ID === leadId);
    for (const r of list) this.audit.record({ actor, action: 'read', table: 'Interactions', recordId: r.Interaction_ID });
    return list.map((r) => ({ ...r }));
  }
  async deleteByLead(leadId: string, actor: string): Promise<void> {
    for (let i = this.rows.length - 1; i >= 0; i--) {
      if (this.rows[i].Lead_ID !== leadId) continue;
      this.audit.record({ actor, action: 'delete', table: 'Interactions', recordId: this.rows[i].Interaction_ID });
      this.rows.splice(i, 1);
    }
  }
}

export class RecordingMessenger implements Messenger {
  readonly sent: OutboundMessage[] = [];
  async send(m: OutboundMessage): Promise<void> {
    this.sent.push(m);
  }
}

export class RecordingNotifier implements Notifier {
  readonly sent: StaffNotification[] = [];
  async notify(n: StaffNotification): Promise<void> {
    this.sent.push(n);
  }
}

export class FixedClock implements Clock {
  private t: Date;
  constructor(iso: string) {
    this.t = new Date(iso);
  }
  now(): Date {
    return new Date(this.t);
  }
  advanceHours(h: number): void {
    this.t = new Date(this.t.getTime() + h * 3600_000);
  }
  set(iso: string): void {
    this.t = new Date(iso);
  }
}
