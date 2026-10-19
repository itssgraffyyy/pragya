import { integrityForSession,learningEligible } from '../assessGuard/eligibility';
import type { StoredSession } from '../persistence/storage';
import type { ContactScore } from '../scoring/results';
import type { TraineeProfile } from './profile';
import { validSession } from './validation';

export const COMPETENCIES = [
  { id:'detection', label:'Detection awareness', objective:'basic-recognition' },
  { id:'classification', label:'Classification accuracy', objective:'category-discrimination' },
  { id:'evidence', label:'Evidence interpretation', objective:'evidence-selection' },
  { id:'calibration', label:'Confidence calibration', objective:'unknown-classification' },
  { id:'procedure', label:'Procedural decision quality', objective:'procedural-response' },
  { id:'degraded', label:'Degraded observation performance', objective:'conflicting-sources' },
  { id:'multiContact', label:'Multi-contact management', objective:'multi-contact-tracking' },
  { id:'uncertainty', label:'Recognition of uncertainty', objective:'unknown-classification' },
  { id:'reporting', label:'Reporting completeness', objective:'evidence-selection' },
  { id:'consistency', label:'Score consistency across assessments', objective:'category-discrimination' },
] as const;
export type CompetencyId = typeof COMPETENCIES[number]['id'];
export interface SkillConfig { halfLifeDays:number; minSessions:number; minObservations:number; strengthThreshold:number; developmentThreshold:number; trendThreshold:number }
export const DEFAULT_SKILL_CONFIG: SkillConfig = { halfLifeDays:30, minSessions:3, minObservations:3, strengthThreshold:80, developmentThreshold:60, trendThreshold:5 };
export interface SkillPoint { sessionId:string; contactIds:string[]; date:string; score:number; samples:number }
export interface Competency {
  id:CompetencyId; label:string; objective:string; score:number|null; samples:number; coverage:number; sessionCount:number;
  trend:number|null; state:'unassessed'|'insufficientEvidence'|'emergingCompetency'|'consistentStrength'|'developmentArea'|'improvementObserved'; evidence:SkillPoint[];
}
export interface SkillCohort { key:string; label:string; policyId:string; policyVersion:string; sessionIds:string[]; competencies:Competency[]; latestDate:string; conditions:ReturnType<typeof conditionsFor> }
export interface SkillDNA { traineeId:string; cohorts:SkillCohort[]; excludedSessionIds:string[]; measuredSessions:number; config:SkillConfig }
export function stableKey(value: unknown): string {
  if (Array.isArray(value)) return '['+value.map(stableKey).join(',')+']';
  if (value && typeof value==='object') return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+stableKey(v)).join(',')+'}';
  return JSON.stringify(value) ?? 'null';
}
export function conditionsFor(s: StoredSession) {
  const x=s.summary.scenarioSnapshot;
  return { environment:x.environment, timeOfDay:x.timeOfDay, visibility:x.visibility, weather:x.weather, difficulty:x.difficulty,
    degraded:x.sensor.channels.some((c)=>c.actualCondition!=='normal') || x.timedEvents.some((e)=>e.type==='sensorChange'),
    sensors:x.sensor.channels.map((c)=>c.channel+':'+c.actualCondition).sort().join(','),
    multiContact:x.contacts.length>1,
  };
}
export function cohortKey(s: StoredSession): string {
  return stableKey({ policyId:s.assessment?.policyId, policyVersion:s.assessment?.policyVersion, policy:s.scoringPolicy ?? ('snapshot-unavailable:'+s.summary.sessionId), conditions:conditionsFor(s) });
}
export function measuredSessions(profile: TraineeProfile, sessions: StoredSession[]): StoredSession[] {
  return [...new Map(sessions.filter((s)=>validSession(s) && s.summary.status==='completed' && s.assessment && s.assessment.contacts.some((c)=>c.assessable) && (!s.summary.scenarioSnapshot.trainingContract||integrityForSession(s).competencies.some(c=>['eligible','partially_eligible'].includes(c.state))) &&
    (s.summary.traineeId===profile.id || profile.legacySessionIds.includes(s.summary.sessionId)))
    .map((s)=>[s.summary.sessionId,s])).values()].sort((a,b)=>a.summary.endedAt.localeCompare(b.summary.endedAt) || a.summary.sessionId.localeCompare(b.summary.sessionId));
}
const avg=(xs:number[])=>xs.reduce((a,b)=>a+b,0)/xs.length;
const rounded=(n:number)=>Math.round(n*100)/100;
function valueFor(id:CompetencyId,c:ContactScore,s:StoredSession):number|null {
  if(!learningEligible(s,id,c.contactId))return null;
  const def=s.summary.scenarioSnapshot.contacts.find((d)=>d.id===c.contactId);
  switch(id) {
    case 'detection': return c.detection*100;
    case 'classification': return c.classification*100;
    case 'evidence': return def?.assessment.requiredEvidence.length ? c.evidence*100 : null;
    case 'calibration': return c.confidence ? c.calibration*100 : null;
    case 'procedure': return c.procedural*100;
    case 'degraded': return conditionsFor(s).degraded ? (c.detection+c.classification+c.evidence+c.procedural)*25 : null;
    case 'multiContact': return s.summary.scenarioSnapshot.contacts.length>1 ? (c.detection+c.classification+c.evidence+c.procedural)*25 : null;
    case 'uncertainty': return def?.assessment.acceptableClassifications.includes('unknown') ? c.classification*100 : null;
    case 'reporting': {
      const a=s.events.events.find((e)=>e.contactId===c.contactId && e.type==='assessmentSubmitted');
      if(!a) return 0;
      return [!!a.classification,!!a.confidence,!!a.proceduralResponse,(def?.assessment.requiredEvidence ?? []).every((e)=>a.evidence?.includes(e))].filter(Boolean).length*25;
    }
    case 'consistency': return null;
  }
}
export function calculateSkillDNA(profile:TraineeProfile,sessions:StoredSession[],config:SkillConfig=DEFAULT_SKILL_CONFIG):SkillDNA {
  if(config.halfLifeDays<=0 || config.minSessions<2 || config.minObservations<1) throw new Error('Invalid Skill DNA aggregation configuration');
  const eligible=measuredSessions(profile,sessions); const groups=new Map<string,StoredSession[]>();
  for(const s of eligible) { const key=cohortKey(s); groups.set(key,[...(groups.get(key) ?? []),s]); }
  const cohorts=[...groups.entries()].map(([key,group]):SkillCohort=>{
    const latestDate=group[group.length-1].summary.endedAt; const first=group[0]; const conditions=conditionsFor(first);
    const competencies=COMPETENCIES.map((def):Competency=>{
      let evidence:SkillPoint[]=group.flatMap((s)=>{
        const pairs=s.assessment!.contacts.filter((c)=>c.assessable).map((c)=>({ c, value:valueFor(def.id,c,s) })).filter((p):p is { c:ContactScore;value:number }=>p.value!==null);
        return pairs.length ? [{ sessionId:s.summary.sessionId, contactIds:pairs.map((p)=>p.c.contactId), date:s.summary.endedAt, score:rounded(avg(pairs.map((p)=>p.value))), samples:pairs.length }] : [];
      });
      if(def.id==='consistency') {
        const xs=group.filter((s)=>learningEligible(s,'consistency')&&learningEligible(s,'classification')&&s.assessment!.contacts.some((c)=>c.assessable));
        evidence=xs.flatMap((s,i)=>{if(i===0)return []; const values=xs.slice(0,i+1).map((x)=>x.assessment!.categories.classification); const mean=avg(values);
          return [{ sessionId:s.summary.sessionId, contactIds:[], date:s.summary.endedAt, score:rounded(Math.max(0,100-Math.sqrt(avg(values.map((v)=>(v-mean)**2))))), samples:1 }]; });
      }
      const weights=evidence.map((p)=>Math.pow(0.5,Math.max(0,Date.parse(latestDate)-Date.parse(p.date))/86400000/config.halfLifeDays));
      const score=evidence.length ? rounded(evidence.reduce((sum,p,i)=>sum+p.score*weights[i],0)/weights.reduce((a,b)=>a+b,0)) : null;
      const samples=evidence.reduce((sum,p)=>sum+p.samples,0); const enough=evidence.length>=config.minSessions && samples>=config.minObservations;
      const half=Math.floor(evidence.length/2); const trend=evidence.length>=3 ? rounded(avg(evidence.slice(-half).map((p)=>p.score))-avg(evidence.slice(0,half).map((p)=>p.score))) : null;
      const state=score===null ? 'unassessed' : !enough ? evidence.length<2 ? 'insufficientEvidence' : 'emergingCompetency' : trend!==null && trend>=config.trendThreshold ? 'improvementObserved' : score>=config.strengthThreshold ? 'consistentStrength' : score<config.developmentThreshold ? 'developmentArea' : 'emergingCompetency';
      return { ...def, score,samples,coverage:rounded(evidence.length/group.length),sessionCount:evidence.length,trend,state,evidence };
    });
    return { key,label:`${first.assessment!.policyId}@${first.assessment!.policyVersion} / ${conditions.timeOfDay}, ${conditions.visibility}, ${conditions.degraded?'degraded':'normal'}, ${conditions.multiContact?'multi':'single'}, ${conditions.difficulty}`, policyId:first.assessment!.policyId,policyVersion:first.assessment!.policyVersion,sessionIds:group.map((s)=>s.summary.sessionId),competencies,latestDate,conditions };
  }).sort((a,b)=>a.latestDate.localeCompare(b.latestDate) || a.key.localeCompare(b.key));
  const ids=new Set(eligible.map((s)=>s.summary.sessionId));
  return { traineeId:profile.id,cohorts,excludedSessionIds:sessions.filter((s)=>!ids.has(s.summary?.sessionId)).map((s)=>s.summary?.sessionId ?? 'corrupt'),measuredSessions:eligible.length,config };
}

export function competencyFindings(cohort:SkillCohort,config:SkillConfig=DEFAULT_SKILL_CONFIG){
  const measured=cohort.competencies.filter((c)=>c.score!==null);
  return {strongest:[...measured].sort((a,b)=>b.score!-a.score!).slice(0,3),weakest:[...measured].sort((a,b)=>a.score!-b.score!).slice(0,3),
    improving:measured.filter((c)=>c.sessionCount>=config.minSessions&&c.trend!==null&&c.trend>=config.trendThreshold),
    declining:measured.filter((c)=>c.sessionCount>=config.minSessions&&c.trend!==null&&c.trend<=-config.trendThreshold),
    underAssessed:cohort.competencies.filter((c)=>c.sessionCount<config.minSessions)};
}