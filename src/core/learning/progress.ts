import { reservedEvaluation } from '../evidenceMind/reservation';
import { independentScenario } from '../evidenceMind/stages';
import type { StorageAdapter, StoredSession } from '../persistence/storage';
import type { TraineeProfile } from './profile';
import { calculateSkillDNA, cohortKey, measuredSessions, type CompetencyId } from './skillDNA';
import type { LearningPlan, LearningRecommendation } from './plan';
import { deriveSeed } from '../rng';
export interface ProgressComparison { recommendationId:string; exerciseId:string; stage:'before'|'afterPractice'|'unseenEvaluation'|'followup'; competency:CompetencyId; baseline:number|null; current:number|null; recordedOverall:number|null; delta:number|null; comparable:boolean; sessionIds:string[]; explanation:string }
export interface Refresher { competency:CompetencyId; objective:string; lastPractice:string; dueAt:string; sessionIds:string[]; reason:string }
export interface LearningProgress {
  traineeId:string; asOf:string; progression:'foundationPractice'|'developing'|'consistentPerformance'|'advancedPractice'|'refresherRecommended';
  competencies:{cohortKey:string;competency:CompetencyId;baseline:number|null;current:number|null;change:number|null;sessionIds:string[];state:string}[];
  comparisons:ProgressComparison[]; refreshers:Refresher[]; completedCorrectiveExercises:number; remainingDevelopmentAreas:string[]; unassessed:string[];
}
export function learningProgress(profile:TraineeProfile,sessions:StoredSession[],plan:LearningPlan|null,asOf:string,refresherDays=profile.refresherDays??30):LearningProgress {
  if(!Number.isFinite(Date.parse(asOf))||refresherDays<1||refresherDays>3650)throw new Error('Valid progress date and refresher interval required');
  const eligible=measuredSessions(profile,sessions).filter((s)=>s.summary.endedAt<=asOf);const dna=calculateSkillDNA(profile,eligible);
  const competencies=dna.cohorts.flatMap((cohort)=>cohort.competencies.map((c)=>{const baseline=c.evidence[0]?.score??null;const current=c.evidence[c.evidence.length-1]?.score??null;
    return {cohortKey:cohort.key,competency:c.id,baseline,current,change:baseline!==null&&current!==null&&c.evidence.length>1?current-baseline:null,sessionIds:c.evidence.map((e)=>e.sessionId),state:c.state};}));
  const comparisons:ProgressComparison[]=[];
  for(const e of plan?.exercises.filter((e)=>e.traineeId===profile.id&&e.status==='completed')??[]){
    const r=plan!.recommendations.find((r)=>r.id===e.recommendationId);const currentSession=sessions.find((s)=>s.summary.sessionId===e.sessionId);if(!r||!currentSession)continue;
    const compatibleBaseline=eligible.filter((s)=>e.baselineSessionIds.includes(s.summary.sessionId)&&cohortKey(s)===cohortKey(currentSession));
    const before=calculateSkillDNA(profile,compatibleBaseline).cohorts[0]?.competencies.find((c)=>c.id===r.competency)?.score??null;
    const current=calculateSkillDNA(profile,[currentSession]).cohorts[0]?.competencies.find((c)=>c.id===r.competency)?.score??null;
    const declared=!!currentSession.summary.scenarioSnapshot.trainingContract;const qualification=reservedEvaluation(currentSession,sessions);
    const comparable=before!==null&&current!==null&&(!declared||compatibleBaseline.length>=dna.config.minSessions&&independentScenario(currentSession.summary.scenarioSnapshot)&&qualification.eligible);
    comparisons.push({recommendationId:r.id,exerciseId:e.id,stage:e.stage==='practice'?'afterPractice':e.stage==='evaluation'?'unseenEvaluation':'followup',competency:r.competency,baseline:before,current,recordedOverall:currentSession.assessment?.overall??null,delta:comparable?Math.round((current!-before!)*100)/100:null,comparable,sessionIds:[...compatibleBaseline.map((s)=>s.summary.sessionId),currentSession.summary.sessionId],explanation:comparable?(declared?'Eligible independent outcomes share objective/version, policy and condition cohort. '+qualification.explanation:'Legacy rubric comparison; presentation, assistance and familiarity metadata are unknown.'):'Insufficient compatible eligible baseline history or independent evaluation; no improvement percentage is claimed. '+(declared?qualification.explanation:'')});
  }
  const refreshers:Refresher[]=[];const ids=new Set<CompetencyId>();
  for(const cohort of [...dna.cohorts].reverse())for(const c of cohort.competencies){
    if(ids.has(c.id)||!c.evidence.length)continue;ids.add(c.id);
    const latest=c.evidence[c.evidence.length-1];const dueAt=new Date(Date.parse(latest.date)+refresherDays*86400000).toISOString();
    if(dueAt<=asOf&&(profile.objectiveIds.includes(c.objective)||c.evidence.some((p)=>p.score<dna.config.developmentThreshold)))refreshers.push({competency:c.id,objective:c.objective,lastPractice:latest.date,dueAt,sessionIds:c.evidence.map((p)=>p.sessionId),reason:`${refresherDays} days have elapsed since relevant recorded practice, with assigned objectives or past difficulty. This schedules a refresher; it does not establish skill decay.`});
  }
  const latest=dna.cohorts[dna.cohorts.length-1];const primary=latest?.competencies.filter((c)=>['detection','classification','evidence','calibration','procedure'].includes(c.id));
  const strong=primary?.every((c)=>c.score!==null&&c.score>=80&&c.sessionCount>=dna.config.minSessions)??false;
  const progression=refreshers.length?'refresherRecommended':eligible.length<3?'foundationPractice':strong?latest!.conditions.difficulty==='advanced'?'advancedPractice':'consistentPerformance':'developing';
  return {traineeId:profile.id,asOf,progression,competencies,comparisons,refreshers,completedCorrectiveExercises:plan?.exercises.filter((e)=>e.traineeId===profile.id&&e.stage==='practice'&&e.status==='completed').length??0,
    remainingDevelopmentAreas:latest?.competencies.filter((c)=>c.score!==null&&c.score<60).map((c)=>c.label)??[],unassessed:latest?.competencies.filter((c)=>c.score===null).map((c)=>c.label)??['All competencies']};
}
export function addRefresherRecommendations(profile:TraineeProfile,plan:LearningPlan,progress:LearningProgress,now:string):LearningPlan {
  const updated=structuredClone(plan);
  for(const f of progress.refreshers){const fingerprint=`refresher:${profile.id}:${f.competency}:${f.lastPractice}`;
    if(updated.recommendations.some((r)=>r.sourceFingerprint===fingerprint||r.competency===f.competency&&!['resolved','dismissed'].includes(r.status)))continue;
    const rec:LearningRecommendation={id:`rec-${deriveSeed(1,fingerprint)}`,traineeId:profile.id,competency:f.competency,objective:f.objective,reason:f.reason,evidenceSessionIds:f.sessionIds,templateId:'procedural-generator',constraints:{objectiveIds:[f.objective],difficulty:'basic',contactCount:f.competency==='multiContact'?2:1,durationSeconds:90,timeOfDay:'day',visibility:'clear',weather:'none',environment:'urban',sensorConditions:f.competency==='degraded'?['blurred']:['normal']},difficulty:'basic',expectedBehavior:`Refresh ${f.competency} through supported evidence and instructor-approved procedures.`,priority:50,status:'recommended',generatedAt:now,cohortKey:null,sourceFingerprint:fingerprint};updated.recommendations.push(rec);
  }
  return updated;
}
export async function saveRefresherInterval(storage:StorageAdapter,profile:TraineeProfile,days:number):Promise<void>{if(!Number.isInteger(days)||days<1||days>3650)throw new Error('Interval must be 1 to 3650 days');await storage.saveTrainee({...profile,refresherDays:days});}
