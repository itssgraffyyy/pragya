/** PRAGYA Module 2 — calibration + rule-derived explanations. */

import type { ConfidenceLevel, ContactDefinition } from '../types';
import type { ScoringPolicy } from './policy';
import type { AssessmentExplanation, ContactScore } from './results';

const CONF_NUM: Record<ConfidenceLevel, number> = { low: 0.25, medium: 0.6, high: 0.9 };

/** Informational calibration: correct+high or wrong+low score well. */
export function calibrationFor(
  outcome: ContactScore['classificationOutcome'],
  confidence: ConfidenceLevel | null,
): number {
  if (!confidence) return 0;
  const c = CONF_NUM[confidence];
  switch (outcome) {
    case 'correct': return c >= 0.9 ? 1 : c >= 0.6 ? 0.7 : 0.4;
    case 'acceptableUnknown': return c <= 0.25 ? 0.9 : c <= 0.6 ? 0.7 : 0.3;
    case 'incorrect': return c >= 0.9 ? 0 : c >= 0.6 ? 0.2 : 0.5;
    case 'missing': return 0;
  }
}

export function buildExplanations(
  score: ContactScore,
  def: ContactDefinition,
  policy: ScoringPolicy,
): AssessmentExplanation[] {
  const base = `${policy.policyId}@${policy.policyVersion}`;
  const explanations: AssessmentExplanation[] = [
    {
      contactId: score.contactId,
      category: 'detection',
      whatHappened: score.acknowledged
        ? `Acknowledged ${score.detectionDelaySeconds ?? '?'}s after appearance (sim-time).`
        : 'Never acknowledged during the session.',
      availableInfo: `Spawned at T+${def.spawnTime}s; window ended at scenario end.`,
      ruleRef: `${base}:detection(prompt=${policy.detectionThresholds.promptSeconds}s, late=${policy.detectionThresholds.lateSeconds}s)`,
      why: score.detection >= 1 ? 'Prompt acknowledgment: full credit.'
        : score.detection > 0 ? 'Late acknowledgment: partial credit (linear decay).'
        : 'No timely acknowledgment: no credit.',
      revisitObjective: 'basic-recognition',
    },
    {
      contactId: score.contactId,
      category: 'classification',
      whatHappened: score.submittedClassification !== null
        ? `Submitted "${score.submittedClassification}".` : 'No classification submitted.',
      availableInfo: `Decision-time category: "${def.category}". Truth ("${def.groundTruthLabel}") hidden until review.`,
      ruleRef: `${base}:classification(${score.classificationOutcome})`,
      why: score.classificationOutcome === 'correct' ? 'Matches the scenario answer key.'
        : score.classificationOutcome === 'acceptableUnknown' ? 'Justifiable uncertainty: partial credit.'
        : score.classificationOutcome === 'incorrect' ? 'Does not match the answer key.'
        : 'Nothing submitted.',
      revisitObjective: 'category-discrimination',
    },
    {
      contactId: score.contactId,
      category: 'procedural',
      whatHappened: score.proceduralOutcome === 'missing'
        ? 'No procedural response submitted.'
        : `Evaluated via [${score.appliedRuleIds.join(', ')}].`,
      availableInfo: `Instructor-approved response: "${def.assessment.correctResponse}".`,
      ruleRef: `${base}:${score.appliedRuleIds[0] ?? 'procedural-missing'}`,
      why: score.proceduralOutcome === 'correct' ? 'Matches the approved training procedure.'
        : score.proceduralOutcome === 'acceptable' ? 'Partially satisfies the procedure.'
        : score.proceduralOutcome === 'missing' ? 'No response submitted.'
        : 'Does not follow the approved procedure.',
      revisitObjective: 'procedural-response',
    },
    {
      contactId: score.contactId,
      category: 'evidence',
      whatHappened: score.supportingEvidence.length > 0
        ? `Supporting: ${score.supportingEvidence.join(', ')}.` : 'No supporting observations.',
      availableInfo: `Required: ${def.assessment.requiredEvidence.join(', ') || '(none)'}.`
        + (score.missingEvidence.length > 0 ? ` Missing: ${score.missingEvidence.join(', ')}.` : '')
        + (score.contradictoryEvidence.length > 0 ? ` Contradictory: ${score.contradictoryEvidence.join(', ')}.` : ''),
      ruleRef: `${base}:evidence(required=${def.assessment.requiredEvidence.join('+') || 'none'})`,
      why: score.evidence >= 1 ? 'All required evidence selected.'
        : score.evidence > 0 ? 'Some required evidence missing or contradictory.'
        : 'Required evidence not selected.',
      revisitObjective: 'evidence-selection',
    },
    {
      contactId: score.contactId,
      category: 'confidence',
      whatHappened: score.confidence !== null
        ? `Confidence "${score.confidence}" with ${score.classificationOutcome}.` : 'No confidence recorded.',
      availableInfo: 'Calibration is a separate learning metric; excluded from overall.',
      ruleRef: `${base}:calibration`,
      why: score.calibration >= 0.9 ? 'Confidence matches the outcome well.'
        : score.calibration >= 0.5 ? 'Confidence roughly aligned.'
        : 'Confidence poorly aligned — review uncertainty handling.',
      revisitObjective: 'unknown-classification',
    },
  ];
  return explanations.map((e) => ({ ...e, why: policy.explanationTemplates?.[e.category] ?? e.why }));
}

