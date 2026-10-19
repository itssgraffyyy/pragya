import { z } from 'zod';
const id=z.string().min(1).max(64);
export const groupReportSchema=z.enum(['observedGrouping','independentObservations','relationshipUncertain']);
export type GroupReport=z.infer<typeof groupReportSchema>;
export const groupStateSchema=z.object({id,atTime:z.number().finite().nonnegative(),members:z.array(id).min(2).max(8),formation:z.enum(['cluster','line','dispersed']),cue:z.string().min(1).max(500)}).strict();
export const groupTrainingSchema=z.object({schemaVersion:z.literal(1),groups:z.array(z.object({id,label:z.string().min(1).max(100),relationship:z.enum(['coordinated','independent','ambiguous']),acceptedReports:z.array(groupReportSchema).min(1),states:z.array(groupStateSchema).min(1).max(30)}).strict()).min(1).max(8)}).strict();
export type GroupTraining=z.infer<typeof groupTrainingSchema>;
export interface GroupView {id:string;label:string;members:string[];cue:string;stateId:string;available:boolean;presented:boolean;recordedContactIds:string[];report:GroupReport|null}
export const groupReportingPolicySchema=z.object({schemaVersion:z.literal(1),completeness:z.number().min(0).max(1),attribution:z.number().min(0).max(1),qualification:z.number().min(0).max(1)}).strict().refine(w=>Math.abs(w.completeness+w.attribution+w.qualification-1)<1e-6,'Group reporting weights must sum to one');
export interface GroupScore {groupId:string;policyRef:string;observationCompleteness:number;attribution:number;qualification:number;overall:number;sourceEventIds:string[];explanation:string}

export const groupScoreSchema=z.object({groupId:id,policyRef:z.string().min(1).max(200),observationCompleteness:z.number().min(0).max(100),attribution:z.number().min(0).max(100),qualification:z.number().min(0).max(100),overall:z.number().min(0).max(100),sourceEventIds:z.array(z.string().min(1)).max(100000),explanation:z.string().max(2000)}).strict();
