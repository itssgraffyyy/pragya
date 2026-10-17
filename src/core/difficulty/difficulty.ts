/**
 * Adaptive difficulty service.
 *
 * Transparent, configurable rules operating on an external trainee
 * performance summary (provided by Module 2 or local session history).
 * Every rule that fires records its rationale. These rules are heuristics —
 * NOT a validated AI model.
 *
 * Design principle: no single overall score drives every adjustment.
 * Each dimension (accuracy, misses, calibration, evidence, trend,
 * degraded-performance) is considered independently.
 */

import type {
  DifficultyRecommendation,
  DifficultyTier,
  TraineePerformanceSummary,
  VisibilityCondition,
} from '../types';
import { createRng, deriveSeed } from '../rng';

export interface DifficultyRuleConfig {
  /** Accuracy at/above which we consider promoting difficulty. */
  promoteAccuracyThreshold: number;
  /** Accuracy below which we consider simplifying. */
  simplifyAccuracyThreshold: number;
  /** Missed-contact rate that triggers targeted recognition practice. */
  missedContactThreshold: number;
  /** Calibration below which we add corrective uncertainty exercises. */
  calibrationThreshold: number;
  /** Evidence quality below which we emphasise evidence objectives. */
  evidenceThreshold: number;
  /** Trend below which we simplify regardless of raw accuracy. */
  declineTrendThreshold: number;
  /** Degraded performance below which we reduce sensor intensity. */
  degradedThreshold: number;
  /** Minimum sample count before trusting the summary. */
  minSamples: number;
}

export const DEFAULT_RULE_CONFIG: DifficultyRuleConfig = {
  promoteAccuracyThreshold: 0.85,
  simplifyAccuracyThreshold: 0.5,
  missedContactThreshold: 0.25,
  calibrationThreshold: 0.55,
  evidenceThreshold: 0.6,
  declineTrendThreshold: -0.2,
  degradedThreshold: 0.4,
  minSamples: 3,
};

const TIER_ORDER: DifficultyTier[] = ['basic', 'intermediate', 'advanced'];

const TIER_VISIBILITY: Record<DifficultyTier, VisibilityCondition[]> = {
  basic: ['clear', 'clear', 'lightFog'],
  intermediate: ['clear', 'lightFog', 'lightFog'],
  advanced: ['lightFog', 'denseFog', 'denseFog'],
};

const TIER_CONTACT_RANGE: Record<DifficultyTier, [number, number]> = {
  basic: [1, 2],
  intermediate: [2, 4],
  advanced: [3, 6],
};

/**
 * Produce a difficulty recommendation from a performance summary.
 * Deterministic for a given (summary, config, seed) triple apart from the
 * suggested seed which intentionally varies per recommendation.
 */
