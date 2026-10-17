/**
 * PRAGYA Module 2 — scoring engine: aggregates session scores and runs blind-spot analysis.
 */

import type { AssessmentResult, ScoringInput } from './results';
import { scoreSession } from './scoreSession';
import { detectBlindSpots, type BlindSpotPattern } from '../intelligence/blindSpots';
import type { ScoringPolicy } from './policy';

/**
 * Run scoring across multiple sessions and surface blind-spot findings.
 *
 * Reuses `scoreSession` for per-session scoring, then flattens all contacts
 * and feeds them into the rules-based blind-spot detector.
 */
export function scoreAllSessions(inputs: ScoringInput[], policy: ScoringPolicy): {
  results: AssessmentResult[];
  blindSpotFindings: BlindSpotPattern[];
} {
  const results = inputs.map((input) => scoreSession(input, policy));
  const findings = detectBlindSpots(results);
  return { results, blindSpotFindings: findings };
}

/** Merge findings into a single result object for presentation/serialization. */
export function mergeBlindSpotFindings(
  results: AssessmentResult[],
  findings: BlindSpotPattern[],
): AssessmentResult & { blindSpotFindings: BlindSpotPattern[] } {
  if (results.length !== 1) throw new Error('Merge requires exactly one assessment result.');
  const merged = results.map((r) => ({ ...r, explanations: [...r.explanations] }));
  return { ...merged[0], blindSpotFindings: findings };
}

