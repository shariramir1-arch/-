import React from 'react';
import { Users, UserPlus, PhoneCall, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { LeadStatus } from '../types';

interface StatsProps {
  total: number;
  thisWeek: number;
  byStatus: Record<string, number>;
  byInterest: Record<string, number>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  [LeadStatus.NEW]: { label: 'חדשים', color: 'text-blue-400', icon: <UserPlus size={20} /> },
  [LeadStatus.CONTACTED]: { label: 'נוצר קשר', color: 'text-yellow-400', icon: <PhoneCall size={20} /> },
  [LeadStatus.IN_PROGRESS]: { label: 'בטיפול', color: 'text-orange-400', icon: <Clock size={20} /> },
  [LeadStatus.CLOSED_WON]: { label: 'נסגר בהצלחה', color: 'text-green-400', icon: <CheckCircle size={20} /> },
  [LeadStatus.CLOSED_LOST]: { label: 'נסגר ללא עסקה', color: 'text-red-400', icon: <XCircle size={20} /> },
};

const INTEREST_LABELS: Record<string, string> = {
  lectures: 'הרצאות',
  development: 'פיתוח',
  consulting: 'ייעוץ',
};

const DashboardStats: React.FC<StatsProps> = ({ total, thisWeek, byStatus, byInterest }) => {
  return (
    <div className="space-y-8">
      {/* Top summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users size={24} />} label="סה״כ לידים" value={total} color="text-luxury-gold" />
        <StatCard icon={<TrendingUp size={24} />} label="השבוע" value={thisWeek} color="text-green-400" />
        <StatCard icon={<UserPlus size={24} />} label="חדשים" value={byStatus[LeadStatus.NEW] || 0} color="text-blue-400" />
        <StatCard icon={<CheckCircle size={24} />} label="נסגרו בהצלחה" value={byStatus[LeadStatus.CLOSED_WON] || 0} color="text-green-400" />
      </div>

      {/* Status breakdown + Interest breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Status */}
        <div className="bg-luxury-card/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">לפי סטטוס</h3>
          <div className="space-y-3">
            {Object.values(LeadStatus).map((status) => {
              const config = STATUS_CONFIG[status];
              const count = byStatus[status] || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className={config.color}>{config.icon}</span>
                  <span className="text-gray-300 text-sm flex-1">{config.label}</span>
                  <span className="text-white font-bold">{count}</span>
                  <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${status === LeadStatus.CLOSED_WON ? 'bg-green-500' : status === LeadStatus.NEW ? 'bg-blue-500' : status === LeadStatus.CONTACTED ? 'bg-yellow-500' : status === LeadStatus.IN_PROGRESS ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Interest */}
        <div className="bg-luxury-card/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">לפי תחום עניין</h3>
          <div className="space-y-4">
            {['lectures', 'development', 'consulting'].map((interest) => {
              const count = byInterest[interest] || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={interest}>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-300 text-sm">{INTEREST_LABELS[interest]}</span>
                    <span className="text-white font-bold text-sm">{count} ({Math.round(pct)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-luxury-gold to-yellow-600 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-luxury-card/50 border border-white/5 rounded-2xl p-5 hover:border-luxury-gold/20 transition-colors">
      <div className={`mb-3 ${color}`}>{icon}</div>
      <div className="text-3xl font-black text-white mb-1">{value}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

export default DashboardStats;