export function recommendDifficulty(
  summary: TraineePerformanceSummary,
  config: DifficultyRuleConfig = DEFAULT_RULE_CONFIG,
  seed = 1,
): DifficultyRecommendation {
  const rationale: string[] = [];
  let tierIndex = 1; // start at intermediate
  let ambiguity: 'low' | 'medium' | 'high' = 'medium';
  let degradation = 0.4;
  const objectives = new Set<string>();

  if (summary.sampleCount < config.minSamples) {
    rationale.push(
      `Insufficient samples (${summary.sampleCount} < ${config.minSamples}): recommending intermediate baseline.`,
    );
    return finish(
      'intermediate',
      'low',
      0.3,
      ['basic-recognition', 'evidence-selection'],
      rationale,
      seed,
      summary,
      'clear',
    );
  }

  // Rule 1: consistently strong performance promotes difficulty.
  if (summary.recognitionAccuracy >= config.promoteAccuracyThreshold) {
    tierIndex = Math.min(tierIndex + 1, TIER_ORDER.length - 1);
    rationale.push(
      `Recognition accuracy ${pct(summary.recognitionAccuracy)} >= ${pct(config.promoteAccuracyThreshold)} — promoting tier.`,
    );
  }

  // Rule 2: weak accuracy simplifies (overrides promotion).
  if (summary.recognitionAccuracy < config.simplifyAccuracyThreshold) {
    tierIndex = Math.max(tierIndex - 1, 0);
    rationale.push(
      `Recognition accuracy ${pct(summary.recognitionAccuracy)} < ${pct(config.simplifyAccuracyThreshold)} — simplifying tier.`,
    );
  }

  // Rule 3: repeated missed observations -> targeted recognition practice.
  if (summary.missedContactRate >= config.missedContactThreshold) {
    objectives.add('basic-recognition');
    objectives.add('low-visibility-observation');
    if (tierIndex > 0) tierIndex -= 1;
    rationale.push(
      `Missed-contact rate ${pct(summary.missedContactRate)} >= ${pct(config.missedContactThreshold)} — targeted recognition practice; reducing tier.`,
    );
  }

  // Rule 4: poor confidence calibration -> corrective uncertainty exercises.
  if (summary.confidenceCalibration < config.calibrationThreshold) {
    objectives.add('unknown-classification');
    ambiguity = 'high';
    rationale.push(
      `Confidence calibration ${pct(summary.confidenceCalibration)} < ${pct(config.calibrationThreshold)} — increasing observation ambiguity for uncertainty-handling practice.`,
    );
  }

  // Rule 5: weak evidence selection -> evidence-focused objectives.
  if (summary.evidenceQuality < config.evidenceThreshold) {
    objectives.add('evidence-selection');
    rationale.push(
      `Evidence quality ${pct(summary.evidenceQuality)} < ${pct(config.evidenceThreshold)} — emphasising evidence-based reporting.`,
    );
  }

  // Rule 6: declining trend simplifies regardless of raw accuracy.
  if (summary.recentTrend <= config.declineTrendThreshold) {
    tierIndex = Math.max(tierIndex - 1, 0);
    objectives.add('procedural-response');
    rationale.push(
      `Recent trend ${summary.recentTrend.toFixed(2)} <= ${config.declineTrendThreshold} — simplifying tier and reinforcing procedures.`,
    );
  }

  // Rule 7: performance under degraded observations.
  if (summary.degradedPerformance < config.degradedThreshold) {
    degradation = 0.25;
    objectives.add('conflicting-sources');
    rationale.push(
      `Degraded-sensor performance ${pct(summary.degradedPerformance)} < ${pct(config.degradedThreshold)} — reducing degradation intensity; practising source disagreement.`,
    );
  } else if (summary.degradedPerformance >= 0.75) {
    degradation = 0.75;
    rationale.push(
      `Degraded-sensor performance ${pct(summary.degradedPerformance)} >= 75% — maintaining higher degradation intensity.`,
    );
  }

  if (objectives.size === 0) objectives.add('procedural-response');

  const tier = TIER_ORDER[tierIndex];
  // Hold visibility easier when calibration is poor so ambiguity comes from
  // evidence quality rather than raw visibility.
  const visibility =
    ambiguity === 'high' ? 'clear' : pickVisibility(tier, seed, summary.traineeId);

  return finish(tier, ambiguity, degradation, [...objectives], rationale, seed, summary, visibility);
}

function finish(
  tier: DifficultyTier,
  ambiguity: 'low' | 'medium' | 'high',
  degradation: number,
  objectives: string[],
  rationale: string[],
  seed: number,
  summary: TraineePerformanceSummary,
  visibilityOverride?: VisibilityCondition,
): DifficultyRecommendation {
  const visibility = visibilityOverride ?? TIER_VISIBILITY[tier][0];
  // Always include a baseline rationale so the trail is never empty.
  rationale.unshift(
    `Baseline selection: tier "${tier}" from accuracy ${pct(summary.recognitionAccuracy)} across ${summary.sampleCount} samples.`,
  );
  // New seed every recommendation, even when tier is unchanged.
  const suggestedSeed =
    deriveSeed(seed, `${summary.traineeId}:${summary.sampleCount}:${summary.recognitionAccuracy}`) % 1_000_000;
  return {
    recommendedTier: tier,
    visibilityComplexity: visibility,
    contactCountRange: TIER_CONTACT_RANGE[tier],
    observationAmbiguity: ambiguity,
    sensorDegradationIntensity: Math.round(degradation * 100) / 100,
    suggestedObjectives: objectives,
    rationale,
    suggestedSeed,
  };
}

function pickVisibility(tier: DifficultyTier, seed: number, traineeId: string): VisibilityCondition {
  const rng = createRng(deriveSeed(seed, traineeId));
  return rng.pick(TIER_VISIBILITY[tier]);
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
