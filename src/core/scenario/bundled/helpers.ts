/**
 * Shared builders for bundled scripted scenarios. Keeps scenario files
 * concise while producing full ScenarioDefinition objects that validate
 * against the schema.
 */

import type {
  AssessmentCriteria,
  ContactCategory,
  ContactDefinition,
  EvidenceItem,
  GroundTruthLabel,
  MotionPath,
  ProceduralResponse,
  ScenarioDefinition,
  SensorCondition,
} from '../../types';

export interface ContactSpec {
  id: string;
  category: ContactCategory;
  groundTruth: GroundTruthLabel;
  spawnTime: number;
  despawnTime?: number;
  motion?: Partial<MotionPath['params']> & {
    profile?: MotionPath['profile'];
    origin?: [number, number, number];
  };
  observable?: boolean;
  color?: string;
  scale?: number;
  hasLights?: boolean;
  audibleCues?: boolean;
  occlusionWindows?: { start: number; end: number }[];
  assessment?: Partial<AssessmentCriteria>;
}

const DEFAULT_COLORS: Record<ContactCategory, string> = {
  smallMultirotor: '#8a97a7',
  largeMultirotor: '#6f7d8c',
  fixedWing: '#9aa7b5',
  birdLike: '#5b4a3a',
  civilianLike: '#c7b26a',
  unidentified: '#455060',
  decoy: '#b0684f',
};

const DEFAULT_EVIDENCE: Record<ContactCategory, EvidenceItem[]> = {
  smallMultirotor: ['rotorSilhouette'],
  largeMultirotor: ['rotorSilhouette', 'sizeEstimate'],
  fixedWing: ['wingShape'],
  birdLike: ['flightPattern'],
  civilianLike: ['lightSignature'],
  unidentified: ['absenceOfFeatures'],
  decoy: ['absenceOfFeatures'],
};

export function buildContact(spec: ContactSpec): ContactDefinition {
  const motion: MotionPath = {
    profile: spec.motion?.profile ?? 'circle',
    origin: spec.motion?.origin ?? [0, 0, -80],
    params: {
      radius: spec.motion?.radius ?? 25,
      altitude: spec.motion?.altitude ?? 40,
      speed: spec.motion?.speed ?? 0.8,
      amplitude: spec.motion?.amplitude ?? 4,
      waypoints: spec.motion?.waypoints,
    },
  };
  return {
    id: spec.id,
    category: spec.category,
    groundTruthLabel: spec.groundTruth,
    appearance: {
      color: spec.color ?? DEFAULT_COLORS[spec.category],
      scale: spec.scale ?? 1,
      hasLights: spec.hasLights ?? false,
      audibleCues: spec.audibleCues ?? false,
    },
    spawnTime: spec.spawnTime,
    despawnTime: spec.despawnTime ?? -1,
    motion,
    observable: spec.observable ?? true,
    occlusionWindows: spec.occlusionWindows,
    assessment: {
      acceptableClassifications: spec.assessment?.acceptableClassifications ?? [spec.category],
      requiredEvidence: spec.assessment?.requiredEvidence ?? DEFAULT_EVIDENCE[spec.category],
      correctResponse:
        spec.assessment?.correctResponse ??
        defaultResponse(spec.category),
      minimumConfidence: spec.assessment?.minimumConfidence,
    },
  };
}

function defaultResponse(category: ContactCategory): ProceduralResponse {
  if (category === 'unidentified' || category === 'decoy') return 'recordAndReport';
  if (category === 'birdLike' || category === 'civilianLike') return 'continueObservation';
  return 'recordAndReport';
}

export interface ScenarioSpec {
  id: string;
  title: string;
  description: string;
  learningObjectives: { id: string; label: string }[];
  environment: ScenarioDefinition['environment'];
  timeOfDay: ScenarioDefinition['timeOfDay'];
  visibility: ScenarioDefinition['visibility'];
  weather: ScenarioDefinition['weather'];
  difficulty: ScenarioDefinition['difficulty'];
  seed: number;
  duration: number;
  contacts: ContactDefinition[];
  sensorConditions?: { primary?: SensorCondition; secondary?: SensorCondition; intensity?: number };
  delaySeconds?: number;
  lossIntervalSeconds?: number;
  timedEvents?: ScenarioDefinition['timedEvents'];
  completion?: Partial<ScenarioDefinition['completion']>;
}

export function buildScenario(spec: ScenarioSpec): ScenarioDefinition {
  const primaryCondition = spec.sensorConditions?.primary ?? 'normal';
  const secondaryCondition = spec.sensorConditions?.secondary;
  const intensity = spec.sensorConditions?.intensity ?? 0.6;
  const channels: ScenarioDefinition['sensor']['channels'] = [
    {
      channel: 'primary',
      actualCondition: primaryCondition,
      intensity: primaryCondition === 'normal' ? 0 : intensity,
      displayedStatus: primaryCondition === 'normal' ? 'nominal' : 'degraded',
    },
  ];
  if (secondaryCondition) {
    channels.push({
      channel: 'secondary',
      actualCondition: secondaryCondition,
      intensity,
      displayedStatus: 'nominal',
    });
  }
  return {
    schemaVersion: 1,
    id: spec.id,
    title: spec.title,
    description: spec.description,
    version: '1.0.0',
    author: 'PRAGYA Team',
    learningObjectives: spec.learningObjectives,
    environment: spec.environment,
    timeOfDay: spec.timeOfDay,
    visibility: spec.visibility,
    weather: spec.weather,
    difficulty: spec.difficulty,
    seed: spec.seed,
    duration: spec.duration,
    contacts: spec.contacts,
    sensor: {
      channels,
      delaySeconds: spec.delaySeconds ?? 5,
      lossIntervalSeconds: spec.lossIntervalSeconds ?? 12,
    },
    timedEvents: spec.timedEvents ?? [],
    permittedActions: {
      acknowledge: true,
      classify: true,
      setConfidence: true,
      selectEvidence: true,
      proceduralResponse: true,
      requestVerification: true,
    },
    scoringRuleRefs: ['default-v1'],
    completion: {
      requiredAssessments: spec.completion?.requiredAssessments ?? spec.contacts.length,
      requireAllContactsAssessed: spec.completion?.requireAllContactsAssessed ?? true,
      allowEarlyEnd: spec.completion?.allowEarlyEnd ?? false,
    },
  };
}
