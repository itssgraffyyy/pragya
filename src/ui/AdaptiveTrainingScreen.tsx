import { useEffect, useState } from 'react';
import { useTraineeLearning } from './useTraineeLearning';
import { useUiStore } from '../store/uiStore';
import { initStorage } from '../core/persistence/appStorage';
import { refreshRecommendations } from '../core/learning/recommendations';
import type { LearningPlan } from '../core/learning/plan';

export function AdaptiveTrainingScreen() {
  const data=useTraineeLearning();const [plan,setPlan]=useState<LearningPlan|null>(null);const [error,setError]=useState('');
  useEffect(()=>{let active=true;setPlan(null);if(!data.profile)return;void initStorage().then((s)=>refreshRecommendations(s,data.profile!,new Date().toISOString())).then((p)=>{if(active)setPlan(p);}).catch((e:Error)=>{if(active)setError(e.message);});return()=>{active=false;};},[data.profile,data.sessions]);
  return <main className="p-6 max-w-5xl mx-auto space-y-4"><header className="flex justify-between"><h2 className="text-2xl">Adaptive training</h2><button onClick={()=>useUiStore.getState().navigate('home')}>Home</button></header>
    {(error||data.error)&&<p role="alert">{error||data.error}</p>}
    {data.loading?<p role="status">Loading trainee history...</p>:!data.profile?<><p>Create or select a trainee profile first.</p><button onClick={()=>useUiStore.getState().navigate('trainees')}>Manage trainee profiles</button></>:<>
      <p>Personalized exercises for <strong>{data.profile.displayName}</strong>. Recommendations are computed offline from saved assessments.</p>
      {!plan&&!error&&<p role="status">Preparing recommendations...</p>}
      {plan?.recommendations.map((r)=><article className="panel p-4 space-y-2" key={r.id} data-testid="recommendation-card"><h3>{r.expectedBehavior}</h3><p>{r.reason}</p><p>Target: {r.competency}; difficulty: {r.difficulty}; priority: {r.priority}; status: {r.status}.</p><p>Evidence: {r.evidenceSessionIds.join(', ')||'New trainee baseline; no weakness claimed'}.</p><p>Template reference: {r.templateId}; objective: {r.objective}.</p>
        {!['resolved','dismissed'].includes(r.status)&&<button className="border p-2" onClick={()=>{void initStorage().then(async(s)=>{const p={...plan,recommendations:plan.recommendations.map((x)=>x.id===r.id?{...x,status:'dismissed' as const}:x)};await s.saveLearningPlan(p);setPlan(p);}).catch((e:Error)=>setError(e.message));}}>Dismiss recommendation</button>}
      </article>)}
    </>}
  </main>;
}
