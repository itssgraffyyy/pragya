import type { ScenarioDefinition } from '../../types';
import { buildContact, buildScenario } from './helpers';

/** 4 — Ambiguous classification (rural day, ambiguous contact). */
export const SCENARIO_AMBIGUOUS: ScenarioDefinition = buildScenario({
  id: 'scn-ambiguous',
  title: 'Ambiguous Classification — Uncertainty Handling',
  description:
    'A distant, indistinct contact moves over rural terrain in hazy conditions. Its visual ' +
    'category is deliberately ambiguous. The best answer may be "Unknown" with low confidence ' +
    'plus a verification request — practise communicating uncertainty honestly.',
  learningObjectives: [
    { id: 'unknown-classification', label: 'Select "Unknown" and low confidence when evidence is insufficient' },
    { id: 'evidence-selection', label: 'Select supporting observations that justify a classification' },
  ],
  environment: 'rural',
  timeOfDay: 'day',
  visibility: 'lightFog',
  weather: 'reducedContrast',
  difficulty: 'intermediate',
  seed: 4004,
  duration: 140,
  contacts: [
    buildContact({
      id: 'c1',
      category: 'unidentified',
      groundTruth: 'decoy',
      spawnTime: 8,
      motion: { profile: 'hover', origin: [20, 0, -140], altitude: 60, speed: 0.4 },
      scale: 0.8,
      assessment: {
        // The decoy is indistinguishable from a simple hovering object at
        // range; "unknown" is an accepted, arguably ideal, answer.
        acceptableClassifications: ['unidentified', 'unknown', 'decoy'],
        requiredEvidence: ['absenceOfFeatures'],
        correctResponse: 'requestVerification',
        minimumConfidence: 'low',
      },
    }),
  ],
});

/** 5 — Conflicting simulated sensor observations (urban night). */
export const SCENARIO_CONFLICTING_SOURCES: ScenarioDefinition = buildScenario({
  id: 'scn-conflicting-sources',
  title: 'Conflicting Sources — Sensor Disagreement',
  description:
    'The primary feed and a secondary simulated source disagree about a contact over an ' +
    'urban area at night. Recognise the disagreement, avoid premature certainty, and follow ' +
    'the verification procedure.',
  learningObjectives: [
    { id: 'conflicting-sources', label: 'Handle disagreement between simulated information sources' },
    { id: 'procedural-response', label: 'Choose an instructor-approved procedural response' },
  ],
  environment: 'urban',
  timeOfDay: 'night',
  visibility: 'clear',
  weather: 'none',
  difficulty: 'advanced',
  seed: 5005,
  duration: 160,
  contacts: [
    buildContact({
      id: 'c1',
      category: 'largeMultirotor',
      groundTruth: 'largeMultirotor',
      spawnTime: 10,
      motion: { profile: 'orbit', origin: [0, 0, -80], radius: 30, altitude: 50, speed: 0.7 },
      hasLights: true,
      assessment: {
        acceptableClassifications: ['largeMultirotor', 'unknown'],
        requiredEvidence: ['rotorSilhouette'],
        correctResponse: 'requestVerification',
      },
    }),
  ],
  sensorConditions: { primary: 'sourceDisagreement', secondary: 'sourceDisagreement', intensity: 0.7 },
  timedEvents: [
    {
      id: 'te-drop',
      atTime: 70,
      type: 'sensorChange',
      data: { channel: 'primary', condition: 'intermittentLoss', intensity: 0.6 },
    },
  ],
});

/** 6 — Mixed contacts with evidence-based reporting (rural dusk). */
export const SCENARIO_MIXED_EVIDENCE: ScenarioDefinition = buildScenario({
  id: 'scn-mixed-evidence',
  title: 'Mixed Contacts — Evidence-Based Reporting',
  description:
    'Four contacts of mixed categories appear over rural terrain at dusk, including a ' +
    'harmless civilian-like object and a bird-like distractor. Every assessment must include ' +
    'supporting evidence before submission.',
  learningObjectives: [
    { id: 'distractor-rejection', label: 'Reject harmless/distractor contacts without over-classifying' },
    { id: 'evidence-selection', label: 'Select supporting observations that justify a classification' },
    { id: 'multi-contact-tracking', label: 'Track multiple simultaneous contacts independently' },
  ],
  environment: 'rural',
  timeOfDay: 'dusk',
  visibility: 'clear',
  weather: 'rain',
  difficulty: 'advanced',
  seed: 6006,
  duration: 260,
  contacts: [
    buildContact({
      id: 'c1',
      category: 'civilianLike',
      groundTruth: 'civilianLike',
      spawnTime: 6,
      motion: { profile: 'straight', origin: [-60, 0, -120], altitude: 55, speed: 0.8 },
      hasLights: true,
      assessment: { requiredEvidence: ['lightSignature'], correctResponse: 'continueObservation' },
    }),
    buildContact({
      id: 'c2',
      category: 'smallMultirotor',
      groundTruth: 'smallMultirotor',
      spawnTime: 30,
      motion: { profile: 'circle', origin: [15, 0, -70], radius: 18, altitude: 35, speed: 1.0 },
      assessment: { requiredEvidence: ['rotorSilhouette'], correctResponse: 'recordAndReport' },
    }),
    buildContact({
      id: 'c3',
      category: 'birdLike',
      groundTruth: 'birdLike',
      spawnTime: 30,
      despawnTime: 150,
      motion: { profile: 'wave', origin: [40, 0, -60], altitude: 22, speed: 1.4, amplitude: 5 },
      assessment: { requiredEvidence: ['flightPattern'], correctResponse: 'continueObservation' },
    }),
    buildContact({
      id: 'c4',
      category: 'decoy',
      groundTruth: 'decoy',
      spawnTime: 120,
      motion: { profile: 'hover', origin: [-20, 0, -95], altitude: 48, speed: 0.3 },
      assessment: {
        acceptableClassifications: ['decoy', 'unidentified', 'unknown'],
        requiredEvidence: ['absenceOfFeatures'],
        correctResponse: 'recordAndReport',
      },
    }),
  ],
});
