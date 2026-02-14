'use client';

import { useState } from 'react';
import { useLocale } from '@/context/locale-context';
import type { SessionRow } from '@/lib/types';
import type { RecommendationResult } from '@/lib/recommendations';

interface Props {
  session: SessionRow;
  userName: string;
  recommendations: RecommendationResult;
}

export function PdfDownloadButton({ session, userName, recommendations }: Props) {
  const { t } = useLocale();
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { PdfReportDocument } = await import('@/components/pdf-report');

      const blob = await pdf(
        PdfReportDocument({
          session,
          userName,
          recommendations,
          exercises: recommendations.exercises,
        })
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paincam-report-${session.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
    setGenerating(false);
  };

  return (
    <button
      onClick={handleDownload}
      disabled={generating}
      className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
    >
      {generating ? t.generating : t.downloadPdf}
    </button>
  );
}
