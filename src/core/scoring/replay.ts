import type { SimulationEvent } from '../types';
import type { ScoringInput } from './results';

export interface DecisionReplayFrame {
  event: SimulationEvent;
  observations: SimulationEvent[];
  decision: SimulationEvent | null;
}

/** Each frame contains only logged observations available at that point in the stream. */
export function decisionReplay(input: ScoringInput): DecisionReplayFrame[] {
  const events = input.events.filter((e) => e.sessionId === input.sessionId && e.simTimestamp <= input.endedAtSimTime)
    .map((event, index) => ({ event, index })).sort((a, b) => a.event.simTimestamp - b.event.simTimestamp || a.index - b.index);
  const seen: SimulationEvent[] = [];
  return events.map(({ event }) => {
    seen.push(event);
    return {
      event,
      observations: seen.filter((e) => e.type === 'sensorStateChanged' || e.type === 'environmentChanged' || (['groupStateChanged','groupCuePresented','groupObservationRecorded'].includes(e.type) && e.actionDetails?.groupId === event.actionDetails?.groupId) || (e.contactId === event.contactId && ['contactBecameVisible', 'contactOccluded', 'evidenceSelected', 'evidenceDeselected', 'verificationRequested', 'opportunityAvailable', 'opportunityUnavailable', 'opportunityPresented', 'opportunityAcknowledged'].includes(e.type))),
      decision: event.type === 'assessmentSubmitted' || event.type === 'groupReportSubmitted' ? event : null,
    };
  });
}
