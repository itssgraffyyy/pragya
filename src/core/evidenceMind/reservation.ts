import type { StoredSession } from '../persistence/storage';
import { presentationFamily,independentScenario } from './stages';
export function reservedEvaluation(session:StoredSession,prior:StoredSession[]):{eligible:boolean;explanation:string}{
 const s=session.summary.scenarioSnapshot,c=s.trainingContract,r=c?.reservation;
 if(!c)return {eligible:true,explanation:'Legacy seed-only evaluation; unfamiliarity metadata is unknown.'};
 if(!['unseen_evaluation','retention_followup'].includes(c.stage)||!independentScenario(s)||!r||r.featureKey!==presentationFamily(s)||r.priorFeatureKeys.includes(r.featureKey))return {eligible:false,explanation:'Independent reserved variant integrity is not established.'};
 const before=prior.filter(p=>p.summary.traineeId===session.summary.traineeId&&p.summary.sessionId!==session.summary.sessionId&&p.summary.startedAt<=session.summary.startedAt);
 if(before.some(p=>presentationFamily(p.summary.scenarioSnapshot)===r.featureKey))return {eligible:false,explanation:'This answer/evidence family appeared in an earlier saved attempt.'};
 if(r.sourceSessionIds.some(id=>!prior.some(p=>p.summary.sessionId===id)))return {eligible:false,explanation:'Reservation source history is incomplete.'};
 return {eligible:true,explanation:'Controlled answer/evidence family differs from recorded prior attempts and prepared variants. This reduces leakage; it does not establish human unfamiliarity or transfer.'};
}
