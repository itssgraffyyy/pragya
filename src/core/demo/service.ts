import { MemoryStorage } from '../persistence/memoryStorage';
import type { LocalActor } from '../unit/models';
import type { StorageAdapter } from '../persistence/storage';
import { trainingSchemas } from '../unit/models';
import { initializeLocalUnit,addLocalUser,manageUnit,associateSession,records,writeRecord } from '../unit/service';
import { createProfile } from '../learning/profile';
import { recordProfileSession } from '../learning/trainees';
import { refreshRecommendations } from '../learning/recommendations';
import { prepareExercise,assignExerciseSession,reconcileLearningSession } from '../learning/adaptive';
import { SCENARIO_SINGLE_RECOGNITION } from '../scenario/bundled/scenariosA';
import { assignTraining,startAssignment,reconcileAssignment,addInstructorNote } from '../instructor/service';
import { createAuthorizedCrew,persistCrew } from '../crew/runtime';
import { CREW_DEMOS } from '../crew/scenarios';
import { annotateCrew } from '../aar/annotations';
import { createLocalBackup,restoreLocalBackup } from '../transfer/backup';
import { demoSession } from './session';

export const DEMO_ID='pragya-synthetic-demo-v1';
function localOwner(actor:LocalActor|null){if(actor)throw new Error('Select Unrestricted local demo before managing synthetic demo data.');}
/** Assemble in isolation, validate the complete graph, then append atomically. */
export async function installDemo(storage:StorageAdapter,actor:LocalActor|null=null,now=new Date().toISOString()){
 localOwner(actor);if((await records(storage,'demoManifests')).length)throw new Error('Synthetic demo already installed; reset it before reinstalling.');
 const scratch=new MemoryStorage();const time=Date.parse(now);const at=(days:number)=>new Date(time-days*86400000).toISOString();
 const {unit,user:commander}=await initializeLocalUnit(scratch,'[Synthetic demo] Commander','[Synthetic demo] Training unit');const owner={userId:commander.id};
 const profiles=['Asha — correction history','Biren — consistent recognition','Chitra — unassessed'].map(name=>({...createProfile(`[Synthetic demo] ${name}`,at(20),`demo-${crypto.randomUUID()}`),referenceCode:'SYNTHETIC DEMO',objectiveIds:['basic-recognition','evidence-selection','unknown-classification']}));
 const users=[];for(const p of profiles){await scratch.saveTrainee(p);users.push(await addLocalUser(scratch,owner,unit.id,p.displayName,'trainee',p.id));}
 const teacher=await addLocalUser(scratch,owner,unit.id,'[Synthetic demo] Instructor','instructor');const instructor={userId:teacher.id};
 await manageUnit(scratch,owner,'instructors',{schemaVersion:1,id:crypto.randomUUID(),unitId:unit.id,instructorId:teacher.id,traineeIds:profiles.map(p=>p.id),archived:false});
 await manageUnit(scratch,owner,'cohorts',{schemaVersion:1,id:crypto.randomUUID(),unitId:unit.id,name:'[Synthetic demo] Foundation cohort',traineeIds:profiles.map(p=>p.id),archived:false});
 async function save(session:ReturnType<typeof demoSession>){await scratch.saveSession(session);await recordProfileSession(scratch,session);await associateSession(scratch,instructor,unit.id,session.summary.sessionId,session.summary.traineeId);}
 for(let day=12;day>=10;day--)for(let i=0;i<2;i++)await save(demoSession(SCENARIO_SINGLE_RECOGNITION,profiles[i].id,`demo-session-${crypto.randomUUID()}`,i===1,at(day)));
 const plan=await refreshRecommendations(scratch,(await scratch.getTrainee(profiles[0].id))!,at(9));const rec=plan.recommendations.find(r=>r.competency==='calibration');if(!rec)throw new Error('Synthetic baseline did not produce the expected measured recommendation.');
 for(const [stage,days] of [['practice',8],['evaluation',7]] as const){const exercise=await prepareExercise(scratch,profiles[0].id,rec.id,stage,at(days));const id=`demo-session-${crypto.randomUUID()}`;await assignExerciseSession(scratch,profiles[0].id,exercise.id,id);const session=demoSession(exercise.scenario,profiles[0].id,id,true,at(days));await save(session);await reconcileLearningSession(scratch,session);}
 const input={traineeIds:[profiles[1].id],scenarioId:SCENARIO_SINGLE_RECOGNITION.id,objectiveIds:['basic-recognition'],dueAt:null,policyKey:null};const [assignment]=await assignTraining(scratch,instructor,unit.id,input);const started=await startAssignment(scratch,{userId:users[1].id},assignment.id);const assigned=demoSession(started.scenarioSnapshot,profiles[1].id,started.sessionId!,true,at(2),started.policy);await scratch.saveSession(assigned);await recordProfileSession(scratch,assigned);await reconcileAssignment(scratch,assignment.id,assigned);
 await addInstructorNote(scratch,instructor,unit.id,profiles[1].id,assigned.summary.sessionId,'[Synthetic demo] Recorded evidence supports the selected recognition response. Broaden conditions before drawing readiness conclusions.',['basic-recognition']);
 await assignTraining(scratch,instructor,unit.id,{...input,traineeIds:[profiles[2].id],dueAt:new Date(time+7*86400000).toISOString()});
 for(const p of profiles.slice(1))await refreshRecommendations(scratch,(await scratch.getTrainee(p.id))!,now);
 const participants=[{traineeId:profiles[0].id,role:'observer' as const,channel:'visual' as const,present:true},{traineeId:profiles[1].id,role:'informationVerifier' as const,channel:'sensor' as const,present:true}];
 const crew=await createAuthorizedCrew(scratch,instructor,unit.id,CREW_DEMOS[0],participants);const a=profiles[0].id,b=profiles[1].id;crew.start();crew.tick(1);
 const decision={classification:'unknown' as const,confidence:'low' as const,evidence:['absenceOfFeatures' as const],response:'requestVerification' as const};
 crew.detect(a,'c1');crew.detect(b,'c1');crew.decide(a,'c1',{...decision,classification:'fixedWing',confidence:'high'});crew.decide(b,'c1',decision);
 const uncertainty=crew.communicate(a,'flagUncertainty','c1');crew.communicate(b,'acknowledgeInformation','c1',[],uncertainty.id);
 for(const p of participants){const share=crew.communicate(p.traineeId,'shareObservation','c1',['absenceOfFeatures']);crew.communicate(p.traineeId===a?b:a,'acknowledgeInformation','c1',[],share.id);}
 const report=crew.communicate(b,'sendProceduralReport','c1',[],undefined,decision);crew.communicate(a,'confirmReceipt','c1',[],report.id);crew.complete(a);await persistCrew(scratch,crew);
 await annotateCrew(scratch,instructor,crew.snapshot().id,'[Synthetic demo] Private initial error retained; confirmed joint report acknowledges ambiguity. Coordination and recognition accuracy are separate.',['conflicting-sources']);
 const manifest=trainingSchemas.demoManifests.parse({schemaVersion:1,id:DEMO_ID,unitId:unit.id,userIds:[commander.id,teacher.id,...users.map(u=>u.id)],traineeIds:profiles.map(p=>p.id),createdAt:now,label:'Synthetic demo — calculated outcomes, scripted decisions and calendar dates'});
 await writeRecord(scratch,'demoManifests',manifest,true);const backup=await createLocalBackup(scratch);await restoreLocalBackup(storage,backup,actor);return manifest;
}

