import type { StoredSession } from '../persistence/storage';
import type { TraineeProfile } from './profile';
import type { LearningPlan } from './plan';
import { calculateSkillDNA, measuredSessions } from './skillDNA';
import { longitudinalPatterns } from './longitudinal';
import { learningProgress } from './progress';
export const COACH_QUESTIONS={score:'Why did I receive this score?',next:'What should I practice next?',patterns:'Which mistake keeps repeating?',progress:'Am I improving?',recommendation:'Why was this scenario recommended?',strengths:'What did I do well?',evidence:'Which evidence did I overlook?',confidence:'Was my confidence justified?'} as const;
export type CoachQuestion=keyof typeof COACH_QUESTIONS;
export interface CoachAnswer { question:CoachQuestion; paragraphs:string[]; references:{sessionId:string;contactIds:string[]}[]; objectives:string[]; recommendationId:string|null }
export function coachAnswer(profile:TraineeProfile,sessions:StoredSession[],plan:LearningPlan|null,question:CoachQuestion,asOf:string,sessionId?:string):CoachAnswer {
  const eligible=measuredSessions(profile,sessions).filter((s)=>s.summary.endedAt<=asOf);const latest=sessionId?eligible.find((s)=>s.summary.sessionId===sessionId):eligible[eligible.length-1];
  const answer:CoachAnswer={question,paragraphs:[],references:[],objectives:[],recommendationId:null};
  const cite=(ids:string[])=>{for(const id of new Set(ids)){const s=eligible.find((s)=>s.summary.sessionId===id);if(s&&!answer.references.some((r)=>r.sessionId===id))answer.references.push({sessionId:id,contactIds:s.assessment!.contacts.filter((c)=>c.assessable).map((c)=>c.contactId)});}};
  if(question==='next'||question==='recommendation') {
    const rec=plan?.recommendations.filter((r)=>r.traineeId===profile.id&&!['dismissed','resolved'].includes(r.status)).sort((a,b)=>Number(b.status==='awaitingEvaluation')-Number(a.status==='awaitingEvaluation')||b.priority-a.priority)[0];
    if(rec){answer.paragraphs.push(rec.reason,`Objective: ${rec.expectedBehavior}. Difficulty: ${rec.difficulty}.`);answer.objectives.push(rec.objective);answer.recommendationId=rec.id;cite(rec.evidenceSessionIds);}
    else answer.paragraphs.push('No supported recommendation is stored yet. Open adaptive training to establish a baseline or refresh your learning plan.');
    return answer;
  }
  if(!latest){answer.paragraphs.push('Insufficient completed assessment evidence for this question. Complete a baseline assessment first.');return answer;}
  if(question==='score') {
    const r=latest.assessment!;answer.paragraphs.push(`Session ${r.sessionId}: ${r.overall.toFixed(1)}/100 under ${r.policyId}@${r.policyVersion}. Calibration is separate from the overall score.`);
    for(const e of r.explanations.slice(0,15))answer.paragraphs.push(`${e.contactId}, ${e.category}: ${e.whatHappened} ${e.why} Rule: ${e.ruleRef}.`);cite([r.sessionId]);
  } else if(question==='evidence') {
    for(const c of latest.assessment!.contacts.filter((c)=>c.assessable)){
      const missing=c.missingEvidence.map((e)=>`${e} (${c.evidenceStates[e]??'state unavailable'})`);
      answer.paragraphs.push(`${c.contactId}: ${missing.length?'Required answer-key evidence not selected: '+missing.join(', '):'No required evidence is missing in this saved assessment.'}${c.contradictoryEvidence.length?' Contradictory selection: '+c.contradictoryEvidence.join(', '):''}`);
    }answer.objectives=['evidence-selection'];cite([latest.summary.sessionId]);
  } else if(question==='confidence') {
    const c=latest.assessment!.contacts.filter((c)=>c.assessable&&c.confidence);const highErrors=c.filter((c)=>c.confidence==='high'&&c.classificationOutcome==='incorrect');
    answer.paragraphs.push(`${c.length} contacts have recorded confidence. ${highErrors.length} were high-confidence incorrect classifications. Saved calibration: ${(latest.assessment!.categories.confidenceCalibration*100).toFixed(1)}%.`,'This compares reported confidence with the saved outcome; it does not diagnose a personal trait.');if(c.length<3)answer.paragraphs.push('Fewer than three suitable confidence observations: calibration feedback is provisional; no stable calibration conclusion is supported.');answer.objectives=['unknown-classification'];cite([latest.summary.sessionId]);
  } else if(question==='patterns') {
    const patterns=longitudinalPatterns(profile,eligible).filter((p)=>p.state==='possibleRecurringPattern'||p.state==='consistentlyObservedPattern');
    if(!patterns.length)answer.paragraphs.push('Insufficient evidence to establish a recurring pattern. Isolated mistakes are not treated as a personal characteristic.');
    for(const p of patterns){answer.paragraphs.push(`${p.name}: ${p.explanation} Current trend: ${p.trend}.`);cite(p.evidence.map((e)=>e.sessionId));answer.objectives.push(p.objective);}
  } else if(question==='strengths') {
    const dna=calculateSkillDNA(profile,eligible);const cohort=dna.cohorts[dna.cohorts.length-1];const strengths=cohort?.competencies.filter((c)=>c.state==='consistentStrength')??[];
    if(!strengths.length)answer.paragraphs.push('More comparable assessments are needed before labeling a consistent strength.');
    for(const c of strengths){answer.paragraphs.push(`${c.label}: ${c.score?.toFixed(1)}/100 across ${c.sessionCount} comparable assessments.`);cite(c.evidence.map((e)=>e.sessionId));}
  } else if(question==='progress') {
    const progress=learningProgress(profile,eligible,plan,asOf);const measured=progress.competencies.filter((c)=>c.change!==null&&c.sessionIds.length>=3);
    if(!measured.length)answer.paragraphs.push('Insufficient comparable evidence for an improvement conclusion. A higher overall score alone is not proof of learning transfer.');
    for(const c of measured){answer.paragraphs.push(`${c.competency}: baseline ${c.baseline?.toFixed(1)}, latest ${c.current?.toFixed(1)}, change ${c.change!>0?'+':''}${c.change!.toFixed(1)} points within one policy/condition cohort.`);cite(c.sessionIds);}
    if(progress.comparisons.some((c)=>c.stage==='unseenEvaluation'))answer.paragraphs.push('The progress view separates unseen evaluations from practiced exercises.');
  }
  return answer;
}
