/** PRAGYA Module 2 — shared scoring utilities. */

import type { SimulationEvent } from '../types';
import { visibilityAt } from '../contacts/lifecycle';
import type { ContactDefinition } from '../types';
import type { ContactScore } from './results';

export function wasObservable(def: ContactDefinition, endT: number): boolean {
  if (!def.observable || endT < def.spawnTime) return false;
  const candidates = [def.spawnTime, ...(def.occlusionWindows ?? []).map((w) => w.end)];
  return candidates.some((t) => t <= endT && t >= def.spawnTime && visibilityAt(def, t) === 'visible');
}

export function firstEventTime(
  events: SimulationEvent[],
  contactId: string,
  type: SimulationEvent['type'],
): number | null {
  const found = events
    .filter((e) => e.contactId === contactId && e.type === type)
    .sort((a, b) => a.simTimestamp - b.simTimestamp)[0];
  return found ? found.simTimestamp : null;
}

export function emptyScore(contactId: string, reason: string): ContactScore {
  return {
    contactId,
    assessable: false,
    unassessableReason: reason,
    detection: 0,
    detectionDelaySeconds: null,
    acknowledged: false,
    classification: 0,
    classificationOutcome: 'missing',
    submittedClassification: null,
    procedural: 0,
    proceduralOutcome: 'missing',
    appliedRuleIds: [],
    evidence: 0,
    evidenceStates: {} as ContactScore['evidenceStates'],
    supportingEvidence: [],
    missingEvidence: [],
    contradictoryEvidence: [],
    confidence: null,
    calibration: 0,
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

