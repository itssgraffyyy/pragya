/**
 * Deterministic motion evaluation for aerial contacts.
 *
 * Position is a pure function of (path, elapsedSeconds), so both the
 * renderer and headless tests agree exactly. No wall-clock time involved.
 */

import type { MotionPath } from '../types';

export type Vec3 = [number, number, number];

/**
 * Compute the world position of a contact at `t` seconds after its spawn.
 * Deterministic for a given (path, t).
 */
export function evaluateMotion(path: MotionPath, t: number): Vec3 {
  const [ox, oy, oz] = path.origin;
  const altitude = path.params.altitude ?? 30;
  const radius = path.params.radius ?? 20;
  const speed = path.params.speed ?? 1;
  const amplitude = path.params.amplitude ?? 3;

  switch (path.profile) {
    case 'hover': {
      // Gentle vertical bob only.
      return [ox, oy + altitude + Math.sin(t * speed * 0.8) * 1.2, oz];
    }
    case 'straight': {
      // Travels along +x with a slight altitude drift.
      return [ox + t * speed * 4, oy + altitude + Math.sin(t * 0.3) * 0.5, oz];
    }
    case 'circle':
    case 'orbit': {
      const angle = t * speed * 0.35;
      return [
        ox + Math.cos(angle) * radius,
        oy + altitude + Math.sin(t * 0.5) * 1.0,
        oz + Math.sin(angle) * radius,
      ];
    }
    case 'figureEight': {
      const w = speed * 0.3;
      return [
        ox + Math.sin(w * t) * radius,
        oy + altitude + Math.sin(w * t * 2) * 1.5,
        oz + Math.sin(w * t * 2) * (radius * 0.5),
      ];
    }
    case 'wave': {
      return [
        ox + t * speed * 2.5,
        oy + altitude + Math.sin(t * speed * 1.1) * amplitude,
        oz + Math.cos(t * speed * 0.6) * amplitude,
      ];
    }
    case 'erratic': {
      // Deterministic pseudo-random-looking wobble built from layered sines.
      const a = amplitude * 2;
      return [
        ox + Math.sin(t * 1.7) * a + Math.sin(t * 0.53) * a * 0.6,
        oy + altitude + Math.sin(t * 2.3) * a * 0.5 + Math.cos(t * 0.9) * a * 0.3,
        oz + Math.cos(t * 1.3) * a + Math.cos(t * 0.71) * a * 0.6,
      ];
    }
    case 'waypoints': {
      const waypoints = path.params.waypoints ?? [];
      if (waypoints.length === 0) return [ox, oy + altitude, oz];
      // Loop through waypoints at `speed` segments/second-equivalent pace.
      const legDuration = 6 / Math.max(speed, 0.1); // seconds per leg
      const total = waypoints.length;
      const progress = t / legDuration;
      const leg = Math.floor(progress) % total;
      const next = (leg + 1) % total;
      const frac = progress - Math.floor(progress);
      const a = waypoints[leg];
      const b = waypoints[next];
      return [
        a[0] + (b[0] - a[0]) * frac,
        a[1] + (b[1] - a[1]) * frac,
        a[2] + (b[2] - a[2]) * frac,
      ];
    }
    default:
      return [ox, oy + altitude, oz];
  }
}

/**
 * Compute a heading (yaw in radians) roughly following the direction of
 * travel, computed numerically for renderer orientation.
 */
export function evaluateHeading(path: MotionPath, t: number): number {
  const dt = 0.1;
  const p0 = evaluateMotion(path, Math.max(0, t - dt));
  const p1 = evaluateMotion(path, t + dt);
  return Math.atan2(p1[0] - p0[0], p1[2] - p0[2]);
}
