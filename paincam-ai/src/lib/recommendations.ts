import { exercises } from '@/data/exercises';
import type { SessionFormData, RiskLevel, Exercise } from './types';

export interface RecommendationResult {
  exercises: Exercise[];
  sleepTip: boolean;
  breathingTip: boolean;
  seekMedicalAdvice: boolean;
}

export function getRecommendations(
  formData: SessionFormData,
  riskLevel: RiskLevel
): RecommendationResult {
  const result: RecommendationResult = {
    exercises: [],
    sleepTip: false,
    breathingTip: false,
    seekMedicalAdvice: false,
  };

  if (riskLevel === 'high') {
    result.seekMedicalAdvice = true;
    // Only gentle breathing + walking suggestions
    const gentle = exercises.filter(
      (e) => e.id === 'ex-13' || e.id === 'ex-14' // Walking + Breathing
    );
    result.exercises = gentle;
  } else {
    // Pick 5 exercises matching pain area + easy difficulty for first session
    const matching = exercises.filter(
      (e) =>
        e.areaTags.includes(formData.painArea) &&
        e.difficulty === 'easy' &&
        e.id !== 'ex-13' && // We'll add walking/breathing separately if needed
        e.id !== 'ex-14'
    );

    result.exercises = matching.slice(0, 5);

    // If we don't have 5, fill with other easy exercises
    if (result.exercises.length < 5) {
      const remaining = exercises.filter(
        (e) =>
          e.difficulty === 'easy' &&
          !result.exercises.find((r) => r.id === e.id) &&
          e.id !== 'ex-13' &&
          e.id !== 'ex-14'
      );
      result.exercises = [
        ...result.exercises,
        ...remaining.slice(0, 5 - result.exercises.length),
      ];
    }
  }

  if (formData.sleepQuality <= 4) {
    result.sleepTip = true;
  }

  if (formData.stress >= 7) {
    result.breathingTip = true;
    // Add breathing exercise if not already present
    const breathingEx = exercises.find((e) => e.id === 'ex-14');
    if (breathingEx && !result.exercises.find((e) => e.id === 'ex-14')) {
      result.exercises.push(breathingEx);
    }
  }

  return result;
}
