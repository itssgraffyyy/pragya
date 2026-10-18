import { useMemo, useState } from 'react';
import { useUiStore } from '../store/uiStore';
import { useTraineeLearning } from './useTraineeLearning';
import { calculateSkillDNA, conditionsFor, type SkillCohort } from '../core/learning/skillDNA';
import type { StoredSession } from '../core/persistence/storage';
import { AssessmentDashboard } from './AssessmentDashboard';

export function SkillChart({ cohort }: { cohort:SkillCohort }) {
  return <><svg viewBox="0 0 620 310" role="img" aria-label="Competency scores; full values and evidence in the table below" className="w-full max-w-3xl">
    {cohort.competencies.map((c,i)=><g key={c.id} transform={`translate(0,${i*30})`}><text x="0" y="19" fill="currentColor" fontSize="12">{c.label}</text><rect x="285" y="4" width="250" height="20" fill="#273549"/>{c.score!==null&&<rect x="285" y="4" width={c.score*2.5} height="20" fill="#42c8b0"/>}<text x="545" y="19" fill="currentColor" fontSize="12">{c.score?.toFixed(1)??'N/A'}</text></g>)}
  </svg><table className="w-full text-sm"><caption className="text-left">Evidence-backed competency breakdown</caption><thead><tr><th scope="col">Competency</th><th scope="col">Score</th><th scope="col">Samples / sessions</th><th scope="col">Coverage</th><th scope="col">State / trend</th></tr></thead><tbody>
    {cohort.competencies.map((c)=><tr key={c.id}><th scope="row" className="text-left py-1">{c.label}</th><td>{c.score?.toFixed(1)??'Unassessed'}</td><td>{c.samples} / {c.sessionCount}</td><td>{Math.round(c.coverage*100)}%</td><td>{c.state}; {c.trend===null?'no comparable trend':`${c.trend>0?'+':''}${c.trend} points`}</td></tr>)}
  </tbody></table></>;
}
export function LearningScreen() {
  const data=useTraineeLearning(); const [cohortId,setCohortId]=useState(''); const [condition,setCondition]=useState('all'); const [from,setFrom]=useState('');
  const [review,setReview]=useState<StoredSession|null>(null);
  const filtered=useMemo(()=>data.sessions.filter((s)=>{const c=conditionsFor(s);return (!from||s.summary.endedAt>=from)&&(condition==='all'||condition==='day'&&c.timeOfDay==='day'||condition==='night'&&c.timeOfDay==='night'||condition==='degraded'&&c.degraded||condition==='normal'&&!c.degraded||condition==='multi'&&c.multiContact||condition==='single'&&!c.multiContact);}),[data.sessions,condition,from]);
  const dna=useMemo(()=>data.profile?calculateSkillDNA(data.profile,filtered):null,[data.profile,filtered]);
  const cohort=dna?.cohorts.find((c)=>c.key===cohortId)??dna?.cohorts[dna.cohorts.length-1];
  if(data.loading)return <p role="status" className="p-6">Loading learning history...</p>;
  return <main className="p-6 max-w-6xl mx-auto space-y-4"><header className="flex justify-between"><h2 className="text-2xl">Skill DNA</h2><button onClick={()=>useUiStore.getState().navigate('home')}>Home</button></header>
    {data.error&&<p role="alert">{data.error}</p>}
    {!data.profile?<><p>Select or create a trainee profile to begin.</p><button className="border p-2" onClick={()=>useUiStore.getState().navigate('trainees')}>Manage trainee profiles</button></>:<>
      <p>Training profile: <strong>{data.profile.displayName}</strong>. These are simulator learning measures, not operational certification.</p>
      <button className="border p-2" onClick={()=>useUiStore.getState().navigate('trainees')}>Change trainee</button>{' '}<button className="border p-2" onClick={data.refresh}>Refresh learning history</button>
      <div className="flex flex-wrap gap-3"><label>History conditions <select className="bg-console-bg border p-1" aria-label="History conditions" value={condition} onChange={(e)=>setCondition(e.target.value)}>{['all','day','night','normal','degraded','single','multi'].map((v)=><option key={v}>{v}</option>)}</select></label><label>History from <input className="bg-console-bg border p-1" aria-label="History from" type="date" value={from} onChange={(e)=>setFrom(e.target.value)}/></label></div>
      {!cohort?<section className="panel p-4" data-testid="skill-empty"><h3>No measured competencies yet</h3><p>Complete a baseline assessment. Missing data is not a zero score.</p><button className="border p-2" onClick={()=>useUiStore.getState().navigate('scenarios')}>Start baseline assessment</button></section>:<>
        <label>Comparable assessment cohort <select className="w-full bg-console-bg border p-2" aria-label="Assessment cohort" value={cohort.key} onChange={(e)=>setCohortId(e.target.value)}>{dna!.cohorts.map((c)=><option key={c.key} value={c.key}>{c.label} ({c.sessionIds.length} sessions)</option>)}</select></label>
        <section className="panel p-4"><SkillChart cohort={cohort}/></section>
        <section className="panel p-4"><h3>Strengths and development areas</h3>{cohort.competencies.filter((c)=>['consistentStrength','developmentArea','improvementObserved'].includes(c.state)).map((c)=><p key={c.id}>{c.label}: {c.state} ({c.score?.toFixed(1)}). Supported by {c.evidence.map((e)=>e.sessionId).join(', ')}.</p>)}<p>Under-assessed: {cohort.competencies.filter((c)=>c.sessionCount<dna!.config.minSessions).map((c)=>c.label).join(', ')||'none'}.</p></section>
        <section className="panel p-4"><h3>Performance trends and supporting assessments</h3>{cohort.competencies.filter((c)=>c.evidence.length>0).map((c)=><details key={c.id}><summary>{c.label}: {c.evidence.length} assessment points</summary>
          <svg viewBox="0 0 500 110" className="w-full max-w-xl" role="img" aria-label={`${c.label} trend; values listed below`}><polyline fill="none" stroke="#42c8b0" strokeWidth="2" points={c.evidence.map((p,i)=>`${10+i*480/Math.max(1,c.evidence.length-1)},${105-p.score}`).join(' ')}/></svg>
          {c.evidence.map((p)=><div key={p.sessionId}><button className="underline" onClick={()=>setReview(data.sessions.find((s)=>s.summary.sessionId===p.sessionId)??null)}>{p.sessionId}: {p.score.toFixed(1)} at {p.date}</button></div>)}
        </details>)}</section>
        <section className="panel p-4"><h3>Day/night, normal/degraded and contact-count coverage</h3><p>Separate cohorts retain policy and condition differences; their scores are not pooled.</p>{dna!.cohorts.map((c)=><p key={c.key}>{c.label}: {c.sessionIds.length} sessions, classification {c.competencies.find((x)=>x.id==='classification')?.score?.toFixed(1)??'unassessed'}.</p>)}</section>
      </>}
      {review&&<AssessmentDashboard key={review.summary.sessionId} session={review}/>}
    </>}
  </main>;
}
