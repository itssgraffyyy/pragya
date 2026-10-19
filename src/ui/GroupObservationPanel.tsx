import { useEffect,useRef,useState } from 'react';
import type { GroupView,GroupReport } from '../core/groups/models';
import { useSimulationStore } from '../store/simulationStore';
export function GroupObservationPanel({group,interactive}:{group:GroupView;interactive:boolean}){
 const [selected,setSelected]=useState<string[]>([]),[report,setReport]=useState<GroupReport>('relationshipUncertain'),[confidence,setConfidence]=useState<'low'|'medium'|'high'>('low');
 useEffect(()=>setSelected([]),[group.stateId]);
 const store=useSimulationStore;const ref=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{
  if(!interactive||!group.available||group.presented||!ref.current||typeof IntersectionObserver==='undefined')return;
  let frame=0;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting&&e.intersectionRatio>=.95))frame=requestAnimationFrame(()=>{if(document.visibilityState==='visible')store.getState().presentGroupCue(group.id,group.stateId);});},{threshold:.95});observer.observe(ref.current);return()=>{observer.disconnect();cancelAnimationFrame(frame);};
 },[group.id,group.stateId,group.available,group.presented,interactive]);
 return <section className="panel p-3 space-y-2" data-testid={`group-${group.id}`}><h3>{group.label} — synthetic group awareness</h3><p ref={ref}>{group.cue}</p><p>Current visible references: {group.members.join(', ')||'unavailable'}. These cues do not establish real-world coordination or intent.</p>
 {group.members.map(id=><label className="block" key={id}><input type="checkbox" aria-label={`Group observation ${id}`} disabled={!interactive||!group.available||!!group.report} checked={selected.includes(id)} onChange={e=>setSelected(xs=>e.target.checked?[...xs,id]:xs.filter(x=>x!==id))}/>{id}</label>)}
 <button disabled={!interactive||!group.available||!selected.length||!!group.report} onClick={()=>store.getState().recordGroupObservation(group.id,selected)}>Record group observation</button>
 <p>Recorded references for this cue: {group.recordedContactIds.join(', ')||'none'}. Acknowledge individual contacts before recording their references.</p>
 <label>Group report<select aria-label="Group report" disabled={!interactive||!!group.report} value={report} onChange={e=>setReport(e.target.value as GroupReport)}><option value="relationshipUncertain">Relationship uncertain</option><option value="observedGrouping">Observed synthetic grouping</option><option value="independentObservations">Independent observations</option></select></label>
 <label>Group confidence<select aria-label="Group confidence" disabled={!interactive||!!group.report} value={confidence} onChange={e=>setConfidence(e.target.value as typeof confidence)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
 <button disabled={!interactive||!group.available||!group.recordedContactIds.length||!!group.report} onClick={()=>store.getState().submitGroupReport(group.id,report,confidence)}>Submit group report</button>{group.report&&<p>Committed group report: {group.report}</p>}
 </section>;
}
