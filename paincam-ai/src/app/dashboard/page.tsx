'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import { useLocale } from '@/context/locale-context';
import { Navbar } from '@/components/navbar';
import type { SessionRow } from '@/lib/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const { t, locale } = useLocale();
  const supabase = createClient();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });
      setSessions(data ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartData = [...sessions]
    .reverse()
    .slice(-10)
    .map((s) => ({
      date: new Date(s.created_at).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
        month: 'short',
        day: 'numeric',
      }),
      score: s.mobility_score,
    }));

  const riskColor = (level: string) => {
    if (level === 'high') return 'text-red-600 bg-red-50';
    if (level === 'moderate') return 'text-yellow-700 bg-yellow-50';
    return 'text-green-700 bg-green-50';
  };

  const riskLabel = (level: string) => {
    if (level === 'high') return t.high;
    if (level === 'moderate') return t.moderate;
    return t.low;
  };

  const painAreaLabel = (area: string) => {
    return (t.painAreas as Record<string, string>)[area] ?? area;
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t.dashboard}</h1>
          <Link
            href="/session/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
          >
            + {t.newSession}
          </Link>
        </div>

        {loading && <p className="text-gray-500">{t.loading}</p>}

        {!loading && sessions.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">{t.noSessions}</p>
            <Link
              href="/session/new"
              className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              {t.newSession}
            </Link>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <>
            {/* Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <h2 className="text-sm font-semibold mb-3 text-gray-600">
                {t.scoreOverTime}
              </h2>
              <div className="h-56" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis domain={[0, 100]} fontSize={12} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ fill: '#2563eb' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sessions list */}
            <div className="space-y-3">
              {sessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/reports/${s.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{painAreaLabel(s.pain_area)}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(s.created_at).toLocaleDateString(
                          locale === 'he' ? 'he-IL' : 'en-US',
                          { year: 'numeric', month: 'long', day: 'numeric' }
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {s.mobility_score}
                        </p>
                        <p className="text-[10px] text-gray-400">{t.mobilityScore}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${riskColor(
                          s.risk_level
                        )}`}
                      >
                        {riskLabel(s.risk_level)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
