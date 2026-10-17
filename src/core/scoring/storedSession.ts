import type { StoredSession } from '../persistence/storage';
import type { ScoringInput, AssessmentResult } from './results';
import type { ScoringPolicy } from './policy';
import { scoreSession } from './scoreSession';
import { POLICY_BASIC_RECOGNITION } from './samplePolicies';

/** Reconstruct committed decisions from the event log, never from unfinished form fields. */
export function scoringInputFor(session: StoredSession): ScoringInput {
  const { summary, events: log } = session;
  const events = log.events.filter((e) => e.sessionId === summary.sessionId && e.simTimestamp <= summary.durationSimSeconds);
  return {
    sessionId: summary.sessionId, traineeId: summary.traineeId, scenario: summary.scenarioSnapshot,
    endedAtSimTime: summary.durationSimSeconds, events,
    assessments: summary.scenarioSnapshot.contacts.map((def) => {
      const submitted = events.find((e) => e.contactId === def.id && e.type === 'assessmentSubmitted');
      const acknowledged = events.some((e) => e.contactId === def.id && e.type === 'contactAcknowledged');
      return {
        contactId: def.id, acknowledged, detectionState: acknowledged ? 'acknowledged' : 'notDetected',
        classification: submitted?.classification ?? null, confidence: submitted?.confidence ?? null,
        evidence: submitted?.evidence ?? [], proceduralResponse: submitted?.proceduralResponse ?? null,
        submitted: !!submitted, submittedAt: submitted?.simTimestamp ?? null,
      };
    }),
  };
}

export function assessStoredSession(session: StoredSession, policy: ScoringPolicy = POLICY_BASIC_RECOGNITION): AssessmentResult {
  const result = scoreSession(scoringInputFor(session), policy);
  return { ...result, calculatedAt: session.summary.endedAt };
}
