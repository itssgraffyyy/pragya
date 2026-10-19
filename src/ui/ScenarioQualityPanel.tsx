import { WorkflowSteps } from './WorkspacePrimitives';
import { useEffect,useRef,useState } from 'react';
import type { LocalActor } from '../core/unit/models';
import type { CompetencyKey,TrainingContract } from '../core/assessGuard/models';
import { declareAssessment } from '../core/assessGuard/declare';
import { scenarioTestBench,type ScenarioBenchReport } from '../core/assessGuard/testBench';
import { reviewAssessment } from '../core/assessGuard/reviewService';
import { defaultPolicyFor } from '../core/scoring/defaultPolicy';
import { initStorage } from '../core/persistence/appStorage';
import { scenarioDefinitionSchema } from '../core/scenario/schema';
import type { ScenarioDefinition } from '../core/types';
export function ScenarioQualityPanel({text,actor,unitId,onDeclare,onApproved}:{text:string;actor:LocalActor|null;unitId:string|null;onDeclare:(scenario:ScenarioDefinition)=>void;onApproved:(id:string|undefined)=>void}){
 const [report,setReport]=useState<ScenarioBenchReport|null>(null),[error,setError]=useState(''),[rationale,setRationale]=useState(''),[waived,setWaived]=useState<string[]>([]),[busy,setBusy]=useState(false),[approval,setApproval]=useState('');
 const [competency,setCompetency]=useState<CompetencyKey>('classification'),[stage,setStage]=useState<TrainingContract['stage']>('independent_assessment');const latest=useRef(text);latest.current=text;
 useEffect(()=>{setReport(null);setError('');setWaived([]);setApproval('');onApproved(undefined);},[text,onApproved]);
 function declare(){try{const source=scenarioDefinitionSchema.parse(JSON.parse(text));const scenario=declareAssessment({...source,curriculum:undefined,id:`ag-${crypto.randomUUID()}`,title:`${source.title.slice(0,90)} — assessment version`,version:'1.0.0'} as ScenarioDefinition,[competency,'evidence'],stage);onDeclare(scenario);}catch(e){setError(e instanceof Error?e.message:String(e));}}
 function run(){try{const source=JSON.parse(text);setReport(scenarioTestBench(source,defaultPolicyFor(source)));setError('');}catch(e){setError(e instanceof Error?e.message:String(e));}}
 async function approve(){setBusy(true);setError('');const snapshot=text;try{const source=scenarioDefinitionSchema.parse(JSON.parse(snapshot));const review=await reviewAssessment(await initStorage(),actor,unitId,source,defaultPolicyFor(source),rationale,waived.map(checkId=>({checkId,rationale})));if(latest.current===snapshot){setApproval(review.approved?`Approved by ${review.authorId}; version ${review.scenarioVersion}; review ${review.id}`:'Review recorded; unresolved checks prevent approval.');onApproved(review.approved?review.id:undefined);}}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 return <section className="panel quality-workflow workflow-form p-4 my-4 space-y-3" data-testid="scenario-quality"><h3>AssessGuard — scenario quality and instructor review</h3><p>Automated checks are decision support, not educational certification. Legacy scenarios remain playable without invented observation history.</p>
 <WorkflowSteps steps={['Declare objectives','Run test bench','Review findings','Approve version']}/><label>Declared competency<select aria-label="Declared competency" value={competency} onChange={e=>setCompetency(e.target.value as CompetencyKey)}>{['detection','classification','evidence','calibration','procedure','degraded','multiContact','uncertainty','reporting','consistency'].map(id=><option key={id}>{id}</option>)}</select></label>
 <label>Assessment mode<select aria-label="Assessment mode" value={stage} onChange={e=>setStage(e.target.value as typeof stage)}>{['guided_practice','independent_assessment','unseen_evaluation','retention_followup'].map(id=><option key={id}>{id}</option>)}</select></label>
 <button disabled={busy} onClick={declare}>Create declared assessment copy</button>{' '}<button disabled={busy} onClick={run}>Run scenario test bench</button>
 {error&&<p role="alert">{error}</p>}{approval&&<p role="status">{approval}</p>}
 {report&&<><p className="quality-status" data-testid="quality-status">{report.status} · reproduction seed {report.seed}</p><p>Passed checks: {report.passedCheckIds.join(', ')}</p>{report.checks.map(c=><div className="quality-finding" data-severity={c.severity} key={c.id}><h4>{c.severity}: {c.id} · {c.objective}</h4><p>Expected: {c.expected}. Observed: {c.observed}. References: {c.references.join(', ')}. Suggested correction: {c.correction??'Instructor judgment required'}.</p>{c.severity==='warning'&&<label><input type="checkbox" aria-label={`Waive ${c.id}`} checked={waived.includes(c.id)} onChange={e=>setWaived(ids=>e.target.checked?[...ids,c.id]:ids.filter(id=>id!==c.id))}/>Waive warning with the recorded review rationale</label>}</div>)}
 <details><summary>Controlled synthetic participant results</summary>{report.trials.map(t=><p key={t.participant}>{t.participant}: {t.status}; classification {t.classification??'unavailable'}; evidence {t.evidence??'unavailable'}; {t.error??t.eligibility?.competencies.map(c=>`${c.competency}: ${c.state}`).join('; ')}. Source events: {t.sourceEventIds.join(', ')}.</p>)}</details>
 {report.limitations.map(x=><p key={x}>{x}</p>)}<label>Instructor review rationale<textarea aria-label="Instructor review rationale" value={rationale} onChange={e=>setRationale(e.target.value)} minLength={10} maxLength={4000}/></label><button disabled={busy||rationale.trim().length<10||report.status==='invalid_for_declared_assessment'} onClick={()=>void approve()}>Approve reviewed configuration</button></>}
 </section>;
}
