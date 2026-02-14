import { z } from 'zod';

const painAreas = ['neck', 'upper_back', 'lower_back', 'shoulder', 'hip', 'knee', 'other'] as const;
const redFlagValues = [
  'numbness_tingling',
  'fever',
  'unexplained_weight_loss',
  'loss_of_bladder_or_bowel_control',
  'recent_major_trauma',
] as const;

const movementScore = z.number().int().min(0).max(3);

export const sessionFormSchema = z.object({
  painArea: z.enum(painAreas),
  painIntensity: z.number().int().min(0).max(10),
  stiffness: z.number().int().min(0).max(10),
  sleepQuality: z.number().int().min(0).max(10),
  stress: z.number().int().min(0).max(10),
  redFlags: z.array(z.enum(redFlagValues)),
  movementTests: z.object({
    neck_rotation_left: movementScore,
    neck_rotation_right: movementScore,
    forward_bend: movementScore,
    back_extension: movementScore,
    squat_depth: movementScore,
    single_leg_balance_left: movementScore,
    single_leg_balance_right: movementScore,
  }),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
});
