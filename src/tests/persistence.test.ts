import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { MemoryStorage } from '../core/persistence/memoryStorage';
import { IndexedDbStorage } from '../core/persistence/indexedDbStorage';
import { SCENARIO_SINGLE_RECOGNITION } from '../core/scenario/bundled/scenariosA';
import type { StorageAdapter, StoredSession } from '../core/persistence/storage';
import { buildSessionSummary, buildSessionExport, isSessionExportEnvelope } from '../core/sim/sessionSummary';
import { SimulationEngine } from '../core/sim/engine';

function sampleSession(id: string): StoredSession {
  return {
    summary: {
      sessionId: id,
      traineeId: 't1',
      scenarioId: 'scn',
      scenarioTitle: 'Test',
      scenarioVersion: '1.0.0',
      seed: 1,
      startedAt: '2026-01-01T00:00:00.000Z',
      endedAt: '2026-01-01T00:02:00.000Z',
      durationSimSeconds: 120,
      status: 'completed',
      eventCount: 3,
      assessments: [],
      scenarioSnapshot: SCENARIO_SINGLE_RECOGNITION,
    },
    events: { logVersion: 1, exportedAt: '2026-01-01T00:02:00.000Z', events: [] },
  };
}

async function exerciseAdapter(adapter: StorageAdapter) {
  await adapter.init();

  // Scenarios
  await adapter.saveScenario(SCENARIO_SINGLE_RECOGNITION);
  const all = await adapter.listScenarios();
  expect(all).toHaveLength(1);
  expect((await adapter.getScenario(SCENARIO_SINGLE_RECOGNITION.id))?.id).toBe(SCENARIO_SINGLE_RECOGNITION.id);
  await adapter.deleteScenario(SCENARIO_SINGLE_RECOGNITION.id);
  expect(await adapter.listScenarios()).toHaveLength(0);

  // Sessions
  await adapter.saveSession(sampleSession('sess-a'));
  await adapter.saveSession(sampleSession('sess-b'));
  expect(await adapter.listSessions()).toHaveLength(2);
  expect((await adapter.getSession('sess-a'))?.summary.sessionId).toBe('sess-a');
  await adapter.deleteSession('sess-a');
  expect(await adapter.listSessions()).toHaveLength(1);

  // Settings
  const settings = await adapter.getSettings();
  expect(settings.traineeId).toBeTruthy();
  await adapter.saveSettings({ ...settings, traineeId: 'instructor-9' });
  expect((await adapter.getSettings()).traineeId).toBe('instructor-9');

  // Clear
  await adapter.clearAll();
  expect(await adapter.listSessions()).toHaveLength(0);
  expect(await adapter.listScenarios()).toHaveLength(0);
}

describe('MemoryStorage', () => {
  it('supports the full StorageAdapter contract', async () => {
    await exerciseAdapter(new MemoryStorage());
  });
});

describe('IndexedDbStorage (fake-indexeddb)', () => {
  it('supports the full StorageAdapter contract', async () => {
    await exerciseAdapter(new IndexedDbStorage());
  });
});

describe('session summary', () => {
  function completedEngine() {
    const engine = new SimulationEngine({
      scenario: SCENARIO_SINGLE_RECOGNITION,
      sessionId: 'sess-sum',
      traineeId: 't1',
    });
    engine.load();
    engine.start();
    for (let i = 0; i < 6; i++) engine.tick(1); // c1 spawns at t=5
    engine.acknowledgeContact('c1');
    engine.setClassification('c1', 'smallMultirotor');
    engine.setConfidence('c1', 'high');
    engine.toggleEvidence('c1', 'rotorSilhouette', true);
    engine.setProceduralResponse('c1', 'recordAndReport');
    engine.submitAssessment('c1'); // auto-completes
    return engine;
  }

  it('captures a full summary with correctness', () => {
    const engine = completedEngine();
    const summary = buildSessionSummary(engine);
    expect(summary.status).toBe('completed');
    expect(summary.assessments).toHaveLength(1);
    expect(summary.assessments[0].submittedClassification).toBe('smallMultirotor');
    expect(summary.assessments[0].groundTruth).toBe('smallMultirotor');
    expect(summary.assessments[0].correct).toBe(true);
    expect(summary.assessments[0].evidence).toContain('rotorSilhouette');
    expect(summary.seed).toBe(SCENARIO_SINGLE_RECOGNITION.seed);
  });

  it('marks incorrect classifications', () => {
    const engine = new SimulationEngine({
      scenario: SCENARIO_SINGLE_RECOGNITION,
      sessionId: 'sess-wrong',
      traineeId: 't1',
    });
    engine.load();
    engine.start();
    for (let i = 0; i < 6; i++) engine.tick(1);
    engine.setClassification('c1', 'birdLike');
    engine.setConfidence('c1', 'low');
    engine.setProceduralResponse('c1', 'continueObservation');
    engine.submitAssessment('c1');
    const summary = buildSessionSummary(engine);
    expect(summary.assessments[0].correct).toBe(false);
  });

  it('builds a valid export envelope', () => {
    const engine = completedEngine();
    const envelope = buildSessionExport(engine);
    expect(isSessionExportEnvelope(envelope)).toBe(true);
    expect(envelope.events.events.length).toBeGreaterThan(0);
    expect(envelope.summary.sessionId).toBe('sess-sum');
  });

  it('rejects foreign objects in isSessionExportEnvelope', () => {
    expect(isSessionExportEnvelope(null)).toBe(false);
    expect(isSessionExportEnvelope({ kind: 'other' })).toBe(false);
  });
});
