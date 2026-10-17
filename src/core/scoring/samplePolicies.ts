/**
 * PRAGYA Module 2 — sample scoring policies (validated at import time).
 * 1. Basic contact recognition.
 * 2. Uncertain / degraded observations.
 * 3. Multiple-contact evidence and reporting.
 */

import type { ScoringPolicy } from './policy';
import { DEFAULT_WEIGHTS, SCORING_POLICY_VERSION, parseScoringPolicy } from './policy';

function base(overrides: Partial<ScoringPolicy> & Pick<ScoringPolicy, 'policyId' | 'title' | 'description'>): ScoringPolicy {
  return parseScoringPolicy({
    schemaVersion: SCORING_POLICY_VERSION,
    policyVersion: '1.0.0',
    weights: { ...DEFAULT_WEIGHTS },
    detectionThresholds: { promptSeconds: 15, lateSeconds: 60 },
    classificationScores: { correct: 1, acceptableUnknown: 0.6, incorrect: 0, missing: 0 },
    decisionTrees: [
      {
        id: 'procedural-lenient',
        description: 'Any instructor-approved response earns partial credit; exact match earns full.',
        kind: 'proceduralMatch',
        passScore: 0.5,
        failScore: 0,
      },
    ],
    unassessablePolicy: 'exclude',
    ...overrides,
  });
}

export const POLICY_BASIC_RECOGNITION: ScoringPolicy = base({
  policyId: 'basic-recognition',
  title: 'Basic Contact Recognition',
  description: 'Illustrative training weights for single-contact recognition exercises.',
  decisionTrees: [
    {
      id: 'basic-procedural',
      description: 'Exact approved response earns full credit; verification requests earn partial.',
      kind: 'proceduralMatch',
      passScore: 1,
      failScore: 0,
    },
    {
          id: 'basic-procedural-fallback',
          description: 'Requesting verification is acceptable but not ideal for a clear contact.',
          kind: 'proceduralMatch',
          expected: ['requestVerification', 'continueObservation'],
          passScore: 0.5,
          failScore: 0,
    },
  ],
});

export const POLICY_UNCERTAIN_OBSERVATION: ScoringPolicy = base({
  policyId: 'uncertain-observation',
  title: 'Uncertain / Degraded Observations',
  description: 'Rewards justified uncertainty under degraded conditions; penalises overconfident errors.',
  detectionThresholds: { promptSeconds: 20, lateSeconds: 90 },
  classificationScores: { correct: 1, acceptableUnknown: 0.85, incorrect: 0, missing: 0 },
  decisionTrees: [
    {
      id: 'degraded-procedural',
      description: 'Requesting verification or continued observation is the approved behaviour.',
      kind: 'proceduralMatch',
      expected: ['requestVerification', 'continueObservation'],
      passScore: 1,
      failScore: 0.2,
    },
  ],
});

export const POLICY_MULTI_CONTACT: ScoringPolicy = base({
  policyId: 'multi-contact-reporting',
  title: 'Multiple-Contact Evidence and Reporting',
  description: 'Per-contact scoring aggregated across simultaneous contacts; evidence quality weighted equally.',
  decisionTrees: [
    {
      id: 'multi-procedural',
      description: 'Each contact needs its own approved response.',
      kind: 'proceduralMatch',
      passScore: 1,
      failScore: 0,
      children: [
        {
          id: 'multi-classification-gate',
          description: 'Procedural credit requires a submitted classification.',
          kind: 'classificationMatch',
          expected: ['smallMultirotor', 'largeMultirotor', 'fixedWing', 'birdLike', 'civilianLike', 'unidentified', 'decoy', 'unknown'],
          passScore: 1,
          failScore: 0,
        },
      ],
    },
  ],
});

export const SAMPLE_POLICIES: ScoringPolicy[] = [
  POLICY_BASIC_RECOGNITION,
  POLICY_UNCERTAIN_OBSERVATION,
  POLICY_MULTI_CONTACT,
];

export function getPolicy(id: string): ScoringPolicy | undefined {
  return SAMPLE_POLICIES.find((p) => p.policyId === id);
}


