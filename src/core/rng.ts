/**
 * Deterministic seeded pseudo-random number generator (mulberry32).
 * Identical seeds always produce identical sequences — this is the basis
 * for reproducible procedural scenario generation.
 */

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Uniform float in [min, max). */
  float(min: number, max: number): number;
  /** Pick a uniformly random element from a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** Pick `count` distinct elements (order randomized) from a non-empty array. */
  sample<T>(items: readonly T[], count: number): T[];
  /** Shuffle a copy (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[];
  /** True with the given probability (0..1). */
  chance(probability: number): boolean;
  /** Current internal state, for debugging. */
  state(): number;
}

/** Create a deterministic RNG from an integer seed. */
export function createRng(seed: number): Rng {
  // Normalize seed to uint32.
  let s = seed >>> 0;
  if (s === 0) s = 0x9e3779b9;

  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng: Rng = {
    next,
    int(min, max) {
      if (max < min) throw new Error(`rng.int: max (${max}) < min (${min})`);
      return min + Math.floor(next() * (max - min + 1));
    },
    float(min, max) {
      return min + next() * (max - min);
    },
    pick(items) {
      if (items.length === 0) throw new Error('rng.pick: empty array');
      return items[Math.floor(next() * items.length)];
    },
    sample(items, count) {
      return rng.shuffle(items).slice(0, Math.min(count, items.length));
    },
    shuffle(items) {
      const arr = [...items];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    chance(probability) {
      return next() < probability;
    },
    state() {
      return s;
    },
  };
  return rng;
}

/** Derive a stable child seed from a parent seed and a string label. */
export function deriveSeed(parentSeed: number, label: string): number {
  let h = parentSeed >>> 0;
  for (let i = 0; i < label.length; i++) {
    h = Math.imul(h ^ label.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h;
}
