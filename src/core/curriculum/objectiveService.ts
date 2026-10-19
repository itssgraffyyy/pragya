import type { StorageAdapter } from '../persistence/storage';
import type { LocalActor,TrainingRecords } from '../unit/models';
import { authorize,records,writeRecord,authorizedHistory } from '../unit/service';
import { objectiveDefinitionSchema,type ObjectiveDefinition } from './models';
import { INITIAL_CURRICULUM } from './catalogue';
import { stableKey,calculateSkillDNA } from '../learning/skillDNA';
import { learningEligible } from '../assessGuard/eligibility';
export async function saveObjectiveVersion(storage:StorageAdapter,actor:LocalActor,unitId:string,input:unknown){
 await authorize(storage,actor,unitId,'manageTraining');const definition=objectiveDefinitionSchema.parse(input);
 if(definition.prerequisites.some(p=>p.objectiveId===definition.objectiveId)||new Set(definition.prerequisites.map(p=>p.objectiveId)).size!==definition.prerequisites.length)throw new Error('Prerequisites must be distinct and cannot reference the objective itself.');
 const id=`${unitId}:${definition.objectiveId}@${definition.version}`,old=(await records(storage,'curriculumObjectives')).find(r=>r.id===id);
 if(old){if(stableKey(old.definition)!==stableKey(definition))throw new Error('Objective version is immutable; save a new version.');return old;}
 const value={schemaVersion:1 as const,id,unitId,authorId:actor.userId,createdAt:new Date().toISOString(),definition,approvedBy:null,approvedAt:null,approvalRationale:'',archived:false};await writeRecord(storage,'curriculumObjectives',value,true);return value;
}
export async function initializeCatalogue(storage:StorageAdapter,actor:LocalActor,unitId:string){await authorize(storage,actor,unitId,'manageTraining');const result=[];for(const definition of INITIAL_CURRICULUM)result.push(await saveObjectiveVersion(storage,actor,unitId,definition));return result;}
export async function approveObjectiveVersion(storage:StorageAdapter,actor:LocalActor,id:string,rationale:string){
 const value=(await records(storage,'curriculumObjectives')).find(r=>r.id===id);if(!value)throw new Error('Objective version not found');await authorize(storage,actor,value.unitId,'manageTraining');if(rationale.trim().length<10)throw new Error('Provide an instructor approval rationale.');if(value.archived)throw new Error('Archived objective cannot be approved.');
 const available=(await records(storage,'curriculumObjectives')).filter(r=>r.unitId===value.unitId&&r.approvedBy&&!r.archived);
 for(const prerequisite of value.definition.prerequisites)if(!available.some(r=>r.definition.objectiveId===prerequisite.objectiveId&&r.definition.version===prerequisite.version))throw new Error('Approve prerequisite objective versions before approving this version.');
 if(value.approvedBy)return value;const next={...value,approvedBy:actor.userId,approvedAt:new Date().toISOString(),approvalRationale:rationale.trim()};await writeRecord(storage,'curriculumObjectives',next);return next;
}
export async function archiveObjectiveVersion(storage:StorageAdapter,actor:LocalActor,id:string){const row=(await records(storage,'curriculumObjectives')).find(r=>r.id===id);if(!row)throw new Error('Objective version not found');await authorize(storage,actor,row.unitId,'manageTraining');await writeRecord(storage,'curriculumObjectives',{...row,archived:true});}
export async function curriculumTargets(storage:StorageAdapter,actor:LocalActor,unitId:string,traineeIds:string[],cohortId?:string){
 await authorize(storage,actor,unitId,'manageTraining');const cohort=cohortId?(await records(storage,'cohorts')).find(c=>c.id===cohortId&&c.unitId===unitId&&!c.archived):null;if(cohortId&&!cohort)throw new Error('Active unit cohort required');
 const ids=[...new Set([...traineeIds,...cohort?.traineeIds??[]])];for(const id of ids){await authorize(storage,actor,unitId,'manageTraining',id);const p=await storage.getTrainee(id);if(!p||p.archived)throw new Error('Active target profile required');}return ids;
}
export async function prerequisiteSupport(storage:StorageAdapter,actor:LocalActor,unitId:string,objective:ObjectiveDefinition,traineeIds:string[]):Promise<TrainingRecords['curriculumCandidates']['prerequisiteSupport']>{
 const definitions=(await records(storage,'curriculumObjectives')).filter(r=>r.unitId===unitId&&r.approvedBy&&!r.archived),result:TrainingRecords['curriculumCandidates']['prerequisiteSupport']=[];
 for(const traineeId of traineeIds){const profile=await storage.getTrainee(traineeId);const sessions=await authorizedHistory(storage,actor,unitId,traineeId);for(const p of objective.prerequisites){const definition=definitions.find(d=>d.definition.objectiveId===p.objectiveId&&d.definition.version===p.version)?.definition;
 const sourceSessionIds=definition?sessions.filter(s=>s.summary.status==='completed'&&s.summary.scenarioSnapshot.trainingContract&&s.summary.scenarioSnapshot.trainingContract.stage!=='guided_practice'&&s.summary.scenarioSnapshot.trainingContract.competencies.some(b=>b.objectiveId===p.objectiveId)&&s.summary.scenarioSnapshot.curriculum?.objectiveVersion===p.version&&s.summary.scenarioSnapshot.curriculum.objectiveId===p.objectiveId&&learningEligible(s,definition.competency)&&!!profile&&(calculateSkillDNA(profile,[s]).cohorts[0]?.competencies.find(c=>c.id===definition.competency)?.score??-1)>=p.minimumScore).map(s=>s.summary.sessionId):[];
 const supported=sourceSessionIds.length>=p.minimumEligibleSessions;result.push({traineeId,objectiveId:p.objectiveId,objectiveVersion:p.version,minimumEligibleSessions:p.minimumEligibleSessions,minimumScore:p.minimumScore,sourceSessionIds,supported,explanation:supported?'Eligible independent simulator records meet the configured instructor prerequisite threshold.':'Suitable independent prerequisite evidence is insufficient; no lack of real-world ability is inferred.'});
 }}return result;
}
