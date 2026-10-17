/**
 * Structured event log.
 *
 * Every meaningful trainee action and simulation event appends a
 * SimulationEvent. The log is an append-only array keyed by sequential
 * event ids and is the primary integration contract for Module 2
 * (Decision Intelligence & Scoring). See docs/event-logging.md.
 */

import type { EventLogExport, SimulationEvent } from '../types';
import { EVENT_LOG_VERSION } from '../types';

export interface EventInput {
  sessionId: string;
  traineeId: string;
  scenarioId: string;
  scenarioVersion: string;
  simTimestamp: number;
  type: SimulationEvent['type'];
  contactId?: string;
  actionDetails?: SimulationEvent['actionDetails'];
  sensorState?: Record<string, string>;
  classification?: SimulationEvent['classification'];
  confidence?: SimulationEvent['confidence'];
  evidence?: SimulationEvent['evidence'];
  proceduralResponse?: SimulationEvent['proceduralResponse'];
}

export type EventListener = (event: SimulationEvent) => void;

export class EventLog {
  private events: SimulationEvent[] = [];
  private counter = 0;
  private listeners = new Set<EventListener>();

  /** Append an event; returns the stored event (with generated id). */
  append(input: EventInput): SimulationEvent {
    const event: SimulationEvent = {
      eventId: `ev-${String(++this.counter).padStart(6, '0')}`,
      ...input,
    };
    this.events.push(event);
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Listener errors must never corrupt the log.
      }
    }
    return event;
  }

  getAll(): readonly SimulationEvent[] {
    return this.events;
  }

  byType(type: SimulationEvent['type']): SimulationEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  byContact(contactId: string): SimulationEvent[] {
    return this.events.filter((e) => e.contactId === contactId);
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get length(): number {
    return this.events.length;
  }

  /** Export as a versioned envelope suitable for JSON download. */
  export(): EventLogExport {
    return {
      logVersion: EVENT_LOG_VERSION,
      exportedAt: new Date().toISOString(),
      events: [...this.events],
    };
  }

  /** Import events from an exported envelope (replaces current contents). */
  import(data: EventLogExport): void {
    if (data.logVersion !== EVENT_LOG_VERSION) {
      throw new Error(`Unsupported event log version: ${data.logVersion}`);
    }
    this.events = [...data.events];
    this.counter = this.events.length;
  }

  clear(): void {
    this.events = [];
    this.counter = 0;
  }
}
