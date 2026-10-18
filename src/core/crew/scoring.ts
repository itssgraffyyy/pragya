import type { CrewSession,CrewEvent } from './models';
const percent=(n:number,d:number)=>d?Math.min(100,n/d*100):0;
export function scoreCrew(session:CrewSession){
 const {events,definition}=session;const ids=definition.scenario.contacts.map(c=>c.id);const expected=definition.expectations;
 const shares=events.filter(e=>e.kind==='shareObservation');
 const validShare=(e:CrewEvent)=>events.some(o=>o.kind==='observation'&&o.actorId===e.actorId&&o.contactId===e.contactId&&o.sequence<e.sequence&&e.evidence.length>0&&e.evidence.every(x=>o.observation?.availableEvidence.includes(x)));
 const acknowledge=(e:CrewEvent)=>events.find(a=>['acknowledgeInformation','confirmReceipt'].includes(a.kind)&&a.replyTo===e.id&&a.actorId!==e.actorId&&a.sequence>e.sequence);
 const missingAcknowledgments=shares.filter(e=>!acknowledge(e)).map(e=>e.id);
 const quality=shares.filter(validShare);const accepted=new Set(quality.map(e=>`${e.contactId}:${e.actorId}`));
 const decisions=events.filter(e=>e.kind==='decision');const reports=events.filter(e=>e.kind==='sendProceduralReport'&&e.decision);
 const discrepancies=ids.filter(id=>{const ds=decisions.filter(e=>e.contactId===id);return ds.length===2&&(ds[0].decision?.classification!==ds[1].decision?.classification||ds[0].decision?.response!==ds[1].decision?.response)&&!reports.some(r=>r.contactId===id&&acknowledge(r));});
 const sharedEvidence=(r:CrewEvent)=>r.decision?.evidence.length&&r.decision.evidence.every(x=>quality.some(e=>e.contactId===r.contactId&&e.sequence<r.sequence&&e.evidence.includes(x)));
 const metrics={sharing:percent(accepted.size,ids.length*expected.minimumSharesPerContact),acknowledgment:percent(quality.filter(e=>{const a=acknowledge(e);return a&&a.time-e.time<=expected.acknowledgeSeconds;}).length,Math.max(shares.length,ids.length*expected.minimumSharesPerContact)),consistency:percent(ids.length-discrepancies.length,ids.length)*(decisions.length/(ids.length*2)),clarity:percent(quality.length,Math.max(shares.length,ids.length*expected.minimumSharesPerContact)),reporting:percent(ids.filter(id=>reports.some(r=>r.contactId===id&&acknowledge(r)&&sharedEvidence(r))).length,ids.length),joint:percent(ids.filter(id=>reports.some(r=>r.contactId===id&&acknowledge(r))&&decisions.filter(d=>d.contactId===id).length===2).length,ids.length)};
 const weights=expected.weights;const score=Object.entries(metrics).reduce((sum,[k,v])=>sum+v*weights[k as keyof typeof weights],0);
 return {score:Math.round(score*100)/100,metrics,missingAcknowledgments,discrepancies,explanations:[...Object.entries(metrics).map(([k,v])=>`${k}: ${v.toFixed(1)} × ${weights[k as keyof typeof weights]} weighted points.`),'Acknowledgment earns credit only for evidence supported by a recorded observation. Speed alone is insufficient.','Consistency records agreement and confirmed reconciliation, not ground-truth accuracy. Individual accuracy is scored separately by Module 2.']};
}
