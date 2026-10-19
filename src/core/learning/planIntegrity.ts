import type { StoredSession } from '../persistence/storage';
import type { TraineeProfile } from './profile';
import type { LearningPlan } from './plan';
import { stableKey } from './skillDNA';
import { presentationFamily } from '../evidenceMind/stages';
/** Shared semantic checks for profile-only and complete-backup imports. */
export function assertLearningPlanSources(profile:TraineeProfile,plan:LearningPlan,sessions:StoredSession[]):void{
 const require=(ok:unknown,message:string)=>{if(!ok)throw new Error('Learning plan reference: '+message);};
 require(plan.traineeId===profile.id&&plan.recommendations.every(r=>r.traineeId===profile.id)&&plan.exercises.every(e=>e.traineeId===profile.id),'foreign learning plan owner');
 const source=(id:string)=>sessions.find(s=>s.summary.sessionId===id&&(s.summary.traineeId===profile.id||profile.legacySessionIds.includes(id)));
 for(const id of plan.recommendations.flatMap(r=>r.evidenceSessionIds))require(source(id),'foreign/missing recommendation evidence');
 for(const e of plan.exercises){require(e.seed===e.config.seed&&e.seed===e.scenario.seed,'adaptive seed mismatch');require(plan.recommendations.some(r=>r.id===e.recommendationId),'exercise recommendation missing');if(e.status==='completed')require(e.sessionId&&source(e.sessionId),'completed exercise source missing');for(const id of e.baselineSessionIds)require(source(id),'exercise baseline missing');const contract=e.scenario.trainingContract;if(contract){require(contract.stage===(e.stage==='practice'?'guided_practice':e.stage==='evaluation'?'unseen_evaluation':'retention_followup'),'adaptive stage mismatch');if(contract.reservation){require(contract.reservation.featureKey===presentationFamily(e.scenario)&&!contract.reservation.priorFeatureKeys.includes(contract.reservation.featureKey),'adaptive reservation mismatch');for(const id of contract.reservation.sourceSessionIds)require(source(id),'adaptive reservation source missing/foreign');}if(e.status==='completed'){require(stableKey(source(e.sessionId!)!.summary.scenarioSnapshot)===stableKey(e.scenario),'completed adaptive scenario mismatch');if(e.policySnapshot)require(stableKey(source(e.sessionId!)!.scoringPolicy)===stableKey(e.policySnapshot),'completed adaptive policy mismatch');}}}
 for(const pattern of plan.patterns)for(const e of pattern.evidence)require(source(e.sessionId),'foreign pattern evidence');
}
