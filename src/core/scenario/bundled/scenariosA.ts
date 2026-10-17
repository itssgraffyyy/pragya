/**
 * Bundled scripted scenarios (6).
 * Each covers a distinct learning objective set. All validate against
 * scenario schema v1.
 */

import type { ScenarioDefinition } from '../../types';
import { buildContact, buildScenario } from './helpers';

/** 1 — Basic single-contact recognition (day, clear, urban). */
export const SCENARIO_SINGLE_RECOGNITION: ScenarioDefinition = buildScenario({
  id: 'scn-single-recognition',
  title: 'Single Contact — Basic Recognition',
  description:
    'A single small multirotor-like contact appears over an urban area in clear daylight. ' +
    'Acknowledge the contact, classify it, set confidence, select supporting evidence and ' +
    'submit an instructor-approved procedural response.',
  learningObjectives: [
    { id: 'basic-recognition', label: 'Recognize a single basic aerial contact' },
    { id: 'procedural-response', label: 'Choose an instructor-approved procedural response' },
  ],
  environment: 'urban',
  timeOfDay: 'day',
  visibility: 'clear',
  weather: 'none',
  difficulty: 'basic',
  seed: 1001,
  duration: 120,
  contacts: [
    buildContact({
      id: 'c1',
      category: 'smallMultirotor',
      groundTruth: 'smallMultirotor',
      spawnTime: 5,
      motion: { profile: 'circle', origin: [0, 0, -70], radius: 20, altitude: 35, speed: 0.6 },
      hasLights: true,
      assessment: {
        requiredEvidence: ['rotorSilhouette'],
        correctResponse: 'recordAndReport',
      },
    }),
  ],
});

/** 2 — Low-visibility observation (night, dense fog, rural). */
export const SCENARIO_LOW_VISIBILITY: ScenarioDefinition = buildScenario({
  id: 'scn-low-visibility',
  title: 'Low Visibility — Night Fog Observation',
  description:
    'Dense fog at night over a rural area. A contact with navigation lights appears briefly ' +
    'and is partially occluded. Practise maintaining observation and expressing appropriate ' +
    'uncertainty when evidence is limited.',
  learningObjectives: [
    { id: 'low-visibility-observation', label: 'Maintain observation under reduced visibility' },
    { id: 'unknown-classification', label: 'Select "Unknown" and low confidence when evidence is insufficient' },
  ],
  environment: 'rural',
  timeOfDay: 'night',
  visibility: 'denseFog',
  weather: 'none',
  difficulty: 'intermediate',
  seed: 2002,
  duration: 150,
  contacts: [
    buildContact({
      id: 'c1',
      category: 'unidentified',
      groundTruth: 'largeMultirotor',
      spawnTime: 10,
      motion: { profile: 'waypoints', origin: [-30, 0, -90], altitude: 45, speed: 0.5,
        waypoints: [[-30, 45, -90], [10, 48, -75], [40, 45, -95], [0, 42, -110]] },
      hasLights: true,
      occlusionWindows: [{ start: 60, end: 80 }],
      assessment: {
        // Ground truth is a large multirotor but it is intentionally hard to
        // tell; "unknown" is also acceptable and may be the best answer.
        acceptableClassifications: ['largeMultirotor', 'unknown'],
        requiredEvidence: ['absenceOfFeatures'],
        correctResponse: 'requestVerification',
      },
    }),
  ],
});

/** 3 — Multiple contacts appearing sequentially and simultaneously (urban dusk). */
export const SCENARIO_MULTI_CONTACT: ScenarioDefinition = buildScenario({
  id: 'scn-multi-contact',
  title: 'Multiple Contacts — Sequential and Simultaneous',
  description:
    'Three contacts appear over an urban area at dusk: one initially, then two more ' +
    'simultaneously. Track each contact independently and submit a separate assessment for each.',
  learningObjectives: [
    { id: 'multi-contact-tracking', label: 'Track multiple simultaneous contacts independently' },
    { id: 'category-discrimination', label: 'Discriminate multirotor vs fixed-wing vs bird-like contacts' },
  ],
  environment: 'urban',
  timeOfDay: 'dusk',
  visibility: 'lightFog',
  weather: 'none',
  difficulty: 'intermediate',
  seed: 3003,
  duration: 200,
  contacts: [
    buildContact({
      id: 'c1',
      category: 'fixedWing',
      groundTruth: 'fixedWing',
      spawnTime: 8,
      motion: { profile: 'figureEight', origin: [10, 0, -100], radius: 35, altitude: 70, speed: 0.9 },
      assessment: { requiredEvidence: ['wingShape'], correctResponse: 'recordAndReport' },
    }),
    buildContact({
      id: 'c2',
      category: 'smallMultirotor',
      groundTruth: 'smallMultirotor',
      spawnTime: 60,
      motion: { profile: 'hover', origin: [-40, 0, -60], altitude: 30, speed: 0.5 },
      hasLights: true,
      assessment: { requiredEvidence: ['rotorSilhouette'], correctResponse: 'recordAndReport' },
    }),
    buildContact({
      id: 'c3',
      category: 'birdLike',
      groundTruth: 'birdLike',
      spawnTime: 60,
      despawnTime: 130,
      motion: { profile: 'erratic', origin: [30, 0, -50], altitude: 25, speed: 1.2, amplitude: 6 },
      assessment: {
        requiredEvidence: ['flightPattern'],
        correctResponse: 'continueObservation',
      },
    }),
  ],
});
