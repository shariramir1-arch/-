import type { SessionFormData, ScoreResult, RiskLevel } from './types';

export function calculateScores(formData: SessionFormData): ScoreResult {
  let mobilityScore = 100;

  // Subtract painIntensity * 5
  mobilityScore -= formData.painIntensity * 5;

  // Subtract stiffness * 3
  mobilityScore -= formData.stiffness * 3;

  // Subtract (10 - sleepQuality) * 2
  mobilityScore -= (10 - formData.sleepQuality) * 2;

  // Subtract stress * 2
  mobilityScore -= formData.stress * 2;

  // For each movement self-test item, subtract (3 - value) * 4
  const tests = formData.movementTests;
  const testKeys = Object.keys(tests) as (keyof typeof tests)[];
  for (const key of testKeys) {
    mobilityScore -= (3 - tests[key]) * 4;
  }

  // Clamp to 0..100
  mobilityScore = Math.max(0, Math.min(100, mobilityScore));

  // Determine risk level
  let painRiskLevel: RiskLevel = 'low';

  const hasAnyRedFlag = formData.redFlags.length > 0;
  const hasNumbness = formData.redFlags.includes('numbness_tingling');

  if (hasAnyRedFlag) {
    painRiskLevel = 'high';
  } else if (formData.painIntensity >= 7 || hasNumbness) {
    painRiskLevel = 'moderate';
  }

  return { mobilityScore, painRiskLevel };
}
