import { describe, expect, it } from 'vitest';
import { createProfile } from '../core/learning/profile';
import { calculateSkillDNA } from '../core/learning/skillDNA';
import { longitudinalPatterns } from '../core/learning/longitudinal';
import { recommendLearning, refreshRecommendations } from '../core/learning/recommendations';
import { MemoryStorage } from '../core/persistence/memoryStorage';
import { learningSession } from './learningFixtures';
const p=createProfile('T','2026-10-01T00:00:00.000Z','t1'); const now='2026-10-18T00:00:00.000Z';
function recs(xs:ReturnType<typeof learningSession>[],existing:ReturnType<typeof recommendLearning>=[]){return recommendLearning(p,calculateSkillDNA(p,xs),longitudinalPatterns(p,xs),xs,existing,now);}
describe('personalized recommendations',()=>{
  it('offers baseline training for missing evidence without claiming weakness',()=>{const r=recs([]);expect(r[0].objective).toBe('basic-recognition');expect(r[0].reason).toContain('no personal weakness');});
  it('prioritizes recurring concerns and maps them to actual objectives and templates',()=>{const r=recs([1,2,3].map((d)=>learningSession('s'+d,'t1','wrong',d)));expect(r[0].priority).toBe(92);expect(r.some((x)=>x.competency==='classification')).toBe(true);expect(r.find((x)=>x.competency==='calibration')?.objective).toBe('unknown-classification');expect(r.every((x)=>x.evidenceSessionIds.length===3)).toBe(true);});
  it('does not duplicate active or identical dismissed recommendations and does not mutate inputs',()=>{const r=recs([]);const before=structuredClone(r);expect(recs([],r)).toEqual(r);expect(r).toEqual(before);r[0].status='dismissed';expect(recs([],r)).toHaveLength(1);});
  it('broadens conditions after consistent strong performance and persists a plan',async()=>{const xs=[1,2,3].map((d)=>learningSession('s'+d,'t1','correct',d));const r=recs(xs);expect(r.some((x)=>x.constraints.timeOfDay==='night')).toBe(true);const s=new MemoryStorage();await s.saveTrainee(p);for(const x of xs)await s.saveSession(x);await refreshRecommendations(s,p,now);expect((await s.getLearningPlan('t1'))?.recommendations.length).toBeGreaterThan(0);});
});
