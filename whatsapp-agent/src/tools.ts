import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Store } from "./store.js";

const LEAD_STATUSES = ["new", "contacted", "meeting", "proposal", "won", "lost"] as const;

const json = (value: unknown) => JSON.stringify(value);

/**
 * The actions the assistant can perform. `user` is the WhatsApp number of the
 * person talking to the bot, so reminders go back to them.
 */
export function buildTools(store: Store, user: string) {
  return [
    betaZodTool({
      name: "add_task",
      description: "Add a task to the user's to-do list.",
      inputSchema: z.object({
        title: z.string().describe("What needs to be done"),
        due: z.string().optional().describe("Optional due date/time, ISO 8601 with timezone offset"),
      }),
      run: async ({ title, due }) => json(store.addTask(title, due)),
    }),

    betaZodTool({
      name: "list_tasks",
      description: "List the user's tasks. Open tasks only unless include_done is true.",
      inputSchema: z.object({ include_done: z.boolean().optional() }),
      run: async ({ include_done }) => json(store.listTasks(include_done)),
    }),

    betaZodTool({
      name: "complete_task",
      description: "Mark a task as done by its id (get ids from list_tasks).",
      inputSchema: z.object({ id: z.string() }),
      run: async ({ id }) => {
        const task = store.completeTask(id);
        return task ? json(task) : `No task with id ${id}`;
      },
    }),

    betaZodTool({
      name: "set_reminder",
      description:
        "Schedule a WhatsApp reminder that will be sent to the user at a specific time. " +
        "Resolve relative times ('tomorrow at 9', 'in two hours') against the current time given in the message.",
      inputSchema: z.object({
        text: z.string().describe("The reminder text to send, in the user's language"),
        at: z.string().describe("When to send it: ISO 8601 with timezone offset, e.g. 2026-09-25T09:00:00+03:00"),
      }),
      run: async ({ text, at }) => {
        const when = new Date(at);
        if (Number.isNaN(when.getTime())) return `Invalid time "${at}" - use ISO 8601 with an offset`;
        if (when.getTime() < Date.now() - 60_000) return `The time ${at} is in the past`;
        return json(store.addReminder(user, text, when.toISOString()));
      },
    }),

    betaZodTool({
      name: "list_reminders",
      description: "List the user's pending (not yet sent) reminders.",
      inputSchema: z.object({}),
      run: async () => json(store.listReminders(user)),
    }),

    betaZodTool({
      name: "cancel_reminder",
      description: "Cancel a pending reminder by its id.",
      inputSchema: z.object({ id: z.string() }),
      run: async ({ id }) => (store.cancelReminder(id) ? "Cancelled" : `No pending reminder with id ${id}`),
    }),

    betaZodTool({
      name: "add_lead",
      description: "Save a new business lead (potential customer).",
      inputSchema: z.object({
        name: z.string(),
        phone: z.string().optional(),
        email: z.string().optional(),
        interest: z.string().optional().describe("What they are interested in, e.g. lectures, development, consulting"),
        notes: z.string().optional(),
      }),
      run: async (input) => json(store.addLead(input)),
    }),

    betaZodTool({
      name: "list_leads",
      description: "List saved leads, optionally filtered by status.",
      inputSchema: z.object({ status: z.enum(LEAD_STATUSES).optional() }),
      run: async ({ status }) => json(store.listLeads(status)),
    }),

    betaZodTool({
      name: "update_lead",
      description: "Update a lead's status, notes or contact details by id.",
      inputSchema: z.object({
        id: z.string(),
        status: z.enum(LEAD_STATUSES).optional(),
        notes: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        interest: z.string().optional(),
      }),
      run: async ({ id, ...patch }) => {
        const lead = store.updateLead(id, patch);
        return lead ? json(lead) : `No lead with id ${id}`;
      },
    }),

    betaZodTool({
      name: "save_note",
      description: "Save a free-form note or idea for later.",
      inputSchema: z.object({
        text: z.string(),
        tags: z.array(z.string()).optional(),
      }),
      run: async ({ text, tags }) => json(store.addNote(text, tags)),
    }),

    betaZodTool({
      name: "search_notes",
      description: "Search saved notes by a word or tag.",
      inputSchema: z.object({ query: z.string() }),
      run: async ({ query }) => json(store.searchNotes(query)),
    }),

    betaZodTool({
      name: "clear_conversation",
      description: "Forget the conversation history (does not delete tasks, leads, notes or reminders).",
      inputSchema: z.object({}),
      run: async () => {
        store.clearHistory(user);
        return "Conversation history cleared";
      },
    }),
  ];
}
