import { z } from 'zod';
import { qualityReportSchema } from './models';
import { scoringPolicySchema } from '../scoring/policy';
export const assessmentReviewSchema=z.object({schemaVersion:z.literal(1),id:z.string().min(1).max(400),unitId:z.string().nullable(),authorId:z.string().min(1),scenarioId:z.string().min(1),scenarioVersion:z.string().min(1),scenarioKey:z.string().max(600000),policy:scoringPolicySchema,report:qualityReportSchema,passedCheckIds:z.array(z.string()),waivers:z.array(z.object({checkId:z.string(),rationale:z.string().trim().min(10).max(2000)}).strict()),rationale:z.string().trim().min(10).max(4000),approved:z.boolean(),createdAt:z.string().datetime()}).strict();
