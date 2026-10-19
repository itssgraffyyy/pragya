import { describe,it,expect } from 'vitest';
import { comparableDemoSeed } from '../core/demo/candidate';
import { generateCurriculumCandidate,DEFAULT_LEARNING_DEMAND } from '../core/curriculum/generation';
import { INITIAL_CURRICULUM } from '../core/curriculum/catalogue';
import { POLICY_BASIC_RECOGNITION } from '../core/scoring/samplePolicies';
describe('synthetic walkthrough comparison cohort',()=>{
 it('replaces a generated degraded-secondary baseline with an actually comparable candidate, preserving generator output',()=>{
  const key='demo-regression-0',objective=INITIAL_CURRICULUM.find(o=>o.objectiveId==='category-discrimination')!;
  const original=generateCurriculumCandidate(key,objective,DEFAULT_LEARNING_DEMAND,505,POLICY_BASIC_RECOGNITION,8);
  expect(original.scenario.sensor.channels.length).toBeGreaterThan(1);
  const seed=comparableDemoSeed(key,objective,POLICY_BASIC_RECOGNITION);
  expect(seed).toBeGreaterThan(505);expect(seed).toBeLessThan(537);
  const chosen=generateCurriculumCandidate(key,objective,DEFAULT_LEARNING_DEMAND,seed,POLICY_BASIC_RECOGNITION,8);
  expect(chosen.scenario.sensor.channels).toHaveLength(1);expect(chosen.scenario.sensor.channels[0].actualCondition).toBe('normal');
  expect(chosen.scenario.timedEvents.some(e=>e.type==='sensorChange')).toBe(false);
  expect(chosen.quality.status).not.toBe('invalid_for_declared_assessment');
  expect(generateCurriculumCandidate(key,objective,DEFAULT_LEARNING_DEMAND,505,POLICY_BASIC_RECOGNITION,8)).toEqual(original);
 });
});
