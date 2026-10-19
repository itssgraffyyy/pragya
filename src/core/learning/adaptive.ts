import { declareAssessment } from '../assessGuard/declare';
import { scenarioQuality } from '../assessGuard/quality';
import { comparisonIdentity,presentationFamily } from '../evidenceMind/stages';
import { reservedEvaluation } from '../evidenceMind/reservation';
import { defaultPolicyFor } from '../scoring/defaultPolicy';
import { serializeLearning } from './queue';
import type { StorageAdapter, StoredSession } from '../persistence/storage';
import type { TraineeProfile } from './profile';
import { generateScenario } from '../generator/generator';
import { recommendDifficulty } from '../difficulty/difficulty';
import { deriveSeed } from '../rng';
import { GENERATOR_VERSION } from '../types';
import { calculateSkillDNA, cohortKey, measuredSessions,stableKey,DEFAULT_SKILL_CONFIG } from './skillDNA';
import { recomputeRecommendations } from './recommendations';
import { traineeHistory } from './trainees';
import { exerciseSchema, learningPlanSchema, recommendationSchema, type AdaptiveExercise, type LearningRecommendation } from './plan';

export function generateAdaptiveExercise(profile:TraineeProfile,recommendation:LearningRecommendation,sessions:StoredSession[],exercises:AdaptiveExercise[],stage:AdaptiveExercise['stage'],now:string):AdaptiveExercise {
  const r=recommendationSchema.parse(recommendation);
  if(r.traineeId!==profile.id||profile.archived)throw new Error('Select an active matching trainee');
  const measured=measuredSessions(profile,sessions);const dna=calculateSkillDNA(profile,measured);
  const source=dna.cohorts.find((c)=>c.key===r.cohortKey)??dna.cohorts[dna.cohorts.length-1];
  const metric=(id:string)=>source?.competencies.find((c)=>c.id===id)?.score??null;
  const rationale=[r.reason];const unsupportedConstraints=['Ambiguity, exact sensor intensity and evidence requirements are not direct GeneratorConfig controls; the existing generator remains authoritative.'];
  const tiers=['basic','intermediate','advanced'] as const;const current=source?.conditions.difficulty??'basic';let desired=r.difficulty;
  const prerequisite=[metric('classification'),metric('evidence'),metric('calibration')].filter((n):n is number=>n!==null);
  if(prerequisite.some((n)=>n<50)) { desired='basic';rationale.push('Weak recognition, evidence or calibration prerequisites: simplify corrective practice.'); }
  if(tiers.indexOf(desired)>tiers.indexOf(current)+1){desired=tiers[tiers.indexOf(current)+1];rationale.push('Difficulty increase capped at one tier.');}
  if(['classification','evidence','calibration','degraded'].every((id)=>metric(id)!==null)&&source) {
    const contacts=measured.filter((s)=>source.sessionIds.includes(s.summary.sessionId)).flatMap((s)=>s.assessment!.contacts.filter((c)=>c.assessable));
    const difficulty=recommendDifficulty({traineeId:profile.id,recognitionAccuracy:metric('classification')!/100,evidenceQuality:metric('evidence')!/100,confidenceCalibration:metric('calibration')!/100,degradedPerformance:metric('degraded')!/100,missedContactRate:contacts.filter((c)=>!c.acknowledged).length/Math.max(1,contacts.length),recentTrend:(source.competencies.find((c)=>c.id==='classification')?.trend??0)/100,sampleCount:source.sessionIds.length});
    if(tiers.indexOf(difficulty.recommendedTier)<tiers.indexOf(desired))desired=difficulty.recommendedTier;
    rationale.push(...difficulty.rationale);
  } else rationale.push('Some difficulty-service inputs are unmeasured; no missing performance values were invented.');
  const baseline=sessions.find(s=>r.evidenceSessionIds.includes(s.summary.sessionId)&&s.summary.scenarioSnapshot.trainingContract);
  const qualifiedMode=true;
  const baselineScenario=baseline?.summary.scenarioSnapshot;
  const priorFamilies=[...new Set([...sessions.map(s=>presentationFamily(s.summary.scenarioSnapshot)),...exercises.map(e=>presentationFamily(e.scenario))])];
  const used=new Set([...sessions.map((s)=>s.summary.seed),...exercises.map((e)=>e.seed)]);
  const ordinal=exercises.filter((e)=>e.recommendationId===r.id&&e.stage===stage).length;
  let failure='No suitable scenario generated';
  for(let attempt=0;attempt<160;attempt++) {
    const seed=deriveSeed(1,`${profile.id}:${r.id}:${stage}:${ordinal}:${attempt}`)%1_000_000_000;if(used.has(seed))continue;
    const config={...r.constraints,seed,objectiveIds:[r.objective],difficulty:desired};
    try {
      const generated=generateScenario(config);let scenario=generated.scenario;
      if(scenario.contacts.some((c)=>!c.observable))continue;
      if(r.objective==='unknown-classification'&&!scenario.contacts.some((c)=>c.assessment.acceptableClassifications.includes('unknown')))continue;
      if(r.constraints.sensorConditions?.length===1&&Array.isArray(r.constraints.sensorConditions)&&scenario.sensor.channels.length!==1)continue;
      if(qualifiedMode){
        const policy=baseline?.scoringPolicy??defaultPolicyFor(scenario);
        scenario=declareAssessment(scenario,[...new Set([r.competency,'classification' as const,'evidence' as const])],stage==='practice'?'guided_practice':stage==='evaluation'?'unseen_evaluation':'retention_followup',policy);
        const c=scenario.trainingContract!;c.comparisonKey=baselineScenario?comparisonIdentity(baselineScenario)!:JSON.stringify({objective:r.objective,version:'1.0.0',competency:r.competency});
        for(const b of c.competencies){const original=baselineScenario?.trainingContract?.competencies.find(x=>x.competency===b.competency);if(original)b.objectiveId=original.objectiveId;}
        if(stage!=='practice'){
          const featureKey=presentationFamily(scenario);if(priorFamilies.includes(featureKey))continue;
          c.reservedFamily='controlled-answer-evidence-variant-v1';c.reservation={featureKey,priorFeatureKeys:priorFamilies,sourceSessionIds:sessions.map(s=>s.summary.sessionId),checkedAt:now};
        }
        if(scenarioQuality(scenario,policy).status==='invalid_for_declared_assessment')continue;
      }
      return exerciseSchema.parse({id:`exercise-${profile.id}-${seed}`,recommendationId:r.id,traineeId:profile.id,stage,scenario,...(qualifiedMode?{policySnapshot:baseline?.scoringPolicy??defaultPolicyFor(scenario)}:{}),generatorVersion:GENERATOR_VERSION,seed,config,
        rationale:[...rationale,...generated.notes,stage==='practice'?'Corrective practice; success alone is not transfer.':qualifiedMode?'Controlled reserved answer/evidence variant; no hints. Unfamiliarity to this person is not certified.':'Legacy seed-only evaluation; answer-family familiarity is unknown.'],unsupportedConstraints,
        baselineSessionIds:r.evidenceSessionIds,createdAt:now,sessionId:null,completedAt:null,status:'prepared'});
    } catch(e) { failure=e instanceof Error?e.message:String(e); }
  }
  throw new Error(`Adaptive generator could not satisfy supported constraints: ${failure}`);
}
export async function prepareExercise(storage:StorageAdapter,traineeId:string,recommendationId:string,stage:AdaptiveExercise['stage'],now:string):Promise<AdaptiveExercise> {
  return serializeLearning(traineeId,async()=>{
    const profile=await storage.getTrainee(traineeId);if(!profile||profile.archived)throw new Error('Active trainee profile required');
    const raw=await storage.getLearningPlan(traineeId);if(!raw)throw new Error('Generate recommendations first');const plan=learningPlanSchema.parse(raw);
    const rec=plan.recommendations.find((r)=>r.id===recommendationId);if(!rec||rec.status==='dismissed'||rec.status==='resolved'&&stage!=='followup')throw new Error('Active recommendation required');
    const active=plan.exercises.find((e)=>e.recommendationId===rec.id&&['prepared','running'].includes(e.status));if(active)return active;
    if(stage!=='practice'&&!plan.exercises.some((e)=>e.recommendationId===rec.id&&e.stage==='practice'&&e.status==='completed'))throw new Error('Complete practice before unseen evaluation');
    if(stage==='followup'&&!plan.exercises.some((e)=>e.recommendationId===rec.id&&e.stage==='evaluation'&&e.status==='completed'))throw new Error('Complete unseen evaluation before follow-up');
    const history=await traineeHistory(storage,profile);
    if(stage==='followup'&&history.sessions.some(s=>s.summary.scenarioSnapshot.trainingContract)){
      const evaluation=plan.exercises.filter(e=>e.recommendationId===rec.id&&e.stage==='evaluation'&&e.status==='completed').at(-1);
      if(!evaluation?.completedAt||Date.parse(now)-Date.parse(evaluation.completedAt)<(profile.refresherDays??30)*86400000)throw new Error('Delayed follow-up is not due yet under the profile refresher interval.');
    }
    const exercise=generateAdaptiveExercise(profile,rec,history.sessions,plan.exercises,stage,now);
    plan.exercises.push(exercise);rec.status='assigned';plan.updatedAt=now;await storage.saveLearningPlan(plan);return exercise;
  });
}
export async function assignExerciseSession(storage:StorageAdapter,traineeId:string,exerciseId:string,sessionId:string):Promise<AdaptiveExercise> {
  return serializeLearning(traineeId,async()=>{
    const raw=await storage.getLearningPlan(traineeId);if(!raw)throw new Error('Learning plan not found');const plan=learningPlanSchema.parse(raw);
    const exercise=plan.exercises.find((e)=>e.id===exerciseId);if(!exercise||exercise.status!=='prepared'||exercise.traineeId!==traineeId)throw new Error('Prepared exercise required');
    const profile=await storage.getTrainee(traineeId);if(!profile||profile.archived)throw new Error('Active trainee required');
    if(exercise.scenario.trainingContract&&exercise.stage!=='practice'){
      const history=await traineeHistory(storage,profile);if(history.sessions.some(s=>presentationFamily(s.summary.scenarioSnapshot)===presentationFamily(exercise.scenario)))throw new Error('Reserved evaluation family was attempted after preparation; release it and prepare another variant.');
    }
    exercise.sessionId=sessionId;exercise.status='running';const rec=plan.recommendations.find((r)=>r.id===exercise.recommendationId)!;rec.status='practicing';await storage.saveLearningPlan(plan);return exercise;
  });
}
export async function reconcileLearningSession(storage:StorageAdapter,session:StoredSession):Promise<void> {
  return serializeLearning(session.summary.traineeId,async()=>{
    const profile=await storage.getTrainee(session.summary.traineeId);if(!profile)return;
    const raw=await storage.getLearningPlan(profile.id);const plan=raw?learningPlanSchema.parse(raw):null;
    const exercise=plan?.exercises.find((e)=>e.sessionId===session.summary.sessionId);
    if(exercise&&exercise.status==='running'&&plan){
      if(stableKey(exercise.scenario)!==stableKey(session.summary.scenarioSnapshot)||exercise.policySnapshot&&stableKey(exercise.policySnapshot)!==stableKey(session.scoringPolicy))throw new Error('Adaptive exercise/session snapshot mismatch; original outcome preserved without a learning resolution.');
      exercise.status=session.summary.status==='completed'?'completed':'aborted';exercise.completedAt=session.summary.endedAt;
      const rec=plan.recommendations.find((r)=>r.id===exercise.recommendationId)!;
      if(exercise.status==='aborted')rec.status='continued';
      else if(exercise.stage==='practice')rec.status='awaitingEvaluation';
      else {
        const score=calculateSkillDNA(profile,[session]).cohorts[0]?.competencies.find((c)=>c.id===rec.competency)?.score;
        const practice=plan.exercises.find((e)=>e.recommendationId===rec.id&&e.stage==='practice'&&e.status==='completed');
        const prior=practice?.sessionId?await storage.getSession(practice.sessionId):undefined;
        const history=await traineeHistory(storage,profile);
        const declared=!!session.summary.scenarioSnapshot.trainingContract;
        const comparable=declared?measuredSessions(profile,history.sessions).filter(s=>exercise.baselineSessionIds.includes(s.summary.sessionId)&&cohortKey(s)===cohortKey(session)).length>=DEFAULT_SKILL_CONFIG.minSessions&&reservedEvaluation(session,history.sessions).eligible:!!prior&&cohortKey(prior)===cohortKey(session)&&(rec.cohortKey===null||rec.cohortKey===cohortKey(session));
        rec.status=score!==null&&score!==undefined&&score>=80&&comparable&&practice?.seed!==exercise.seed?'resolved':'continued';
        if(rec.status==='resolved'&&!(profile.completedRecommendationIds??[]).includes(rec.id)){profile.curriculumPosition+=1;profile.completedRecommendationIds=[...(profile.completedRecommendationIds??[]),rec.id];}
      }
      if(exercise.status==='completed'){profile.lastCompletedAdaptiveExercise=exercise.id;await storage.saveTrainee(profile);}
      await storage.saveLearningPlan(plan);
    }
    await recomputeRecommendations(storage,profile,session.summary.endedAt);
  });
}
export async function abandonExercise(storage:StorageAdapter,traineeId:string,exerciseId:string):Promise<void>{
  await serializeLearning(traineeId,async()=>{const raw=await storage.getLearningPlan(traineeId);if(!raw)throw new Error('Learning plan not found');const plan=learningPlanSchema.parse(raw);const e=plan.exercises.find((x)=>x.id===exerciseId);if(!e||!['prepared','running'].includes(e.status))throw new Error('Unfinished exercise required');e.status='aborted';const r=plan.recommendations.find((r)=>r.id===e.recommendationId);if(r)r.status='continued';await storage.saveLearningPlan(plan);});
}
