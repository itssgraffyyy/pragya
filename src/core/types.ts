/**
 * PRAGYA Module 1 — shared domain types.
 *
 * Contract between the simulation engine, scenario definitions, rendering
 * layer, event log and future modules (Module 2+).
 */

export const SCHEMA_VERSION = 1 as const;
export const GENERATOR_VERSION = '1.0.0' as const;

// ---------------------------------------------------------------------------
// Environment & conditions
// ---------------------------------------------------------------------------

export type EnvironmentPreset = 'urban' | 'rural';
export type TimeOfDay = 'day' | 'dusk' | 'night';
export type VisibilityCondition = 'clear' | 'lightFog' | 'denseFog';
export type WeatherEffect = 'none' | 'rain' | 'reducedContrast';

export interface EnvironmentalConditions {
  environment: EnvironmentPreset;
  timeOfDay: TimeOfDay;
  visibility: VisibilityCondition;
  weather: WeatherEffect;
}

// ---------------------------------------------------------------------------
// Aerial contacts
// ---------------------------------------------------------------------------

/**
 * Trainee-facing visual categories. Describe what a contact LOOKS like —
 * never its ground truth. Fictional/generalized only.
 */
export type ContactCategory =
  | 'smallMultirotor'
  | 'largeMultirotor'
  | 'fixedWing'
  | 'birdLike'
  | 'civilianLike'
  | 'unidentified'
  | 'decoy';

/** Ground-truth label used for scoring. Hidden during an active session. */
export type GroundTruthLabel =
  | 'smallMultirotor'
  | 'largeMultirotor'
  | 'fixedWing'
  | 'birdLike'
  | 'civilianLike'
  | 'unidentified'
  | 'decoy';

/** Classification options a trainee may submit (includes Unknown). */
export type TraineeClassification = ContactCategory | 'unknown';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

/** Instructor-approved procedural responses. Never weapon engagement. */
export type ProceduralResponse =
  | 'continueObservation'
  | 'requestVerification'
  | 'recordAndReport'
  | 'escalateSupervisor'
  | 'instructorBranch';

export const PROCEDURAL_RESPONSE_LABELS: Record<ProceduralResponse, string> = {
  continueObservation: 'Continue observation',
  requestVerification: 'Request additional verification',
  recordAndReport: 'Record and report',
  escalateSupervisor: 'Escalate to authorized supervisor',
  instructorBranch: 'Follow instructor-defined authorization branch',
};

export type ContactVisibilityState =
  | 'notYetSpawned'
  | 'visible'
  | 'occluded'
  | 'lost'
  | 'despawned';

export type TraineeDetectionState =
  | 'notDetected'
  | 'detected'
  | 'acknowledged'
  | 'markedUncertain'
  | 'verificationRequested';

/** Evidence items a trainee can select to support a classification. */
export type EvidenceItem =
  | 'rotorSilhouette'
  | 'wingShape'
  | 'flightPattern'
  | 'sizeEstimate'
  | 'lightSignature'
  | 'soundSignature'
  | 'thermalSignature'
  | 'absenceOfFeatures';

export const EVIDENCE_LABELS: Record<EvidenceItem, string> = {
  rotorSilhouette: 'Rotor silhouette observed',
  wingShape: 'Wing shape observed',
  flightPattern: 'Flight pattern consistent',
  sizeEstimate: 'Size estimate',
  lightSignature: 'Light signature',
  soundSignature: 'Sound signature',
  thermalSignature: 'Thermal signature',
  absenceOfFeatures: 'Absence of distinguishing features',
};

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

export type MotionProfile =
  | 'straight'
  | 'orbit'
  | 'waypoints'
  | 'hover'
  | 'erratic'
  | 'circle'
  | 'figureEight'
  | 'wave';

export interface MotionPath {
  profile: MotionProfile;
  /** Origin of the path in world units (x, ground y, z). */
  origin: [number, number, number];
  params: {
    radius?: number;
    altitude?: number;
    speed?: number;
    /** Waypoints as [x, y, z] for the `waypoints` profile. */
    waypoints?: [number, number, number][];
    /** Wobble amount for `erratic` profiles. */
    amplitude?: number;
  };
}

// ---------------------------------------------------------------------------
// Contacts in a scenario
// ---------------------------------------------------------------------------

/** Criteria used by the scoring engine (Module 2) after session end. */
export interface AssessmentCriteria {
  acceptableClassifications: TraineeClassification[];
  requiredEvidence: EvidenceItem[];
  correctResponse: ProceduralResponse;
  /** Minimum confidence for a correct submission, if any. */
  minimumConfidence?: ConfidenceLevel;
}

