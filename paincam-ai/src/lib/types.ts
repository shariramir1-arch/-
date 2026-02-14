export type PainArea = 'neck' | 'upper_back' | 'lower_back' | 'shoulder' | 'hip' | 'knee' | 'other';

export type RedFlag =
  | 'numbness_tingling'
  | 'fever'
  | 'unexplained_weight_loss'
  | 'loss_of_bladder_or_bowel_control'
  | 'recent_major_trauma';

export type MovementTest =
  | 'neck_rotation_left'
  | 'neck_rotation_right'
  | 'forward_bend'
  | 'back_extension'
  | 'squat_depth'
  | 'single_leg_balance_left'
  | 'single_leg_balance_right';

export type RiskLevel = 'low' | 'moderate' | 'high';

export interface MovementTests {
  neck_rotation_left: number;
  neck_rotation_right: number;
  forward_bend: number;
  back_extension: number;
  squat_depth: number;
  single_leg_balance_left: number;
  single_leg_balance_right: number;
}

export interface SessionFormData {
  painArea: PainArea;
  painIntensity: number;
  stiffness: number;
  sleepQuality: number;
  stress: number;
  redFlags: RedFlag[];
  movementTests: MovementTests;
}

export interface ScoreResult {
  mobilityScore: number;
  painRiskLevel: RiskLevel;
}

export interface SessionRow {
  id: string;
  user_id: string;
  created_at: string;
  pain_area: PainArea;
  pain_intensity: number;
  stiffness: number;
  sleep_quality: number;
  stress: number;
  red_flags: RedFlag[];
  movement_tests: MovementTests;
  mobility_score: number;
  risk_level: RiskLevel;
  video_path: string | null;
  notes: string | null;
}

export interface ReportRow {
  id: string;
  session_id: string;
  user_id: string;
  created_at: string;
  pdf_path: string | null;
  summary: string;
}

export interface Exercise {
  id: string;
  name: string;
  nameHe: string;
  areaTags: PainArea[];
  difficulty: 'easy' | 'med' | 'hard';
  durationMin: number;
  instructionsSteps: string[];
  instructionsStepsHe: string[];
  contraindications: string[];
  contraindicationsHe: string[];
  videoPlaceholderUrl: string;
}
