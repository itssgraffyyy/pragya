import { useEffect, useState } from 'react';
import type { StoredSession } from '../core/persistence/storage';
import { initStorage } from '../core/persistence/appStorage';
import { traineeHistory } from '../core/learning/trainees';
import { coachAnswer } from '../core/learning/coach';
import { learningPlanSchema, type LearningRecommendation } from '../core/learning/plan';
import { prepareExercise } from '../core/learning/adaptive';
import { useSimulationStore } from '../store/simulationStore';
import { useSettingsStore } from '../store/settingsStore';
import { startAdaptiveExercise } from '../store/learningActions';
import { LearningNav } from './LearningNav';
export function PostSessionLearning({session}:{session:StoredSession}){
  const pending=useSimulationStore((s)=>s.learningPending);const revision=useSimulationStore((s)=>s.learningRevision);
  const [name,setName]=useState('');const [insight,setInsight]=useState<string[]>([]);const [next,setNext]=useState<LearningRecommendation|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  useEffect(()=>{let active=true;setNext(null);setName('');if(pending)return;void initStorage().then(async(storage)=>{
    const profile=await storage.getTrainee(session.summary.traineeId);if(!profile){if(active)setInsight(['This legacy trainee ID has no profile. Create a profile and associate the session explicitly to include it in learning history.']);return;}
    const h=await traineeHistory(storage,profile);const raw=await storage.getLearningPlan(profile.id);const plan=raw?learningPlanSchema.parse(raw):null;
    const feedback=coachAnswer(profile,h.sessions,plan,'next',new Date().toISOString());
    if(active){setName(profile.displayName);setInsight(feedback.paragraphs);setNext(plan?.recommendations.find((r)=>r.id===feedback.recommendationId)??null);}
  }).catch((e:Error)=>{if(active)setError(e.message);});return()=>{active=false;};},[session,pending,revision]);
  return <section className="panel p-4 my-4 space-y-3" data-testid="post-session-learning"><h3 className="text-xl">Your next learning step{name?' - '+name:''}</h3><LearningNav/>{pending?<p role="status">Saving assessment and updating Skill DNA...</p>:insight.map((p,i)=><p key={i}>{p}</p>)}{error&&<p role="alert">{error}</p>}
    {next&&<button className="border p-2" disabled={busy||pending} onClick={()=>{setBusy(true);setError('');void initStorage().then(async(storage)=>{
      const exercise=await prepareExercise(storage,session.summary.traineeId,next.id,next.status==='awaitingEvaluation'?'evaluation':'practice',new Date().toISOString());
      await storage.saveSettings({...await storage.getSettings(),traineeId:session.summary.traineeId});useSettingsStore.getState().update({traineeId:session.summary.traineeId});await startAdaptiveExercise(exercise.id);
    }).catch((e:Error)=>setError(e.message)).finally(()=>setBusy(false));}}>Start recommended exercise</button>}
  </section>;
}