export interface ContactAppearance {
  color: string;
  scale: number;
  hasLights: boolean;
  audibleCues: boolean;
}

export interface ContactDefinition {
  id: string;
  category: ContactCategory;
  /** HIDDEN from trainee during active session. */
  groundTruthLabel: GroundTruthLabel;
  appearance: ContactAppearance;
  /** Simulation time (seconds) at which the contact appears. */
  spawnTime: number;
  /** Simulation time (seconds) at which the contact disappears; -1 = until scenario end. */
  despawnTime: number;
  motion: MotionPath;
  /** Whether trainees should be able to visually acquire this contact at all. */
  observable: boolean;
  /**
   * At these simulation times the contact temporarily leaves the trainee's
   * view (e.g. passes behind a building) and then returns.
   */
  occlusionWindows?: { start: number; end: number }[];
  assessment: AssessmentCriteria;
}

// ---------------------------------------------------------------------------
// Sensor degradation
// ---------------------------------------------------------------------------

export type SensorCondition =
  | 'normal'
  | 'noisy'
  | 'blurred'
  | 'reducedContrast'
  | 'intermittentLoss'
  | 'frozen'
  | 'delayed'
  | 'missingObservations'
  | 'falsePositives'
  | 'sourceDisagreement';

export interface SensorChannelState {
  channel: 'primary' | 'secondary';
  /** Actual internal condition (engine truth). */
  actualCondition: SensorCondition;
  /** Intensity 0..1 for conditions that support scaling. */
  intensity: number;
  /** What the trainee-facing status indicator displays. */
  displayedStatus: 'nominal' | 'degraded' | 'unknown';
}

export interface SensorConfiguration {
  channels: SensorChannelState[];
  /** Delay in simulation seconds applied to the delayed channel. */
  delaySeconds: number;
  /** Interval in simulation seconds between feed-loss blips for intermittentLoss. */
  lossIntervalSeconds: number;
}

// ---------------------------------------------------------------------------
// Timed events
// ---------------------------------------------------------------------------

export type TimedEventType =
  | 'sensorChange'
  | 'environmentShift'
  | 'contactOcclusion'
  | 'contactReveal'
  | 'instructorNote';

export interface TimedEvent {
  id: string;
  atTime: number;
  type: TimedEventType;
  data: Record<string, string | number | boolean>;
}

// ---------------------------------------------------------------------------
// Difficulty & scenario
// ---------------------------------------------------------------------------

export type DifficultyTier = 'basic' | 'intermediate' | 'advanced';

export interface LearningObjective {
  id: string;
  label: string;
}

export interface CompletionCondition {
  /** Required number of submitted assessments. */
  requiredAssessments: number;
  /** Require every contact to be assessed. */
  requireAllContactsAssessed: boolean;
  /** Whether the trainee may end the session early. */
  allowEarlyEnd: boolean;
}

export interface ScenarioDefinition {
  schemaVersion: number;
  id: string;
  title: string;
  description: string;
  version: string;
  author: string;
  learningObjectives: LearningObjective[];
  environment: EnvironmentPreset;
  timeOfDay: TimeOfDay;
  visibility: VisibilityCondition;
  weather: WeatherEffect;
  difficulty: DifficultyTier;
  seed: number;
  /** Scenario duration in simulation seconds. */
  duration: number;
  contacts: ContactDefinition[];
  sensor: SensorConfiguration;
  timedEvents: TimedEvent[];
  permittedActions: {
    acknowledge: boolean;
    classify: boolean;
    setConfidence: boolean;
    selectEvidence: boolean;
    proceduralResponse: boolean;
    requestVerification: boolean;
  };
  /** References to approved scoring rules for Module 2. */
  scoringRuleRefs: string[];
  completion: CompletionCondition;
  /** Set for procedurally generated scenarios. */
  generated?: {
    generatorVersion: string;
    objectivesConstrained: boolean;
  };
}

// ---------------------------------------------------------------------------
// Simulation state machine
// ---------------------------------------------------------------------------

export type SimulationState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'running'
  | 'paused'
  | 'completed'
  | 'aborted'
  | 'error';

export const SIMULATION_TRANSITIONS: Record<SimulationState, SimulationState[]> = {
  idle: ['loading', 'error'],
  loading: ['ready', 'error'],
  ready: ['running', 'aborted', 'error'],
  running: ['paused', 'completed', 'aborted', 'error'],
  paused: ['running', 'aborted', 'error'],
  completed: ['idle'],
  aborted: ['idle'],
  error: ['idle'],
};

// ---------------------------------------------------------------------------
// Event log (contract for Module 2 scoring)
// ---------------------------------------------------------------------------

