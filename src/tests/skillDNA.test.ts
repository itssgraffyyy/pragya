import { describe, expect, it } from 'vitest';
import { calculateSkillDNA, competencyFindings, DEFAULT_SKILL_CONFIG } from '../core/learning/skillDNA';
import { createProfile } from '../core/learning/profile';
import { learningSession } from './learningFixtures';
const p=createProfile('T','2026-10-01T00:00:00.000Z','t1');
const metric=(sessions:ReturnType<typeof learningSession>[],id='classification')=>calculateSkillDNA(p,sessions).cohorts[0]?.competencies.find((c)=>c.id===id);
describe('Skill DNA',()=>{
  it('is deterministic, deduplicates sessions and isolates trainees',()=>{const s=learningSession();expect(calculateSkillDNA(p,[s])).toEqual(calculateSkillDNA(p,[s,s]));expect(calculateSkillDNA(p,[learningSession('other','t2')]).measuredSessions).toBe(0);});
  it('distinguishes missing measurements from zero performance',()=>{expect(calculateSkillDNA(p,[]).cohorts).toEqual([]);expect(metric([learningSession('s','t1','wrong')])?.score).toBe(0);expect(metric([learningSession()],'degraded')?.score).toBeNull();});
  it('needs multiple sessions before establishing strength',()=>{expect(metric([learningSession()])?.state).toBe('insufficientEvidence');expect(metric([1,2,3].map((d)=>learningSession('s'+d,'t1','correct',d)))?.state).toBe('consistentStrength');});
  it('weights recent comparable evidence and measures improvement',()=>{const xs=[learningSession('s1','t1','wrong',1),learningSession('s2','t1','wrong',2),learningSession('s3','t1','correct',15)];expect(metric(xs)!.score).toBeGreaterThan(100/3);expect(metric(xs)?.state).toBe('improvementObserved');expect(competencyFindings(calculateSkillDNA(p,xs).cohorts[0]).improving.some((c)=>c.id==='classification')).toBe(true);expect(metric(xs)?.evidence.map((e)=>e.sessionId)).toEqual(['s1','s2','s3']);});
  it('separates policy versions and day/night conditions',()=>{const a=learningSession('a'),b=learningSession('b'),c=learningSession('c');b.assessment!.policyVersion='2';b.scoringPolicy!.policyVersion='2';c.summary.scenarioSnapshot.timeOfDay='night';expect(calculateSkillDNA(p,[a,b,c]).cohorts).toHaveLength(3);});
  it('rejects invalid aggregation rules and excludes missing or corrupt assessments',()=>{expect(()=>calculateSkillDNA(p,[],{...DEFAULT_SKILL_CONFIG,halfLifeDays:0})).toThrow();const s=learningSession();delete s.assessment;expect(calculateSkillDNA(p,[s]).measuredSessions).toBe(0);const unseen=learningSession('unseen');unseen.assessment!.contacts.forEach((c)=>c.assessable=false);expect(calculateSkillDNA(p,[unseen]).measuredSessions).toBe(0);});
});
