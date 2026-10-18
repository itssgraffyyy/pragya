import { describe, expect, it } from 'vitest';
import { createProfile } from '../core/learning/profile';
import { longitudinalPatterns } from '../core/learning/longitudinal';
import { learningSession } from './learningFixtures';
const p=createProfile('T','2026-10-01T00:00:00.000Z','t1');
describe('longitudinal patterns',()=>{
  it('reports one-time mistakes without inventing a recurring pattern',()=>{const r=longitudinalPatterns(p,[learningSession('a','t1','wrong')]).find((x)=>x.patternId==='overconfidence');expect(r?.state).toBe('oneTimeMistake');expect(r?.evidence).toEqual([{sessionId:'a',contactId:'c1'}]);});
  it('tracks recurring overconfidence and evidence neglect with exact references',()=>{const xs=[1,2,3].map((d)=>learningSession('s'+d,'t1','wrong',d));const r=longitudinalPatterns(p,xs);expect(r.find((x)=>x.patternId==='overconfidence')?.state).toBe('possibleRecurringPattern');expect(r.find((x)=>x.patternId==='evidenceNeglect')?.observations).toBe(3);});
  it('recognizes fewer errors under comparable conditions, even with unchanged overall values',()=>{const xs=[1,2,3,4].map((d)=>learningSession('s'+d,'t1',d<3?'wrong':'correct',d));xs.forEach((s)=>s.assessment!.overall=50);const r=longitudinalPatterns(p,xs).find((x)=>x.patternId==='overconfidence');expect(r?.trend).toBe('improving');expect(r?.earlyRate).toBe(1);expect(r?.recentRate).toBe(0);});
  it('does not treat changed conditions or duplicate sessions as repeated observations',()=>{const a=learningSession('a','t1','wrong'),b=learningSession('b','t1','wrong');b.summary.scenarioSnapshot.timeOfDay='night';const r=longitudinalPatterns(p,[a,a,b]).filter((x)=>x.patternId==='overconfidence');expect(r).toHaveLength(2);expect(r.every((x)=>x.observations===1)).toBe(true);});
});
