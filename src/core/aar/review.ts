import type { StoredSession } from '../persistence/storage';
import type { TraineeProfile } from '../learning/profile';
import { calculateSkillDNA,cohortKey,measuredSessions,conditionsFor } from '../learning/skillDNA';
import { longitudinalPatterns } from '../learning/longitudinal';
import { recommendLearning } from '../learning/recommendations';
import type { CrewSession } from '../crew/models';
export function longitudinalAar(profile:TraineeProfile,sessions:StoredSession[],sessionId:string){
 const all=measuredSessions(profile,sessions),current=all.find(s=>s.summary.sessionId===sessionId);if(!current)return null;
 const history=all.filter(s=>(s.summary.sessionId===sessionId||s.summary.endedAt<current.summary.endedAt));const key=cohortKey(current);const comparable=history.filter(s=>cohortKey(s)===key);const previous=comparable.filter(s=>s.summary.sessionId!==sessionId).slice(-1)[0]??null;
 const dna=calculateSkillDNA(profile,history),cohort=dna.cohorts.find(c=>c.key===key)!;const priorDna=previous?calculateSkillDNA(profile,history.filter(s=>s.summary.endedAt<=previous.summary.endedAt&&s.summary.sessionId!==sessionId)):null;const prior=priorDna?.cohorts.find(c=>c.key===key);
 const changes=cohort.competencies.map(c=>({id:c.id,label:c.label,current:c.score,previous:prior?.competencies.find(p=>p.id===c.id)?.score??null,delta:c.score!==null&&prior?.competencies.find(p=>p.id===c.id)?.score!=null?Math.round((c.score-prior.competencies.find(p=>p.id===c.id)!.score!)*100)/100:null,state:c.state,sessions:c.sessionCount,evidenceSessionIds:c.evidence.map(e=>e.sessionId)}));
 const patterns=longitudinalPatterns(profile,history);return {current,previous,comparableSessionIds:comparable.map(s=>s.summary.sessionId),incompatible:history.filter(s=>cohortKey(s)!==key).map(s=>({sessionId:s.summary.sessionId,policy:`${s.assessment!.policyId}@${s.assessment!.policyVersion}`,conditions:conditionsFor(s),reason:'Different policy snapshot or training conditions; excluded from the comparison.'})),changes,patterns,recommendations:recommendLearning(profile,dna,patterns,history,[],current.summary.endedAt),conditions:conditionsFor(current),policy:`${current.assessment!.policyId}@${current.assessment!.policyVersion}`};
}
/** Each frame is a projection of the actual recorded prefix, never an inferred feed/video. */
export function crewReviewFrames(session:CrewSession){return session.events.map((event,index)=>{const prefix=session.events.slice(0,index+1);return {event,observations:session.participants.map(p=>({traineeId:p.traineeId,observations:prefix.filter(e=>e.kind==='observation'&&e.actorId===p.traineeId)})),communications:prefix.filter(e=>['shareObservation','requestClarification','acknowledgeInformation','flagUncertainty','submitEvidence','sendProceduralReport','confirmReceipt','recordHandoff'].includes(e.kind)),decisions:prefix.filter(e=>e.kind==='decision')};});}
