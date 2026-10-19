import type { ScoringPolicy } from '../scoring/policy';
import type { StoredSession } from '../persistence/storage';
import { assessStoredSession } from '../scoring/storedSession';
import { defaultPolicyFor } from '../scoring/defaultPolicy';
/**
 * Session summary builder.
 *
 * Produces a SessionSummaryRecord from a finished engine. Correctness here
 * is a minimal local indicator (classification in acceptable set) so the
 * trainee gets basic feedback; full scoring (Module 2) consumes the event
 * log independently.
 */

import type { SessionSummaryRecord } from '../types';
import { EVENT_LOG_VERSION } from '../types';
import type { SimulationEngine } from '../sim/engine';

export function buildSessionSummary(engine: SimulationEngine): SessionSummaryRecord {
  const truth = new Map(engine.groundTruth().map((t) => [t.contactId, t]));
  const assessments = engine.allAssessments().map((a) => {
    const t = truth.get(a.contactId);
    const correct =
      a.classification && t
        ? t.assessment.acceptableClassifications.includes(a.classification)
        : null;
    return {
      contactId: a.contactId,
      submittedClassification: a.classification,
      groundTruth: (t?.groundTruthLabel ?? 'unidentified') as SessionSummaryRecord['assessments'][number]['groundTruth'],
      correct,
      confidence: a.confidence,
      evidence: [...a.evidence],
      proceduralResponse: a.proceduralResponse,
    };
  });

  return {
    sessionId: engine.sessionId,
    traineeId: engine.traineeId,
    scenarioId: engine.scenario.id,
    scenarioTitle: engine.scenario.title,
    scenarioVersion: engine.scenario.version,
    seed: engine.scenario.seed,
    generatorVersion: engine.scenario.generated?.generatorVersion,
    startedAt: engine.startedAtIso ?? new Date().toISOString(),
    endedAt: engine.endedAtIso ?? new Date().toISOString(),
    // Event timestamps use millisecond precision; keep the same end boundary.
    durationSimSeconds: Math.round(engine.simTime * 1000) / 1000,
    status:
      engine.state === 'completed' ? 'completed'
      : engine.state === 'aborted' ? 'aborted'
      : 'error',
    eventCount: engine.log.length,
    assessments,
    scenarioSnapshot: engine.scenario,
  };
}

/** Envelope for exporting a session summary + events as one JSON file. */
export interface SessionExportEnvelope extends StoredSession {
  exportVersion: number;
  kind: 'pragya-session-export';
  summary: SessionSummaryRecord;
  events: ReturnType<SimulationEngine['log']['export']>;
}

export function buildSessionExport(engine: SimulationEngine, policy: ScoringPolicy = defaultPolicyFor(engine.scenario)): SessionExportEnvelope {
  const session: StoredSession = { summary: buildSessionSummary(engine), events: engine.log.export() };
  return {
    ...session,
    assessment: assessStoredSession(session, policy),
    scoringPolicy: structuredClone(policy),
    exportVersion: EVENT_LOG_VERSION,
    kind: 'pragya-session-export',
    summary: buildSessionSummary(engine),
    events: engine.log.export(),
  };
}

/** Check an export envelope's shape without throwing. */
export function isSessionExportEnvelope(value: unknown): value is SessionExportEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.kind === 'pragya-session-export' && typeof v.summary === 'object' && typeof v.events === 'object';
}
