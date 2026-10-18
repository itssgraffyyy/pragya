import { createProfile } from '../learning/profile';
import type { StorageAdapter } from '../persistence/storage';
import { trainingSchemas, type TrainingKind, type TrainingRecords, type LocalActor, type Permission, type TrainingRecord } from './models';
/** Local identity selection is a workflow boundary, not OS/browser authentication. */
export async function records<K extends TrainingKind>(storage:StorageAdapter,kind:K):Promise<TrainingRecords[K][]> {
  return (await storage.listTrainingRecords(kind)).map(r=>trainingSchemas[kind].parse(r.value) as TrainingRecords[K]);
}
export async function writeRecord<K extends TrainingKind>(storage:StorageAdapter,kind:K,value:TrainingRecords[K]) {
  const parsed=trainingSchemas[kind].parse(value) as TrainingRecords[K];
  await storage.saveTrainingRecords([{kind,id:parsed.id,value:parsed} as TrainingRecord]);
}
export async function authorize(storage:StorageAdapter,actor:LocalActor,unitId:string,permission:Permission,traineeId?:string) {
  const user=(await records(storage,'users')).find(u=>u.id===actor.userId&&!u.archived);
  const unit=(await records(storage,'units')).find(u=>u.id===unitId&&!u.archived);
  const memberships=(await records(storage,'memberships')).filter(m=>m.unitId===unitId&&!m.archived);
  const roles=memberships.filter(m=>m.userId===actor.userId).map(m=>m.role);
  if(!user||!unit||!roles.length)throw new Error('Access denied: active unit membership required');
  const own=traineeId===user.traineeId&&roles.includes('trainee');
  const targetMember=!traineeId||memberships.some(m=>m.role==='trainee'&&(user.id===m.userId&&own));
  if(permission==='manageUnit'&&roles.includes('commander'))return user;
  if(permission==='aggregate'&&roles.includes('commander'))return user;
  if(permission==='ownTraining'&&own&&targetMember)return user;
  if(roles.includes('instructor')) {
    if(permission==='manageTraining'&&!traineeId)return user;
    const assigned=(await records(storage,'instructors')).some(a=>!a.archived&&a.unitId===unitId&&a.instructorId===user.id&&!!traineeId&&a.traineeIds.includes(traineeId));
    const allUsers=await records(storage,'users');
    const member=allUsers.some(u=>!u.archived&&u.traineeId===traineeId&&memberships.some(m=>m.userId===u.id&&m.role==='trainee'));
    if(assigned&&member&&(permission==='reviewTrainee'||permission==='manageTraining'))return user;
  }
  throw new Error('Access denied: permission or instructor assignment required');
}
export async function initializeLocalUnit(storage:StorageAdapter,commanderName:string,unitName:string,now=new Date().toISOString()) {
  if((await storage.listTrainingRecords('users')).length)throw new Error('Local identity setup already exists');
  const user=trainingSchemas.users.parse({schemaVersion:1,id:crypto.randomUUID(),name:commanderName,traineeId:null,archived:false,createdAt:now});
  const unit=trainingSchemas.units.parse({schemaVersion:1,id:crypto.randomUUID(),name:unitName,description:'',archived:false,createdAt:now});
  const membership=trainingSchemas.memberships.parse({schemaVersion:1,id:crypto.randomUUID(),unitId:unit.id,userId:user.id,role:'commander',archived:false,joinedAt:now});
  await storage.saveTrainingRecords([{kind:'users',id:user.id,value:user},{kind:'units',id:unit.id,value:unit},{kind:'memberships',id:membership.id,value:membership}]);
  return {user,unit};
}
export async function manageUnit<K extends 'units'|'memberships'|'instructors'|'cohorts'>(storage:StorageAdapter,actor:LocalActor,kind:K,value:TrainingRecords[K]) {
  const data=trainingSchemas[kind].parse(value) as TrainingRecords[K];
  const unitId='unitId' in data?data.unitId:data.id;
  await authorize(storage,actor,unitId,'manageUnit');
  if(kind==='memberships') {
    const member=data as TrainingRecords['memberships'];
    if(!(await records(storage,'users')).some(u=>u.id===member.userId&&!u.archived))throw new Error('Active user required');
    const other=(await records(storage,'memberships')).find(m=>m.id!==member.id&&!m.archived&&!member.archived&&m.userId===member.userId&&m.unitId===member.unitId&&m.role===member.role);
    if(other)throw new Error('Membership already exists');
    const current=(await records(storage,'memberships')).find(m=>m.id===member.id);
    if(current?.role==='commander'&&!current.archived&&(member.archived||member.role!=='commander')&&!(await records(storage,'memberships')).some(m=>m.id!==member.id&&m.unitId===unitId&&m.role==='commander'&&!m.archived))throw new Error('Cannot remove last commander');
  }
  if(kind==='instructors'||kind==='cohorts') {
    const group=data as TrainingRecords['cohorts']|TrainingRecords['instructors'];
    const users=await records(storage,'users');const members=await records(storage,'memberships');
    for(const tid of group.traineeIds)if(!users.some(u=>!u.archived&&u.traineeId===tid&&members.some(m=>!m.archived&&m.unitId===unitId&&m.userId===u.id&&m.role==='trainee')))throw new Error('Trainee must be an active unit member');
    if('instructorId' in group&&!members.some(m=>!m.archived&&m.unitId===unitId&&m.userId===group.instructorId&&m.role==='instructor'))throw new Error('Instructor membership required');
  }
  const previous=(await records(storage,kind)).find(r=>r.id===data.id);
  if(previous&&'unitId' in previous&&previous.unitId!==unitId)throw new Error('Cannot move records between units');
  await writeRecord(storage,kind,data);
}
export async function addLocalUser(storage:StorageAdapter,actor:LocalActor,unitId:string,name:string,role:'trainee'|'instructor'|'commander',traineeId:string|null=null) {
  await authorize(storage,actor,unitId,'manageUnit');
  if(role==='trainee'&&(!traineeId||!(await storage.getTrainee(traineeId))))throw new Error('Existing trainee profile required');
  if(traineeId&&(await records(storage,'users')).some(u=>u.traineeId===traineeId))throw new Error('Profile already has an identity');
  const now=new Date().toISOString();const user=trainingSchemas.users.parse({schemaVersion:1,id:crypto.randomUUID(),name,traineeId,archived:false,createdAt:now});
  const membership=trainingSchemas.memberships.parse({schemaVersion:1,id:crypto.randomUUID(),unitId,userId:user.id,role,archived:false,joinedAt:now});
  await storage.saveTrainingRecords([{kind:'users',id:user.id,value:user},{kind:'memberships',id:membership.id,value:membership}]);return user;
}
export async function associateSession(storage:StorageAdapter,actor:LocalActor,unitId:string,sessionId:string,traineeId:string) {
  await authorize(storage,actor,unitId,'manageTraining',traineeId);
  const session=await storage.getSession(sessionId);
  if(!session||session.summary.traineeId!==traineeId)throw new Error('Session owner mismatch');
  if((await records(storage,'ownership')).some(r=>r.sessionId===sessionId))throw new Error('Session already associated');
  await writeRecord(storage,'ownership',{schemaVersion:1,id:sessionId,unitId,sessionId,traineeId,associatedBy:actor.userId,associatedAt:new Date().toISOString()});
}
export async function authorizedHistory(storage:StorageAdapter,actor:LocalActor,unitId:string,traineeId:string) {
  try {await authorize(storage,actor,unitId,'ownTraining',traineeId);}catch {await authorize(storage,actor,unitId,'reviewTrainee',traineeId);}
  const owned=(await records(storage,'ownership')).filter(r=>r.unitId===unitId&&r.traineeId===traineeId).map(r=>r.sessionId);
  return (await storage.listSessions()).filter(s=>s.summary.traineeId===traineeId&&owned.includes(s.summary.sessionId));
}

export async function createAdditionalUnit(storage:StorageAdapter,actor:LocalActor,fromUnitId:string,name:string) {
  await authorize(storage,actor,fromUnitId,'manageUnit');
  const now=new Date().toISOString();const unit=trainingSchemas.units.parse({schemaVersion:1,id:crypto.randomUUID(),name,description:'',archived:false,createdAt:now});
  const membership=trainingSchemas.memberships.parse({schemaVersion:1,id:crypto.randomUUID(),unitId:unit.id,userId:actor.userId,role:'commander',archived:false,joinedAt:now});
  await storage.saveTrainingRecords([{kind:'units',id:unit.id,value:unit},{kind:'memberships',id:membership.id,value:membership}]);return unit;
}

export async function createUnitTrainee(storage:StorageAdapter,actor:LocalActor,unitId:string,displayName:string){
 await authorize(storage,actor,unitId,'manageUnit');
 const profile=createProfile(displayName);await storage.saveTrainee(profile);await addLocalUser(storage,actor,unitId,profile.displayName,'trainee',profile.id);return profile;
}
