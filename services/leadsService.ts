import { Lead, LeadStatus } from '../types';

const STORAGE_KEY = 'lme_leads';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLead(formData: {
  name: string;
  email: string;
  phone: string;
  company: string;
  interest: string;
  message: string;
}): Lead {
  const leads = getLeads();
  const now = new Date().toISOString();
  const lead: Lead = {
    id: generateId(),
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    company: formData.company,
    interest: formData.interest as Lead['interest'],
    message: formData.message,
    status: LeadStatus.NEW,
    createdAt: now,
    updatedAt: now,
    notes: '',
  };
  leads.unshift(lead);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  return lead;
}

export function updateLeadStatus(id: string, status: LeadStatus): Lead | null {
  const leads = getLeads();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  leads[idx].status = status;
  leads[idx].updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  return leads[idx];
}

export function updateLeadNotes(id: string, notes: string): Lead | null {
  const leads = getLeads();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  leads[idx].notes = notes;
  leads[idx].updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  return leads[idx];
}

export function deleteLead(id: string): boolean {
  const leads = getLeads();
  const filtered = leads.filter((l) => l.id !== id);
  if (filtered.length === leads.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export function getLeadStats(leads: Lead[]) {
  const total = leads.length;
  const byStatus: Record<string, number> = {};
  const byInterest: Record<string, number> = {};

  for (const lead of leads) {
    byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
    byInterest[lead.interest] = (byInterest[lead.interest] || 0) + 1;
  }

  const thisWeek = leads.filter((l) => {
    const created = new Date(l.createdAt);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return created >= weekAgo;
  }).length;

  return { total, byStatus, byInterest, thisWeek };
}
