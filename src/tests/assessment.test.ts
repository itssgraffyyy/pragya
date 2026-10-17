import { describe, expect, it } from 'vitest';
import { SimulationEngine } from '../core/sim/engine';
import { buildSessionExport } from '../core/sim/sessionSummary';
import { SCENARIO_SINGLE_RECOGNITION } from '../core/scenario/bundled/scenariosA';
import { assessStoredSession, scoringInputFor } from '../core/scoring/storedSession';
import { decisionReplay } from '../core/scoring/replay';
import { assessmentCsv, assessmentExport } from '../core/scoring/exports';
import { POLICY_BASIC_RECOGNITION } from '../core/scoring/samplePolicies';
import { detectBlindSpots } from '../core/intelligence/blindSpots';

export function finishedSession() {
  const engine = new SimulationEngine({ scenario: SCENARIO_SINGLE_RECOGNITION, sessionId: 'review', traineeId: 't' });
  engine.load(); engine.start(); for (let i = 0; i < 6; i++) engine.tick(1);
  engine.acknowledgeContact('c1'); engine.setClassification('c1', 'smallMultirotor'); engine.setConfidence('c1', 'high');
  engine.toggleEvidence('c1', 'rotorSilhouette', true); engine.setProceduralResponse('c1', 'recordAndReport'); engine.submitAssessment('c1');
  return buildSessionExport(engine);
}

describe('stored assessment and replay', () => {
  it('reconstructs a submitted decision and preserves policy and result snapshots', () => {
    const session = finishedSession();
    expect(scoringInputFor(session).assessments[0].submitted).toBe(true);
    expect(session.assessment?.overall).toBe(100);
    expect(assessStoredSession(session)).toEqual(session.assessment);
    expect(session.scoringPolicy?.policyId).toBe(POLICY_BASIC_RECOGNITION.policyId);
  });
  it('keeps future observations out of earlier replay frames', () => {
    const input = scoringInputFor(finishedSession());
    const frames = decisionReplay(input);
    expect(frames[0].observations.some((e) => e.type === 'evidenceSelected')).toBe(false);
    const decision = frames.find((f) => f.decision);
    expect(decision?.decision?.classification).toBe('smallMultirotor');
    expect(decision?.observations.some((e) => e.type === 'evidenceSelected')).toBe(true);
  });
  it('does not score unfinished form fields from older summary records', () => {
    const session = finishedSession(); session.events.events = session.events.events.filter((e) => e.type !== 'assessmentSubmitted');
    expect(assessStoredSession(session).contacts[0].classificationOutcome).toBe('missing');
  });
  it('exports reproducible JSON and safe CSV', () => {
    const session = finishedSession(); const result = assessStoredSession(session);
    expect(assessmentExport(session, result, POLICY_BASIC_RECOGNITION).policy).toEqual(session.scoringPolicy);
    result.traineeId = '=HYPERLINK("example")';
    const csv = assessmentCsv(result);
    expect(csv).toContain("'=HYPERLINK"); expect(csv).toContain('"policyVersion"');
  });
  it('does not inflate pattern counts when a session is provided repeatedly', () => {
    const result = assessStoredSession(finishedSession());
    result.contacts[0].classificationOutcome = 'incorrect';
    expect(detectBlindSpots([result, result, result])).toEqual([]);
  });
});
