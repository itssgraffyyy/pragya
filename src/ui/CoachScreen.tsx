import { useEffect, useMemo, useState } from 'react';
import { useTraineeLearning } from './useTraineeLearning';
import { useUiStore } from '../store/uiStore';
import { initStorage } from '../core/persistence/appStorage';
import { learningPlanSchema, type LearningPlan } from '../core/learning/plan';
import { COACH_QUESTIONS, coachAnswer, type CoachQuestion } from '../core/learning/coach';
import { AssessmentDashboard } from './AssessmentDashboard';
export function CoachScreen(){
  const data=useTraineeLearning();const [plan,setPlan]=useState<LearningPlan|null>(null);const [question,setQuestion]=useState<CoachQuestion>('score');const [reviewId,setReviewId]=useState('');const [error,setError]=useState('');const [asOf]=useState(()=>new Date().toISOString());
  useEffect(()=>{let active=true;setPlan(null);setReviewId('');if(!data.profile)return;void initStorage().then((s)=>s.getLearningPlan(data.profile!.id)).then((p)=>{if(active)setPlan(p?learningPlanSchema.parse(p):null);}).catch((e:Error)=>{if(active)setError(e.message);});return()=>{active=false;};},[data.profile]);
  const answer=useMemo(()=>data.profile?coachAnswer(data.profile,data.sessions,plan,question,asOf):null,[data.profile,data.sessions,plan,question,asOf]);const review=data.sessions.find((s)=>s.summary.sessionId===reviewId);
  return <main className="p-6 max-w-5xl mx-auto space-y-4"><header className="flex justify-between"><h2 className="text-2xl">Personal coach</h2><button onClick={()=>useUiStore.getState().navigate('home')}>Home</button></header><p>Offline, rules-based learning guidance. No language model, external API or operational certification is involved.</p>
    {(error||data.error)&&<p role="alert">{error||data.error}</p>}{data.loading?<p role="status">Loading learning evidence...</p>:!answer?<p>Create or select a trainee profile first.</p>:<>
      <p>Learning profile: {data.profile!.displayName}</p><div className="flex flex-wrap gap-2">{Object.entries(COACH_QUESTIONS).map(([id,label])=><button key={id} aria-pressed={question===id} className="border p-2" onClick={()=>setQuestion(id as CoachQuestion)}>{label}</button>)}</div>
      <section className="panel p-4" data-testid="coach-answer"><h3>{COACH_QUESTIONS[question]}</h3>{answer.paragraphs.map((p,i)=><p key={i} className="my-2">{p}</p>)}<p>Learning objectives: {[...new Set(answer.objectives)].join(', ')||'none established'}.</p><h4>Supporting assessments</h4>{answer.references.map((r)=><button key={r.sessionId} className="block underline" onClick={()=>setReviewId(r.sessionId)}>{r.sessionId}: {r.contactIds.join(', ')}</button>)}</section>
      <button className="border p-2" onClick={()=>useUiStore.getState().navigate('adaptive')}>Open recommended training</button>
      {review&&<AssessmentDashboard key={review.summary.sessionId} session={review}/>}
    </>}
  </main>;
}
