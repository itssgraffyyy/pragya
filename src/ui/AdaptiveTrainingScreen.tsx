import { WorkflowSteps } from './WorkspacePrimitives';
import { LearningNav } from './LearningNav';
import { prepareExercise, abandonExercise } from '../core/learning/adaptive';
import { startAdaptiveExercise } from '../store/learningActions';
import { learningPlanSchema, type AdaptiveExercise } from '../core/learning/plan';
import { useEffect, useState } from 'react';
import { useTraineeLearning } from './useTraineeLearning';
import { useUiStore } from '../store/uiStore';
import { initStorage } from '../core/persistence/appStorage';
import { refreshRecommendations, dismissRecommendation } from '../core/learning/recommendations';
import type { LearningPlan } from '../core/learning/plan';

export function AdaptiveTrainingScreen() {
  const data=useTraineeLearning();const [plan,setPlan]=useState<LearningPlan|null>(null);const [error,setError]=useState('');const [preview,setPreview]=useState<AdaptiveExercise|null>(null);const [busy,setBusy]=useState(false);
  useEffect(()=>{let active=true;setPlan(null);if(!data.profile)return;void initStorage().then((s)=>refreshRecommendations(s,data.profile!,new Date().toISOString())).then((p)=>{if(active)setPlan(p);}).catch((e:Error)=>{if(active)setError(e.message);});return()=>{active=false;};},[data.profile,data.sessions]);
  return <main className="p-6 max-w-5xl mx-auto space-y-4"><header className="flex justify-between"><h2 className="text-2xl">Adaptive training</h2><button onClick={()=>useUiStore.getState().navigate('home')}>Home</button></header><LearningNav/><WorkflowSteps steps={['Measure baseline','Targeted practice','Unseen evaluation','Retention follow-up']}/>
    {(error||data.error)&&<p role="alert">{error||data.error}</p>}
    {data.loading?<p role="status">Loading trainee history...</p>:!data.profile?<><p>Create or select a trainee profile first.</p><button onClick={()=>useUiStore.getState().navigate('trainees')}>Manage trainee profiles</button></>:<>
      <p>Personalized exercises for <strong>{data.profile.displayName}</strong>. Recommendations are computed offline from saved assessments.</p>
      {!plan&&!error&&<p role="status">Preparing recommendations...</p>}
      {(plan?.traineeId===data.profile?.id?plan:null)?.recommendations.map((r)=><article className="panel recommendation-card p-4 space-y-2" key={r.id} data-testid="recommendation-card"><h3>{r.expectedBehavior}</h3><p>{r.reason}</p><p>Target: {r.competency}; difficulty: {r.difficulty}; priority: {r.priority}; status: {r.status}.</p><p>Evidence: {r.evidenceSessionIds.join(', ')||'New trainee baseline; no weakness claimed'}.</p><p>Template reference: {r.templateId}; objective: {r.objective}.</p>
        {!['resolved','dismissed'].includes(r.status)&&<button className="border p-2" disabled={busy} onClick={()=>{setBusy(true);setError('');void initStorage().then(async(s)=>{const stage=r.status==='awaitingEvaluation'?'evaluation':'practice';const exercise=await prepareExercise(s,data.profile!.id,r.id,stage,new Date().toISOString());setPreview(exercise);setPlan(learningPlanSchema.parse(await s.getLearningPlan(data.profile!.id)));}).catch((e:Error)=>setError(e.message)).finally(()=>setBusy(false));}}>{r.status==='awaitingEvaluation'?'Prepare unseen evaluation':'Generate tailored exercise'}</button>}{' '}
        {r.status==='resolved'&&<button className="border p-2" disabled={busy} onClick={()=>{setBusy(true);void initStorage().then(async(s)=>{setPreview(await prepareExercise(s,data.profile!.id,r.id,'followup',new Date().toISOString()));setPlan(learningPlanSchema.parse(await s.getLearningPlan(data.profile!.id)));}).catch((e:Error)=>setError(e.message)).finally(()=>setBusy(false));}}>Prepare follow-up assessment</button>}
        {!['resolved','dismissed'].includes(r.status)&&<button className="border p-2" onClick={()=>{void initStorage().then(async(s)=>{if(!plan)return;const p=await dismissRecommendation(s,data.profile!.id,r.id);setPlan(p);}).catch((e:Error)=>setError(e.message));}}>Dismiss recommendation</button>}
      </article>)}
      {preview&&<section className="panel p-4" data-testid="adaptive-preview"><h3>Personalized scenario preview</h3><p>{preview.scenario.title}: {preview.stage}, seed {preview.seed}, {preview.scenario.difficulty}, {preview.scenario.contacts.length} contacts, {preview.scenario.timeOfDay}, {preview.scenario.visibility}.</p><p>Objective: {preview.scenario.learningObjectives.map((o)=>o.label).join(', ')}.</p><ul>{preview.rationale.map((x,i)=><li key={i}>{x}</li>)}</ul><p>{preview.unsupportedConstraints.join(' ')}</p><button className="border p-2" disabled={busy||preview.status!=='prepared'} onClick={()=>{setBusy(true);void startAdaptiveExercise(preview.id).catch((e:Error)=>setError(e.message)).finally(()=>setBusy(false));}}>Start personalized exercise</button></section>}
      <section className="panel p-4"><h3>Personalized exercise history</h3>{(plan?.traineeId===data.profile?.id?plan:null)?.exercises.map((e)=><p key={e.id}>{e.stage}: {e.status}; seed {e.seed}; session {e.sessionId??'not launched'}; recommendation {e.recommendationId}. {['prepared','running'].includes(e.status)&&<button className="border p-1" onClick={()=>void initStorage().then(async(s)=>{await abandonExercise(s,data.profile!.id,e.id);setPreview(null);setPlan(learningPlanSchema.parse(await s.getLearningPlan(data.profile!.id)));}).catch((x:Error)=>setError(x.message))}>Release unfinished assignment</button>}</p>)}</section>
    </>}
  </main>;
}
