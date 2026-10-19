import { SimulationEngine } from '../sim/engine';
import { buildSessionExport } from '../sim/sessionSummary';
import { scenarioDefinitionSchema } from '../scenario/schema';
import { scoringPolicySchema,type ScoringPolicy } from '../scoring/policy';
import type { ScenarioDefinition } from '../types';
import { scenarioQuality } from './quality';
import type { IntegrityResult,QualityReport } from './models';
export const CONTROLLED_PARTICIPANTS=['supported','incorrect','uncertain','unsupported_guess','missed','incomplete_report','interrupted'] as const;
export type ControlledParticipant=typeof CONTROLLED_PARTICIPANTS[number];
/** Synthetic scripted participant; uses the existing engine/scorer and does not supply scores. */
export function controlledSession(scenario:ScenarioDefinition,policy:ScoringPolicy,participant:ControlledParticipant,traineeId='controlled-synthetic-participant',sessionId=`controlled-${participant}`){
 const engine=new SimulationEngine({scenario:structuredClone(scenario),traineeId,sessionId});engine.load();engine.start();
 for(let t=0;t<Math.min(scenario.duration,600)&&engine.state==='running';t++){
  engine.tick(1);
  for(const o of engine.traineeView().opportunities)if(o.available&&o.channel==='text'){
   if(!o.presented)engine.presentOpportunity(o.id);if(!o.acknowledged&&!['unsupported_guess','missed'].includes(participant))engine.acknowledgeOpportunity(o.id);
  }
  if(participant==='interrupted'){engine.abort();break;}
  if(participant==='missed')continue;
  for(const contact of engine.traineeView().contacts){
   if(contact.visibility!=='visible'||contact.assessment.submitted)continue;
   const def=scenario.contacts.find(c=>c.id===contact.id)!;
   engine.acknowledgeContact(contact.id);
   const classification=participant==='incorrect'?(def.assessment.acceptableClassifications.includes('birdLike')?'fixedWing':'birdLike'):participant==='uncertain'?'unknown':def.assessment.acceptableClassifications[0];
   engine.setClassification(contact.id,classification);engine.setConfidence(contact.id,classification==='unknown'?'low':'high');
   if(participant!=='unsupported_guess')for(const evidence of def.assessment.requiredEvidence)engine.toggleEvidence(contact.id,evidence,true);
   if(participant==='incomplete_report')continue;
   engine.setProceduralResponse(contact.id,def.assessment.correctResponse);engine.submitAssessment(contact.id);
  }
  if(engine.state==='running')for(const group of scenario.groupTraining?.groups??[]){
   const view=engine.traineeView().groups.find(g=>g.id===group.id);
   if(view?.available&&!view.report&&engine.simTime>=group.states[group.states.length-1].atTime){engine.recordGroupObservation(group.id,view.members);engine.submitGroupReport(group.id,group.acceptedReports[0],'low');}
  }
 }
 if(engine.state==='running')engine.abort();
 return buildSessionExport(engine,policy);
}
export interface ControlledTrial {participant:ControlledParticipant;status:string;classification:number|null;evidence:number|null;eligibility:IntegrityResult|null;sourceEventIds:string[];error:string|null}
export interface ScenarioBenchReport extends QualityReport {trials:ControlledTrial[]}
export function scenarioTestBench(input:unknown,policyInput:unknown):ScenarioBenchReport{
 const quality=scenarioQuality(input,policyInput),scenario=scenarioDefinitionSchema.safeParse(input),policy=scoringPolicySchema.safeParse(policyInput);
 if(!scenario.success||!policy.success)return {...quality,trials:[]};
 const trials=CONTROLLED_PARTICIPANTS.map((participant):ControlledTrial=>{try{const session=controlledSession(scenario.data as ScenarioDefinition,policy.data,participant);return {participant,status:session.summary.status,classification:session.assessment?.categories.classification??null,evidence:session.assessment?.categories.evidence??null,eligibility:session.assessment?.integrity??null,sourceEventIds:session.events.events.map(e=>e.eventId),error:null};}catch(error){return {participant,status:'error',classification:null,evidence:null,eligibility:null,sourceEventIds:[],error:error instanceof Error?error.message:String(error)};}});
 return {...quality,trials,limitations:[...quality.limitations,'Controlled participants are deterministic software fixtures, not empirical human learning results.','Execution fixtures are bounded to 600 simulation seconds; late opportunities beyond that bound require further review.']};
}
