import { describe, expect, it } from 'vitest';
import { createRng, deriveSeed } from '../core/rng';

describe('createRng (mulberry32)', () => {
  it('produces identical sequences for identical seeds', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('int stays within inclusive bounds', () => {
    const rng = createRng(999);
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });

  it('next stays within [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('shuffle returns a permutation and does not mutate input', () => {
    const rng = createRng(42);
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = rng.shuffle(input);
    expect(out).toHaveLength(input.length);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('sample picks distinct items', () => {
    const rng = createRng(77);
    const out = rng.sample(['a', 'b', 'c', 'd', 'e'], 3);
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
  });

  it('handles seed 0 without degenerating', () => {
    const rng = createRng(0);
    const values = Array.from({ length: 5 }, () => rng.next());
    expect(new Set(values).size).toBeGreaterThan(1);
  });

  it('deriveSeed is deterministic and label-sensitive', () => {
    expect(deriveSeed(10, 'alpha')).toBe(deriveSeed(10, 'alpha'));
    expect(deriveSeed(10, 'alpha')).not.toBe(deriveSeed(10, 'beta'));
    expect(deriveSeed(10, 'alpha')).not.toBe(deriveSeed(11, 'alpha'));
  });
});
