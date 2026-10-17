/**
 * Simulation state machine helpers.
 *
 * All transitions go through `canTransition` so illegal moves (e.g. running
 * straight to a second completed) are rejected and logged by callers.
 */

import { SIMULATION_TRANSITIONS, type SimulationState } from '../types';

export function canTransition(from: SimulationState, to: SimulationState): boolean {
  return SIMULATION_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: SimulationState, to: SimulationState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal simulation transition: ${from} -> ${to}`);
  }
}

/** True when the trainee may still perform actions. */
export function actionsAllowed(state: SimulationState): boolean {
  return state === 'running' || state === 'paused';
}

/** True when the session has reached a terminal state. */
export function isTerminal(state: SimulationState): boolean {
  return state === 'completed' || state === 'aborted';
}
