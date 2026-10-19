import { integrityResultSchema } from '../assessGuard/models';
import { groupScoreSchema,groupReportSchema } from '../groups/models';
import { SIMULATION_EVENT_TYPES } from '../types';
import { z } from 'zod';
import { scenarioDefinitionSchema, confidenceLevelSchema, evidenceItemSchema, contactCategorySchema, proceduralResponseSchema } from '../scenario/schema';
import { scoringPolicySchema } from '../scoring/policy';
import type { StoredSession } from '../persistence/storage';

const unit = z.number().finite().min(0).max(1);
const percent = z.number().finite().min(0).max(100);
const classification = z.union([contactCategorySchema, z.literal('unknown')]);
const contactScore = z.object({
  contactId: z.string(), assessable: z.boolean(), unassessableReason: z.string().nullable(),
  detection: unit, detectionDelaySeconds: z.number().nonnegative().nullable(), acknowledged: z.boolean(),
  classification: unit, classificationOutcome: z.enum(['correct','acceptableUnknown','incorrect','missing']), submittedClassification: classification.nullable(),
  procedural: unit, proceduralOutcome: z.enum(['correct','acceptable','incorrect','missing']), appliedRuleIds: z.array(z.string()),
  evidence: unit, evidenceStates: z.record(z.enum(['observed','inferred','unavailable','contradictory','notVerifiable'])),
  supportingEvidence: z.array(evidenceItemSchema), missingEvidence: z.array(evidenceItemSchema), contradictoryEvidence: z.array(evidenceItemSchema),
  confidence: confidenceLevelSchema.nullable(), calibration: unit, allowsUnknown: z.boolean().optional(), observationContext: z.string().optional(),
}).passthrough();
export const assessmentSchema = z.object({
  integrity:integrityResultSchema.optional(),
  groupAwareness:z.object({schemaVersion:z.literal(1),groups:z.array(groupScoreSchema).max(8)}).strict().optional(),
  sessionId: z.string(), traineeId: z.string(), scenarioId: z.string(), scenarioVersion: z.string(), policyId: z.string(), policyVersion: z.string(),
  overall: percent, categories: z.object({ detection: percent, classification: percent, procedural: percent, evidence: percent, confidenceCalibration: unit }),
  contacts: z.array(contactScore), missedContacts: z.array(z.string()), unassessableContacts: z.array(z.string()),
  explanations: z.array(z.object({ contactId: z.string(), category: z.enum(['detection','classification','procedural','evidence','confidence']), whatHappened: z.string(), availableInfo: z.string(), ruleRef: z.string(), why: z.string(), revisitObjective: z.string() }).passthrough()),
  calculatedAt: z.string().datetime(),
}).passthrough();
export const simulationEventSchema=z.object({eventId:z.string().min(1),sessionId:z.string().min(1),traineeId:z.string().min(1),scenarioId:z.string().min(1),scenarioVersion:z.string().min(1),simTimestamp:z.number().finite().nonnegative(),type:z.enum(SIMULATION_EVENT_TYPES),contactId:z.string().optional(),classification:classification.optional(),confidence:confidenceLevelSchema.optional(),evidence:z.array(evidenceItemSchema).max(8).optional(),proceduralResponse:proceduralResponseSchema.optional(),actionDetails:z.record(z.union([z.string(),z.number().finite(),z.boolean(),z.array(z.string())])).optional(),sensorState:z.record(z.string()).optional()}).passthrough();
export const sessionEventLogSchema=z.object({logVersion:z.literal(1),exportedAt:z.string().datetime(),events:z.array(simulationEventSchema).max(100000)});
export const storedSessionSchema = z.object({
  summary: z.object({ sessionId: z.string().min(1), traineeId: z.string().min(1), scenarioId: z.string(), scenarioVersion: z.string(), scenarioTitle: z.string(), seed: z.number().int().nonnegative(),
    startedAt: z.string().datetime(), endedAt: z.string().datetime(), durationSimSeconds: z.number().finite().nonnegative(), status: z.enum(['completed','aborted','error']), eventCount: z.number().int().nonnegative(),
    assessments: z.array(z.object({ contactId: z.string(), submittedClassification: classification.nullable(), groundTruth: contactCategorySchema, correct: z.boolean().nullable(), confidence: confidenceLevelSchema.nullable(), evidence: z.array(evidenceItemSchema), proceduralResponse: proceduralResponseSchema.nullable() })),
    scenarioSnapshot: scenarioDefinitionSchema,
  }).passthrough(),
  events: sessionEventLogSchema,
  assessment: assessmentSchema.optional(), scoringPolicy: scoringPolicySchema.optional(),
}).passthrough().superRefine((s, ctx) => {
  const a = s.assessment;
  if (a && (a.sessionId !== s.summary.sessionId || a.traineeId !== s.summary.traineeId || a.scenarioId !== s.summary.scenarioId || a.scenarioVersion !== s.summary.scenarioVersion)) ctx.addIssue({ code: 'custom', message: 'Assessment identity does not match session' });
  if (a && s.scoringPolicy && (a.policyId !== s.scoringPolicy.policyId || a.policyVersion !== s.scoringPolicy.policyVersion)) ctx.addIssue({ code: 'custom', message: 'Policy snapshot does not match assessment' });
  if (s.summary.scenarioId !== s.summary.scenarioSnapshot.id || s.summary.scenarioVersion !== s.summary.scenarioSnapshot.version) ctx.addIssue({ code: 'custom', message: 'Scenario snapshot does not match session' });
  if (s.events.events.some((e) => e.sessionId !== s.summary.sessionId || e.traineeId !== s.summary.traineeId)) ctx.addIssue({ code: 'custom', message: 'Foreign event in session' });
  const ids=new Set(s.summary.scenarioSnapshot.contacts.map((c)=>c.id));
  if(s.events.events.some(e=>e.scenarioId!==s.summary.scenarioId||e.scenarioVersion!==s.summary.scenarioVersion||(e.contactId&&!ids.has(e.contactId))))ctx.addIssue({code:'custom',message:'Foreign scenario/contact event'});
  if(new Set(s.events.events.map(e=>e.eventId)).size!==s.events.events.length)ctx.addIssue({code:'custom',message:'Duplicate event identifier'});
  for(const event of s.events.events.filter(e=>['groupStateChanged','groupCuePresented','groupObservationRecorded','groupReportSubmitted'].includes(e.type))){
    const details=event.actionDetails,group=s.summary.scenarioSnapshot.groupTraining?.groups.find(g=>g.id===details?.groupId),state=group?.states.find(x=>x.id===details?.stateId);
    if(!group||!state||state.atTime>event.simTimestamp)ctx.addIssue({code:'custom',message:'Invalid group event reference/time'});
    if(event.type==='groupReportSubmitted'&&(!groupReportSchema.safeParse(details?.report).success||!['low','medium','high'].includes(String(details?.confidence))))ctx.addIssue({code:'custom',message:'Invalid group report'});
    if(event.type==='groupObservationRecorded'&&(!Array.isArray(details?.contactIds)||!details.contactIds.length||new Set(details.contactIds).size!==details.contactIds.length||details.contactIds.some(id=>!ids.has(id))))ctx.addIssue({code:'custom',message:'Invalid group observation contact reference'});
  }
  if(a?.groupAwareness?.groups.some(g=>!s.summary.scenarioSnapshot.groupTraining?.groups.some(d=>d.id===g.groupId)||g.sourceEventIds.some(id=>!s.events.events.some(e=>e.eventId===id))))ctx.addIssue({code:'custom',message:'Invalid group assessment provenance'});
  for(const event of s.events.events.filter(e=>e.type.startsWith('opportunity'))){
    const o=s.summary.scenarioSnapshot.trainingContract?.opportunities.find(o=>o.id===event.actionDetails?.opportunityId);
    if(!o||event.contactId!==o.contactId)ctx.addIssue({code:'custom',message:'Invalid opportunity event reference'});
    if(event.type==='opportunityAcknowledged'&&!s.events.events.some(p=>p.type==='opportunityPresented'&&p.eventId===event.actionDetails?.presentationEventId&&p.actionDetails?.opportunityId===o?.id&&p.simTimestamp<=event.simTimestamp))ctx.addIssue({code:'custom',message:'Invalid observation presentation provenance'});
  }
  if(a?.integrity?.competencies.some(c=>c.sourceEventIds.some(id=>!s.events.events.some(e=>e.eventId===id))||c.eligibleContactIds.some(id=>!ids.has(id))))ctx.addIssue({code:'custom',message:'Invalid eligibility provenance'});
  if(a?.contacts.some((c)=>!ids.has(c.contactId)))ctx.addIssue({code:'custom',message:'Unknown contact in assessment'});
  if (a && new Set(a.contacts.map((c) => c.contactId)).size !== a.contacts.length) ctx.addIssue({ code: 'custom', message: 'Duplicate contact score' });
});
export function validSession(value: unknown): value is StoredSession { return storedSessionSchema.safeParse(value).success; }
