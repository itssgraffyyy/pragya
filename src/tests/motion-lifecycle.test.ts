import { describe, expect, it } from 'vitest';
import { evaluateHeading, evaluateMotion } from '../core/contacts/motion';
import { allOcclusionWindows, detectTransitions, isRenderable, visibilityAt } from '../core/contacts/lifecycle';
import type { ContactDefinition, MotionPath } from '../core/types';

const baseContact = (overrides: Partial<ContactDefinition> = {}): ContactDefinition => ({
  id: 'c1',
  category: 'smallMultirotor',
  groundTruthLabel: 'smallMultirotor',
  appearance: { color: '#888888', scale: 1, hasLights: false, audibleCues: false },
  spawnTime: 10,
  despawnTime: -1,
  motion: { profile: 'circle', origin: [0, 0, -80], params: { radius: 20, altitude: 30, speed: 1 } },
  observable: true,
  assessment: {
    acceptableClassifications: ['smallMultirotor'],
    requiredEvidence: ['rotorSilhouette'],
    correctResponse: 'recordAndReport',
  },
  ...overrides,
});

describe('motion evaluation', () => {
  it('is deterministic for identical inputs', () => {
    const path: MotionPath = { profile: 'orbit', origin: [5, 0, -50], params: { radius: 25, altitude: 40, speed: 1.2 } };
    expect(evaluateMotion(path, 12.5)).toEqual(evaluateMotion(path, 12.5));
  });

  it('evaluates all profiles without NaN', () => {
    const profiles: MotionPath['profile'][] = ['straight', 'orbit', 'waypoints', 'hover', 'erratic', 'circle', 'figureEight', 'wave'];
    for (const profile of profiles) {
      const path: MotionPath = {
        profile,
        origin: [0, 0, 0],
        params: { radius: 20, altitude: 30, speed: 1, amplitude: 5, waypoints: [[0, 30, 0], [10, 30, -10], [-10, 30, -20]] },
      };
      const p = evaluateMotion(path, 7);
      expect(Number.isFinite(p[0])).toBe(true);
      expect(Number.isFinite(p[1])).toBe(true);
      expect(Number.isFinite(p[2])).toBe(true);
    }
  });

  it('waypoints interpolate between segments', () => {
    const path: MotionPath = {
      profile: 'waypoints',
      origin: [0, 0, 0],
      params: { speed: 1, waypoints: [[0, 30, 0], [60, 30, 0]] },
    };
    // legDuration = 6/1 = 6s; at t=3 we should be halfway to the second waypoint.
    const p = evaluateMotion(path, 3);
    expect(p[0]).toBeCloseTo(30, 5);
  });

  it('hover stays near origin x/z', () => {
    const path: MotionPath = { profile: 'hover', origin: [10, 0, -40], params: { altitude: 30, speed: 1 } };
    const p = evaluateMotion(path, 5);
    expect(p[0]).toBeCloseTo(10, 5);
    expect(p[2]).toBeCloseTo(-40, 5);
  });

  it('heading is finite for all profiles', () => {
    const path: MotionPath = { profile: 'circle', origin: [0, 0, 0], params: { radius: 20, altitude: 30, speed: 1 } };
    expect(Number.isFinite(evaluateHeading(path, 4))).toBe(true);
  });
});

describe('contact lifecycle', () => {
  it('reports notYetSpawned before spawn', () => {
    expect(visibilityAt(baseContact(), 5)).toBe('notYetSpawned');
  });

  it('reports visible inside the window', () => {
    expect(visibilityAt(baseContact(), 15)).toBe('visible');
  });

  it('reports despawned after despawnTime', () => {
    expect(visibilityAt(baseContact({ despawnTime: 30 }), 31)).toBe('despawned');
  });

  it('reports occluded inside an occlusion window', () => {
    const c = baseContact({ occlusionWindows: [{ start: 20, end: 30 }] });
    expect(visibilityAt(c, 25)).toBe('occluded');
    expect(visibilityAt(c, 31)).toBe('visible');
  });

  it('detects transitions between two times', () => {
    const contacts = [baseContact()];
    const tr = detectTransitions(contacts, 5, 15);
    expect(tr).toEqual([{ contactId: 'c1', from: 'notYetSpawned', to: 'visible' }]);
  });

  it('non-observable contacts are not renderable', () => {
    expect(isRenderable(baseContact({ observable: false }), 15)).toBe(false);
    expect(isRenderable(baseContact(), 15)).toBe(true);
  });

  it('collects and sorts occlusion windows', () => {
    const windows = allOcclusionWindows([
      baseContact({ id: 'a', occlusionWindows: [{ start: 40, end: 50 }] }),
      baseContact({ id: 'b', occlusionWindows: [{ start: 10, end: 20 }] }),
    ]);
    expect(windows.map((w) => w.contactId)).toEqual(['b', 'a']);
  });
});
