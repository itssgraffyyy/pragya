import { describe, expect, it } from 'vitest';
import { EventLog } from '../core/events/eventLog';
import { EVENT_LOG_VERSION } from '../core/types';

function baseInput(over: Partial<Parameters<EventLog['append']>[0]> = {}) {
  return {
    sessionId: 's1',
    traineeId: 't1',
    scenarioId: 'scn',
    scenarioVersion: '1.0.0',
    simTimestamp: 0,
    type: 'sessionStarted' as const,
    ...over,
  };
}

describe('EventLog', () => {
  it('appends events with sequential ids', () => {
    const log = new EventLog();
    const e1 = log.append(baseInput());
    const e2 = log.append(baseInput({ type: 'contactSpawned', contactId: 'c1' }));
    expect(e1.eventId).toBe('ev-000001');
    expect(e2.eventId).toBe('ev-000002');
    expect(log.length).toBe(2);
  });

  it('filters by type and contact', () => {
    const log = new EventLog();
    log.append(baseInput({ type: 'contactSpawned', contactId: 'c1' }));
    log.append(baseInput({ type: 'contactSpawned', contactId: 'c2' }));
    log.append(baseInput({ type: 'sessionPaused' }));
    expect(log.byType('contactSpawned')).toHaveLength(2);
    expect(log.byContact('c1')).toHaveLength(1);
  });

  it('notifies subscribers and supports unsubscribe', () => {
    const log = new EventLog();
    const seen: string[] = [];
    const unsub = log.subscribe((e) => seen.push(e.type));
    log.append(baseInput());
    unsub();
    log.append(baseInput({ type: 'sessionPaused' }));
    expect(seen).toEqual(['sessionStarted']);
  });

  it('survives listener errors', () => {
    const log = new EventLog();
    log.subscribe(() => {
      throw new Error('listener boom');
    });
    expect(() => log.append(baseInput())).not.toThrow();
    expect(log.length).toBe(1);
  });

  it('exports and imports a versioned envelope', () => {
    const log = new EventLog();
    log.append(baseInput());
    log.append(baseInput({ type: 'contactSpawned', contactId: 'c1' }));
    const exported = log.export();
    expect(exported.logVersion).toBe(EVENT_LOG_VERSION);
    const log2 = new EventLog();
    log2.import(exported);
    expect(log2.getAll()).toEqual(log.getAll());
  });

  it('rejects unknown log versions on import', () => {
    const log = new EventLog();
    expect(() => log.import({ logVersion: 999, exportedAt: '', events: [] })).toThrow(/version/);
  });

  it('clear empties the log and resets ids', () => {
    const log = new EventLog();
    log.append(baseInput());
    log.clear();
    expect(log.length).toBe(0);
    const e = log.append(baseInput());
    expect(e.eventId).toBe('ev-000001');
  });
});
