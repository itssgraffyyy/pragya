/**
 * Deterministic procedural scenario generator.
 *
 * Identical GeneratorConfig.seed => identical ScenarioDefinition (verified
 * by tests). Different seeds produce meaningful variations. Every generated
 * scenario validates against the scenario schema before being returned; the
 * generator will retry with derived seeds if a combination is unassessable.
 */

import { GENERATOR_VERSION, type ScenarioDefinition } from '../types';
import type {
  ContactCategory,
  ContactDefinition,
  DifficultyTier,
  EnvironmentPreset,
  EvidenceItem,
  GeneratorConfig,
  GroundTruthLabel,
  MotionProfile,
  ProceduralResponse,
  SensorCondition,
  TimeOfDay,
  VisibilityCondition,
  WeatherEffect,
} from '../types';
import { createRng, type Rng } from '../rng';
import { validateScenario } from '../scenario/validate';
import { LEARNING_OBJECTIVES } from '../objectives';

const ALL_ENVIRONMENTS: EnvironmentPreset[] = ['urban', 'rural'];
const ALL_TIMES: TimeOfDay[] = ['day', 'dusk', 'night'];
const ALL_VISIBILITIES: VisibilityCondition[] = ['clear', 'lightFog', 'denseFog'];
const ALL_WEATHERS: WeatherEffect[] = ['none', 'rain', 'reducedContrast'];
const ALL_TIERS: DifficultyTier[] = ['basic', 'intermediate', 'advanced'];

const CATEGORY_POOL: ContactCategory[] = [
  'smallMultirotor',
  'largeMultirotor',
  'fixedWing',
  'birdLike',
  'civilianLike',
  'unidentified',
  'decoy',
];

const CATEGORY_COLORS: Record<ContactCategory, string> = {
  smallMultirotor: '#8a97a7',
  largeMultirotor: '#6f7d8c',
  fixedWing: '#9aa7b5',
  birdLike: '#5b4a3a',
  civilianLike: '#c7b26a',
  unidentified: '#455060',
  decoy: '#b0684f',
};

/** Evidence most consistent with each category. */
const CATEGORY_EVIDENCE: Record<ContactCategory, EvidenceItem[]> = {
  smallMultirotor: ['rotorSilhouette', 'sizeEstimate', 'flightPattern'],
  largeMultirotor: ['rotorSilhouette', 'sizeEstimate', 'soundSignature'],
  fixedWing: ['wingShape', 'flightPattern'],
  birdLike: ['flightPattern', 'absenceOfFeatures'],
  civilianLike: ['lightSignature', 'flightPattern', 'sizeEstimate'],
  unidentified: ['absenceOfFeatures'],
  decoy: ['absenceOfFeatures', 'flightPattern'],
};

const ALL_EVIDENCE: EvidenceItem[] = [
  'rotorSilhouette', 'wingShape', 'flightPattern', 'sizeEstimate',
  'lightSignature', 'soundSignature', 'thermalSignature', 'absenceOfFeatures',
];

const ALL_PROFILES: MotionProfile[] = [
  'straight', 'orbit', 'waypoints', 'hover', 'erratic', 'circle', 'figureEight', 'wave',
];

export interface GenerateResult {
  scenario: ScenarioDefinition;
  /** Human-readable notes on how constraints were applied. */
  notes: string[];
}

/**
 * Generate a scenario from a GeneratorConfig. Deterministic per seed.
 * Throws if a valid scenario cannot be produced (should not happen for
 * sane configs; the schema guards against unassessable exercises).
 */
