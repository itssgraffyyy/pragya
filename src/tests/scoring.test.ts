import { describe, expect, it } from 'vitest';
import { SCENARIO_SINGLE_RECOGNITION } from '../core/scenario/bundled/scenariosA';
import { POLICY_BASIC_RECOGNITION } from '../core/scoring/samplePolicies';
import { scoreSession } from '../core/scoring/scoreSession';
import { evaluateProcedural } from '../core/scoring/procedural';
import { parseScoringPolicy, type ScoringPolicy } from '../core/scoring/policy';
import type { ScoringInput } from '../core/scoring/results';

function input(): ScoringInput {
  return {
    sessionId: 's', traineeId: 't', scenario: structuredClone(SCENARIO_SINGLE_RECOGNITION), endedAtSimTime: 20,
    events: [{ eventId: 'e', sessionId: 's', traineeId: 't', scenarioId: SCENARIO_SINGLE_RECOGNITION.id, scenarioVersion: '1', simTimestamp: 6, type: 'contactAcknowledged', contactId: 'c1' }],
    assessments: [{ contactId: 'c1', acknowledged: true, detectionState: 'acknowledged', classification: 'smallMultirotor', confidence: 'high', evidence: ['rotorSilhouette'], proceduralResponse: 'recordAndReport', submitted: true, submittedAt: 10 }],
  };
}

describe('Module 2 scoring', () => {
  it('scores a fully supported correct submission and explains every category', () => {
    const r = scoreSession(input(), POLICY_BASIC_RECOGNITION);
    expect(r.overall).toBe(100);
    expect(r.categories.confidenceCalibration).toBe(1);
    expect(r.explanations).toHaveLength(5);
    expect(r.policyVersion).toBe('1.0.0');
  });
  it('does not award classification credit to a draft or a future submission', () => {
    const i = input(); i.assessments[0].submitted = false;
    expect(scoreSession(i, POLICY_BASIC_RECOGNITION).categories.classification).toBe(0);
    i.assessments[0].submitted = true; i.assessments[0].submittedAt = 21;
    expect(scoreSession(i, POLICY_BASIC_RECOGNITION).categories.classification).toBe(0);
  });
  it('ignores acknowledgment events after the session end', () => {
    const i = input(); i.events[0].simTimestamp = 25;
    expect(scoreSession(i, POLICY_BASIC_RECOGNITION).categories.detection).toBe(0);
  });
  it('excludes hidden and fully occluded contacts, with optional zero weighting', () => {
    const i = input(); const hidden = structuredClone(i.scenario.contacts[0]);
    hidden.id = 'hidden'; hidden.observable = false; i.scenario.contacts.push(hidden);
    expect(scoreSession(i, POLICY_BASIC_RECOGNITION).overall).toBe(100);
    expect(scoreSession(i, { ...POLICY_BASIC_RECOGNITION, unassessablePolicy: 'zero' }).overall).toBe(50);
    i.scenario.contacts[0].occlusionWindows = [{ start: 5, end: 21 }];
    expect(scoreSession(i, POLICY_BASIC_RECOGNITION).unassessableContacts).toEqual(['c1', 'hidden']);
  });
  it('handles fractional appearance windows', () => {
    const i = input(); i.scenario.contacts[0].spawnTime = 5.1; i.scenario.contacts[0].despawnTime = 5.2;
    expect(scoreSession(i, POLICY_BASIC_RECOGNITION).contacts[0].assessable).toBe(true);
  });
  it('evaluates evidence and confidence conditions instead of always passing', () => {
    const def = input().scenario.contacts[0];
    const policy: ScoringPolicy = { ...POLICY_BASIC_RECOGNITION, decisionTrees: [{ id: 'evidence', description: 'Needs evidence', kind: 'evidencePresent' as const, expected: ['rotorSilhouette'], passScore: 0.7, failScore: 0 }] };
    expect(evaluateProcedural(def, 'requestVerification', 'smallMultirotor', policy).score).toBe(0);
    expect(evaluateProcedural(def, 'requestVerification', 'smallMultirotor', policy, ['rotorSilhouette']).score).toBe(0.7);
    policy.decisionTrees = [{ ...policy.decisionTrees[0], kind: 'confidenceReasonable', expected: ['low'] }];
    expect(evaluateProcedural(def, 'requestVerification', 'unknown', policy, [], 'high').score).toBe(0);
    expect(evaluateProcedural(def, 'requestVerification', 'unknown', policy, [], 'low').score).toBe(0.7);
  });
  it('rejects invalid weights', () => {
    expect(() => parseScoringPolicy({ ...POLICY_BASIC_RECOGNITION, weights: { detection: 1, classification: 1, procedural: 1, evidence: 1 } })).toThrow();
  });
});

