/**
 * Bundled scenario library index.
 * Every bundled scenario is validated at module load — if one fails, the
 * app surfaces the error instead of silently shipping a broken scenario.
 */

import type { ScenarioDefinition } from '../../types';
import { validateScenario } from '../validate';
import {
  SCENARIO_SINGLE_RECOGNITION,
  SCENARIO_LOW_VISIBILITY,
  SCENARIO_MULTI_CONTACT,
} from './scenariosA';
import {
  SCENARIO_AMBIGUOUS,
  SCENARIO_CONFLICTING_SOURCES,
  SCENARIO_MIXED_EVIDENCE,
} from './scenariosB';

const RAW_SCENARIOS: ScenarioDefinition[] = [
  SCENARIO_SINGLE_RECOGNITION,
  SCENARIO_LOW_VISIBILITY,
  SCENARIO_MULTI_CONTACT,
  SCENARIO_AMBIGUOUS,
  SCENARIO_CONFLICTING_SOURCES,
  SCENARIO_MIXED_EVIDENCE,
];

// Validate all bundled scenarios eagerly; developer mistakes fail fast.
for (const scenario of RAW_SCENARIOS) {
  const result = validateScenario(scenario);
  if (!result.valid) {
    throw new Error(
      `Bundled scenario "${scenario.id}" is invalid: ${result.errors.join('; ')}`,
    );
  }
}

export const BUNDLED_SCENARIOS: ScenarioDefinition[] = RAW_SCENARIOS;

export function bundledScenarioById(id: string): ScenarioDefinition | undefined {
  return BUNDLED_SCENARIOS.find((s) => s.id === id);
}