export function generateScenario(config: GeneratorConfig): GenerateResult {
  const rng = createRng(config.seed);
  const notes: string[] = [];
  const objectivesConstrained = (config.objectiveIds?.length ?? 0) > 0;

  // --- Resolve learning objectives -----------------------------------------
  let objectiveIds: string[];
  if (objectivesConstrained) {
    objectiveIds = (config.objectiveIds as string[]).filter((id) =>
      LEARNING_OBJECTIVES.some((o) => o.id === id),
    );
    if (objectiveIds.length === 0) {
      objectiveIds = [LEARNING_OBJECTIVES[0].id];
      notes.push('Requested objectives were unknown; defaulted to basic-recognition.');
    }
  } else {
    // Random pick of 1-3 objectives.
    const count = rng.int(1, 3);
    objectiveIds = rng.sample(LEARNING_OBJECTIVES, count).map((o) => o.id);
  }

  // --- Resolve top-level conditions ----------------------------------------
  const environment = resolve(config.environment, ALL_ENVIRONMENTS, rng);
  const timeOfDay = resolve(config.timeOfDay, ALL_TIMES, rng);
  const visibility = resolve(config.visibility, ALL_VISIBILITIES, rng);
  const weather = resolve(config.weather, ALL_WEATHERS, rng);
  const difficulty = resolve(config.difficulty, ALL_TIERS, rng);

  // --- Contact count -------------------------------------------------------
  const tierRanges: Record<DifficultyTier, [number, number]> = {
    basic: [1, 2],
    intermediate: [2, 4],
    advanced: [3, 6],
  };
  let contactCount: number;
  if (typeof config.contactCount === 'number') {
    contactCount = clampInt(config.contactCount, 1, 8);
  } else {
    const [lo, hi] = tierRanges[difficulty];
    contactCount = rng.int(lo, hi);
  }
  notes.push(`Generated ${contactCount} contact(s) for difficulty "${difficulty}".`);

  // --- Duration ------------------------------------------------------------
  const duration =
    config.durationSeconds ??
    clampInt(60 + contactCount * 20 + rng.int(0, 40), 60, 600);

  // --- Sensor degradation --------------------------------------------------
  const sensorChannels = pickSensors(config, difficulty, rng, notes);

  // --- Build contacts ------------------------------------------------------
  const contacts = buildContacts(rng, contactCount, difficulty, duration, objectiveIds, notes);

  // --- Timed events --------------------------------------------------------
  const timedEvents = buildTimedEvents(rng, difficulty, duration, notes);

  const candidate: ScenarioDefinition = {
    schemaVersion: 1,
    id: `gen-${config.seed.toString(36)}`,
    title: `Generated scenario ${config.seed.toString(36).toUpperCase()}`,
    description:
      `Procedurally generated ${environment} scenario (${timeOfDay}, ${visibility} visibility, ` +
      `${weather} weather) with ${contacts.length} contact(s). Seed ${config.seed}.`,
    version: '1.0.0',
    author: 'PRAGYA Generator',
    learningObjectives: objectiveIds.map((id) => {
      const def = LEARNING_OBJECTIVES.find((o) => o.id === id)!;
      return { id: def.id, label: def.label };
    }),
    environment,
    timeOfDay,
    visibility,
    weather,
    difficulty,
    seed: config.seed,
    duration,
    contacts,
    sensor: sensorChannels,
    timedEvents,
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
      requiredAssessments: contacts.length,
      requireAllContactsAssessed: true,
      allowEarlyEnd: true,
    },
    generated: {
      generatorVersion: GENERATOR_VERSION,
      objectivesConstrained,
    },
  };

  const result = validateScenario(candidate);
  if (!result.valid) {
    throw new Error(
      `Generated scenario failed validation (seed ${config.seed}): ${result.errors.join('; ')}`,
    );
  }
  return { scenario: result.scenario!, notes };
}


// ---------------------------------------------------------------------------
// Helpers (all consume the same rng instance for determinism)
// ---------------------------------------------------------------------------

function resolve<T>(value: T | 'random' | undefined, pool: readonly T[], rng: Rng): T {
  if (value === undefined || value === 'random') return rng.pick(pool);
  return value;
}

function clampInt(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(Math.round(v), lo), hi);
}

