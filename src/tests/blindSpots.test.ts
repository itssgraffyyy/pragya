import { describe, expect, it } from 'vitest';
import { detectBlindSpots } from '../core/intelligence/blindSpots';
import type { AssessmentResult, ContactScore } from '../core/scoring/results';

function makeResult(
  sessionId: string,
  contactId: string,
  outcome: ContactScore['classificationOutcome'],
  confidence: ContactScore['confidence'],
  evidence: number,
  missing: ContactScore['missingEvidence'] = [],
  acknowledged: boolean = true,
  delay: number | null = null,
  submitted: ContactScore['submittedClassification'] = null,
): AssessmentResult {
  return {
    sessionId,
    traineeId: 'trainee-1',
    scenarioId: 'scenario-1',
    scenarioVersion: '1.0.0',
    policyId: 'policy-1',
    policyVersion: '1.0.0',
    overall: 0,
    categories: {
      detection: 0,
      classification: 0,
      procedural: 0,
      evidence: 0,
      confidenceCalibration: 0,
    },
    contacts: [
      {
        contactId,
        assessable: true,
        unassessableReason: null,
        detection: 0,
        detectionDelaySeconds: delay,
        acknowledged,
        classification: 0,
        classificationOutcome: outcome,
        submittedClassification: submitted,
        procedural: 0,
        proceduralOutcome: 'missing',
        appliedRuleIds: [],
        evidence,
        evidenceStates: {} as ContactScore['evidenceStates'],
        supportingEvidence: [],
        missingEvidence: missing,
        contradictoryEvidence: [],
        confidence,
        calibration: 0,
      },
    ],
    missedContacts: [],
    unassessableContacts: [],
    explanations: [],
    calculatedAt: new Date().toISOString(),
  };
}

describe('detectBlindSpots', () => {
  it('flags overconfidence when there are high-confidence incorrect classifications', () => {
    const results = [
      makeResult('s1', 'c1', 'incorrect', 'high', 0.2),
      makeResult('s1', 'c2', 'incorrect', 'high', 0.1),
      makeResult('s1', 'c3', 'incorrect', 'high', 0.3),
    ];
    const findings = detectBlindSpots(results);
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          patternId: 'overconfidence',
          strength: 'possiblePattern',
          relevantObservations: 3,
        }),
      ]),
    );
  });

  it('does not flag overconfidence when there is only 1 high-confidence error', () => {
    const results = [makeResult('s1', 'c1', 'incorrect', 'high', 0.2)];
    const findings = detectBlindSpots(results);
    expect(findings.some((f) => f.patternId === 'overconfidence')).toBe(false);
  });

  it('flags underconfidence when there are low-confidence correct classifications', () => {
    const results = [
      makeResult('s1', 'c1', 'correct', 'low', 0.9),
      makeResult('s1', 'c2', 'correct', 'low', 0.8),
      makeResult('s1', 'c3', 'correct', 'low', 0.85),
    ];
    const findings = detectBlindSpots(results);
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          patternId: 'underconfidence',
          strength: 'possiblePattern',
          relevantObservations: 3,
        }),
      ]),
    );
  });

  it('flags premature conclusion when evidence is missing', () => {
    const results = [
      makeResult('s1', 'c1', 'correct', 'medium', 0.7, ['flightPattern']),
      makeResult('s1', 'c2', 'correct', 'medium', 0.6, ['flightPattern']),
      makeResult('s1', 'c3', 'correct', 'medium', 0.5, ['flightPattern']),
    ];
    const findings = detectBlindSpots(results);
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          patternId: 'prematureConclusion',
          relevantObservations: 3,
        }),
      ]),
    );
  });
});

describe('detectBlindSpots thresholds', () => {
  it('uses 3 observations = possiblePattern, 6 observations = repeatedPattern', () => {
    const few = [
      makeResult('s1', 'c1', 'incorrect', 'high', 0.2),
      makeResult('s1', 'c2', 'incorrect', 'high', 0.1),
      makeResult('s1', 'c3', 'incorrect', 'high', 0.3),
    ];
    const many = [
      ...few,
      ...few.map((r, i) => ({ ...r, sessionId: 'extra-' + i })),
    ];

    const fewFindings = detectBlindSpots(few);
    const manyFindings = detectBlindSpots(many);

    const fewOverconfidence = fewFindings.find((f) => f.patternId === 'overconfidence');
    const manyOverconfidence = manyFindings.find((f) => f.patternId === 'overconfidence');

    expect(fewOverconfidence?.strength).toBe('possiblePattern');
    expect(manyOverconfidence?.strength).toBe('repeatedPattern');
  });
});


