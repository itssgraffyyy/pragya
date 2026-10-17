import { describe, expect, it } from 'vitest';
import { parseScenarioJson, validateScenario } from '../core/scenario/validate';
import { BUNDLED_SCENARIOS } from '../core/scenario/bundled';
import { SCENARIO_SINGLE_RECOGNITION } from '../core/scenario/bundled/scenariosA';

describe('scenario validation', () => {
  it('accepts every bundled scenario', () => {
    for (const s of BUNDLED_SCENARIOS) {
      const result = validateScenario(s);
      expect(result.valid, `${s.id}: ${result.errors.join('; ')}`).toBe(true);
    }
  });

  it('rejects wrong schema version', () => {
    const bad = { ...SCENARIO_SINGLE_RECOGNITION, schemaVersion: 99 };
    expect(validateScenario(bad).valid).toBe(false);
  });

  it('rejects duplicate contact ids', () => {
    const contacts = [
      SCENARIO_SINGLE_RECOGNITION.contacts[0],
      { ...SCENARIO_SINGLE_RECOGNITION.contacts[0] },
    ];
    const bad = { ...SCENARIO_SINGLE_RECOGNITION, contacts };
    const result = validateScenario(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/duplicate contact id/);
  });

  it('rejects despawn before spawn', () => {
    const contact = { ...SCENARIO_SINGLE_RECOGNITION.contacts[0], spawnTime: 20, despawnTime: 10 };
    const bad = { ...SCENARIO_SINGLE_RECOGNITION, contacts: [contact] };
    expect(validateScenario(bad).valid).toBe(false);
  });

  it('rejects spawn after scenario duration', () => {
    const contact = { ...SCENARIO_SINGLE_RECOGNITION.contacts[0], spawnTime: 99999 };
    const bad = { ...SCENARIO_SINGLE_RECOGNITION, contacts: [contact] };
    const result = validateScenario(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/never appear/);
  });

  it('rejects requiredAssessments exceeding contact count', () => {
    const bad = {
      ...SCENARIO_SINGLE_RECOGNITION,
      completion: { ...SCENARIO_SINGLE_RECOGNITION.completion, requiredAssessments: 5 },
    };
    const result = validateScenario(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/uncompletable/);
  });

  it('rejects multiple primary sensor channels', () => {
    const bad = {
      ...SCENARIO_SINGLE_RECOGNITION,
      sensor: {
        ...SCENARIO_SINGLE_RECOGNITION.sensor,
        channels: [
          SCENARIO_SINGLE_RECOGNITION.sensor.channels[0],
          { ...SCENARIO_SINGLE_RECOGNITION.sensor.channels[0] },
        ],
      },
    };
    const result = validateScenario(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/exactly one primary/);
  });

  it('rejects invalid hex colors with a readable message', () => {
    const contact = {
      ...SCENARIO_SINGLE_RECOGNITION.contacts[0],
      appearance: { ...SCENARIO_SINGLE_RECOGNITION.contacts[0].appearance, color: 'blue' },
    };
    const bad = { ...SCENARIO_SINGLE_RECOGNITION, contacts: [contact] };
    const result = validateScenario(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/hex color/);
  });

  it('parseScenarioJson reports invalid JSON gracefully', () => {
    const result = parseScenarioJson('{ not json');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Invalid JSON/);
  });

  it('round-trips a bundled scenario through JSON', () => {
    const json = JSON.stringify(SCENARIO_SINGLE_RECOGNITION);
    const result = parseScenarioJson(json);
    expect(result.valid).toBe(true);
    expect(result.scenario!.id).toBe(SCENARIO_SINGLE_RECOGNITION.id);
  });
});
