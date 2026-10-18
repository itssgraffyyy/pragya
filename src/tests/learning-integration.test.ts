import { describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../core/persistence/memoryStorage';
import { initStorage } from '../core/persistence/appStorage';
import { createProfile } from '../core/learning/profile';
import { refreshRecommendations } from '../core/learning/recommendations';
import { prepareExercise, abandonExercise } from '../core/learning/adaptive';
import { getLearningSnapshot } from '../core/learning/contracts';
import { useSimulationStore } from '../store/simulationStore';
import { SCENARIO_SINGLE_RECOGNITION } from '../core/scenario/bundled/scenariosA';
import { learningSession } from './learningFixtures';
const now='2026-10-18T00:00:00.000Z';
describe('integrated learning workspace',()=>{
  it('recovers an unfinished assignment without creating a fabricated assessment',async()=>{const storage=new MemoryStorage();const p=createProfile('T',now,'t1');await storage.saveTrainee(p);const plan=await refreshRecommendations(storage,p,now);const a=await prepareExercise(storage,p.id,plan.recommendations[0].id,'practice',now);await abandonExercise(storage,p.id,a.id);const b=await prepareExercise(storage,p.id,plan.recommendations[0].id,'practice',now);expect(b.seed).not.toBe(a.seed);expect(await storage.listSessions()).toEqual([]);});
  it('exposes an isolated versioned learning contract for future consumers',async()=>{const storage=new MemoryStorage();const p=createProfile('T',now,'t1');await storage.saveTrainee(p);await storage.saveSession(learningSession());await storage.saveSession(learningSession('foreign','other'));const snapshot=await getLearningSnapshot(storage,p.id,now);expect(snapshot.contractVersion).toBe(1);expect(snapshot.assessments.map((a)=>a.sessionId)).toEqual(['s1']);expect(snapshot.nonSensitiveMetrics.completedSessions).toBe(1);});
  it('updates Skill DNA recommendations after an actual terminal store workflow',async()=>{
    const storage=await initStorage();const p=createProfile('Store trainee',now,'learning-store');await storage.saveTrainee(p);
    const store=useSimulationStore;store.getState().loadScenario(SCENARIO_SINGLE_RECOGNITION,'store-learning',p.id);store.getState().start();for(let i=0;i<6;i++)store.getState().tick(1);
    store.getState().acknowledge('c1');store.getState().classify('c1','smallMultirotor');store.getState().setConfidence('c1','high');store.getState().toggleEvidence('c1','rotorSilhouette',true);store.getState().selectResponse('c1','recordAndReport');store.getState().submitAssessment('c1');
    await vi.waitFor(()=>expect(store.getState().learningPending).toBe(false));expect((await storage.getTrainee(p.id))?.completedSessionIds).toEqual(['store-learning']);expect((await storage.getLearningPlan(p.id))?.recommendations[0].objective).toBe('basic-recognition');
  });
});
