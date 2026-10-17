/**
 * Scenario validation entry point.
 * Produces instructor-friendly error strings from zod issues.
 */

import { z } from 'zod';
import { scenarioDefinitionSchema } from './schema';
import type { ScenarioDefinition } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  scenario?: ScenarioDefinition;
}

/** Validate an unknown value as a ScenarioDefinition. */
export function validateScenario(input: unknown): ValidationResult {
  const result = scenarioDefinitionSchema.safeParse(input);
  if (result.success) {
    return { valid: true, errors: [], scenario: result.data as ScenarioDefinition };
  }
  return { valid: false, errors: formatIssues(result.error) };
}

/** Parse JSON text into a validated ScenarioDefinition. */
export function parseScenarioJson(text: string): ValidationResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { valid: false, errors: [`Invalid JSON: ${(e as Error).message}`] };
  }
  return validateScenario(raw);
}

function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.map(String).join('.') : '(root)';
    return `${path}: ${issue.message}`;
  });
}
