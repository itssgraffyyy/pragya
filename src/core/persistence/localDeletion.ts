import type { LocalDataBundle } from './storage';
import type { TrainingKind } from '../unit/models';
import { stableKey } from '../learning/skillDNA';
export interface LocalDeletion {scenarios:string[];sessions:string[];trainees:string[];plans:string[];training:[TrainingKind,string][]}
/** Compare whole relevant stores at commit time so a stale reset cannot erase concurrent work. */
export function localDataFingerprint(b:LocalDataBundle){return stableKey({scenarios:[...b.scenarios].sort((a,c)=>a.id.localeCompare(c.id)),sessions:[...b.sessions].sort((a,c)=>a.summary.sessionId.localeCompare(c.summary.sessionId)),trainees:[...b.trainees].sort((a,c)=>a.id.localeCompare(c.id)),plans:[...b.plans].sort((a,c)=>a.traineeId.localeCompare(c.traineeId)),training:[...b.training].sort((a,c)=>(a.kind+':'+a.id).localeCompare(c.kind+':'+c.id))});}
