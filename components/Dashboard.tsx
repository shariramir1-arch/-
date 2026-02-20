import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, ArrowRight, Download } from 'lucide-react';
import DashboardStats from './DashboardStats';
import LeadsTable from './LeadsTable';
import { Lead, LeadStatus } from '../types';
import { getLeads, updateLeadStatus, updateLeadNotes, deleteLead, getLeadStats } from '../services/leadsService';

interface DashboardProps {
  onBack: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onBack }) => {
  const [leads, setLeads] = useState<Lead[]>([]);

  const refresh = useCallback(() => {
    setLeads(getLeads());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = getLeadStats(leads);

  const handleStatusChange = (id: string, status: LeadStatus) => {
    updateLeadStatus(id, status);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('למחוק את הליד?')) {
      deleteLead(id);
      refresh();
    }
  };

  const handleNotesChange = (id: string, notes: string) => {
    updateLeadNotes(id, notes);
    refresh();
  };

  const exportCSV = () => {
    if (leads.length === 0) return;
    const headers = ['שם', 'אימייל', 'טלפון', 'ארגון', 'תחום', 'סטטוס', 'הודעה', 'הערות', 'תאריך'];
    const rows = leads.map((l) => [
      l.name, l.email, l.phone, l.company, l.interest, l.status, l.message, l.notes, l.createdAt
    ]);
    const csvContent = '\uFEFF' + [headers, ...rows].map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-luxury-black">
      {/* Header */}
      <div className="border-b border-white/5 bg-luxury-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              title="חזרה לאתר"
            >
              <ArrowRight size={20} />
            </button>
            <div className="flex items-center gap-3">
              <LayoutDashboard className="text-luxury-gold" size={24} />
              <div>
                <h1 className="text-xl font-black text-white">דשבורד ניהול</h1>
                <p className="text-xs text-gray-500">LME Cowork Leads</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportCSV}
              disabled={leads.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white hover:border-luxury-gold/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              ייצוא CSV
            </button>
            <button
              onClick={refresh}
              className="px-4 py-2 bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/20 rounded-xl text-sm font-bold hover:bg-luxury-gold/20 transition-colors"
            >
              רענון
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8 space-y-8">
        <DashboardStats
          total={stats.total}
          thisWeek={stats.thisWeek}
          byStatus={stats.byStatus}
          byInterest={stats.byInterest}
        />

        <div>
          <h2 className="text-lg font-bold text-white mb-4">כל הלידים</h2>
          <LeadsTable
            leads={leads}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onNotesChange={handleNotesChange}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
