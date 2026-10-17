import { describe, expect, it } from 'vitest';
import { SimulationEngine } from '../core/sim/engine';
import { canTransition } from '../core/sim/stateMachine';
import { SCENARIO_SINGLE_RECOGNITION } from '../core/scenario/bundled/scenariosA';
import type { ScenarioDefinition } from '../core/types';

function makeEngine(scenario: ScenarioDefinition = SCENARIO_SINGLE_RECOGNITION) {
  const engine = new SimulationEngine({ scenario, sessionId: 's1', traineeId: 't1' });
  return engine;
}

describe('simulation state machine transitions', () => {
  it('permits the happy path', () => {
    expect(canTransition('idle', 'loading')).toBe(true);
    expect(canTransition('loading', 'ready')).toBe(true);
    expect(canTransition('ready', 'running')).toBe(true);
    expect(canTransition('running', 'paused')).toBe(true);
    expect(canTransition('paused', 'running')).toBe(true);
    expect(canTransition('running', 'completed')).toBe(true);
    expect(canTransition('completed', 'idle')).toBe(true);
  });

  it('rejects illegal transitions', () => {
    expect(canTransition('idle', 'running')).toBe(false);
    expect(canTransition('ready', 'paused')).toBe(false);
    expect(canTransition('completed', 'running')).toBe(false);
    expect(canTransition('aborted', 'completed')).toBe(false);
  });
});

describe('SimulationEngine lifecycle', () => {
  it('loads from idle to ready', () => {
    const engine = makeEngine();
    expect(engine.state).toBe('idle');
    engine.load();
    expect(engine.state).toBe('ready');
  });

  it('rejects loading an empty scenario', () => {
    const bad: ScenarioDefinition = { ...SCENARIO_SINGLE_RECOGNITION, contacts: [] };
    const engine = new SimulationEngine({ scenario: bad, sessionId: 's', traineeId: 't' });
    expect(() => engine.load()).toThrow();
    expect(engine.state).toBe('error');
  });

  it('start/pause/resume preserve state and log events', () => {
    const engine = makeEngine();
    engine.load();
    engine.start();
    expect(engine.state).toBe('running');
    engine.pause();
    expect(engine.state).toBe('paused');
    engine.resume();
    expect(engine.state).toBe('running');
    const types = engine.log.getAll().map((e) => e.type);
    expect(types).toContain('sessionStarted');
    expect(types).toContain('sessionPaused');
    expect(types).toContain('sessionResumed');
  });

  it('does not advance simulation time while paused', () => {
    const engine = makeEngine();
    engine.load();
    engine.start();
    engine.tick(5);
    expect(engine.simTime).toBeGreaterThan(0);
    engine.pause();
    const t = engine.simTime;
    engine.tick(5);
    expect(engine.simTime).toBe(t);
  });

  it('does not advance simulation time when idle or ready', () => {
    const engine = makeEngine();
    engine.load();
    engine.tick(5);
    expect(engine.simTime).toBe(0);
  });

  it('completes when duration elapses and rejects further ticks advancing time', () => {
    const engine = makeEngine();
    engine.load();
    engine.start();
    for (let i = 0; i < 400; i++) engine.tick(1); // duration is 120
    expect(engine.state).toBe('completed');
    expect(engine.simTime).toBe(SCENARIO_SINGLE_RECOGNITION.duration);
    const t = engine.simTime;
    engine.tick(5);
    expect(engine.simTime).toBe(t);
  });

  it('abort is distinguishable from completion', () => {
    const engine = makeEngine();
    engine.load();
    engine.start();
    engine.tick(2);
    engine.abort();
    expect(engine.state).toBe('aborted');
    const types = engine.log.getAll().map((e) => e.type);
    expect(types).toContain('sessionAborted');
    expect(types).not.toContain('sessionCompleted');
  });

  it('restart resets time and clears the log', () => {
    const engine = makeEngine();
    engine.load();
    engine.start();
    engine.tick(10);
    engine.abort();
    engine.restart();
    expect(engine.simTime).toBe(0);
    expect(engine.state).toBe('ready');
    const types = engine.log.getAll().map((e) => e.type);
    expect(types).toContain('sessionRestarted');
    expect(types).not.toContain('sessionStarted');
  });

  it('illegal transitions throw', () => {
    const engine = makeEngine();
    expect(() => engine.start()).toThrow(/Illegal simulation transition/);
  });
});