import { assertGraph,existingData } from '../transfer/backup';
import type { LocalDataBundle } from '../persistence/storage';
import { localDataFingerprint,type LocalDeletion } from '../persistence/localDeletion';
import { acquireCrewHost } from '../crew/lease';

function references(value:unknown,ids:Set<string>):boolean{
 if(typeof value==='string')return ids.has(value);
 if(Array.isArray(value))return value.some(v=>references(v,ids));
 return !!value&&typeof value==='object'&&Object.values(value).some(v=>references(v,ids));
}
export async function previewDemoReset(storage:StorageAdapter,actor:LocalActor|null=null){
 localOwner(actor);const expected=structuredClone(await existingData(storage));
 const manifest=expected.training.find(r=>r.kind==='demoManifests'&&r.id===DEMO_ID);if(!manifest||manifest.kind!=='demoManifests')throw new Error('No installed synthetic demo.');
 const demo=manifest.value,users=new Set(demo.userIds),trainees=new Set(demo.traineeIds);
 if(expected.training.some(r=>r.kind==='memberships'&&r.value.unitId===demo.unitId&&!users.has(r.value.userId)))throw new Error('Demo unit contains an additional identity; preserve or move that work before resetting.');
 const training=expected.training.filter(r=>r.kind==='demoManifests'&&r.id===DEMO_ID||r.kind==='units'&&r.id===demo.unitId||r.kind==='users'&&users.has(r.id)||'unitId' in r.value&&r.value.unitId===demo.unitId);
 if(training.some(r=>r.kind==='scenarioDocuments'||r.kind==='scenarioVersions'))throw new Error('Demo unit has additional authored scenarios; export and move them before resetting.');
 const sessions=expected.sessions.filter(s=>trainees.has(s.summary.traineeId));const plans=expected.plans.filter(p=>trainees.has(p.traineeId));
 const remove:LocalDeletion={scenarios:[],sessions:sessions.map(s=>s.summary.sessionId),trainees:[...trainees],plans:plans.map(p=>p.traineeId),training:training.map(r=>[r.kind,r.id])};
 const keys=new Set(training.map(r=>r.kind+':'+r.id));const kept:LocalDataBundle={scenarios:expected.scenarios,sessions:expected.sessions.filter(s=>!remove.sessions.includes(s.summary.sessionId)),trainees:expected.trainees.filter(p=>!trainees.has(p.id)),plans:expected.plans.filter(p=>!trainees.has(p.traineeId)),training:expected.training.filter(r=>!keys.has(r.kind+':'+r.id))};
 const ids=new Set([demo.unitId,...demo.userIds,...demo.traineeIds,...remove.sessions,...training.map(r=>r.id)]);
 if(references(kept,ids))throw new Error('Other records reference this demo. Reset refused; all local work preserved.');
 assertGraph(kept);
 return {expected,remove,unitId:demo.unitId,crewIds:training.flatMap(r=>r.kind==='crews'?[r.id]:[]),counts:{profiles:remove.trainees.length,sessions:remove.sessions.length,plans:remove.plans.length,trainingRecords:remove.training.length}};
}
export async function resetDemo(storage:StorageAdapter,preview:Awaited<ReturnType<typeof previewDemoReset>>,actor:LocalActor|null=null){
 localOwner(actor);const current=await previewDemoReset(storage,actor);
 // The caller approves a concrete snapshot; changed data requires a fresh preview.
 if(localDataFingerprint(current.expected)!==localDataFingerprint(preview.expected))throw new Error('Local data changed; review the demo reset again. No records removed.');
 const releases:(()=>void)[]=[];
 try{if(typeof navigator!=='undefined'&&navigator.locks)for(const id of current.crewIds)releases.push(await acquireCrewHost(id));
 await storage.deleteLocalRecords(current.expected,current.remove);return current.counts;
 }finally{for(const release of releases)release();}
}
