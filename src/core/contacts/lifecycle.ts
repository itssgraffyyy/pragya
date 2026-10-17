/**
 * Contact lifecycle — pure functions computing a contact's visibility state
 * at a given simulation time. No wall-clock, fully deterministic.
 */

import type { ContactDefinition, ContactVisibilityState } from '../types';

/** Compute visibility state at simulation time `t` (seconds). */
export function visibilityAt(def: ContactDefinition, t: number): ContactVisibilityState {
  if (t < def.spawnTime) return 'notYetSpawned';
  if (def.despawnTime !== -1 && t >= def.despawnTime) return 'despawned';
  if (def.occlusionWindows) {
    for (const w of def.occlusionWindows) {
      if (t >= w.start && t < w.end) return 'occluded';
    }
  }
  return 'visible';
}

/** True when the contact is currently within its spawn window. */
export function isSpawned(def: ContactDefinition, t: number): boolean {
  const v = visibilityAt(def, t);
  return v === 'visible' || v === 'occluded';
}

/** Whether the contact should be rendered to the trainee at time t. */
export function isRenderable(def: ContactDefinition, t: number): boolean {
  return def.observable && visibilityAt(def, t) === 'visible';
}

/**
 * Detect state transitions between two consecutive simulation times.
 * Used by the engine to emit appearance/disappearance events exactly once.
 */
export interface VisibilityTransition {
  contactId: string;
  from: ContactVisibilityState;
  to: ContactVisibilityState;
}

export function detectTransitions(
  defs: readonly ContactDefinition[],
  prevTime: number,
  currTime: number,
): VisibilityTransition[] {
  const out: VisibilityTransition[] = [];
  for (const def of defs) {
    const from = visibilityAt(def, prevTime);
    const to = visibilityAt(def, currTime);
    if (from !== to) out.push({ contactId: def.id, from, to });
  }
  return out;
}

/** All occlusion windows across a scenario, sorted by start time. */
export function allOcclusionWindows(
  defs: readonly ContactDefinition[],
): { contactId: string; start: number; end: number }[] {
  const windows: { contactId: string; start: number; end: number }[] = [];
  for (const def of defs) {
    for (const w of def.occlusionWindows ?? []) {
      windows.push({ contactId: def.id, ...w });
    }
  }
  return windows.sort((a, b) => a.start - b.start);
}
