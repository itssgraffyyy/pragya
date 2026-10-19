import { z } from 'zod';
import type { StorageAdapter } from '../persistence/storage';
import type { LocalActor } from '../unit/models';
import { authorize,records,writeRecord } from '../unit/service';
import { curriculumCandidateSchema } from './models';
import { learningDemandSchema } from './contract';
import { curriculumTargets,prerequisiteSupport } from './objectiveService';
import { generateCurriculumCandidate,validateCurriculumCandidate } from './generation';
import { SAMPLE_POLICIES } from '../scoring/samplePolicies';
import { POLICY_GROUP_AWARENESS } from '../scoring/defaultPolicy';
import { reviewAssessment } from '../assessGuard/reviewService';
import { saveScenarioDocument,savePolicyVersion,assignTraining } from '../instructor/service';
const requestSchema=z.object({objectiveKey:z.string().min(1),traineeIds:z.array(z.string().min(1)).max(1000).default([]),cohortId:z.string().optional(),seed:z.number().int().min(0).max(4294967295),demand:learningDemandSchema,maxAttempts:z.number().int().min(1).max(8).default(4),policyKey:z.string().optional()}).strict();
export async function createCurriculumCandidate(storage:StorageAdapter,actor:LocalActor,unitId:string,input:unknown){
 await authorize(storage,actor,unitId,'manageTraining');const request=requestSchema.parse(input),objective=(await records(storage,'curriculumObjectives')).find(r=>r.id===request.objectiveKey&&r.unitId===unitId&&r.approvedBy&&!r.archived);if(!objective)throw new Error('Select an approved active objective version from this unit.');
 const targets=await curriculumTargets(storage,actor,unitId,request.traineeIds,request.cohortId),support=await prerequisiteSupport(storage,actor,unitId,objective.definition,targets);
 const selected=request.policyKey?(await records(storage,'policies')).find(p=>p.id===request.policyKey&&p.unitId===unitId)?.policy:[...SAMPLE_POLICIES,POLICY_GROUP_AWARENESS].find(p=>objective.definition.policyRefs.some(ref=>ref.id===p.policyId&&ref.version===p.policyVersion));if(!selected)throw new Error('Selected immutable unit policy was not found.');
 const generated=generateCurriculumCandidate(objective.id,objective.definition,request.demand,request.seed,selected,request.maxAttempts);
 const value=curriculumCandidateSchema.parse({schemaVersion:1,id:crypto.randomUUID(),unitId,authorId:actor.userId,createdAt:new Date().toISOString(),objectiveKey:objective.id,objectiveSnapshot:objective.definition,targetTraineeIds:targets,prerequisiteSupport:support,prerequisiteOverride:null,demand:request.demand,requestedSeed:request.seed,seed:generated.scenario.seed,attempts:generated.attempts,scenarioSnapshot:JSON.parse(JSON.stringify(generated.scenario)),policy:selected,quality:generated.quality,status:generated.quality.status==='invalid_for_declared_assessment'?'needs_revision':'draft',assessmentReviewId:null,assignmentIds:[],rejectionRationale:null});await writeRecord(storage,'curriculumCandidates',value,true);return value;
}
async function permittedCandidate(storage:StorageAdapter,actor:LocalActor,id:string){const candidate=(await records(storage,'curriculumCandidates')).find(c=>c.id===id);if(!candidate)throw new Error('Candidate not found');await curriculumTargets(storage,actor,candidate.unitId,candidate.targetTraineeIds);return candidate;}
export async function curriculumWorkspace(storage:StorageAdapter,actor:LocalActor,unitId:string){
 await authorize(storage,actor,unitId,'manageTraining');const candidates=[];for(const row of (await records(storage,'curriculumCandidates')).filter(r=>r.unitId===unitId)){try{await permittedCandidate(storage,actor,row.id);candidates.push(row);}catch{/* Candidates outside the instructor's target scope remain private. */}}
 return {objectives:(await records(storage,'curriculumObjectives')).filter(r=>r.unitId===unitId),candidates};
}
export async function rejectCurriculumCandidate(storage:StorageAdapter,actor:LocalActor,id:string,rationale:string){const row=await permittedCandidate(storage,actor,id);if(!['draft','needs_revision'].includes(row.status))throw new Error('Published/assigned candidate history is immutable.');if(rationale.trim().length<10)throw new Error('Record a rejection rationale.');const value={...row,status:'rejected' as const,rejectionRationale:rationale.trim()};await writeRecord(storage,'curriculumCandidates',value);return value;}
export async function approveAndPublishCandidate(storage:StorageAdapter,actor:LocalActor,id:string,rationale:string,waivers:{checkId:string;rationale:string}[]=[],prerequisiteOverride?:string){
 const row=await permittedCandidate(storage,actor,id);if(['published','assigned'].includes(row.status))return row;if(row.status==='rejected'||row.quality.status==='invalid_for_declared_assessment')throw new Error('Revise or regenerate the invalid/rejected candidate before approval.');
 const rechecked=validateCurriculumCandidate(row.scenarioSnapshot,row.objectiveKey,row.objectiveSnapshot,row.demand,row.policy);if(rechecked.status==='invalid_for_declared_assessment')throw new Error('Candidate no longer satisfies the approved objective constraints.');
 const objective=(await records(storage,'curriculumObjectives')).find(o=>o.id===row.objectiveKey&&o.unitId===row.unitId&&o.approvedBy&&!o.archived);if(!objective)throw new Error('Objective version is no longer active and approved.');
 const currentSupport=await prerequisiteSupport(storage,actor,row.unitId,row.objectiveSnapshot,row.targetTraineeIds);
 if(currentSupport.some(p=>!p.supported)&&(!prerequisiteOverride||prerequisiteOverride.trim().length<10))throw new Error('Independent prerequisite evidence is insufficient; record an explicit instructor override rationale.');
 const review=await reviewAssessment(storage,actor,row.unitId,row.scenarioSnapshot,row.policy,rationale,waivers);if(!review.approved)throw new Error('Unresolved AssessGuard checks require review before publication.');
 await savePolicyVersion(storage,actor,row.unitId,row.policy);
 // Existing publication transaction commits scenario/version/candidate together.
 await saveScenarioDocument(storage,actor,row.unitId,JSON.stringify(row.scenarioSnapshot),'published',undefined,review.id,row.id,prerequisiteOverride?.trim()??null);
 return (await records(storage,'curriculumCandidates')).find(c=>c.id===id)!;
}
export async function assignCurriculumCandidate(storage:StorageAdapter,actor:LocalActor,id:string){const row=await permittedCandidate(storage,actor,id);if(!['published','assigned'].includes(row.status))throw new Error('Approve and publish the candidate before assignment.');if(!row.targetTraineeIds.length)throw new Error('Generate with explicit scoped targets before assigning.');const policy=(await records(storage,'policies')).find(p=>p.unitId===row.unitId&&p.policy.policyId===row.policy.policyId&&p.policy.policyVersion===row.policy.policyVersion);if(!policy)throw new Error('Published immutable policy snapshot missing.');return assignTraining(storage,actor,row.unitId,{traineeIds:row.targetTraineeIds,scenarioId:row.scenarioSnapshot.id,objectiveIds:[row.objectiveSnapshot.objectiveId],dueAt:null,policyKey:policy.id,curriculumCandidateId:row.id});}
