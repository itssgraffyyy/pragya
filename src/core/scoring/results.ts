import type { IntegrityResult } from '../assessGuard/models';
import type { GroupScore } from '../groups/models';
/**
 * PRAGYA Module 2 — Scoring result types.
 * Structured assessment outputs; deterministic for identical inputs.
 */

import type {
  ConfidenceLevel,
  ContactAssessment,
  EvidenceItem,
  ScenarioDefinition,
  SimulationEvent,
  TraineeClassification,
} from '../types';

export type EvidenceState = 'observed' | 'inferred' | 'unavailable' | 'contradictory' | 'notVerifiable';

export interface ContactScore {
  contactId: string;
  allowsUnknown?: boolean;
  observationContext?: string;
  assessable: boolean;
  unassessableReason: string | null;
  /** 0..1 */
  detection: number;
  detectionDelaySeconds: number | null;
  acknowledged: boolean;
  /** 0..1 */
  classification: number;
  classificationOutcome: 'correct' | 'acceptableUnknown' | 'incorrect' | 'missing';
  submittedClassification: TraineeClassification | null;
  /** 0..1 */
  procedural: number;
  proceduralOutcome: 'correct' | 'acceptable' | 'incorrect' | 'missing';
  appliedRuleIds: string[];
  /** 0..1 */
  evidence: number;
  evidenceStates: Record<EvidenceItem, EvidenceState>;
  supportingEvidence: EvidenceItem[];
  missingEvidence: EvidenceItem[];
  contradictoryEvidence: EvidenceItem[];
  confidence: ConfidenceLevel | null;
  /** 0..1 — calibration contribution (informational, not in overall). */
  calibration: number;
}

export interface AssessmentResult {
  integrity?:IntegrityResult;
  evidenceMind?:import('../evidenceMind/models').EvidenceJudgment;
  groupAwareness?: {schemaVersion:1;groups:GroupScore[]};
  sessionId: string;
  traineeId: string;
  scenarioId: string;
  scenarioVersion: string;
  policyId: string;
  policyVersion: string;
  /** 0..100 */
  overall: number;
  categories: {
    detection: number;
    classification: number;
    procedural: number;
    evidence: number;
    /** 0..1 separate learning metric (not folded into overall). */
    confidenceCalibration: number;
  };
  contacts: ContactScore[];
  missedContacts: string[];
  unassessableContacts: string[];
  explanations: AssessmentExplanation[];
  calculatedAt: string;
}

export interface AssessmentExplanation {
  contactId: string;
  allowsUnknown?: boolean;
  observationContext?: string;
  category: 'detection' | 'classification' | 'procedural' | 'evidence' | 'confidence';
  whatHappened: string;
  availableInfo: string;
  ruleRef: string;
  why: string;
  revisitObjective: string;
}

export interface ScoringInput {
  sessionId: string;
  traineeId: string;
  scenario: ScenarioDefinition;
  events: SimulationEvent[];
  assessments: ContactAssessment[];
  /** Sim-time when the session ended. */
  endedAtSimTime: number;
}

