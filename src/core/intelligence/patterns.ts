/**
 * PRAGYA Module 2 — blind-spot pattern types + helpers.
 * Observable patterns only. Conservative labels.
 */

import type { AssessmentResult } from '../scoring/results';

export type PatternId =
  | 'overconfidence'
  | 'underconfidence'
  | 'prematureConclusion'
  | 'evidenceNeglect'
  | 'uncertaintyAvoidance'
  | 'delayedRecognition'
  | 'informationInconsistency';

export type PatternStrength = 'insufficientEvidence' | 'possiblePattern' | 'repeatedPattern';

export interface BlindSpotPattern {
  patternId: PatternId;
  patternName: string;
  strength: PatternStrength;
  relevantObservations: number;
  sessionIds: string[];
  reliability: number;
  evidence: string[];
  explanation: string;
  recommendedObjective: string;
}

export const MIN_OBSERVATIONS = 3;

export interface FlatContact {
  sessionId: string;
  allowsUnknown: boolean;
  context: string | undefined;
  detection: number;
  contactId: string;
  outcome: string;
  confidence: string | null;
  evidence: number;
  missing: string[];
  acknowledged: boolean;
  delay: number | null;
  submitted: string | null;
}

export function flatten(results: AssessmentResult[]): FlatContact[] {
  const seen = new Set<string>();
  return results.flatMap((r) =>
    r.contacts.filter((c) => {
      const key = JSON.stringify([r.traineeId, r.sessionId, c.contactId]);
      if (!c.assessable || seen.has(key)) return false;
      seen.add(key); return true;
    }).map((c) => ({
      sessionId: r.sessionId,
      allowsUnknown: c.allowsUnknown === true,
      context: c.observationContext,
      detection: c.detection,
      contactId: c.contactId,
      outcome: c.classificationOutcome,
      confidence: c.confidence,
      evidence: c.evidence,
      missing: c.missingEvidence.filter((e) => c.evidenceStates[e] !== 'notVerifiable'),
      acknowledged: c.acknowledged,
      delay: c.detectionDelaySeconds,
      submitted: c.submittedClassification,
    })),
  );
}

export function strengthOf(n: number): PatternStrength {
  if (n < MIN_OBSERVATIONS) return 'insufficientEvidence';
  return n >= 2 * MIN_OBSERVATIONS ? 'repeatedPattern' : 'possiblePattern';
}

export function ratio(a: number, b: number): number {
  if (b === 0) return 0;
  return Math.round((a / b) * 100) / 100;
}


