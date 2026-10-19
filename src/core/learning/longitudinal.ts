import { learningEligible } from '../assessGuard/eligibility';
import { detectBlindSpots } from '../intelligence/blindSpots';
import type { StoredSession } from '../persistence/storage';
import type { TraineeProfile } from './profile';
import { cohortKey, conditionsFor, measuredSessions, type CompetencyId } from './skillDNA';
export interface PatternHistory {
  patternId:string; name:string; cohortKey:string; competency:CompetencyId; objective:string;
  firstSession:string|null; latestSession:string|null; observations:number; applicableAssessments:number;
  state:'oneTimeMistake'|'possibleRecurringPattern'|'consistentlyObservedPattern'|'insufficientEvidence';
  trend:'improving'|'recurring'|'insufficientEvidence'|'stable';
  earlyRate:number|null; recentRate:number|null;
  evidence:{sessionId:string;contactId:string}[]; conditions:ReturnType<typeof conditionsFor>; explanation:string;
}
const mapping:Record<string,{competency:CompetencyId;objective:string}>={
  overconfidence:{competency:'calibration',objective:'unknown-classification'}, underconfidence:{competency:'calibration',objective:'unknown-classification'},
  prematureConclusion:{competency:'evidence',objective:'evidence-selection'}, evidenceNeglect:{competency:'evidence',objective:'evidence-selection'},
  uncertaintyAvoidance:{competency:'uncertainty',objective:'unknown-classification'}, delayedRecognition:{competency:'detection',objective:'basic-recognition'},
  informationInconsistency:{competency:'classification',objective:'category-discrimination'},
};
export function longitudinalPatterns(profile:TraineeProfile,sessions:StoredSession[]):PatternHistory[] {
  const groups=new Map<string,StoredSession[]>(); for(const s of measuredSessions(profile,sessions)){const key=cohortKey(s);groups.set(key,[...(groups.get(key)??[]),s]);}
  return [...groups.entries()].flatMap(([key,group])=>{
    // Reuse Module 2 predicates, including sparse observation output. Never manufacture assessment examples.
    const findings=group.every(s=>!s.summary.scenarioSnapshot.trainingContract)?detectBlindSpots(group.map(s=>({...s.assessment!,traineeId:profile.id})),{minimumObservations:1}):Object.entries(mapping).flatMap(([patternId,{competency}])=>detectBlindSpots(group.map(s=>({...s.assessment!,traineeId:profile.id,contacts:s.assessment!.contacts.filter(c=>learningEligible(s,competency,c.contactId))})),{minimumObservations:1}).filter(f=>f.patternId===patternId));
    return findings.filter((f)=>(f.supportingObservations??f.relevantObservations)>0).map((f):PatternHistory=>{
      const evidence=f.observations??[]; const ids=new Set(evidence.map((e)=>e.sessionId)); const split=Math.floor(group.length/2);
      function rate(xs:StoredSession[]):number|null {
        const eligible=xs.flatMap((s)=>s.assessment!.contacts.filter((c)=>c.assessable && learningEligible(s,mapping[f.patternId].competency,c.contactId) && (f.patternId!=='uncertaintyAvoidance'||c.allowsUnknown)));
        if(!eligible.length)return null;
        const sessionIds=new Set(xs.map((s)=>s.summary.sessionId));return evidence.filter((e)=>sessionIds.has(e.sessionId)).length/eligible.length;
      }
      const earlyRate=split>0?rate(group.slice(0,split)):null,recentRate=split>0?rate(group.slice(split)):null;
      const observations=f.supportingObservations??f.relevantObservations;
      const trend=group.length<4||earlyRate===null||recentRate===null?'insufficientEvidence':recentRate<earlyRate?'improving':recentRate>0?'recurring':'stable';
      const state=observations===1?'oneTimeMistake':observations>=6&&ids.size>=3?'consistentlyObservedPattern':observations>=3&&ids.size>=2?'possibleRecurringPattern':'insufficientEvidence';
      const ordered=group.filter((s)=>ids.has(s.summary.sessionId));
      return {patternId:f.patternId,name:f.patternName,cohortKey:key,...mapping[f.patternId],firstSession:ordered[0]?.summary.sessionId??null,latestSession:ordered[ordered.length-1]?.summary.sessionId??null,
        observations,applicableAssessments:group.filter((s)=>s.assessment!.contacts.some((c)=>c.assessable&&learningEligible(s,mapping[f.patternId].competency,c.contactId)&&(f.patternId!=='uncertaintyAvoidance'||c.allowsUnknown))).length,
        state,trend,earlyRate,recentRate,evidence,conditions:conditionsFor(group[0]),explanation:`${observations} supporting observations across ${ids.size} sessions under comparable conditions. ${trend==='improving'?'The later comparable observation rate is lower; this is not proof of transfer.':f.explanation}`};
    });
  });
}
