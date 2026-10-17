import { describe, expect, it } from 'vitest';
import { useSimulationStore } from '../store/simulationStore';
import { initStorage } from '../core/persistence/appStorage';
import { SCENARIO_SINGLE_RECOGNITION } from '../core/scenario/bundled/scenariosA';

describe('terminal session persistence', () => {
  it('saves the original assessment and policy on completion and abort', async () => {
    const store = useSimulationStore;
    store.getState().loadScenario(SCENARIO_SINGLE_RECOGNITION, 'persist-complete', 't');
    store.getState().start();
    for (let i = 0; i < 6; i++) store.getState().tick(1);
    store.getState().acknowledge('c1'); store.getState().classify('c1', 'smallMultirotor');
    store.getState().setConfidence('c1', 'high'); store.getState().toggleEvidence('c1', 'rotorSilhouette', true);
    store.getState().selectResponse('c1', 'recordAndReport'); store.getState().submitAssessment('c1');
    const storage = await initStorage();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await storage.getSession('persist-complete'))?.assessment?.overall).toBe(100);
    expect((await storage.getSession('persist-complete'))?.scoringPolicy?.policyVersion).toBe('1.0.0');
    store.getState().loadScenario(SCENARIO_SINGLE_RECOGNITION, 'persist-abort', 't'); store.getState().start(); store.getState().abort();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await storage.getSession('persist-abort'))?.summary.status).toBe('aborted');
  });
});
