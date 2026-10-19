import { trainingContractSchema } from '../assessGuard/models';
import { groupTrainingSchema } from '../groups/models';
/**
 * Zod schema for scenario definitions (schemaVersion 1).
 *
 * Validation errors are formatted path-by-path so instructors get useful
 * feedback ("contacts[2].spawnTime: expected number, received string").
 */

import { z } from 'zod';
import { SCHEMA_VERSION } from '../types';

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'expected a hex color like "#8fa3b8"');

export const contactCategorySchema = z.enum([
  'smallMultirotor',
  'largeMultirotor',
  'fixedWing',
  'birdLike',
  'civilianLike',
  'unidentified',
  'decoy',
]);

export const groundTruthLabelSchema = contactCategorySchema;

export const confidenceLevelSchema = z.enum(['low', 'medium', 'high']);

export const proceduralResponseSchema = z.enum([
  'continueObservation',
  'requestVerification',
  'recordAndReport',
  'escalateSupervisor',
  'instructorBranch',
]);

export const evidenceItemSchema = z.enum([
  'rotorSilhouette',
  'wingShape',
  'flightPattern',
  'sizeEstimate',
  'lightSignature',
  'soundSignature',
  'thermalSignature',
  'absenceOfFeatures',
]);

export const motionProfileSchema = z.enum([
  'straight',
  'orbit',
  'waypoints',
  'hover',
  'erratic',
  'circle',
  'figureEight',
  'wave',
]);

export const motionPathSchema = z.object({
  profile: motionProfileSchema,
  origin: z.tuple([z.number(), z.number(), z.number()]),
  params: z
    .object({
      radius: z.number().min(0).max(500).optional(),
      altitude: z.number().min(1).max(500).optional(),
      speed: z.number().min(0.05).max(20).optional(),
      waypoints: z.array(z.tuple([z.number(), z.number(), z.number()])).min(2).optional(),
      amplitude: z.number().min(0).max(50).optional(),
    })
    .strict(),
});

export const assessmentCriteriaSchema = z
  .object({
    acceptableClassifications: z.array(z.union([contactCategorySchema, z.literal('unknown')])).min(1),
    requiredEvidence: z.array(evidenceItemSchema),
    correctResponse: proceduralResponseSchema,
    minimumConfidence: confidenceLevelSchema.optional(),
  })
  .strict();

export const contactDefinitionSchema = z
  .object({
    id: z.string().min(1).max(64),
    category: contactCategorySchema,
    groundTruthLabel: groundTruthLabelSchema,
    appearance: z
      .object({
        color: hexColor,
        scale: z.number().min(0.2).max(5),
        hasLights: z.boolean(),
        audibleCues: z.boolean(),
      })
      .strict(),
    spawnTime: z.number().min(0),
    despawnTime: z.number().min(-1),
    motion: motionPathSchema,
    observable: z.boolean(),
    occlusionWindows: z
      .array(z.object({ start: z.number().min(0), end: z.number().min(0) }).strict())
      .optional(),
    assessment: assessmentCriteriaSchema,
  })
  .strict()
  .refine((c) => c.despawnTime === -1 || c.despawnTime > c.spawnTime, {
    message: 'despawnTime must be -1 (until end) or greater than spawnTime',
    path: ['despawnTime'],
  });

export const sensorConditionSchema = z.enum([
  'normal',
  'noisy',
  'blurred',
  'reducedContrast',
  'intermittentLoss',
  'frozen',
  'delayed',
  'missingObservations',
  'falsePositives',
  'sourceDisagreement',
]);

export const sensorChannelStateSchema = z
  .object({
    channel: z.enum(['primary', 'secondary']),
    actualCondition: sensorConditionSchema,
    intensity: z.number().min(0).max(1),
    displayedStatus: z.enum(['nominal', 'degraded', 'unknown']),
  })
  .strict();

export const sensorConfigurationSchema = z
  .object({
    channels: z.array(sensorChannelStateSchema).min(1),
    delaySeconds: z.number().min(0).max(120),
    lossIntervalSeconds: z.number().min(1).max(600),
  })
  .strict();