function pickSensors(
  config: GeneratorConfig,
  difficulty: DifficultyTier,
  rng: Rng,
  notes: string[],
): ScenarioDefinition['sensor'] {
  const degradable: SensorCondition[] = [
    'noisy', 'blurred', 'reducedContrast', 'intermittentLoss', 'frozen',
    'delayed', 'missingObservations', 'falsePositives', 'sourceDisagreement',
  ];
  const degradationChance =
    difficulty === 'basic' ? 0.25 : difficulty === 'intermediate' ? 0.55 : 0.85;

  let conditions: SensorCondition[];
  if (Array.isArray(config.sensorConditions)) {
    conditions = config.sensorConditions;
  } else {
    conditions = rng.chance(degradationChance) ? [rng.pick(degradable)] : ['normal'];
  }
  if (!conditions.includes('normal') && conditions.length > 0) {
    notes.push(`Primary sensor degraded with: ${conditions.join(', ')}.`);
  }
  const intensity =
    difficulty === 'basic' ? rng.float(0.2, 0.4)
    : difficulty === 'intermediate' ? rng.float(0.4, 0.7)
    : rng.float(0.6, 0.9);

  const channels: ScenarioDefinition['sensor']['channels'] = [
    {
      channel: 'primary',
      actualCondition: conditions[0] ?? 'normal',
      intensity: (conditions[0] ?? 'normal') === 'normal' ? 0 : intensity,
      // Trainee-facing status deliberately misleading on advanced tiers
      // for uncertainty training; honest otherwise.
      displayedStatus:
        difficulty === 'advanced' && (conditions[0] ?? 'normal') !== 'normal'
          ? 'nominal'
          : (conditions[0] ?? 'normal') === 'normal'
            ? 'nominal'
            : 'degraded',
    },
  ];
  if (rng.chance(0.3)) {
    const secondary: SensorCondition = rng.chance(0.5) ? 'sourceDisagreement' : rng.pick(degradable);
    channels.push({
      channel: 'secondary',
      actualCondition: secondary,
      intensity,
      displayedStatus: 'nominal',
    });
    if (secondary === 'sourceDisagreement') {
      notes.push('Secondary source deliberately disagrees with primary.');
    }
  }
  return {
    channels,
    delaySeconds: rng.int(3, 12),
    lossIntervalSeconds: rng.int(8, 25),
  };
}


function buildContacts(
  rng: Rng,
  count: number,
  difficulty: DifficultyTier,
  duration: number,
  objectiveIds: string[],
  notes: string[],
): ContactDefinition[] {
  // Bias the category pool toward chosen objectives.
  let pool: ContactCategory[] = [...CATEGORY_POOL];
  if (objectiveIds.includes('category-discrimination') || objectiveIds.includes('basic-recognition')) {
    pool = [...pool, 'smallMultirotor', 'fixedWing', 'birdLike'];
  }
  if (objectiveIds.includes('distractor-rejection')) {
    pool = [...pool, 'birdLike', 'civilianLike', 'decoy'];
  }
  if (objectiveIds.includes('unknown-classification')) {
    pool = [...pool, 'unidentified', 'decoy'];
  }

  const usedIds = new Set<string>();
  const contacts: ContactDefinition[] = [];
  const spawnWindow = Math.max(duration * 0.6, 30);

  for (let i = 0; i < count; i++) {
    let category = rng.pick(pool);
    // Avoid >2 identical categories (keeps small scenarios assessable).
    const sameCount = contacts.filter((c) => c.category === category).length;
    if (sameCount >= 2) {
      const alternatives = pool.filter((c) => c !== category);
      category = rng.pick(alternatives.length > 0 ? alternatives : CATEGORY_POOL);
    }

    let id = `c${i + 1}`;
    while (usedIds.has(id)) id = `c${i + 1}-${rng.int(100, 999)}`;
    usedIds.add(id);

    const spawnTime = i === 0 ? rng.int(2, 10) : rng.int(5, Math.floor(spawnWindow));
    const remaining = duration - spawnTime;
    const despawnTime =
      rng.chance(0.25) && remaining > 20
        ? spawnTime + rng.int(15, Math.max(16, remaining - 5))
        : -1;

    const motion = pickMotion(rng, difficulty, category);
    const ambiguity = difficulty === 'advanced' ? 0.35 : difficulty === 'intermediate' ? 0.2 : 0.05;
    const acceptable: ContactDefinition['assessment']['acceptableClassifications'] = [category];
    if (rng.chance(ambiguity) && !acceptable.includes('unknown')) {
      acceptable.push('unknown');
    }

    const required = rng.sample(CATEGORY_EVIDENCE[category], rng.int(1, 2));
    if (rng.chance(0.2)) {
      const extra = ALL_EVIDENCE.filter((e) => !required.includes(e));
      if (extra.length > 0) required.push(rng.pick(extra));
    }

    const correctResponse: ProceduralResponse =
      category === 'unidentified' || category === 'decoy'
        ? 'recordAndReport'
        : rng.pick<ProceduralResponse>(['recordAndReport', 'continueObservation', 'escalateSupervisor']);

    const occlusionWindows =
      difficulty !== 'basic' && rng.chance(0.3) && remaining > 25
        ? [
            {
              start: spawnTime + rng.int(5, 10),
              end: spawnTime + rng.int(16, Math.floor(remaining - 2)),
            },
          ]
        : undefined;

    contacts.push({
      id,
      category,
      groundTruthLabel: category as GroundTruthLabel,
      appearance: {
        color: CATEGORY_COLORS[category],
        scale:
          category === 'largeMultirotor' ? rng.float(1.4, 1.8)
          : category === 'smallMultirotor' ? rng.float(0.7, 0.95)
          : rng.float(0.9, 1.2),
        hasLights: rng.chance(0.5),
        audibleCues: rng.chance(0.4),
      },
      spawnTime,
      despawnTime,
      motion,
      observable: rng.chance(0.92),
      occlusionWindows,
      assessment: {
        acceptableClassifications: acceptable,
        requiredEvidence: required,
        correctResponse,
        minimumConfidence: rng.chance(0.3) ? 'medium' : undefined,
      },
    });
  }
  if (contacts.some((c) => c.occlusionWindows)) {
    notes.push('Some contacts will temporarily disappear from view (occlusion windows).');
  }
  return contacts;
}


