/**
 * PRAGYA Module 2 - rules-based blind-spot detector.
 * Observable patterns only. Never diagnoses traits.
 * Labels are conservative: insufficientEvidence / possiblePattern / repeatedPattern.
 */

import { flatten, ratio, type FlatContact } from './patterns';
import type { AssessmentResult } from '../scoring/results';

export interface BlindSpotPattern {
  patternId: string;
  patternName: string;
  strength: 'insufficientEvidence' | 'possiblePattern' | 'repeatedPattern';
  relevantObservations: number;
  supportingObservations?: number;
  observations?: { sessionId: string; contactId: string }[];
  sessionIds: string[];
  reliability: number;
  evidence: string[];
  explanation: string;
  recommendedObjective: string;
}

export function detectBlindSpots(results: AssessmentResult[], options: { minimumObservations?: number } = {}): BlindSpotPattern[] {
  if (new Set(results.map((r) => r.traineeId)).size > 1) throw new Error('Blind-spot analysis requires a single trainee.');
  const c = flatten(results);
  const out: BlindSpotPattern[] = [];
  const push = (p: BlindSpotPattern) => out.push(p);

  // 1. Overconfidence: high-confidence incorrect classifications.
  {
    const hits = c.filter((x) => x.outcome === 'incorrect' && x.confidence === 'high');
    push({
      patternId: 'overconfidence',
      patternName: 'Overconfidence',
      strength: strengthOf(hits.length),
      relevantObservations: hits.length,
      supportingObservations: hits.length,
      observations: hits.map((h) => ({ sessionId: h.sessionId, contactId: h.contactId })),
      sessionIds: [...new Set(hits.map((h) => h.sessionId))],
      reliability: ratio(hits.length, c.length),
      evidence: hits.slice(0, 5).map((h) => `${h.contactId} (${h.sessionId}): high-confidence incorrect`),
      explanation: hits.length >= 3
        ? 'Repeated high-confidence incorrect classifications.'
        : 'Too few high-confidence errors to conclude a pattern.',
      recommendedObjective: 'classification-calibration',
    });
  }

  // 2. Underconfidence: low-confidence correct classifications.
  {
    const hits = c.filter((x) => x.outcome === 'correct' && x.confidence === 'low' && x.evidence >= 0.75 && x.missing.length === 0);
    push({
      patternId: 'underconfidence',
      patternName: 'Underconfidence',
      strength: strengthOf(hits.length),
      relevantObservations: hits.length,
      supportingObservations: hits.length,
      observations: hits.map((h) => ({ sessionId: h.sessionId, contactId: h.contactId })),
      sessionIds: [...new Set(hits.map((h) => h.sessionId))],
      reliability: ratio(hits.length, c.length),
      evidence: hits.slice(0, 5).map((h) => `${h.contactId} (${h.sessionId}): low-confidence correct`),
      explanation: hits.length >= 3
        ? 'Repeated low-confidence correct classifications.'
        : 'Insufficient low-confidence correct cases.',
      recommendedObjective: 'classification-calibration',
    });
  }

  // 3. Premature conclusion: submitted with missing required evidence.
  {
    const hits = c.filter((x) => x.missing.length > 0 && x.outcome !== 'missing');
    push({
      patternId: 'prematureConclusion',
      patternName: 'Premature Conclusion',
      strength: strengthOf(hits.length),
      relevantObservations: hits.length,
      supportingObservations: hits.length,
      observations: hits.map((h) => ({ sessionId: h.sessionId, contactId: h.contactId })),
      sessionIds: [...new Set(hits.map((h) => h.sessionId))],
      reliability: ratio(hits.length, c.length),
      evidence: hits.slice(0, 5).map((h) => `${h.contactId}: missing ${h.missing.join(', ')}`),
      explanation: hits.length >= 3
        ? 'Repeated premature submissions without important available evidence.'
        : 'Too few premature submissions to conclude a pattern.',
      recommendedObjective: 'evidence-selection',
    });
  }



  // 4. Evidence neglect: low evidence scores.
  {
    const hits = c.filter((x) => x.evidence < 0.5);
    push({
      patternId: 'evidenceNeglect',
      patternName: 'Evidence Neglect',
      strength: strengthOf(hits.length),
      relevantObservations: hits.length,
      supportingObservations: hits.length,
      observations: hits.map((h) => ({ sessionId: h.sessionId, contactId: h.contactId })),
      sessionIds: [...new Set(hits.map((h) => h.sessionId))],
      reliability: ratio(hits.length, c.length),
      evidence: hits.slice(0, 5).map((h) => `${h.contactId}: evidence ${x2s(h.evidence)}`),
      explanation: hits.length >= 3
        ? 'Repeatedly overlooking relevant observations.'
        : 'Insufficient low-evidence cases.',
      recommendedObjective: 'evidence-selection',
    });
  }

  // 5. Uncertainty avoidance: confident errors where a justified Unknown existed.
  {
    const unknowns = c.filter((x) => x.allowsUnknown && x.outcome === 'acceptableUnknown').length;
    const errorCases = c.filter((x) => x.allowsUnknown && x.confidence === 'high' && x.outcome === 'incorrect');
    const errors = errorCases.length;
    const relevant = unknowns + errors;
    const strength = relevant < 3 ? 'insufficientEvidence' : errors > unknowns ? 'possiblePattern' : 'insufficientEvidence';
    push({
      patternId: 'uncertaintyAvoidance',
      patternName: 'Uncertainty Avoidance',
      strength,
      relevantObservations: relevant,
      supportingObservations: errors,
      observations: errorCases.map((h) => ({ sessionId: h.sessionId, contactId: h.contactId })),
      sessionIds: knownSessions(c),
      reliability: relevant === 0 ? 0 : ratio(errors, relevant),
      evidence: [`${errors} confident errors vs ${unknowns} justified unknowns`],
      explanation: errors > unknowns && relevant >= 3
        ? 'Guessing where a justified Unknown was available.'
        : 'No clear avoidance of justified uncertainty.',
      recommendedObjective: 'unknown-classification',
    });
  }

  // 6. Delayed recognition: missed or late acknowledgments.
  {
    const hits = c.filter((x) => !x.acknowledged || x.detection < 1);
    push({
      patternId: 'delayedRecognition',
      patternName: 'Delayed Recognition',
      strength: strengthOf(hits.length),
      relevantObservations: hits.length,
      supportingObservations: hits.length,
      observations: hits.map((h) => ({ sessionId: h.sessionId, contactId: h.contactId })),
      sessionIds: [...new Set(hits.map((h) => h.sessionId))],
      reliability: ratio(hits.length, c.length),
      evidence: hits.slice(0, 5).map((h) => `${h.contactId}: delay ${x2s(h.delay)}s`),
      explanation: hits.length >= 3
        ? 'Repeated missed or late acknowledgments.'
        : 'Too few late/missed detections.',
      recommendedObjective: 'basic-recognition',
    });
  }

  // 7. Information inconsistency: same submitted label with contradictory outcomes.
  {
    const byLabel = new Map<string, { correct: number; total: number; observations: FlatContact[]; labels: Set<string> }>();
    for (const x of c) {
      if (!x.submitted || !x.context || !['correct','incorrect'].includes(x.outcome)) continue;
      const key=JSON.stringify([x.context,[...x.supportingEvidence].sort()]);
      const e = byLabel.get(key) ?? { correct: 0, total: 0, observations: [], labels: new Set<string>() };
      e.total += 1;
      e.observations.push(x); e.labels.add(x.submitted);
      if (x.outcome === 'correct') e.correct += 1;
      byLabel.set(key, e);
    }
    const mixed = [...byLabel.entries()].filter(([, e]) => e.total >= 3 && e.labels.size > 1 && e.correct > 0 && e.correct < e.total);
    push({
      patternId: 'informationInconsistency',
      patternName: 'Information Inconsistency',
      strength: mixed.length > 0 ? 'possiblePattern' : 'insufficientEvidence',
      relevantObservations: mixed.reduce((s, [, e]) => s + e.total, 0),
      observations: mixed.flatMap(([, e]) => e.observations.map((h) => ({ sessionId: h.sessionId, contactId: h.contactId }))),
      sessionIds: knownSessions(c),
      reliability: mixed.length > 0 ? 0.5 : 0,
      evidence: mixed.slice(0, 5).map(([, e]) => `Labels ${[...e.labels].join(", ")}: ${e.correct}/${e.total} correct with matching recorded context/evidence`),
      explanation: mixed.length > 0
        ? 'Classifications differ in matching recorded observation contexts; compare the supporting evidence.'
        : 'No contradictory use of similar observations.',
      recommendedObjective: 'category-discrimination',
    });
  }

  return out.filter((p) => p.relevantObservations >= (options.minimumObservations ?? 3));
}

function strengthOf(n: number): 'insufficientEvidence' | 'possiblePattern' | 'repeatedPattern' {
  if (n < 3) return 'insufficientEvidence';
  return n >= 6 ? 'repeatedPattern' : 'possiblePattern';
}

function knownSessions(c: FlatContact[]): string[] {
  return [...new Set(c.map((x) => x.sessionId))];
}

function x2s(v: number | null): string {
  if (v === null || v === undefined) return 'n/a';
  return String(v);
}


