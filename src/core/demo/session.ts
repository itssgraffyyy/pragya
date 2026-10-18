import { SimulationEngine } from '../sim/engine';
import { buildSessionExport } from '../sim/sessionSummary';
import type { ScenarioDefinition } from '../types';
import type { ScoringPolicy } from '../scoring/policy';

/** Scripted synthetic decisions, executed by the real engine. Never writes scores. */
export function demoSession(scenario:ScenarioDefinition,traineeId:string,sessionId:string,correct:boolean,at:string,policy?:ScoringPolicy){
 const engine=new SimulationEngine({scenario:structuredClone(scenario),traineeId,sessionId});engine.load();engine.start();
 for(let i=0;i<scenario.duration&&engine.state==='running';i++){
  engine.tick(1);
  for(const contact of engine.traineeView().contacts){
   if(!['visible','occluded'].includes(contact.visibility)||contact.assessment.submitted)continue;
   const def=scenario.contacts.find(c=>c.id===contact.id)!;
   engine.acknowledgeContact(contact.id);
   const classification=correct?def.assessment.acceptableClassifications[0]:def.assessment.acceptableClassifications.includes('birdLike')?'fixedWing':'birdLike';
   engine.setClassification(contact.id,classification);engine.setConfidence(contact.id,'high');
   if(correct)for(const evidence of def.assessment.requiredEvidence)engine.toggleEvidence(contact.id,evidence,true);
   engine.setProceduralResponse(contact.id,correct?def.assessment.correctResponse:def.assessment.correctResponse==='escalateSupervisor'?'recordAndReport':'escalateSupervisor');
   engine.submitAssessment(contact.id);
  }
 }
 const session=structuredClone(buildSessionExport(engine,policy));
 // Explicit synthetic calendar placement; simulation events and calculated scores remain intact.
 session.summary.startedAt=at;session.summary.endedAt=new Date(Date.parse(at)+Math.max(1,session.summary.durationSimSeconds)*1000).toISOString();
 if(session.assessment)session.assessment.calculatedAt=session.summary.endedAt;
 return session;
}