export type SimulationEventType =
  | 'sessionStarted'
  | 'sessionPaused'
  | 'sessionResumed'
  | 'sessionCompleted'
  | 'sessionAborted'
  | 'sessionRestarted'
  | 'contactSpawned'
  | 'contactDespawned'
  | 'contactBecameVisible'
  | 'contactOccluded'
  | 'contactAcknowledged'
  | 'contactMarkedUncertain'
  | 'verificationRequested'
  | 'classificationSubmitted'
  | 'confidenceChanged'
  | 'evidenceSelected'
  | 'evidenceDeselected'
  | 'proceduralResponseSelected'
  | 'assessmentSubmitted'
  | 'sensorStateChanged'
  | 'environmentChanged'
  | 'timedEventOccurred'
  | 'errorOccurred';

export interface SimulationEvent {
  eventId: string;
  sessionId: string;
  traineeId: string;
  scenarioId: string;
  scenarioVersion: string;
  /** Simulation timestamp in seconds since session start. */
  simTimestamp: number;
  type: SimulationEventType;
  contactId?: string;
  actionDetails?: Record<string, string | number | boolean | string[]>;
  sensorState?: Record<string, string>;
  classification?: TraineeClassification;
  confidence?: ConfidenceLevel;
  evidence?: EvidenceItem[];
  proceduralResponse?: ProceduralResponse;
}

/** Versioned envelope for exporting/importing an event stream. */
export interface EventLogExport {
  logVersion: number;
  exportedAt: string;
  events: SimulationEvent[];
}

export const EVENT_LOG_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// Trainee workflow — per-contact assessment record
// ---------------------------------------------------------------------------

export interface ContactAssessment {
  contactId: string;
  acknowledged: boolean;
  detectionState: TraineeDetectionState;
  classification: TraineeClassification | null;
  confidence: ConfidenceLevel | null;
  evidence: EvidenceItem[];
  proceduralResponse: ProceduralResponse | null;
  submitted: boolean;
  /** Simulation time when the assessment was submitted. */
  submittedAt: number | null;
}

// ---------------------------------------------------------------------------
// Adaptive difficulty interface
// ---------------------------------------------------------------------------

export interface TraineePerformanceSummary {
  traineeId: string;
  /** 0..1 */
  recognitionAccuracy: number;
  /** 0..1 fraction of contacts never acknowledged. */
  missedContactRate: number;
  /** 0..1 — how well confidence matches actual correctness. */
  confidenceCalibration: number;
  /** 0..1 quality of evidence selection. */
  evidenceQuality: number;
  /** -1..1 recent trend (negative = declining). */
  recentTrend: number;
  /** 0..1 performance when sensors were degraded. */
  degradedPerformance: number;
  /** Number of samples behind the summary. */
  sampleCount: number;
}

export interface DifficultyRecommendation {
  recommendedTier: DifficultyTier;
  visibilityComplexity: VisibilityCondition;
  contactCountRange: [number, number];
  observationAmbiguity: 'low' | 'medium' | 'high';
  sensorDegradationIntensity: number; // 0..1
  suggestedObjectives: string[];
  /** Human-readable rationale for every applied rule. */
  rationale: string[];
  /** NEW seed must be used even if difficulty is unchanged. */
  suggestedSeed: number;
}

// ---------------------------------------------------------------------------
// Procedural generator input
// ---------------------------------------------------------------------------

export interface GeneratorConfig {
  seed: number;
  /** Constrain to specific learning objective ids when provided. */
  objectiveIds?: string[];
  environment?: EnvironmentPreset | 'random';
  timeOfDay?: TimeOfDay | 'random';
  visibility?: VisibilityCondition | 'random';
  weather?: WeatherEffect | 'random';
  contactCount?: number | 'random';
  sensorConditions?: SensorCondition[] | 'random';
  difficulty?: DifficultyTier | 'random';
  durationSeconds?: number;
}

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

export interface SessionSummaryRecord {
  sessionId: string;
  traineeId: string;
  scenarioId: string;
  scenarioTitle: string;
  scenarioVersion: string;
  seed: number;
  generatorVersion?: string;
  startedAt: string;
  endedAt: string;
  durationSimSeconds: number;
  status: 'completed' | 'aborted' | 'error';
  eventCount: number;
  assessments: {
    contactId: string;
    submittedClassification: TraineeClassification | null;
    groundTruth: GroundTruthLabel;
    correct: boolean | null;
    confidence: ConfidenceLevel | null;
    evidence: EvidenceItem[];
    proceduralResponse: ProceduralResponse | null;
  }[];
  /** Scenario snapshot so a session can be reviewed offline. */
  scenarioSnapshot: ScenarioDefinition;
}