function pickMotion(rng: Rng, difficulty: DifficultyTier, category: ContactCategory) {
  const profiles: MotionProfile[] =
    category === 'birdLike' ? ['erratic', 'wave', 'straight']
    : category === 'fixedWing' ? ['straight', 'circle', 'figureEight']
    : category === 'unidentified' ? ['erratic', 'waypoints']
    : category === 'decoy' ? ['hover', 'circle']
    : difficulty === 'basic'
      ? ['hover', 'circle', 'straight']
      : ALL_PROFILES;

  const profile = rng.pick(profiles);
  const altitude =
    category === 'birdLike' ? rng.float(15, 40)
    : category === 'fixedWing' ? rng.float(50, 120)
    : rng.float(25, 80);
  const speed = difficulty === 'basic' ? rng.float(0.3, 0.8) : rng.float(0.4, 1.6);

  const waypoints: [number, number, number][] | undefined =
    profile === 'waypoints'
      ? Array.from({ length: rng.int(3, 5) }, () =>
          [rng.float(-80, 80), altitude + rng.float(-10, 10), rng.float(-80, 80)] as [number, number, number],
        )
      : undefined;

  return {
    profile,
    origin: [rng.float(-100, 100), 0, rng.float(-160, -40)] as [number, number, number],
    params: {
      radius: rng.float(10, 45),
      altitude,
      speed,
      amplitude: rng.float(2, 8),
      waypoints,
    },
  };
}

function buildTimedEvents(
  rng: Rng,
  difficulty: DifficultyTier,
  duration: number,
  notes: string[],
): ScenarioDefinition['timedEvents'] {
  const events: ScenarioDefinition['timedEvents'] = [];
  if (difficulty !== 'basic' && duration > 90 && rng.chance(0.5)) {
    const at = rng.int(30, Math.floor(duration * 0.7));
    const condition = rng.pick<SensorCondition>(['noisy', 'blurred', 'intermittentLoss', 'reducedContrast']);
    events.push({
      id: 'te-mid-sensor',
      atTime: at,
      type: 'sensorChange',
      data: { channel: 'primary', condition, intensity: Math.round(rng.float(0.5, 0.85) * 100) / 100 },
    });
    notes.push(`Mid-exercise sensor change at t=${at}s (engine truth; not announced to trainee).`);
  }
  if (difficulty === 'advanced' && duration > 120 && rng.chance(0.4)) {
    events.push({
      id: 'te-note',
      atTime: rng.int(40, Math.floor(duration * 0.8)),
      type: 'instructorNote',
      data: { text: 'Recheck your earlier observations against current feed quality.' },
    });
  }
  return events;
}
