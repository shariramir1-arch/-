'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import { useLocale } from '@/context/locale-context';
import { Navbar } from '@/components/navbar';
import { getRecommendations } from '@/lib/recommendations';
import type { SessionRow, SessionFormData } from '@/lib/types';
import type { RecommendationResult } from '@/lib/recommendations';
import { PdfDownloadButton } from '@/components/pdf-download-button';

export default function ReportPage() {
  const { t, locale } = useLocale();
  const params = useParams();
  const sessionId = params.id as string;
  const supabase = createClient();

  const [session, setSession] = useState<SessionRow | null>(null);
  const [userName, setUserName] = useState('');
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError) throw sessionError;
        setSession(sessionData);

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', sessionData.user_id)
          .single();

        setUserName(profile?.full_name ?? '');

        const formData: SessionFormData = {
          painArea: sessionData.pain_area,
          painIntensity: sessionData.pain_intensity,
          stiffness: sessionData.stiffness,
          sleepQuality: sessionData.sleep_quality,
          stress: sessionData.stress,
          redFlags: sessionData.red_flags as SessionFormData['redFlags'],
          movementTests: sessionData.movement_tests as SessionFormData['movementTests'],
        };
        const recs = getRecommendations(formData, sessionData.risk_level);
        setRecommendations(recs);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load session';
        setError(message);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const riskColor = (level: string) => {
    if (level === 'high') return 'text-red-600 bg-red-50 border-red-200';
    if (level === 'moderate') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-green-700 bg-green-50 border-green-200';
  };

  const riskLabel = (level: string) => {
    if (level === 'high') return t.high;
    if (level === 'moderate') return t.moderate;
    return t.low;
  };

  const painAreaLabel = (area: string) =>
    (t.painAreas as Record<string, string>)[area] ?? area;

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-10 text-center text-gray-500">
          {t.loading}
        </main>
      </div>
    );
  }

  if (error || !session || !recommendations) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-10 text-center text-red-600">
          {error || t.error}
        </main>
      </div>
    );
  }

  const movementTests = session.movement_tests as unknown as Record<string, number>;
  const redFlags = session.red_flags as string[];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t.sessionDetails}</h1>
            <p className="text-sm text-gray-400">
              {new Date(session.created_at).toLocaleDateString(
                locale === 'he' ? 'he-IL' : 'en-US',
                { year: 'numeric', month: 'long', day: 'numeric' }
              )}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:underline"
          >
            {t.dashboard}
          </Link>
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {session.mobility_score}
            </p>
            <p className="text-xs text-gray-400">{t.mobilityScore}</p>
          </div>
          <div
            className={`border rounded-xl p-4 text-center ${riskColor(
              session.risk_level
            )}`}
          >
            <p className="text-3xl font-bold">{riskLabel(session.risk_level)}</p>
            <p className="text-xs opacity-70">{t.riskLevel}</p>
          </div>
        </div>

        {/* Red flags warning */}
        {redFlags.length > 0 && (
          <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-xl mb-6">
            <p className="font-bold text-sm mb-1">{t.warning}</p>
            <p className="text-sm">{t.seekMedical}</p>
            <ul className="mt-2 text-sm list-disc list-inside">
              {redFlags.map((flag) => (
                <li key={flag}>
                  {(t.redFlagOptions as Record<string, string>)[flag] ?? flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Details grid */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">{t.summary}</h2>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-gray-500">{t.painArea}</span>
            <span className="font-medium">{painAreaLabel(session.pain_area)}</span>

            <span className="text-gray-500">{t.painIntensity}</span>
            <span className="font-medium">{session.pain_intensity} / 10</span>

            <span className="text-gray-500">{t.stiffness}</span>
            <span className="font-medium">{session.stiffness} / 10</span>

            <span className="text-gray-500">{t.sleepQuality}</span>
            <span className="font-medium">{session.sleep_quality} / 10</span>

            <span className="text-gray-500">{t.stress}</span>
            <span className="font-medium">{session.stress} / 10</span>
          </div>
        </div>

        {/* Movement tests */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">
            {t.movementTests}
          </h2>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            {Object.entries(movementTests).map(([key, val]) => (
              <React.Fragment key={key}>
                <span className="text-gray-500">
                  {(t.movementTestLabels as Record<string, string>)[key] ?? key}
                </span>
                <span className="font-medium">{val as number} / 3</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">
            {t.recommendations}
          </h2>

          {recommendations.seekMedicalAdvice && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-3 text-sm">
              {t.seekMedical}
            </div>
          )}

          <div className="space-y-3">
            {recommendations.exercises.map((ex) => (
              <div
                key={ex.id}
                className="border border-gray-100 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm">
                    {locale === 'he' ? ex.nameHe : ex.name}
                  </p>
                  <span className="text-[10px] text-gray-400">
                    {ex.durationMin} {t.minutes} |{' '}
                    {(t.difficulty as Record<string, string>)[ex.difficulty]}
                  </span>
                </div>
                <ol className="text-xs text-gray-500 list-decimal list-inside space-y-0.5">
                  {(locale === 'he' ? ex.instructionsStepsHe : ex.instructionsSteps).map(
                    (step, i) => (
                      <li key={i}>{step}</li>
                    )
                  )}
                </ol>
                {ex.contraindications.length > 0 && (
                  <p className="text-[10px] text-red-400 mt-1">
                    {t.contraindications}:{' '}
                    {(locale === 'he' ? ex.contraindicationsHe : ex.contraindications).join(
                      ', '
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>

          {recommendations.sleepTip && (
            <div className="mt-3 bg-purple-50 border border-purple-200 p-3 rounded-lg text-sm text-purple-800">
              {t.sleepHygieneTip}
            </div>
          )}

          {recommendations.breathingTip && (
            <div className="mt-3 bg-teal-50 border border-teal-200 p-3 rounded-lg text-sm text-teal-800">
              {t.breathingTip}
            </div>
          )}
        </div>

        {/* PDF download */}
        <div className="mb-6">
          <PdfDownloadButton
            session={session}
            userName={userName}
            recommendations={recommendations}
          />
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 text-center pb-8">{t.disclaimer}</p>
      </main>
    </div>
  );
}
