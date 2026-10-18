import { describe, expect, it } from 'vitest';
import { coachAnswer } from '../core/learning/coach';
import { createProfile } from '../core/learning/profile';
import { learningSession } from './learningFixtures';
const p=createProfile('T','2026-10-01T00:00:00.000Z','t1');const now='2026-10-18T00:00:00.000Z';
describe('offline learning coach',()=>{
  it('cites the saved score, rule and assessment instead of inventing an explanation',()=>{const s=learningSession('s','t1','wrong');const a=coachAnswer(p,[s],null,'score',now);expect(a.paragraphs.join(' ')).toContain(s.assessment!.overall.toFixed(1));expect(a.paragraphs.join(' ')).toContain('basic-recognition@1.0.0');expect(a.references[0].sessionId).toBe('s');});
  it('reports unselected evidence and high-confidence errors from actual contact records',()=>{const s=learningSession('s','t1','wrong');expect(coachAnswer(p,[s],null,'evidence',now).paragraphs.join(' ')).toContain('rotorSilhouette');expect(coachAnswer(p,[s],null,'confidence',now).paragraphs.join(' ')).toContain('1 were high-confidence incorrect');});
  it('does not infer history or improvement from absent or foreign records',()=>{expect(coachAnswer(p,[],null,'progress',now).paragraphs[0]).toContain('Insufficient');expect(coachAnswer(p,[learningSession('x','t2')],null,'score',now).references).toEqual([]);});
  it('bases recurring-pattern and progress statements on comparable records',()=>{const xs=[1,2,3].map((d)=>learningSession('s'+d,'t1','wrong',d));expect(coachAnswer(p,xs,null,'patterns',now).references).toHaveLength(3);expect(coachAnswer(p,xs,null,'progress',now).paragraphs.join(' ')).toContain('one policy/condition cohort');});
});
