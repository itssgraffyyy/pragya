import { describe,it,expect } from 'vitest';
import { module5AdversarialCases } from './fixtures/module5Adversarial';
import { controlledSession } from '../core/assessGuard/testBench';
import { integrityForSession } from '../core/assessGuard/eligibility';
import { createProfile } from '../core/learning/profile';
import { calculateSkillDNA,cohortKey } from '../core/learning/skillDNA';
import { storedSessionSchema } from '../core/learning/validation';
import { SimulationEngine } from '../core/sim/engine';
import { GROUP_EXAMPLES } from '../core/scenario/bundled/scenariosGroup';
const profile=createProfile('Golden fixture learner','2026-10-01T00:00:00.000Z','golden-learner');
describe('reproducible Module 5 adversarial assessment pack',()=>{
 for(const fixture of module5AdversarialCases())it(fixture.id+': '+fixture.expected,()=>{
  const session=controlledSession(fixture.scenario,fixture.policy,fixture.participant,profile.id,'golden-'+fixture.id),snapshot=structuredClone(session),integrity=integrityForSession(session);
  expect(storedSessionSchema.safeParse(session).success).toBe(true);expect(integrity.competencies.find(c=>c.competency==='classification')!.state).toBe(fixture.classificationEligibility);expect(calculateSkillDNA(profile,[session]).measuredSessions>0).toBe(fixture.measured);expect(session).toEqual(snapshot);expect(integrity.competencies.every(c=>c.sourceEventIds.every(id=>session.events.events.some(e=>e.eventId===id)))).toBe(true);expect(fixture.references.length).toBeGreaterThan(0);
  if(fixture.id==='correct-unsupported-guess'){expect(session.assessment!.categories.classification).toBe(100);expect(session.assessment!.evidenceMind!.contacts[0].sufficiency).toBe('insufficient');}
  if(fixture.id==='partially-eligible')expect(integrity.competencies.find(c=>c.competency==='evidence')!.state).toBe('ineligible');
  if(fixture.id==='valid-group-ambiguity')expect(session.assessment!.groupAwareness!.groups[0].overall).toBe(100);
  if(fixture.id==='incompatible-comparison'){const baseline=module5AdversarialCases()[4];expect(cohortKey(session)).not.toBe(cohortKey(controlledSession(baseline.scenario,baseline.policy,'supported',profile.id)));}
 });
 it('rejects a contact reference attributed to the wrong observation group without appending a forged observation',()=>{const scenario=structuredClone(GROUP_EXAMPLES[2]);for(const state of scenario.groupTraining!.groups[0].states)state.members=['c1','c2'];const engine=new SimulationEngine({scenario,sessionId:'golden-attribution',traineeId:profile.id});engine.load();engine.start();engine.tick(1);engine.acknowledgeContact('c1');engine.acknowledgeContact('c3');expect(()=>engine.recordGroupObservation('g1',['c1','c3'])).toThrow();expect(engine.log.getAll().some(e=>e.type==='groupObservationRecorded')).toBe(false);});
});
