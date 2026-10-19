import * as generator from '../core/generator/generator';
import { describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../core/persistence/memoryStorage';
import { createProfile } from '../core/learning/profile';
import { refreshRecommendations } from '../core/learning/recommendations';
import { generateAdaptiveExercise, prepareExercise, assignExerciseSession, reconcileLearningSession } from '../core/learning/adaptive';
import { generateScenario } from '../core/generator/generator';
import { validateScenario } from '../core/scenario/validate';
import { SimulationEngine } from '../core/sim/engine';
import { buildSessionExport } from '../core/sim/sessionSummary';
import type { AdaptiveExercise, LearningRecommendation } from '../core/learning/plan';
import { learningSession } from './learningFixtures';

const now='2026-10-18T00:00:00.000Z';const p=createProfile('T',now,'t1');
async function setup(){const s=new MemoryStorage();await s.saveTrainee(p);for(let d=1;d<=3;d++)await s.saveSession(learningSession('s'+d,'t1','wrong',d,false,true));const plan=await refreshRecommendations(s,p,now);return {s,rec:plan.recommendations.find((r)=>r.competency==='calibration')!};}
function complete(e:AdaptiveExercise,id:string){const engine=new SimulationEngine({scenario:e.scenario,sessionId:id,traineeId:p.id});engine.load();engine.start();
  for(let i=0;i<e.scenario.duration&&engine.state==='running';i++){engine.tick(1);for(const o of engine.traineeView().opportunities)if(o.available){engine.presentOpportunity(o.id);engine.acknowledgeOpportunity(o.id);}for(const c of engine.traineeView().contacts){if(['visible','occluded'].includes(c.visibility)&&!c.assessment.submitted){const def=e.scenario.contacts.find((d)=>d.id===c.id)!;engine.acknowledgeContact(c.id);engine.setClassification(c.id,def.assessment.acceptableClassifications[0]);engine.setConfidence(c.id,'high');for(const ev of def.assessment.requiredEvidence)engine.toggleEvidence(c.id,ev,true);engine.setProceduralResponse(c.id,def.assessment.correctResponse);engine.submitAssessment(c.id);}}}
  return structuredClone(buildSessionExport(engine));
}
describe('closed-loop adaptive scenarios',()=>{
  it('reports generator exhaustion without saving a fabricated exercise',async()=>{const {s,rec}=await setup();const spy=vi.spyOn(generator,'generateScenario').mockImplementation(()=>{throw new Error('Generator unavailable');});try{await expect(prepareExercise(s,p.id,rec.id,'practice',now)).rejects.toThrow('Generator unavailable');expect((await s.getLearningPlan(p.id))!.exercises).toEqual([]);}finally{spy.mockRestore();}});
  it('uses the existing generator, produces valid reproducible scenarios and reports unsupported controls',async()=>{const {s,rec}=await setup();const xs=await s.listSessions();const e=generateAdaptiveExercise(p,rec,xs,[],'practice',now);expect(validateScenario(e.scenario).valid).toBe(true);const raw=generateScenario(e.config).scenario;expect(e.scenario.contacts).toEqual(raw.contacts);expect(e.scenario.trainingContract!.stage).toBe('guided_practice');expect(e.scenario.contacts.some((c)=>c.assessment.acceptableClassifications.includes('unknown'))).toBe(true);expect(e.unsupportedConstraints[0]).toContain('not direct');expect(e.scenario.difficulty).toBe('basic');});
  it('completes real practice and unseen evaluation and resolves the measured target',async()=>{const {s,rec}=await setup();const practice=await prepareExercise(s,p.id,rec.id,'practice',now);await assignExerciseSession(s,p.id,practice.id,'practice');const a=complete(practice,'practice');await s.saveSession(a);await reconcileLearningSession(s,a);expect((await s.getLearningPlan(p.id))!.recommendations.find((r)=>r.id===rec.id)?.status).toBe('awaitingEvaluation');
    const evaluation=await prepareExercise(s,p.id,rec.id,'evaluation',now);expect(evaluation.seed).not.toBe(practice.seed);await assignExerciseSession(s,p.id,evaluation.id,'evaluation');const b=complete(evaluation,'evaluation');await s.saveSession(b);await reconcileLearningSession(s,b);expect((await s.getLearningPlan(p.id))!.recommendations.find((r)=>r.id===rec.id)?.status).toBe('resolved');expect((await s.getTrainee(p.id))!.curriculumPosition).toBe(1);
    await expect(prepareExercise(s,p.id,rec.id,'followup',now)).rejects.toThrow('not due');const followup=await prepareExercise(s,p.id,rec.id,'followup','2026-12-01T00:00:00.000Z');await assignExerciseSession(s,p.id,followup.id,'followup');const c=complete(followup,'followup');await s.saveSession(c);await reconcileLearningSession(s,c);expect((await s.getTrainee(p.id))!.curriculumPosition).toBe(1);
  });
  it('does not permit evaluation before practice or duplicate an assigned exercise',async()=>{const {s,rec}=await setup();await expect(prepareExercise(s,p.id,rec.id,'evaluation',now)).rejects.toThrow('Complete practice');const e=await prepareExercise(s,p.id,rec.id,'practice',now);expect((await prepareExercise(s,p.id,rec.id,'practice',now)).id).toBe(e.id);await expect(assignExerciseSession(s,'other',e.id,'x')).rejects.toThrow();});
  it('rejects unsupported generator fields and invalid constraints instead of pretending to apply them',async()=>{const {s,rec}=await setup();const bad={...rec,constraints:{...rec.constraints,observationAmbiguity:'high'}} as LearningRecommendation;expect(()=>generateAdaptiveExercise(p,bad,[],[],'practice',now)).toThrow();const invalid={...rec,constraints:{...rec.constraints,durationSeconds:5}};expect(()=>generateAdaptiveExercise(p,invalid,[],[],'practice',now)).toThrow();expect(await s.getLearningPlan(p.id)).toBeDefined();});
});
