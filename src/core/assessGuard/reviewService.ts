import { scenarioQuality } from './quality';
import type { StorageAdapter } from '../persistence/storage';
import type { LocalActor } from '../unit/models';
import { assessmentReviewSchema } from './reviewModel';
import { scenarioDefinitionSchema } from '../scenario/schema';
import { scoringPolicySchema } from '../scoring/policy';
import { authorize,records,writeRecord } from '../unit/service';
import { stableKey } from '../learning/skillDNA';

export const scenarioReviewKey=(scenario:unknown)=>stableKey(JSON.parse(JSON.stringify(scenario)));
export async function reviewAssessment(storage:StorageAdapter,actor:LocalActor|null,unitId:string|null,input:unknown,policyInput:unknown,rationale:string,waivers:{checkId:string;rationale:string}[]=[]){
 if(actor&&unitId)await authorize(storage,actor,unitId,'manageTraining');else if(actor||unitId)throw new Error('Instructor identity and unit required together');
 const {scenarioTestBench}=await import('./testBench');
 const scenario=scenarioDefinitionSchema.parse(input),policy=scoringPolicySchema.parse(policyInput),bench=scenarioTestBench(scenario,policy);
 if(waivers.some(w=>!bench.checks.some(c=>c.id===w.checkId&&c.severity==='warning'))||new Set(waivers.map(w=>w.checkId)).size!==waivers.length)throw new Error('Only identified warnings can be waived; scoring-integrity errors cannot be overridden.');
 const {trials,...report}=bench;void trials;
 const approved=!report.checks.some(c=>c.severity==='error')&&report.checks.filter(c=>c.severity==='warning').every(c=>waivers.some(w=>w.checkId===c.id));
 const record=assessmentReviewSchema.parse({schemaVersion:1,id:crypto.randomUUID(),unitId,authorId:actor?.userId??'local-demo',scenarioId:scenario.id,scenarioVersion:scenario.version,scenarioKey:scenarioReviewKey(scenario),policy,report,passedCheckIds:report.passedCheckIds,waivers,rationale,approved,createdAt:new Date().toISOString()});
 await writeRecord(storage,'assessmentReviews',record,true);return record;
}
export async function requireAssessmentApproval(storage:StorageAdapter,unitId:string|null,scenario:unknown,approvalId:string|undefined){
 const candidate=scenarioDefinitionSchema.parse(scenario);
 const review=(await records(storage,'assessmentReviews')).find(r=>r.id===approvalId&&r.unitId===unitId);
 if(!review?.approved||review.scenarioKey!==scenarioReviewKey(candidate)||review.scenarioId!==candidate.id||review.scenarioVersion!==candidate.version)throw new Error('AssessGuard requires approval of this exact scenario version before publication.');
 const checked=scenarioQuality(candidate,review.policy);if(checked.checks.some(c=>c.severity==='error')||checked.checks.some(c=>c.severity==='warning'&&!review.waivers.some(w=>w.checkId===c.id)))throw new Error('Invalid declared assessment cannot be approved by an override.');
 return review;
}
