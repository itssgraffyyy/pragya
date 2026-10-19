import { z } from 'zod';
const id=z.string().min(1).max(120);
export const competencyKeySchema=z.enum(['detection','classification','evidence','calibration','procedure','degraded','multiContact','uncertainty','reporting','consistency']);
export const trainingStageSchema=z.enum(['guided_practice','independent_assessment','unseen_evaluation','retention_followup']);
export const opportunitySchema=z.object({id,contactId:id,channel:z.enum(['text','visual','indicator']),atTime:z.number().finite().nonnegative(),until:z.number().finite().positive(),cue:z.string().min(1).max(600),evidence:z.array(z.enum(['rotorSilhouette','wingShape','flightPattern','sizeEstimate','lightSignature','soundSignature','thermalSignature','absenceOfFeatures'])).max(8)}).strict();
export const competencyBlueprintSchema=z.object({id,competency:competencyKeySchema,objectiveId:id,assessmentMode:trainingStageSchema,behavior:z.string().min(1).max(600),contactIds:z.array(id).min(1).max(8),requiredOpportunityIds:z.array(id).min(1).max(40),channels:z.array(z.enum(['text','visual','indicator'])).min(1).max(3),uncertainty:z.enum(['permitted','required','not_required']),acceptedResponses:z.array(z.string().min(1)).min(1).max(20),policyRef:z.object({id,version:id}).strict(),eligibility:z.object({requirePresentation:z.boolean(),requireAcknowledgement:z.boolean(),minimumIndependentResponses:z.number().int().min(1).max(8)}).strict(),limitations:z.array(z.string().max(600)).min(1).max(20)}).strict();
export const trainingContractSchema=z.object({schemaVersion:z.literal(1),stage:trainingStageSchema,assistance:z.object({hints:z.boolean(),answersExposed:z.boolean()}).strict(),opportunities:z.array(opportunitySchema).min(1).max(80),competencies:z.array(competencyBlueprintSchema).min(1).max(20),reservedFamily:id.optional()}).strict();
export type TrainingContract=z.infer<typeof trainingContractSchema>;
export type Opportunity=z.infer<typeof opportunitySchema>;
export type CompetencyKey=z.infer<typeof competencyKeySchema>;
export const qualityCheckSchema=z.object({id,severity:z.enum(['error','warning','info']),objective:z.string(),references:z.array(z.string()),seed:z.number().int().nonnegative(),expected:z.string(),observed:z.string(),correction:z.string().nullable()}).strict();
export const qualityReportSchema=z.object({schemaVersion:z.literal(1),status:z.enum(['ready_for_instructor_review','needs_revision','invalid_for_declared_assessment']),seed:z.number().int().nonnegative(),checks:z.array(qualityCheckSchema),passedCheckIds:z.array(z.string()),limitations:z.array(z.string())}).strict();
export type QualityReport=z.infer<typeof qualityReportSchema>;
export const eligibilityStateSchema=z.enum(['eligible','partially_eligible','ineligible','requires_instructor_review','legacy_unknown']);
export const competencyEligibilitySchema=z.object({competency:competencyKeySchema,blueprintId:z.string(),state:eligibilityStateSchema,eligibleContactIds:z.array(z.string()),reasonCodes:z.array(z.string()),sourceEventIds:z.array(z.string())}).strict();
export const integrityResultSchema=z.object({schemaVersion:z.literal(1),stage:z.union([trainingStageSchema,z.literal('legacy_unknown')]),competencies:z.array(competencyEligibilitySchema),limitations:z.array(z.string())}).strict();
export type IntegrityResult=z.infer<typeof integrityResultSchema>;
export interface OpportunityView extends Opportunity {available:boolean;presented:boolean;acknowledged:boolean}
