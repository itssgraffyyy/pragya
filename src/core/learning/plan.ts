import { scoringPolicySchema } from '../scoring/policy';
import { z } from 'zod';
import { objectiveIdSchema } from './profile';
import { scenarioDefinitionSchema } from '../scenario/schema';
import { COMPETENCIES } from './skillDNA';

export const competencyIdSchema=z.enum(COMPETENCIES.map((c)=>c.id) as [typeof COMPETENCIES[number]['id'],...typeof COMPETENCIES[number]['id'][]]);
export const generatorConfigSchema=z.object({seed:z.number().int().nonnegative(),objectiveIds:z.array(objectiveIdSchema).optional(),environment:z.enum(['urban','rural','random']).optional(),timeOfDay:z.enum(['day','dusk','night','random']).optional(),visibility:z.enum(['clear','lightFog','denseFog','random']).optional(),weather:z.enum(['none','rain','reducedContrast','random']).optional(),contactCount:z.union([z.number().int().min(1).max(8),z.literal('random')]).optional(),sensorConditions:z.union([z.array(z.enum(['normal','noisy','blurred','reducedContrast','intermittentLoss','frozen','delayed','missingObservations','falsePositives','sourceDisagreement'])),z.literal('random')]).optional(),difficulty:z.enum(['basic','intermediate','advanced','random']).optional(),durationSeconds:z.number().int().min(60).max(600).optional()}).strict();
export const recommendationSchema=z.object({
  id:z.string(),traineeId:z.string(),competency:competencyIdSchema,objective:objectiveIdSchema,reason:z.string(),evidenceSessionIds:z.array(z.string()),
  templateId:z.string(),constraints:generatorConfigSchema.omit({seed:true}),difficulty:z.enum(['basic','intermediate','advanced']),expectedBehavior:z.string(),priority:z.number().min(0).max(100),
  status:z.enum(['recommended','assigned','practicing','awaitingEvaluation','continued','resolved','dismissed']),generatedAt:z.string().datetime(),cohortKey:z.string().nullable(),sourceFingerprint:z.string(),
}).strict();
export type LearningRecommendation=z.infer<typeof recommendationSchema>;
export const exerciseSchema=z.object({
  id:z.string(),recommendationId:z.string(),traineeId:z.string(),stage:z.enum(['practice','evaluation','followup']),scenario:scenarioDefinitionSchema,
  policySnapshot:scoringPolicySchema.optional(),generatorVersion:z.string(),seed:z.number().int().nonnegative(),config:generatorConfigSchema,rationale:z.array(z.string()),unsupportedConstraints:z.array(z.string()),
  baselineSessionIds:z.array(z.string()),createdAt:z.string().datetime(),sessionId:z.string().nullable(),completedAt:z.string().datetime().nullable(),status:z.enum(['prepared','running','completed','aborted']),
}).strict();
export type AdaptiveExercise=z.infer<typeof exerciseSchema>;
const patternSchema=z.object({patternId:z.string(),name:z.string(),cohortKey:z.string(),competency:competencyIdSchema,objective:objectiveIdSchema,firstSession:z.string().nullable(),latestSession:z.string().nullable(),observations:z.number().nonnegative(),applicableAssessments:z.number().nonnegative(),state:z.enum(['oneTimeMistake','possibleRecurringPattern','consistentlyObservedPattern','insufficientEvidence']),trend:z.enum(['improving','recurring','insufficientEvidence','stable']),earlyRate:z.number().nullable(),recentRate:z.number().nullable(),evidence:z.array(z.object({sessionId:z.string(),contactId:z.string()})),conditions:z.object({environment:z.string(),timeOfDay:z.string(),visibility:z.string(),weather:z.string(),difficulty:z.string(),degraded:z.boolean(),sensors:z.string(),multiContact:z.boolean()}),explanation:z.string()});
export const learningPlanSchema=z.object({schemaVersion:z.literal(1),traineeId:z.string(),updatedAt:z.string().datetime(),recommendations:z.array(recommendationSchema),exercises:z.array(exerciseSchema),patterns:z.array(patternSchema)}).strict();
export type LearningPlan=z.infer<typeof learningPlanSchema>;
