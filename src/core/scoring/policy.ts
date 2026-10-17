/**
 * PRAGYA Module 2 — Scoring policy schema (versioned, Zod-validated).
 *
 * A scoring policy is instructor-configurable JSON: weights, thresholds,
 * decision-tree nodes, expected procedural actions and explanation templates.
 * Every AssessmentResult references the policy id + version that produced it,
 * so historical results never change when a new policy is introduced.
 */

import { z } from 'zod';

export const SCORING_POLICY_VERSION = 1 as const;

export const scoringWeightsSchema = z
  .object({
    /** 0..1 fractions; must sum to 1. */
    detection: z.number().min(0).max(1),
    classification: z.number().min(0).max(1),
    procedural: z.number().min(0).max(1),
    evidence: z.number().min(0).max(1),
  })
  .strict()
  .superRefine((w, ctx) => {
    const sum = w.detection + w.classification + w.procedural + w.evidence;
    if (Math.abs(sum - 1) > 1e-6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `scoring weights must sum to 1 (got ${sum.toFixed(4)})`,
        path: ['detection'],
      });
    }
  });

export const detectionThresholdsSchema = z
  .object({
    /** Ack within this many sim-seconds of spawn => full detection credit. */
    promptSeconds: z.number().min(0).max(3600),
    /** Ack within this many sim-seconds => partial credit (linear decay). */
    lateSeconds: z.number().min(0).max(3600),
  })
  .strict()
  .refine((t) => t.lateSeconds >= t.promptSeconds, {
    message: 'lateSeconds must be >= promptSeconds',
    path: ['lateSeconds'],
  });

export const decisionNodeSchema: z.ZodType<DecisionNode> = z.lazy(() =>
  z
    .object({
      id: z.string().min(1).max(80),
      /** Human-readable rule, shown in explanations. */
      description: z.string().min(1).max(500),
      /** Which field of the assessment this node inspects. */
      kind: z.enum(['proceduralMatch', 'classificationMatch', 'evidencePresent', 'confidenceReasonable']),
      /** Expected value(s) for match kinds. */
      expected: z.array(z.string().min(1)).optional(),
      /** Score awarded when the rule passes (0..1). */
      passScore: z.number().min(0).max(1),
      /** Score awarded when the rule fails (0..1). */
      failScore: z.number().min(0).max(1),
      /** Optional nested rules evaluated when this node passes. */
      children: z.array(decisionNodeSchema).optional(),
    })
    .strict(),
);

export interface DecisionNode {
  id: string;
  description: string;
  kind: 'proceduralMatch' | 'classificationMatch' | 'evidencePresent' | 'confidenceReasonable';
  expected?: string[];
  passScore: number;
  failScore: number;
  children?: DecisionNode[];
}

export const scoringPolicySchema = z
  .object({
    schemaVersion: z.literal(SCORING_POLICY_VERSION),
    policyId: z.string().min(1).max(80),
    policyVersion: z.string().min(1).max(32),
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(2000),
    weights: scoringWeightsSchema,
    detectionThresholds: detectionThresholdsSchema,
    /** Classification credit: correct / acceptable-unknown / wrong / missing. */
    classificationScores: z
      .object({
        correct: z.number().min(0).max(1),
        acceptableUnknown: z.number().min(0).max(1),
        incorrect: z.number().min(0).max(1),
        missing: z.number().min(0).max(1),
      })
      .strict(),
    /** Decision trees evaluated for procedural responses. */
    decisionTrees: z.array(decisionNodeSchema).min(1),
    /** Evidence requirements per scenario (informational; scenario data wins). */
    evidenceRequirements: z.array(z.string().min(1)).optional(),
    /** Behavior for contacts that never became observable. */
    unassessablePolicy: z.enum(['exclude', 'zero']),
    explanationTemplates: z.record(z.string().min(1), z.string().min(1).max(1000)).optional(),
  })
  .strict();

export type ScoringPolicy = z.infer<typeof scoringPolicySchema>;
export type ScoringWeights = z.infer<typeof scoringWeightsSchema>;

/** Default illustrative training weights (25/30/30/15). */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  detection: 0.25,
  classification: 0.3,
  procedural: 0.3,
  evidence: 0.15,
};

export function parseScoringPolicy(json: unknown): ScoringPolicy {
  return scoringPolicySchema.parse(json);
}

export function validateScoringPolicy(json: unknown): { ok: true; policy: ScoringPolicy } | { ok: false; errors: string[] } {
  const result = scoringPolicySchema.safeParse(json);
  if (result.success) return { ok: true, policy: result.data };
  return {
    ok: false,
    errors: result.error.errors.map((e) => `${e.path.join('.') || '(root)'}: ${e.message}`),
  };
}
