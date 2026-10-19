import { scoreGroupReports } from './groupReporting';
/** PRAGYA Module 2 — session scorer (aggregates per-contact scores). */

import { parseScoringPolicy, type ScoringPolicy } from './policy';
import type { AssessmentResult, ContactScore, ScoringInput } from './results';
import { firstEventTime, wasObservable, emptyScore, round2, round3 } from './scoreUtils';
import { evaluateEvidence } from './evidence';
import { evaluateProcedural } from './procedural';
import { buildExplanations, calibrationFor } from './explanations';

export function scoreSession(input: ScoringInput, policy: ScoringPolicy): AssessmentResult {
  policy = parseScoringPolicy(policy);
  const events = input.events.filter((e) => e.sessionId === input.sessionId && e.simTimestamp <= input.endedAtSimTime);
  const contacts = input.scenario.contacts.map((def) => {
    const a = input.assessments.find((x) => x.contactId === def.id && x.submitted && x.submittedAt !== null && x.submittedAt <= input.endedAtSimTime);
    if (!wasObservable(def, input.endedAtSimTime)) {
      return emptyScore(def.id, 'Contact never became observable before session end.');
    }
    const ackT = firstEventTime(events.filter((e) => e.simTimestamp >= def.spawnTime), def.id, 'contactAcknowledged');
    const acknowledged = a?.acknowledged === true || ackT !== null;
    const delay = ackT !== null ? Math.max(0, round2(ackT - def.spawnTime)) : null;

    let detection = 0;
    if (acknowledged && delay !== null) {
      const { promptSeconds, lateSeconds } = policy.detectionThresholds;
      if (delay <= promptSeconds) detection = 1;
      else if (lateSeconds > promptSeconds && delay < lateSeconds) {
        detection = 1 - (delay - promptSeconds) / (lateSeconds - promptSeconds);
      }
    }

    const submitted = a?.classification ?? null;
    const acceptable = def.assessment.acceptableClassifications;
    let classification = policy.classificationScores.missing;
    let outcome: ContactScore['classificationOutcome'] = 'missing';
    if (submitted !== null) {
      if (acceptable.includes(submitted)) {
        if (submitted === 'unknown') {
          classification = policy.classificationScores.acceptableUnknown;
          outcome = 'acceptableUnknown';
        } else {
          classification = policy.classificationScores.correct;
          outcome = 'correct';
        }
      } else {
        classification = policy.classificationScores.incorrect;
        outcome = 'incorrect';
      }
    }

    const proc = evaluateProcedural(def, a?.proceduralResponse ?? null, submitted, policy, a?.evidence ?? [], a?.confidence ?? null);
    const ev = evaluateEvidence(def, a?.evidence ?? [], input.scenario);
    const calibration = calibrationFor(outcome, a?.confidence ?? null);

    return {
      contactId: def.id,
      assessable: true,
      allowsUnknown: acceptable.includes('unknown'),
      observationContext: JSON.stringify([def.category, def.assessment.requiredEvidence, input.scenario.visibility, input.scenario.sensor]),
      unassessableReason: null,
      detection: round3(detection),
      detectionDelaySeconds: delay,
      acknowledged,
      classification: round3(classification),
      classificationOutcome: outcome,
      submittedClassification: submitted,
      procedural: round3(proc.score),
      proceduralOutcome: proc.outcome,
      appliedRuleIds: proc.ruleIds,
      evidence: round3(ev.score),
      evidenceStates: ev.states,
      supportingEvidence: (a?.evidence ?? []).filter((e) => def.assessment.requiredEvidence.includes(e)),
      missingEvidence: ev.missing,
      contradictoryEvidence: ev.contradictory,
      confidence: a?.confidence ?? null,
      calibration: round3(calibration),
    } satisfies ContactScore;
  });

  const assessable = contacts.filter((c) => c.assessable || policy.unassessablePolicy === 'zero');
  const avg = (pick: (c: ContactScore) => number): number =>
    assessable.length === 0 ? 0 : assessable.reduce((s, c) => s + pick(c), 0) / assessable.length;

  const detection = avg((c) => c.detection) * 100;
  const classification = avg((c) => c.classification) * 100;
  const procedural = avg((c) => c.procedural) * 100;
  const evidence = avg((c) => c.evidence) * 100;
  const calibration = avg((c) => c.calibration);

  return {
    ...(input.scenario.groupTraining?{groupAwareness:{schemaVersion:1 as const,groups:scoreGroupReports(input,policy)}}:{}),
    sessionId: input.sessionId,
    traineeId: input.traineeId,
    scenarioId: input.scenario.id,
    scenarioVersion: input.scenario.version,
    policyId: policy.policyId,
    policyVersion: policy.policyVersion,
    overall: round2(
      policy.weights.detection * detection +
        policy.weights.classification * classification +
        policy.weights.procedural * procedural +
        policy.weights.evidence * evidence,
    ),
    categories: {
      detection: round2(detection),
      classification: round2(classification),
      procedural: round2(procedural),
      evidence: round2(evidence),
      confidenceCalibration: round2(calibration),
    },
    contacts,
    missedContacts: contacts.filter((c) => c.assessable && !c.acknowledged).map((c) => c.contactId),
    unassessableContacts: contacts.filter((c) => !c.assessable).map((c) => c.contactId),
    explanations: contacts.filter((c) => c.assessable).flatMap((c) =>
      buildExplanations(c, input.scenario.contacts.find((d) => d.id === c.contactId)!, policy),
    ),
    calculatedAt: new Date().toISOString(),
  };
}