export const timedEventSchema = z
  .object({
    id: z.string().min(1),
    atTime: z.number().min(0),
    type: z.enum(['sensorChange', 'environmentShift', 'contactOcclusion', 'contactReveal', 'instructorNote']),
    data: z.record(z.union([z.string(), z.number(), z.boolean()])),
  })
  .strict();

export const scenarioDefinitionSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    groupTraining: groupTrainingSchema.optional(),
    trainingContract: trainingContractSchema.optional(),
    id: z.string().min(1).max(80),
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(2000),
    version: z.string().min(1).max(32),
    author: z.string().min(1).max(80),
    learningObjectives: z
      .array(z.object({ id: z.string().min(1), label: z.string().min(1) }).strict())
      .min(1),
    environment: z.enum(['urban', 'rural']),
    timeOfDay: z.enum(['day', 'dusk', 'night']),
    visibility: z.enum(['clear', 'lightFog', 'denseFog']),
    weather: z.enum(['none', 'rain', 'reducedContrast']),
    difficulty: z.enum(['basic', 'intermediate', 'advanced']),
    seed: z.number().int().min(0),
    duration: z.number().int().min(10).max(3600),
    contacts: z.array(contactDefinitionSchema).min(1),
    sensor: sensorConfigurationSchema,
    timedEvents: z.array(timedEventSchema),
    permittedActions: z
      .object({
        acknowledge: z.boolean(),
        classify: z.boolean(),
        setConfidence: z.boolean(),
        selectEvidence: z.boolean(),
        proceduralResponse: z.boolean(),
        requestVerification: z.boolean(),
      })
      .strict(),
    scoringRuleRefs: z.array(z.string().min(1)).min(1),
    completion: z
      .object({
        requiredAssessments: z.number().int().min(0),
        requireAllContactsAssessed: z.boolean(),
        allowEarlyEnd: z.boolean(),
      })
      .strict(),
    generated: z
      .object({
        generatorVersion: z.string().min(1),
        objectivesConstrained: z.boolean(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((s, ctx) => {
    const groupIds=new Set<string>(),stateIds=new Set<string>();
    for(const [index,group] of (s.groupTraining?.groups??[]).entries()){
      if(groupIds.has(group.id))ctx.addIssue({code:'custom',path:['groupTraining','groups',index,'id'],message:'Duplicate group id'});groupIds.add(group.id);
      let previous=-1;
      for(const state of group.states){
        if(stateIds.has(state.id)||state.atTime<=previous||state.atTime>=s.duration||new Set(state.members).size!==state.members.length)ctx.addIssue({code:'custom',path:['groupTraining'],message:'Group states require unique IDs, increasing times and distinct members within scenario duration'});
        stateIds.add(state.id);previous=state.atTime;
        if(state.members.some(id=>!s.contacts.some(c=>c.id===id)))ctx.addIssue({code:'custom',path:['groupTraining'],message:'Group references an unknown contact'});
      }
    }
    // Cross-field semantic checks beyond shape validation.
    const ids = new Set<string>();
    s.contacts.forEach((c, i) => {
      if (ids.has(c.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate contact id "${c.id}"`,
          path: ['contacts', i, 'id'],
        });
      }
      ids.add(c.id);
    });
    s.contacts.forEach((c, i) => {
      if (c.despawnTime !== -1 && c.despawnTime > s.duration) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `despawnTime (${c.despawnTime}s) exceeds scenario duration (${s.duration}s)`,
          path: ['contacts', i, 'despawnTime'],
        });
      }
      if (c.spawnTime >= s.duration) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `spawnTime (${c.spawnTime}s) is at or after scenario end (${s.duration}s); contact would never appear`,
          path: ['contacts', i, 'spawnTime'],
        });
      }
    });
    const primaryCount = s.sensor.channels.filter((ch) => ch.channel === 'primary').length;
    if (primaryCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'exactly one primary sensor channel is required',
        path: ['sensor', 'channels'],
      });
    }
    if (s.completion.requiredAssessments > s.contacts.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          `requiredAssessments (${s.completion.requiredAssessments}) exceeds number of contacts (${s.contacts.length}); session would be uncompletable`,
        path: ['completion', 'requiredAssessments'],
      });
    }
  });

export type ScenarioZod = z.infer<typeof scenarioDefinitionSchema>;
