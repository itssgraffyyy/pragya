import { describe, expect, it } from 'vitest';
import { createProfile } from '../core/learning/profile';
import { learningProgress, addRefresherRecommendations } from '../core/learning/progress';
import { learningSession } from './learningFixtures';
import type { LearningPlan } from '../core/learning/plan';
const now='2026-12-01T00:00:00.000Z';const p=createProfile('T','2026-10-01T00:00:00.000Z','t1');
const plan:LearningPlan={schemaVersion:1,traineeId:p.id,updatedAt:now,recommendations:[],exercises:[],patterns:[]};
describe('learning progress and retention',()=>{
  it('compares compatible baseline and current evidence without combining condition groups',()=>{const a=learningSession('a','t1','wrong',1),b=learningSession('b','t1','correct',2);const r=learningProgress(p,[a,b],null,now);expect(r.competencies.find((c)=>c.competency==='classification')?.change).toBe(100);b.summary.scenarioSnapshot.timeOfDay='night';expect(learningProgress(p,[a,b],null,now).competencies.filter((c)=>c.competency==='classification').every((c)=>c.change===null)).toBe(true);});
  it('schedules configurable refreshers with past difficulty, without claiming measured decay',()=>{const r=learningProgress(p,[learningSession('s','t1','wrong')],null,now,14);expect(r.progression).toBe('refresherRecommended');expect(r.refreshers[0].reason).toContain('does not establish skill decay');const next=addRefresherRecommendations(p,plan,r,now);expect(next.recommendations.length).toBeGreaterThan(0);expect(addRefresherRecommendations(p,next,r,now)).toEqual(next);});
  it('keeps missing/future observations unassessed and preserves historical scores',()=>{const s=learningSession();const original=structuredClone(s);expect(learningProgress(p,[s],null,'2026-09-01T00:00:00.000Z').competencies).toEqual([]);learningProgress(p,[s],null,now);expect(s).toEqual(original);expect(learningProgress(p,[],null,now).unassessed).toEqual(['All competencies']);});
  it('does not schedule a refresher solely due to age when evidence was consistently strong and unassigned',()=>{expect(learningProgress(p,[learningSession()],null,now).refreshers).toEqual([]);expect(()=>learningProgress(p,[],null,now,0)).toThrow();});
});
