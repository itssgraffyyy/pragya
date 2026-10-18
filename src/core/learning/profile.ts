import { z } from 'zod';
import { LEARNING_OBJECTIVES } from '../objectives';

export const objectiveIdSchema = z.string().refine((id) => LEARNING_OBJECTIVES.some((o) => o.id === id), 'Unknown learning objective');
export const traineeProfileSchema = z.object({
  schemaVersion: z.literal(1), id: z.string().min(1).max(120), displayName: z.string().trim().min(1).max(100),
  referenceCode: z.string().max(80).default(''), createdAt: z.string().datetime(), lastActiveAt: z.string().datetime(),
  experience: z.enum(['foundation', 'developing', 'experienced']), objectiveIds: z.array(objectiveIdSchema).max(30),
  refresherDays: z.number().int().min(1).max(3650).default(30), archived: z.boolean(), legacySessionIds: z.array(z.string().min(1)).max(10000),
  completedRecommendationIds: z.array(z.string()).default([]), completedSessionIds: z.array(z.string().min(1)).max(10000), curriculumPosition: z.number().int().nonnegative(),
  lastCompletedAdaptiveExercise: z.string().nullable(),
}).strict();
export type TraineeProfile = z.infer<typeof traineeProfileSchema>;
export function createProfile(displayName: string, now = new Date().toISOString(), id: string = crypto.randomUUID()): TraineeProfile {
  return traineeProfileSchema.parse({ schemaVersion: 1, id, displayName, referenceCode: '', createdAt: now, lastActiveAt: now,
    experience: 'foundation', objectiveIds: [], archived: false, legacySessionIds: [], completedSessionIds: [], curriculumPosition: 0, lastCompletedAdaptiveExercise: null });
}
