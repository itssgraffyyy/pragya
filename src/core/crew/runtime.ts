import { SimulationEngine } from '../sim/engine';
import { buildSessionExport } from '../sim/sessionSummary';
import { assessStoredSession } from '../scoring/storedSession';
import { POLICY_BASIC_RECOGNITION } from '../scoring/samplePolicies';
import type { ScoringPolicy } from '../scoring/policy';
import type { StoredSession,StorageAdapter } from '../persistence/storage';
import type { SimulationEvent,EventLogExport } from '../types';
import { profileWithSession } from '../learning/trainees';
import { serializeLearning } from '../learning/queue';
import { trainingSchemas,type TrainingRecord } from '../unit/models';
import { records,authorize,writeRecord } from '../unit/service';
import type { LocalActor } from '../unit/models';
import { crewDefinitionSchema,crewSessionSchema,crewEventSchema,decisionSchema,type CrewDefinition,type CrewSession,type CrewDecision,type CrewEvent } from './models';
import { scoreCrew } from './scoring';
export class CrewRuntime {
 readonly engine:SimulationEngine;
 private data:CrewSession;
 constructor(definition:CrewDefinition,participants:CrewSession['participants'],unitId:string|null=null,policy:ScoringPolicy=POLICY_BASIC_RECOGNITION,id:string=crypto.randomUUID(),createdBy:string|null=null){
  const def=crewDefinitionSchema.parse(definition);
  if(new Set(def.cues.map(c=>c.contactId)).size!==def.scenario.contacts.length||def.scenario.contacts.some(c=>!def.cues.some(cue=>cue.contactId===c.id)))throw new Error('Every contact needs one crew cue');
  this.engine=new SimulationEngine({scenario:def.scenario,sessionId:id,traineeId:`crew:${id}`});this.engine.load();
  this.data=crewSessionSchema.parse({schemaVersion:1,id,unitId,createdBy,definition:def,policy,participants,startedAt:null,endedAt:null,status:'ready',simTime:0,events:[],engineLog:this.engine.log.export(),individualSessions:[],jointSession:null,result:null});
  for(const p of participants)this.append(p.traineeId,'joined');
 }
 snapshot():CrewSession{return crewSessionSchema.parse({...this.data,simTime:Math.round(this.engine.simTime*1000)/1000,engineLog:{...this.engine.log.export(),logVersion:1 as const}});}
 private participant(id:string){const p=this.data.participants.find(p=>p.traineeId===id);if(!p||!p.present)throw new Error('Present crew participant required');return p;}
 private active(id:string){this.participant(id);if(this.data.status!=='running')throw new Error('Crew must be running');}
 private contact(id:string){if(!this.data.definition.scenario.contacts.some(c=>c.id===id))throw new Error('Unknown contact');}
 private append(actorId:string,kind:CrewEvent['kind'],details:Partial<CrewEvent>={}){const event=crewEventSchema.parse({...details,id:`crew-${this.data.events.length+1}`,sequence:this.data.events.length+1,time:Math.round(this.engine.simTime*1000)/1000,at:new Date().toISOString(),actorId,kind});this.data.events.push(event);return event;}
 start(){if(this.data.participants.some(p=>!p.present))throw new Error('Both participants must be present');if(this.data.status!=='ready')throw new Error('Crew already started');this.engine.start();this.data.status='running';this.data.startedAt=this.engine.startedAtIso;this.observe();}
 tick(seconds:number){if(!Number.isFinite(seconds)||seconds<0)throw new Error('Invalid clock delta');if(this.data.status!=='running')return;this.engine.tick(seconds);this.observe();if(this.engine.state==='completed')this.finish(true);}
 pause(actorId:string){this.active(actorId);this.engine.pause();this.data.status='paused';this.append(actorId,'paused');}
 resume(actorId:string){this.participant(actorId);if(this.data.status!=='paused'||this.data.participants.some(p=>!p.present))throw new Error('Both participants must be present to resume');this.engine.resume();this.data.status='running';this.append(actorId,'resumed');}
 leave(actorId:string){if(!['ready','running','paused'].includes(this.data.status))throw new Error('Crew is terminal');const p=this.participant(actorId);if(this.data.status==='running')this.pause(actorId);p.present=false;this.append(actorId,'left');}
 rejoin(actorId:string){const p=this.data.participants.find(p=>p.traineeId===actorId);if(!p||!['paused','ready'].includes(this.data.status))throw new Error('Cannot rejoin');p.present=true;this.append(actorId,'joined');}
 abort(actorId:string){this.participant(actorId);if(!['running','paused','ready'].includes(this.data.status))throw new Error('Crew is terminal');this.engine.abort();this.data.status='aborted';this.data.endedAt=this.engine.endedAtIso;this.data.result=scoreCrew(this.snapshot());}
 private observe(){for(const p of this.data.participants.filter(p=>p.present))for(const c of this.engine.traineeView().contacts.filter(c=>c.visibility==='visible'||c.visibility==='occluded')){
  if(this.data.events.some(e=>e.actorId===p.traineeId&&e.kind==='observation'&&e.contactId===c.id))continue;
  const cue=this.data.definition.cues.find(q=>q.contactId===c.id)!;
  this.append(p.traineeId,'observation',{contactId:c.id,observation:{channel:p.channel,cue:cue[p.channel],availableEvidence:p.channel==='visual'?cue.visualEvidence:cue.sensorEvidence}});
 }}
 participantView(actorId:string){const p=this.participant(actorId);const view=this.engine.traineeView();const available=this.data.events.filter(e=>e.actorId===actorId&&e.kind==='observation');return {time:view.simTime,state:this.data.status,channel:p.channel,role:p.role,observations:structuredClone(available),visual:p.channel==='visual'?view:null,sensorIndicators:p.channel==='sensor'?view.sensorStatus:[],communications:structuredClone(this.data.events.filter(e=>!['decision','detect','observation'].includes(e.kind)))};}
 detect(actorId:string,contactId:string){this.active(actorId);this.contact(contactId);if(!this.data.events.some(e=>e.actorId===actorId&&e.kind==='observation'&&e.contactId===contactId))throw new Error('No recorded observation');if(this.data.events.some(e=>e.actorId===actorId&&e.kind==='detect'&&e.contactId===contactId))return;this.append(actorId,'detect',{contactId});}
 decide(actorId:string,contactId:string,input:CrewDecision){this.active(actorId);this.contact(contactId);const decision=decisionSchema.parse(input);const observation=this.data.events.find(e=>e.actorId===actorId&&e.kind==='observation'&&e.contactId===contactId);if(!observation)throw new Error('No recorded observation');if(decision.evidence.some(x=>!observation.observation!.availableEvidence.includes(x)))throw new Error('Evidence unavailable to this participant');if(this.data.events.some(e=>e.actorId===actorId&&e.kind==='decision'&&e.contactId===contactId))throw new Error('Individual decision already committed');this.append(actorId,'decision',{contactId,decision,evidence:decision.evidence});}
 communicate(actorId:string,kind:typeof import('./models').communicationKinds[number],contactId:string,evidence:CrewEvent['evidence']=[],replyTo?:string,decision?:CrewDecision){
  this.active(actorId);this.contact(contactId);if(!['shareObservation','requestClarification','acknowledgeInformation','flagUncertainty','submitEvidence','sendProceduralReport','confirmReceipt','recordHandoff'].includes(kind))throw new Error('Unknown communication');
  const previous=replyTo?this.data.events.find(e=>e.id===replyTo):undefined;
  if(replyTo&&(!previous||previous.actorId===actorId||previous.contactId!==contactId))throw new Error('Reply must reference the other participant on this contact');
  if(['acknowledgeInformation','confirmReceipt'].includes(kind)&&(!previous||!['shareObservation','sendProceduralReport','requestClarification','submitEvidence','recordHandoff'].includes(previous.kind)))throw new Error('An acknowledgeable message is required');
  const observation=this.data.events.find(e=>e.actorId===actorId&&e.contactId===contactId&&e.kind==='observation');
  if(!observation)throw new Error('No recorded observation');
  if(['shareObservation','submitEvidence'].includes(kind)&&(!evidence.length||evidence.some(x=>!observation.observation!.availableEvidence.includes(x))))throw new Error('Share evidence from your recorded observation');
  if(kind==='sendProceduralReport'){
   if(!decision)throw new Error('Complete structured report required');decision=decisionSchema.parse(decision);
   const shared=this.data.events.filter(e=>e.contactId===contactId&&e.kind==='shareObservation').flatMap(e=>e.evidence);
   if(decision.evidence.some(x=>!shared.includes(x)))throw new Error('Joint report evidence must have been shared');
  }
  return this.append(actorId,kind,{contactId,evidence,replyTo,decision});
 }
 complete(actorId:string){this.active(actorId);for(const c of this.data.definition.scenario.contacts){if(this.data.participants.some(p=>!this.data.events.some(e=>e.actorId===p.traineeId&&e.kind==='decision'&&e.contactId===c.id)))throw new Error('Both individual decisions required');if(!this.confirmedReport(c.id))throw new Error('Confirmed joint report required for every contact');}this.finish(false);}
 private confirmedReport(contactId:string){return [...this.data.events].reverse().find(e=>e.contactId===contactId&&e.kind==='sendProceduralReport'&&e.decision&&this.data.events.some(a=>a.kind==='confirmReceipt'&&a.replyTo===e.id&&a.actorId!==e.actorId&&a.sequence>e.sequence));}
 private finish(expired:boolean){
  if(!expired)for(const c of this.data.definition.scenario.contacts){const d=this.confirmedReport(c.id)!.decision!;this.engine.setClassification(c.id,d.classification);this.engine.setConfidence(c.id,d.confidence);for(const e of d.evidence)this.engine.toggleEvidence(c.id,e,true);this.engine.setProceduralResponse(c.id,d.response);this.engine.submitAssessment(c.id);}
  if(this.engine.state!=='completed')this.engine.complete();this.data.status='completed';this.data.endedAt=this.engine.endedAtIso;
  this.data.jointSession=buildSessionExport(this.engine);this.data.jointSession.scoringPolicy=this.data.policy;this.data.jointSession.assessment=assessStoredSession(this.data.jointSession,this.data.policy);
  this.data.individualSessions=this.data.participants.map(p=>this.individual(p.traineeId));this.data.result=scoreCrew(this.snapshot());
 }
 private individual(traineeId:string):StoredSession {
  const sessionId=`${this.data.id}:${traineeId}`,base=buildSessionExport(this.engine);
  const shared=base.events.events.filter(e=>!['classificationSubmitted','confidenceChanged','evidenceSelected','evidenceDeselected','proceduralResponseSelected','assessmentSubmitted','contactAcknowledged'].includes(e.type));
  const own:SimulationEvent[]=this.data.events.filter(e=>e.actorId===traineeId&&(e.kind==='detect'||e.kind==='decision')).map(e=>({eventId:e.id,sessionId,traineeId,scenarioId:this.engine.scenario.id,scenarioVersion:this.engine.scenario.version,simTimestamp:e.time,type:e.kind==='detect'?'contactAcknowledged':'assessmentSubmitted',contactId:e.contactId,classification:e.decision?.classification,confidence:e.decision?.confidence,evidence:e.decision?.evidence,proceduralResponse:e.decision?.response}));
  const events=[...shared,...own].sort((a,b)=>a.simTimestamp-b.simTimestamp).map((e,i)=>({...e,eventId:`ev-${i+1}`,sessionId,traineeId}));
  const session:StoredSession={summary:{...base.summary,sessionId,traineeId,eventCount:events.length,assessments:base.summary.assessments.map(a=>{const decision=this.data.events.find(e=>e.actorId===traineeId&&e.contactId===a.contactId&&e.kind==='decision')?.decision;return {...a,submittedClassification:decision?.classification??null,confidence:decision?.confidence??null,evidence:decision?.evidence??[],proceduralResponse:decision?.response??null,correct:decision?this.engine.scenario.contacts.find(c=>c.id===a.contactId)!.assessment.acceptableClassifications.includes(decision.classification):null};})},events:{logVersion:1,exportedAt:base.events.exportedAt,events},scoringPolicy:this.data.policy};
  session.assessment=assessStoredSession(session,this.data.policy);return session;
 }
 static restore(input:CrewSession){const saved=crewSessionSchema.parse(input);const runtime=new CrewRuntime(saved.definition,saved.participants,saved.unitId,saved.policy,saved.id,saved.createdBy);if(saved.status!=='ready'){runtime.engine.start();while(runtime.engine.simTime<saved.simTime&&runtime.engine.state==='running')runtime.engine.tick(Math.min(1,saved.simTime-runtime.engine.simTime));if(saved.status==='aborted')runtime.engine.abort();else if(saved.status==='completed')runtime.engine.complete();else if(runtime.engine.state==='running')runtime.engine.pause();}runtime.engine.log.import(saved.engineLog as EventLogExport);runtime.engine.startedAtIso=saved.startedAt;runtime.engine.endedAtIso=saved.endedAt;runtime.data=saved;if(saved.status==='running'){runtime.data.status='paused';runtime.append('host','recovered');}return runtime;}
}
export async function createAuthorizedCrew(storage:StorageAdapter,actor:LocalActor,unitId:string,definition:CrewDefinition,participants:CrewSession['participants']){for(const p of participants){await authorize(storage,actor,unitId,'manageTraining',p.traineeId);const profile=await storage.getTrainee(p.traineeId);if(!profile||profile.archived)throw new Error('Active trainee profile required');}const runtime=new CrewRuntime(definition,participants,unitId,undefined,undefined,actor.userId);await writeRecord(storage,'crews',runtime.snapshot());return runtime;}
export async function persistCrew(storage:StorageAdapter,runtime:CrewRuntime){
 const snapshot=runtime.snapshot();if(!snapshot.individualSessions.length){await writeRecord(storage,'crews',snapshot);return;}
 const ids=snapshot.participants.map(p=>p.traineeId).sort();
 await serializeLearning(ids[0],()=>serializeLearning(ids[1],async()=>{
  const trainees=[];const training:TrainingRecord[]=[{kind:'crews',id:snapshot.id,value:snapshot}];const ownership=await records(storage,'ownership');
  for(const session of snapshot.individualSessions){const profile=await storage.getTrainee(session.summary.traineeId);if(profile)trainees.push(profileWithSession(profile,session));if(snapshot.unitId&&snapshot.createdBy){const existing=ownership.find(o=>o.sessionId===session.summary.sessionId);if(existing&&(existing.unitId!==snapshot.unitId||existing.traineeId!==session.summary.traineeId))throw new Error('Crew session already belongs to another unit');if(!existing){const value=trainingSchemas.ownership.parse({schemaVersion:1,id:session.summary.sessionId,unitId:snapshot.unitId,sessionId:session.summary.sessionId,traineeId:session.summary.traineeId,associatedBy:snapshot.createdBy,associatedAt:snapshot.endedAt??new Date().toISOString()});training.push({kind:'ownership',id:value.id,value});}}}
  await storage.saveLocalBundle({scenarios:[],sessions:snapshot.individualSessions,trainees,plans:[],training});
 }));
}
export async function authorizedCrewHistory(storage:StorageAdapter,actor:LocalActor,unitId:string){const crews=(await records(storage,'crews')).filter(c=>c.unitId===unitId);const visible:CrewSession[]=[];for(const c of crews){try{for(const p of c.participants)await authorize(storage,actor,unitId,'reviewTrainee',p.traineeId);visible.push(c);}catch{const user=(await records(storage,'users')).find(u=>u.id===actor.userId);if(user?.traineeId&&c.participants.some(p=>p.traineeId===user.traineeId)){await authorize(storage,actor,unitId,'ownTraining',user.traineeId);visible.push(c);}}}return visible;}
