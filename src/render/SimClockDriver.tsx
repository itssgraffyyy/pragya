/**
 * Simulation clock driver — advances simulation time from requestAnimationFrame
 * deltas ONLY while the engine is running. Paused/ready sessions never advance.
 * Simulation time (not wall clock) is the source of truth for all logic.
 */

import { useEffect, useRef } from 'react';
import { useSimulationStore } from '../store/simulationStore';

export function SimClockDriver() {
  const tick = useSimulationStore((s) => s.tick);
  const state = useSimulationStore((s) => s.state);
  const reducedMotion = useSimulationStore((s) => s.revision); // any revision re-evaluates
  void reducedMotion;
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  // Keep a ref to the current running state for the rAF closure.
  runningRef.current = state === 'running';

  useEffect(() => {
    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (!runningRef.current) {
        lastTsRef.current = null;
        return;
      }
      const last = lastTsRef.current;
      lastTsRef.current = ts;
      if (last === null) return;
      const dtSeconds = Math.min((ts - last) / 1000, 0.25);
      tick(dtSeconds);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [tick]);

  return null;
}
