import type { ScoringInput } from '../scoring/results';
import type { ScoringPolicy } from '../scoring/policy';
import type { StoredSession } from '../persistence/storage';
import { competencyKeySchema,type IntegrityResult,type CompetencyKey } from './models';
import { scenarioQuality } from './quality';
export function assessmentIntegrity(input:ScoringInput,policy?:ScoringPolicy):IntegrityResult{
 const contract=input.scenario.trainingContract;
 if(!contract)return {schemaVersion:1,stage:'legacy_unknown',competencies:competencyKeySchema.options.map(competency=>({competency,blueprintId:'legacy',state:'legacy_unknown',eligibleContactIds:[],reasonCodes:['missing_historical_metadata'],sourceEventIds:[]})),limitations:['Original rubric scores remain usable as legacy summaries; presentation and acknowledgement opportunities are unknown. No metadata is backfilled.']};
 const quality=scenarioQuality(input.scenario,policy),events=input.events.filter(e=>e.sessionId===input.sessionId&&e.traineeId===input.traineeId&&e.simTimestamp<=input.endedAtSimTime),interrupted=events.some(e=>e.type==='sessionAborted'||e.type==='errorOccurred');
 const competencies=contract.competencies.map(b=>{
  const reasonCodes:string[]=[],sourceEventIds:string[]=[],eligibleContactIds:string[]=[];
  const errors=quality.checks.filter(c=>c.severity==='error'&&(c.references.includes(`blueprint:${b.id}`)||c.objective===b.objectiveId||c.objective==='policy'||c.objective==='assessment-integrity'||c.objective==='configuration'||c.objective==='observation'&&b.requiredOpportunityIds.some(id=>c.references.includes(`opportunity:${id}`))));
  if(errors.length)reasonCodes.push(...errors.map(c=>'quality:'+c.id));
  if(interrupted)reasonCodes.push('interrupted_exercise');
  for(const contactId of b.contactIds){
   const committed=events.find(e=>e.type==='assessmentSubmitted'&&e.contactId===contactId),lastIndex=committed?events.indexOf(committed):events.length;
   const before=events.slice(0,lastIndex),required=contract.opportunities.filter(o=>o.contactId===contactId&&b.requiredOpportunityIds.includes(o.id));let valid=!!committed&&required.length>0;
   if(!committed)reasonCodes.push('missing_independent_response');else sourceEventIds.push(committed.eventId);
   for(const o of required){
    const generated=before.find(e=>e.type==='opportunityGenerated'&&e.actionDetails?.opportunityId===o.id),available=before.filter(e=>['opportunityAvailable','opportunityUnavailable'].includes(e.type)&&e.actionDetails?.opportunityId===o.id);
    const presented=before.find(e=>{
     if(e.type!=='opportunityPresented'||e.actionDetails?.opportunityId!==o.id||e.actionDetails?.instrumentation!=='text-panel-v1'||e.actionDetails?.channel!=='text'||e.contactId!==contactId||e.simTimestamp<o.atTime||e.simTimestamp>=o.until||!generated||events.indexOf(generated)>=events.indexOf(e))return false;
     const transitions=before.slice(0,before.indexOf(e)).filter(v=>['opportunityAvailable','opportunityUnavailable'].includes(v.type)&&v.actionDetails?.opportunityId===o.id&&v.simTimestamp<=e.simTimestamp);
     return transitions[transitions.length-1]?.type==='opportunityAvailable';
    });
    const ack=before.find(e=>e.type==='opportunityAcknowledged'&&e.actionDetails?.opportunityId===o.id&&presented&&e.actionDetails?.presentationEventId===presented.eventId&&events.indexOf(e)>events.indexOf(presented));
    const everAvailable=available.some(e=>e.type==='opportunityAvailable');
    if(!generated||!everAvailable){valid=false;reasonCodes.push('missing_observation_opportunity');}
    if(b.eligibility.requirePresentation&&(!presented||o.channel!=='text')){valid=false;reasonCodes.push('presentation_not_established');}
    if(b.eligibility.requireAcknowledgement&&!ack){valid=false;reasonCodes.push('missing_recorded_observation');}
    for(const e of [generated,...available,presented,ack])if(e)sourceEventIds.push(e.eventId);
   }
   if(valid&&!errors.length&&!interrupted)eligibleContactIds.push(contactId);
  }
  const sufficient=eligibleContactIds.length>=b.eligibility.minimumIndependentResponses;
  const state=errors.length?'ineligible' as const:interrupted||reasonCodes.includes('presentation_not_established')&&!sufficient?'requires_instructor_review' as const:sufficient?eligibleContactIds.length===b.contactIds.length?'eligible' as const:'partially_eligible' as const:'ineligible' as const;
  return {competency:b.competency,blueprintId:b.id,state,eligibleContactIds:sufficient?eligibleContactIds:[],reasonCodes:[...new Set(reasonCodes)],sourceEventIds:[...new Set(sourceEventIds)]};
 });
 return {schemaVersion:1,stage:contract.stage,competencies,limitations:['Eligibility is competency-specific and does not change the original numerical rubric score.','Presented information is instrumented UI state, not measured human perception.','Sparse evidence and simulator results do not certify educational transfer or real-world readiness.']};
}
const cache=new WeakMap<StoredSession,IntegrityResult>();
export function integrityForSession(session:StoredSession):IntegrityResult{
 const saved=cache.get(session);if(saved)return saved;
 const policy=session.scoringPolicy;
 if(!policy&&session.summary.scenarioSnapshot.trainingContract){const result:IntegrityResult={schemaVersion:1,stage:session.summary.scenarioSnapshot.trainingContract.stage,competencies:session.summary.scenarioSnapshot.trainingContract.competencies.map(b=>({competency:b.competency,blueprintId:b.id,state:'ineligible',eligibleContactIds:[],reasonCodes:['missing_policy_snapshot'],sourceEventIds:[]})),limitations:['Missing immutable policy snapshot; declared assessment cannot be qualified.']};cache.set(session,result);return result;}
 // Legacy qualification needs no invented/default policy: it only reports absent metadata.
 const input:ScoringInput={sessionId:session.summary.sessionId,traineeId:session.summary.traineeId,scenario:session.summary.scenarioSnapshot,events:session.events.events,endedAtSimTime:session.summary.durationSimSeconds,assessments:[]};
 const result=assessmentIntegrity(input,policy);cache.set(session,result);return result;
}
export function learningEligible(session:StoredSession,competency:CompetencyKey,contactId?:string):boolean{
 if(!session.summary.scenarioSnapshot.trainingContract)return true; // Preserve explicitly labeled legacy rubric summaries.
 const rows=integrityForSession(session).competencies.filter(r=>r.competency===competency);
 return rows.some(r=>['eligible','partially_eligible'].includes(r.state)&&(!contactId||r.eligibleContactIds.includes(contactId)));
}
