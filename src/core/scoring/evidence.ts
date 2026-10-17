/** PRAGYA Module 2 — evidence-based evaluation. */

import type { ContactDefinition, EvidenceItem, ScenarioDefinition } from '../types';
import type { EvidenceState } from './results';

const ALL_EVIDENCE: EvidenceItem[] = [
  'rotorSilhouette', 'wingShape', 'flightPattern', 'sizeEstimate',
  'lightSignature', 'soundSignature', 'thermalSignature', 'absenceOfFeatures',
];

export function evaluateEvidence(
  def: ContactDefinition,
  selected: EvidenceItem[],
  scenario: ScenarioDefinition,
): { score: number; states: Record<EvidenceItem, EvidenceState>; missing: EvidenceItem[]; contradictory: EvidenceItem[] } {
  const required = def.assessment.requiredEvidence;
  const degraded = scenario.sensor.channels.some((c) => c.actualCondition !== 'normal');
  const states = {} as Record<EvidenceItem, EvidenceState>;
  for (const item of ALL_EVIDENCE) {
    if (selected.includes(item) && required.includes(item)) states[item] = 'observed';
    else if (selected.includes(item)) states[item] = 'inferred';
    else if (required.includes(item)) states[item] = degraded ? 'notVerifiable' : 'unavailable';
    else states[item] = 'unavailable';
  }
  const contradictory: EvidenceItem[] = [];
  if (selected.includes('absenceOfFeatures') && selected.some((e) => e !== 'absenceOfFeatures')) {
    contradictory.push('absenceOfFeatures');
    states['absenceOfFeatures'] = 'contradictory';
  }
  const missing = required.filter((e) => !selected.includes(e));
  const base = required.length === 0 ? 1 : (required.length - missing.length) / required.length;
  return { score: Math.max(0, base - (contradictory.length > 0 ? 0.25 : 0)), states, missing, contradictory };
}
