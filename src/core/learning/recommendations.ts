import { serializeLearning } from './queue';
import { learningProgress, addRefresherRecommendations } from './progress';
import type { TraineeProfile } from './profile';
import type { SkillDNA, CompetencyId } from './skillDNA';
import { measuredSessions, stableKey } from './skillDNA';
import type { PatternHistory } from './longitudinal';
import type { StoredSession } from '../persistence/storage';
import type { LearningRecommendation, LearningPlan } from './plan';
import { learningPlanSchema } from './plan';
import { BUNDLED_SCENARIOS } from '../scenario/bundled';
import { LEARNING_OBJECTIVES } from '../objectives';
import { deriveSeed } from '../rng';
import type { StorageAdapter } from '../persistence/storage';
import { traineeHistory } from './trainees';
import { calculateSkillDNA } from './skillDNA';
import { longitudinalPatterns } from './longitudinal';

export function recommendLearning(profile:TraineeProfile,dna:SkillDNA,patterns:PatternHistory[],sessions:StoredSession[],existing:LearningRecommendation[],now:string):LearningRecommendation[] {
  const measured=measuredSessions(profile,sessions); const result=structuredClone(existing);
  function add(competency:CompetencyId,objective:string,reason:string,evidenceSessionIds:string[],priority:number,key:string|null,difficulty:LearningRecommendation['difficulty']='basic') {
    const fingerprint=stableKey({competency,objective,key,evidenceSessionIds:[...evidenceSessionIds].sort()});

    const active=result.find((r)=>r.competency===competency&&r.cohortKey===key&&!['resolved','dismissed'].includes(r.status));
    if(active){if(priority>active.priority){active.priority=priority;active.reason=reason;active.evidenceSessionIds=[...new Set([...active.evidenceSessionIds,...evidenceSessionIds])];}return;}
    if(result.some((r)=>r.sourceFingerprint===fingerprint))return;
    const template=BUNDLED_SCENARIOS.find((s)=>s.learningObjectives.some((o)=>o.id===objective))??BUNDLED_SCENARIOS[0];
    const cohort=dna.cohorts.find((c)=>c.key===key);
    const constraints:LearningRecommendation['constraints']={objectiveIds:[objective],difficulty,contactCount:competency==='multiContact'?2:1,durationSeconds:90,
      environment:cohort?.conditions.environment??'urban',timeOfDay:cohort?.conditions.timeOfDay??'day',visibility:cohort?.conditions.visibility??'clear',weather:cohort?.conditions.weather??'none',sensorConditions:competency==='degraded'?['blurred']:['normal']};
    result.push({id:`rec-${profile.id}-${deriveSeed(1,fingerprint).toString(36)}`,traineeId:profile.id,competency,objective,reason,evidenceSessionIds,priority:Math.min(100,priority+(profile.objectiveIds.includes(objective)?5:0)),cohortKey:key,difficulty,
      templateId:template.id,constraints,expectedBehavior:LEARNING_OBJECTIVES.find((o)=>o.id===objective)!.label,status:'recommended',generatedAt:now,sourceFingerprint:fingerprint});
  }
  if(measured.length<dna.config.minSessions) {
    add('classification','basic-recognition',`Only ${measured.length} valid completed assessments are available. Establish a baseline; no personal weakness is inferred.`,measured.map((s)=>s.summary.sessionId),85,null);
  } else {
    for(const cohort of dna.cohorts) for(const c of cohort.competencies) {
      if(c.score!==null&&c.sessionCount>=dna.config.minSessions&&c.samples>=dna.config.minObservations&&c.score<dna.config.developmentThreshold)
        add(c.id,c.objective,`${c.label} is ${c.score.toFixed(1)}/100 across ${c.sessionCount} comparable assessments (${cohort.label}).`,c.evidence.map((e)=>e.sessionId),Math.round(55+(100-c.score)*0.35),cohort.key);
    }
    for(const p of patterns.filter((x)=>x.state==='possibleRecurringPattern'||x.state==='consistentlyObservedPattern'))
      add(p.competency,p.objective,`${p.name}: ${p.observations} supporting observations. ${p.explanation}`,[...new Set(p.evidence.map((e)=>e.sessionId))],92,p.cohortKey);
    const latest=dna.cohorts[dna.cohorts.length-1]; const primary=latest?.competencies.filter((c)=>['detection','classification','evidence','calibration','procedure'].includes(c.id));
    if(primary?.length&&primary.every((c)=>c.score!==null&&c.score>=dna.config.strengthThreshold&&c.sessionCount>=dna.config.minSessions)) {
      const next=latest.conditions.difficulty==='basic'?'intermediate':'advanced';
      const before=result.length;
      add('degraded','low-visibility-observation','Consistent performance in the measured cohort supports practice in broader, less familiar conditions; this is not a readiness certification.',latest.sessionIds,60,null,next);
      const r=result[result.length-1];if(result.length>before&&r?.objective==='low-visibility-observation'){r.constraints={...r.constraints,timeOfDay:latest.conditions.timeOfDay==='night'?'day':'night',visibility:'lightFog',sensorConditions:['blurred']};}
    }
    if(!result.some((r)=>!['resolved','dismissed'].includes(r.status)))add('uncertainty','unknown-classification','Comparable coverage is insufficient to establish a development area. Broaden assessment coverage.',measured.map((s)=>s.summary.sessionId),55,null);
  }
  return result.sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
}
export async function recomputeRecommendations(storage:StorageAdapter,profile:TraineeProfile,now:string):Promise<LearningPlan> {
  const history=await traineeHistory(storage,profile);const dna=calculateSkillDNA(profile,history.sessions);const patterns=longitudinalPatterns(profile,history.sessions);
  const raw=await storage.getLearningPlan(profile.id); const old=raw?learningPlanSchema.parse(raw):null;
  let plan:LearningPlan={schemaVersion:1,traineeId:profile.id,updatedAt:now,recommendations:recommendLearning(profile,dna,patterns,history.sessions,old?.recommendations??[],now),exercises:old?.exercises??[],patterns};
  plan=addRefresherRecommendations(profile,plan,learningProgress(profile,history.sessions,plan,now),now); await storage.saveLearningPlan(plan); return plan;
}

export function refreshRecommendations(storage:StorageAdapter,profile:TraineeProfile,now:string):Promise<LearningPlan>{
  return serializeLearning(profile.id,()=>recomputeRecommendations(storage,profile,now));
}
export function dismissRecommendation(storage:StorageAdapter,traineeId:string,id:string):Promise<LearningPlan>{
  return serializeLearning(traineeId,async()=>{const raw=await storage.getLearningPlan(traineeId);if(!raw)throw new Error('Learning plan not found');const plan=learningPlanSchema.parse(raw);const rec=plan.recommendations.find((r)=>r.id===id);if(!rec)throw new Error('Recommendation not found');rec.status='dismissed';await storage.saveLearningPlan(plan);return plan;});
}