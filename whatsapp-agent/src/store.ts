import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface Task {
  id: string;
  title: string;
  due?: string;
  done: boolean;
  createdAt: string;
}

export interface Reminder {
  id: string;
  /** WhatsApp number (digits) the reminder is sent to */
  to: string;
  text: string;
  /** ISO 8601 timestamp */
  at: string;
  sent: boolean;
}

export type LeadStatus = "new" | "contacted" | "meeting" | "proposal" | "won" | "lost";

export interface Lead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  interest?: string;
  notes?: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  text: string;
  tags: string[];
  createdAt: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
  /** Tool calls the assistant actually ran in this turn, e.g. `add_task {"title":"..."}` */
  actions?: string[];
}

interface Data {
  tasks: Task[];
  reminders: Reminder[];
  leads: Lead[];
  notes: Note[];
  history: Record<string, ChatTurn[]>;
}

const HISTORY_LIMIT = 20;

const shortId = () => randomUUID().slice(0, 8);
const now = () => new Date().toISOString();

/** Tiny JSON-file database. Good enough for a single-user assistant. */
export class Store {
  private data: Data;

  constructor(private readonly file: string) {
    this.data = { tasks: [], reminders: [], leads: [], notes: [], history: {} };
    if (fs.existsSync(file)) {
      this.data = { ...this.data, ...JSON.parse(fs.readFileSync(file, "utf8")) };
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  // ---- tasks ----
  addTask(title: string, due?: string): Task {
    const task: Task = { id: shortId(), title, due, done: false, createdAt: now() };
    this.data.tasks.push(task);
    this.save();
    return task;
  }

  listTasks(includeDone = false): Task[] {
    return this.data.tasks.filter((t) => includeDone || !t.done);
  }

  completeTask(id: string): Task | undefined {
    const task = this.data.tasks.find((t) => t.id === id);
    if (task) {
      task.done = true;
      this.save();
    }
    return task;
  }

  // ---- reminders ----
  addReminder(to: string, text: string, at: string): Reminder {
    const reminder: Reminder = { id: shortId(), to, text, at, sent: false };
    this.data.reminders.push(reminder);
    this.save();
    return reminder;
  }

  listReminders(to?: string): Reminder[] {
    return this.data.reminders.filter((r) => !r.sent && (!to || r.to === to));
  }

  cancelReminder(id: string): boolean {
    const before = this.data.reminders.length;
    this.data.reminders = this.data.reminders.filter((r) => r.id !== id || r.sent);
    const removed = this.data.reminders.length !== before;
    if (removed) this.save();
    return removed;
  }

  dueReminders(at: Date = new Date()): Reminder[] {
    return this.data.reminders.filter((r) => !r.sent && new Date(r.at) <= at);
  }

  markReminderSent(id: string): void {
    const r = this.data.reminders.find((x) => x.id === id);
    if (r) {
      r.sent = true;
      this.save();
    }
  }

  // ---- leads ----
  addLead(input: Omit<Lead, "id" | "status" | "createdAt" | "updatedAt"> & { status?: LeadStatus }): Lead {
    const lead: Lead = { status: "new", ...input, id: shortId(), createdAt: now(), updatedAt: now() };
    this.data.leads.push(lead);
    this.save();
    return lead;
  }

  listLeads(status?: LeadStatus): Lead[] {
    return this.data.leads.filter((l) => !status || l.status === status);
  }

  updateLead(id: string, patch: Partial<Pick<Lead, "status" | "notes" | "phone" | "email" | "interest">>): Lead | undefined {
    const lead = this.data.leads.find((l) => l.id === id);
    if (lead) {
      Object.assign(lead, patch, { updatedAt: now() });
      this.save();
    }
    return lead;
  }

  // ---- notes ----
  addNote(text: string, tags: string[] = []): Note {
    const note: Note = { id: shortId(), text, tags, createdAt: now() };
    this.data.notes.push(note);
    this.save();
    return note;
  }

  searchNotes(query: string): Note[] {
    const q = query.toLowerCase();
    return this.data.notes.filter(
      (n) => n.text.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }

  // ---- conversation history ----
  getHistory(user: string): ChatTurn[] {
    return this.data.history[user] ?? [];
  }

  appendHistory(user: string, ...turns: ChatTurn[]): void {
    const history = [...this.getHistory(user), ...turns].slice(-HISTORY_LIMIT);
    // History sent to Claude must start with a user turn
    while (history.length && history[0].role !== "user") history.shift();
    this.data.history[user] = history;
    this.save();
  }

  clearHistory(user: string): void {
    delete this.data.history[user];
    this.save();
  }
}
