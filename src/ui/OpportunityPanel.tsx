import { useEffect,useRef } from 'react';
import type { OpportunityView } from '../core/assessGuard/models';
import { useSimulationStore } from '../store/simulationStore';
export function OpportunityPanel({opportunity}:{opportunity:OpportunityView}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!opportunity.available||opportunity.presented||opportunity.channel!=='text'||!ref.current||typeof IntersectionObserver==='undefined')return;
  let frame=0;const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;frame=requestAnimationFrame(()=>{if(document.visibilityState==='visible')useSimulationStore.getState().presentOpportunity(opportunity.id);});});observer.observe(ref.current);
  return()=>{observer.disconnect();cancelAnimationFrame(frame);};
 },[opportunity.id,opportunity.available,opportunity.presented,opportunity.channel]);
 if(!opportunity.available)return null;
 return <div ref={ref} className="panel p-3 space-y-2" data-testid={`opportunity-${opportunity.id}`}><h3>Synthetic observation — {opportunity.contactId}</h3><p>{opportunity.cue}</p><p>{opportunity.channel} source · {opportunity.presented?'presentation instrumented':'presentation not established'} · this does not establish human perception.</p><button disabled={!opportunity.presented||opportunity.acknowledged} onClick={()=>useSimulationStore.getState().acknowledgeOpportunity(opportunity.id)}>{opportunity.acknowledged?'Observation recorded':`Record observation ${opportunity.contactId}`}</button></div>;
}
