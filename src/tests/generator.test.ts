import { describe, expect, it } from 'vitest';
import { generateScenario } from '../core/generator/generator';
import { validateScenario } from '../core/scenario/validate';
import { GENERATOR_VERSION } from '../core/types';

describe('procedural generator', () => {
  it('is deterministic: same seed + config => identical scenario', () => {
    const a = generateScenario({ seed: 42 });
    const b = generateScenario({ seed: 42 });
    expect(a.scenario).toEqual(b.scenario);
  });

  it('different seeds produce different scenarios', () => {
    const a = generateScenario({ seed: 1 });
    const b = generateScenario({ seed: 2 });
    expect(JSON.stringify(a.scenario)).not.toBe(JSON.stringify(b.scenario));
  });

  it('every generated scenario validates against the schema', () => {
    for (const seed of [7, 77, 777, 12345, 99999, 555555]) {
      const { scenario } = generateScenario({ seed });
      const result = validateScenario(scenario);
      expect(result.valid, `seed ${seed}: ${result.errors.join('; ')}`).toBe(true);
    }
  });

  it('respects fully pinned configs', () => {
    const { scenario } = generateScenario({
      seed: 123,
      environment: 'urban',
      timeOfDay: 'night',
      visibility: 'denseFog',
      weather: 'rain',
      contactCount: 3,
      difficulty: 'advanced',
      durationSeconds: 300,
    });
    expect(scenario.environment).toBe('urban');
    expect(scenario.timeOfDay).toBe('night');
    expect(scenario.visibility).toBe('denseFog');
    expect(scenario.weather).toBe('rain');
    expect(scenario.contacts).toHaveLength(3);
    expect(scenario.difficulty).toBe('advanced');
    expect(scenario.duration).toBe(300);
  });

  it('marks generated scenarios with generator version', () => {
    const { scenario } = generateScenario({ seed: 10 });
    expect(scenario.generated?.generatorVersion).toBe(GENERATOR_VERSION);
  });

  it('honors objective constraints', () => {
    const { scenario } = generateScenario({
      seed: 50,
      objectiveIds: ['distractor-rejection'],
    });
    expect(scenario.generated?.objectivesConstrained).toBe(true);
    expect(scenario.learningObjectives.map((o) => o.id)).toContain('distractor-rejection');
  });

  it('records generation notes for the instructor', () => {
    const { notes } = generateScenario({ seed: 2024, difficulty: 'advanced' });
    expect(notes.length).toBeGreaterThan(0);
  });

  it('basic difficulty stays within 1-2 contacts', () => {
    for (const seed of [11, 22, 33]) {
      const { scenario } = generateScenario({ seed, difficulty: 'basic' });
      expect(scenario.contacts.length).toBeGreaterThanOrEqual(1);
      expect(scenario.contacts.length).toBeLessThanOrEqual(2);
    }
  });

  it('clampInt bounds explicit contactCount', () => {
    const { scenario } = generateScenario({ seed: 5, contactCount: 50 });
    expect(scenario.contacts.length).toBeLessThanOrEqual(8);
  });
});
