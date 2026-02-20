import React, { useState } from 'react';
import { Trash2, MessageSquare, ChevronDown, Search, StickyNote } from 'lucide-react';
import { Lead, LeadStatus } from '../types';

interface LeadsTableProps {
  leads: Lead[];
  onStatusChange: (id: string, status: LeadStatus) => void;
  onDelete: (id: string) => void;
  onNotesChange: (id: string, notes: string) => void;
}

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: LeadStatus.NEW, label: 'חדש', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: LeadStatus.CONTACTED, label: 'נוצר קשר', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: LeadStatus.IN_PROGRESS, label: 'בטיפול', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: LeadStatus.CLOSED_WON, label: 'נסגר +', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: LeadStatus.CLOSED_LOST, label: 'נסגר -', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

const INTEREST_LABELS: Record<string, string> = {
  lectures: 'הרצאות',
  development: 'פיתוח',
  consulting: 'ייעוץ',
};

const LeadsTable: React.FC<LeadsTableProps> = ({ leads, onStatusChange, onDelete, onNotesChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterInterest, setFilterInterest] = useState<string>('all');
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');

  const filtered = leads.filter((lead) => {
    const matchesSearch =
      searchTerm === '' ||
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    const matchesInterest = filterInterest === 'all' || lead.interest === filterInterest;
    return matchesSearch && matchesStatus && matchesInterest;
  });

  const getStatusBadge = (status: LeadStatus) => {
    const opt = STATUS_OPTIONS.find((o) => o.value === status);
    if (!opt) return null;
    return <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${opt.color}`}>{opt.label}</span>;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const getWhatsAppLink = (lead: Lead) => {
    const text = `היי ${lead.name}, אני אמיר שריר. קיבלתי את הפנייה שלך בנושא ${INTEREST_LABELS[lead.interest]}. אשמח לשוחח!`;
    return `https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
  };

  const openNotes = (lead: Lead) => {
    if (expandedNotes === lead.id) {
      setExpandedNotes(null);
    } else {
      setExpandedNotes(lead.id);
      setEditingNotes(lead.notes);
    }
  };

  const saveNotes = (id: string) => {
    onNotesChange(id, editingNotes);
    setExpandedNotes(null);
  };

  return (
    <div className="bg-luxury-card/50 border border-white/5 rounded-2xl overflow-hidden">
      {/* Filters bar */}
      <div className="p-4 border-b border-white/5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="חיפוש לפי שם, אימייל, טלפון..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:border-luxury-gold outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:border-luxury-gold outline-none cursor-pointer"
        >
          <option value="all">כל הסטטוסים</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={filterInterest}
          onChange={(e) => setFilterInterest(e.target.value)}
          className="px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:border-luxury-gold outline-none cursor-pointer"
        >
          <option value="all">כל התחומים</option>
          <option value="lectures">הרצאות</option>
          <option value="development">פיתוח</option>
          <option value="consulting">ייעוץ</option>
        </select>
        <span className="text-gray-500 text-sm">{filtered.length} תוצאות</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="p-16 text-center">
          <p className="text-gray-500 text-lg">אין לידים להצגה</p>
          <p className="text-gray-600 text-sm mt-2">לידים חדשים יופיעו כאן לאחר מילוי טופס ההרשמה</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-right py-3 px-4">שם</th>
                <th className="text-right py-3 px-4">ארגון</th>
                <th className="text-right py-3 px-4">תחום</th>
                <th className="text-right py-3 px-4">סטטוס</th>
                <th className="text-right py-3 px-4">תאריך</th>
                <th className="text-right py-3 px-4">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <React.Fragment key={lead.id}>
                  <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{lead.name}</div>
                      <div className="text-gray-500 text-xs">{lead.email}</div>
                      <div className="text-gray-600 text-xs">{lead.phone}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-300 text-sm">{lead.company || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-luxury-gold/10 text-luxury-gold rounded-lg text-xs font-bold">
                        {INTEREST_LABELS[lead.interest]}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={lead.status}
                        onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
                        className="bg-transparent border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:border-luxury-gold outline-none cursor-pointer"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{formatDate(lead.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={getWhatsAppLink(lead)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="WhatsApp"
                          className="p-1.5 rounded-lg hover:bg-[#25D366]/20 text-gray-500 hover:text-[#25D366] transition-colors"
                        >
                          <MessageSquare size={15} />
                        </a>
                        <button
                          onClick={() => openNotes(lead)}
                          title="הערות"
                          className={`p-1.5 rounded-lg hover:bg-luxury-gold/20 transition-colors ${lead.notes ? 'text-luxury-gold' : 'text-gray-500 hover:text-luxury-gold'}`}
                        >
                          <StickyNote size={15} />
                        </button>
                        <button
                          onClick={() => onDelete(lead.id)}
                          title="מחיקה"
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedNotes === lead.id && (
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <td colSpan={6} className="p-4">
                        <div className="flex gap-3 items-end">
                          <textarea
                            value={editingNotes}
                            onChange={(e) => setEditingNotes(e.target.value)}
                            placeholder="הוסף הערות על הליד..."
                            rows={2}
                            className="flex-1 px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:border-luxury-gold outline-none resize-none"
                          />
                          <button
                            onClick={() => saveNotes(lead.id)}
                            className="px-4 py-2 bg-luxury-gold text-black font-bold rounded-xl text-sm hover:bg-luxury-gold-light transition-colors"
                          >
                            שמור
                          </button>
                        </div>
                        {lead.message && (
                          <div className="mt-3 p-3 bg-black/20 rounded-xl">
                            <span className="text-gray-500 text-xs block mb-1">הודעה מקורית:</span>
                            <p className="text-gray-300 text-sm">{lead.message}</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LeadsTable;
