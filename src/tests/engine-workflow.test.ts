import { describe, expect, it } from 'vitest';
import { SimulationEngine } from '../core/sim/engine';
import { SCENARIO_SINGLE_RECOGNITION, SCENARIO_MULTI_CONTACT } from '../core/scenario/bundled/scenariosA';
import { confidenceAtLeast } from '../core/sim/engine';

/** Advance the engine in <=1s steps (tick clamps single deltas to 1s). */
function advance(engine: SimulationEngine, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds); i++) engine.tick(1);
}

function startedEngine() {
  const engine = new SimulationEngine({
    scenario: SCENARIO_SINGLE_RECOGNITION,
    sessionId: 'sess-workflow',
    traineeId: 't1',
  });
  engine.load();
  engine.start();
  advance(engine, 6); // c1 spawns at t=5
  return engine;
}

describe('trainee workflow', () => {
  it('completes the final assessment while paused without advancing time', () => {
    const engine = startedEngine(); engine.pause(); const time = engine.simTime;
    engine.acknowledgeContact('c1'); engine.setClassification('c1', 'smallMultirotor');
    engine.setConfidence('c1', 'high'); engine.setProceduralResponse('c1', 'recordAndReport');
    engine.submitAssessment('c1');
    expect(engine.state).toBe('completed'); expect(engine.simTime).toBe(time);
    expect(engine.log.byType('sessionCompleted')).toHaveLength(1);
  });
  it('rejects actions before the session starts', () => {
    const engine = new SimulationEngine({
      scenario: SCENARIO_SINGLE_RECOGNITION,
      sessionId: 's',
      traineeId: 't',
    });
    engine.load();
    expect(() => engine.acknowledgeContact('c1')).toThrow(/not allowed/);
  });

  it('acknowledges a visible contact and logs it', () => {
    const engine = startedEngine();
    engine.acknowledgeContact('c1');
    const a = engine.allAssessments()[0];
    expect(a.acknowledged).toBe(true);
    expect(a.detectionState).toBe('acknowledged');
    expect(engine.log.byType('contactAcknowledged')).toHaveLength(1);
  });

  it('rejects acknowledging a contact that has not spawned', () => {
    const engine = new SimulationEngine({
      scenario: SCENARIO_MULTI_CONTACT,
      sessionId: 's',
      traineeId: 't',
    });
    engine.load();
    engine.start();
    advance(engine, 3); // nothing spawned yet (earliest spawn is 8)
    expect(() => engine.acknowledgeContact('c2')).toThrow(/not currently observable/);
  });

  it('requires classification, confidence and response before submit', () => {
    const engine = startedEngine();
    expect(() => engine.submitAssessment('c1')).toThrow(/classification/);
    engine.setClassification('c1', 'smallMultirotor');
    expect(() => engine.submitAssessment('c1')).toThrow(/confidence/);
    engine.setConfidence('c1', 'high');
    expect(() => engine.submitAssessment('c1')).toThrow(/procedural response/);
    engine.setProceduralResponse('c1', 'recordAndReport');
    engine.submitAssessment('c1');
    expect(engine.allAssessments()[0].submitted).toBe(true);
  });

  it('accepts "unknown" as a classification', () => {
    const engine = startedEngine();
    engine.setClassification('c1', 'unknown');
    engine.setConfidence('c1', 'low');
    engine.setProceduralResponse('c1', 'recordAndReport');
    engine.submitAssessment('c1');
    expect(engine.allAssessments()[0].classification).toBe('unknown');
  });

  it('does not allow modifying a submitted assessment', () => {
    // Use the multi-contact scenario so submitting one assessment does NOT
    // complete the session (3 required), letting us observe the guard.
    const engine = new SimulationEngine({
      scenario: SCENARIO_MULTI_CONTACT,
      sessionId: 's',
      traineeId: 't',
    });
    engine.load();
    engine.start();
    advance(engine, 9); // c1 spawns at 8
    engine.setClassification('c1', 'fixedWing');
    engine.setConfidence('c1', 'high');
    engine.setProceduralResponse('c1', 'recordAndReport');
    engine.submitAssessment('c1');
    expect(engine.state).toBe('running');
    expect(() => engine.setClassification('c1', 'unknown')).toThrow(/already submitted/);
  });

  it('toggles evidence selection with events', () => {
    const engine = startedEngine();
    engine.toggleEvidence('c1', 'rotorSilhouette', true);
    expect(engine.allAssessments()[0].evidence).toContain('rotorSilhouette');
    expect(engine.log.byType('evidenceSelected')).toHaveLength(1);
    engine.toggleEvidence('c1', 'rotorSilhouette', false);
    expect(engine.allAssessments()[0].evidence).not.toContain('rotorSilhouette');
    expect(engine.log.byType('evidenceDeselected')).toHaveLength(1);
  });

  it('auto-completes when required assessments are submitted', () => {
    const engine = startedEngine();
    engine.setClassification('c1', 'smallMultirotor');
    engine.setConfidence('c1', 'high');
    engine.setProceduralResponse('c1', 'recordAndReport');
    engine.submitAssessment('c1');
    expect(engine.state).toBe('completed');
  });

  it('verification request updates detection state and logs', () => {
    const engine = startedEngine();
    engine.requestVerification('c1');
    expect(engine.allAssessments()[0].detectionState).toBe('verificationRequested');
    expect(engine.log.byType('verificationRequested')).toHaveLength(1);
  });

  it('confidenceAtLeast orders low < medium < high', () => {
    expect(confidenceAtLeast('high', 'medium')).toBe(true);
    expect(confidenceAtLeast('low', 'medium')).toBe(false);
    expect(confidenceAtLeast(null, 'low')).toBe(false);
  });
});

describe('ground-truth isolation', () => {
  it('trainee view never exposes groundTruthLabel', () => {
    const engine = startedEngine();
    const view = engine.traineeView();
    const json = JSON.stringify(view);
    expect(json).not.toContain('groundTruthLabel');
    expect(json).not.toContain('groundTruth');
    // But ground truth is still retrievable for scoring/summary.
    expect(engine.groundTruth()[0].groundTruthLabel).toBe('smallMultirotor');
  });

  it('trainee view assessment omits ground truth and acceptable set', () => {
    const engine = startedEngine();
    const view = engine.traineeView();
    const contact = view.contacts[0];
    expect(contact).toBeDefined();
    const keys = Object.keys(contact);
    expect(keys).not.toContain('assessmentCriteria');
    const assessmentJson = JSON.stringify(contact.assessment);
    expect(assessmentJson).not.toContain('acceptableClassifications');
    expect(assessmentJson).not.toContain('correctResponse');
  });
});
