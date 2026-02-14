'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { useLocale } from '@/context/locale-context';
import { Navbar } from '@/components/navbar';
import { sessionFormSchema } from '@/lib/validation';
import { calculateScores } from '@/lib/scoring';
import { getRecommendations } from '@/lib/recommendations';
import type {
  PainArea,
  RedFlag,
  MovementTests,
  MovementTest,
  SessionFormData,
} from '@/lib/types';

const PAIN_AREAS: PainArea[] = [
  'neck', 'upper_back', 'lower_back', 'shoulder', 'hip', 'knee', 'other',
];

const RED_FLAGS: RedFlag[] = [
  'numbness_tingling',
  'fever',
  'unexplained_weight_loss',
  'loss_of_bladder_or_bowel_control',
  'recent_major_trauma',
];

const MOVEMENT_TESTS: MovementTest[] = [
  'neck_rotation_left',
  'neck_rotation_right',
  'forward_bend',
  'back_extension',
  'squat_depth',
  'single_leg_balance_left',
  'single_leg_balance_right',
];

export default function NewSessionPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Video state
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  // Form state
  const [painArea, setPainArea] = useState<PainArea>('lower_back');
  const [painIntensity, setPainIntensity] = useState(5);
  const [stiffness, setStiffness] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(7);
  const [stress, setStress] = useState(3);
  const [redFlags, setRedFlags] = useState<RedFlag[]>([]);
  const [movementTests, setMovementTests] = useState<MovementTests>({
    neck_rotation_left: 2,
    neck_rotation_right: 2,
    forward_bend: 2,
    back_extension: 2,
    squat_depth: 2,
    single_leg_balance_left: 2,
    single_leg_balance_right: 2,
  });

  // Video recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: 'video/webm' });
        setVideoBlob(blob);
        setVideoPreviewUrl(URL.createObjectURL(blob));
        if (videoRef.current) videoRef.current.srcObject = null;
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError('Camera access denied or not available');
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoBlob(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
    }
  };

  const toggleRedFlag = (flag: RedFlag) => {
    setRedFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  };

  const setMovementTest = (test: MovementTest, value: number) => {
    setMovementTests((prev) => ({ ...prev, [test]: value }));
  };

  const handleSubmit = async () => {
    setError('');

    const formData: SessionFormData = {
      painArea,
      painIntensity,
      stiffness,
      sleepQuality,
      stress,
      redFlags,
      movementTests,
    };

    const parsed = sessionFormSchema.safeParse(formData);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload video if present
      let videoPath: string | null = null;
      if (videoBlob) {
        const ext = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
        const fileName = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('session-videos')
          .upload(fileName, videoBlob);
        if (!uploadError) {
          videoPath = fileName;
        }
      }

      // Calculate scores
      const scores = calculateScores(formData);
      const recommendations = getRecommendations(formData, scores.painRiskLevel);

      // Insert session
      const { data: session, error: insertError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          pain_area: painArea,
          pain_intensity: painIntensity,
          stiffness,
          sleep_quality: sleepQuality,
          stress,
          red_flags: redFlags,
          movement_tests: movementTests,
          mobility_score: scores.mobilityScore,
          risk_level: scores.painRiskLevel,
          video_path: videoPath,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Build summary
      const exerciseNames = recommendations.exercises
        .map((e) => (locale === 'he' ? e.nameHe : e.name))
        .join(', ');
      const summary = `${t.mobilityScore}: ${scores.mobilityScore} | ${t.riskLevel}: ${scores.painRiskLevel} | ${t.exercises}: ${exerciseNames}`;

      // Insert report
      const { error: reportError } = await supabase
        .from('reports')
        .insert({
          session_id: session.id,
          user_id: user.id,
          summary,
        });

      if (reportError) throw reportError;

      router.push(`/reports/${session.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-2">{t.newSession}</h1>

        {/* Steps indicator */}
        <div className="flex gap-2 mb-6">
          <div
            className={`flex-1 h-1 rounded ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}
          />
          <div
            className={`flex-1 h-1 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Video */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              {t.step} 1: {t.videoCapture}
            </h2>

            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <video
                ref={videoRef}
                className="w-full rounded-lg bg-gray-900 mb-3"
                style={{ maxHeight: 300 }}
                autoPlay
                muted
                playsInline
                src={videoPreviewUrl ?? undefined}
              />

              <div className="flex flex-wrap gap-2">
                {!recording && !videoBlob && (
                  <button
                    onClick={startRecording}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
                  >
                    {t.recordVideo}
                  </button>
                )}
                {recording && (
                  <button
                    onClick={stopRecording}
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm animate-pulse"
                  >
                    {t.stopRecording}
                  </button>
                )}
                {!recording && (
                  <label className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm cursor-pointer hover:bg-gray-200">
                    {t.uploadVideo}
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                )}
                {videoBlob && (
                  <button
                    onClick={() => {
                      setVideoBlob(null);
                      setVideoPreviewUrl(null);
                    }}
                    className="text-red-600 text-sm underline"
                  >
                    {t.cancel}
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {t.skipVideo}
              </button>
              <button
                onClick={() => setStep(2)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                {t.next}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Questionnaire */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              {t.step} 2: {t.questionnaire}
            </h2>

            <div className="space-y-6">
              {/* Pain area */}
              <div>
                <label className="block text-sm font-medium mb-2">{t.painArea}</label>
                <div className="flex flex-wrap gap-2">
                  {PAIN_AREAS.map((area) => (
                    <button
                      key={area}
                      onClick={() => setPainArea(area)}
                      className={`px-3 py-1.5 rounded-lg text-sm border ${
                        painArea === area
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      {(t.painAreas as Record<string, string>)[area]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              {[
                { label: t.painIntensity, value: painIntensity, setter: setPainIntensity, max: 10 },
                { label: t.stiffness, value: stiffness, setter: setStiffness, max: 10 },
                { label: t.sleepQuality, value: sleepQuality, setter: setSleepQuality, max: 10 },
                { label: t.stress, value: stress, setter: setStress, max: 10 },
              ].map(({ label, value, setter, max }) => (
                <div key={label}>
                  <label className="block text-sm font-medium mb-1">
                    {label}: <span className="font-bold text-blue-600">{value}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={max}
                    value={value}
                    onChange={(e) => setter(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>0</span>
                    <span>{max}</span>
                  </div>
                </div>
              ))}

              {/* Red flags */}
              <div>
                <label className="block text-sm font-medium mb-2">{t.redFlags}</label>
                <div className="space-y-2">
                  {RED_FLAGS.map((flag) => (
                    <label
                      key={flag}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                        redFlags.includes(flag)
                          ? 'border-red-400 bg-red-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={redFlags.includes(flag)}
                        onChange={() => toggleRedFlag(flag)}
                        className="accent-red-600"
                      />
                      <span className="text-sm">
                        {(t.redFlagOptions as Record<string, string>)[flag]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Red flags warning */}
              {redFlags.length > 0 && (
                <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded-lg text-sm">
                  <strong>{t.warning}:</strong> {t.seekMedical}
                </div>
              )}

              {/* Movement tests */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t.movementTests} (0-3)
                </label>
                <div className="space-y-3">
                  {MOVEMENT_TESTS.map((test) => (
                    <div key={test}>
                      <label className="block text-xs text-gray-600 mb-1">
                        {(t.movementTestLabels as Record<string, string>)[test]}:{' '}
                        <span className="font-bold">
                          {movementTests[test]}
                        </span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={3}
                        step={1}
                        value={movementTests[test]}
                        onChange={(e) =>
                          setMovementTest(test, Number(e.target.value))
                        }
                        className="w-full accent-blue-600"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>0</span>
                        <span>3</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(1)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {t.back}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? t.generating : t.submit}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
