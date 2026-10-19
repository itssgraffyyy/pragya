import * as generator from '../generator/generator';
import { deriveSeed } from '../rng';
import { declareAssessment } from '../assessGuard/declare';
import { scenarioQuality } from '../assessGuard/quality';
import { learningDemandSchema,type LearningDemand } from './contract';
import type { ObjectiveDefinition } from './models';
import type { ScoringPolicy } from '../scoring/policy';
import type { ScenarioDefinition } from '../types';
import { UNSUPPORTED_DEMAND_CONTROLS } from './catalogue';
export function generateCurriculumCandidate(objectiveKey:string,objective:ObjectiveDefinition,demandInput:unknown,seed:number,policy:ScoringPolicy,maxAttempts=4){
 const demand=learningDemandSchema.parse(demandInput);if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new Error('Use a reproducible unsigned 32-bit seed.');if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>8)throw new Error('Generation attempts must be bounded to 1–8.');
 if(!objective.eligibleModes.includes(demand.stage))throw new Error('Unsupported assessment mode for this objective.');
 if(demand.contactCount<objective.constraints.minimumContacts||demand.contactCount>objective.constraints.maximumContacts)throw new Error('Contact count is outside the approved objective constraints.');
 if(objective.constraints.groupRelationship!=='none'&&demand.contactCount<2)throw new Error('Synthetic group awareness requires at least two contacts.');
 if(!objective.policyRefs.some(p=>p.id===policy.policyId&&p.version===policy.policyVersion))throw new Error('Selected policy version is not supported by the objective.');
 const attempts:{attempt:number;seed:number;status:string;notes:string[]}[]=[];let last:{scenario:ScenarioDefinition;quality:ReturnType<typeof scenarioQuality>}|null=null;
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  const generatedSeed=deriveSeed(seed,`curriculum:${objectiveKey}:${JSON.stringify(demand)}:${attempt}`);
  try{
   const generated=generator.generateScenario({seed:generatedSeed,objectiveIds:[objective.objectiveId],contactCount:demand.contactCount,difficulty:demand.contactCount>3?'advanced':demand.contactCount>1?'intermediate':'basic',environment:demand.environment,timeOfDay:demand.timeOfDay,visibility:demand.visibility,weather:'none',sensorConditions:[demand.sensorCondition],durationSeconds:demand.durationSeconds});
   const scenario=declareAssessment(generated.scenario,[objective.competency],demand.stage,policy);
   scenario.id=`forge-${deriveSeed(1,objectiveKey+':'+policy.policyId+'@'+policy.policyVersion).toString(36)}-${generatedSeed}`;scenario.title=`${objective.objectiveId} — objective-guided exercise`;scenario.author='Instructor-reviewed CurriculumForge adapter';
   const contract=scenario.trainingContract!,b=contract.competencies[0];contract.referenceMode=demand.reportDetail;b.objectiveId=objective.objectiveId;b.behavior=objective.description;b.limitations=[...objective.limitations];b.eligibility.requireAcknowledgement=demand.reportDetail==='observation_references'||b.eligibility.requireAcknowledgement;
   if(objective.competency==='uncertainty'){
    b.contactIds=scenario.contacts.filter(c=>c.assessment.acceptableClassifications.includes('unknown')).map(c=>c.id);b.requiredOpportunityIds=contract.opportunities.filter(o=>b.contactIds.includes(o.contactId)).map(o=>o.id);b.uncertainty='required';
   }
   if(objective.constraints.groupRelationship!=='none'){
    const members=scenario.contacts.map(c=>c.id),relationship=objective.constraints.groupRelationship;
    const sharedSpawn=scenario.contacts[0].spawnTime;for(const c of scenario.contacts){c.spawnTime=sharedSpawn;c.despawnTime=-1;if(relationship==='coordinated')c.motion=structuredClone(scenario.contacts[0].motion);}
    for(const o of contract.opportunities){o.atTime=sharedSpawn;o.until=scenario.duration;}
    b.eligibility.minimumIndependentResponses=objective.constraints.minimumContacts;
    const start=Math.max(...scenario.contacts.map(c=>c.spawnTime)),end=Math.min(...scenario.contacts.map(c=>c.despawnTime===-1?scenario.duration:c.despawnTime));
    scenario.groupTraining={schemaVersion:1,groups:[{id:'forge-group',label:'Synthetic observation set',relationship,acceptedReports:[relationship==='coordinated'?'observedGrouping':'relationshipUncertain'],states:[{id:'forge-cluster',atTime:start,members,formation:'cluster',cue:relationship==='coordinated'?'Visible synthetic contacts maintain a relative arrangement.':'Contact proximity alone does not establish a shared relationship.'},{id:'forge-line',atTime:Math.min(start+5,end-1),members,formation:'line',cue:relationship==='coordinated'?'The synthetic arrangement changes while the same contact references remain.':'The contact relationship remains ambiguous; qualify any group-level report.'}]}]};
   }
   scenario.curriculum={schemaVersion:1,objectiveKey,objectiveId:objective.objectiveId,objectiveVersion:objective.version,requestedSeed:seed,attempt,demand,limitations:[...objective.limitations,...UNSUPPORTED_DEMAND_CONTROLS.map(x=>`${x}: unsupported by this generator workflow.`)]};
   const quality=validateCurriculumCandidate(scenario,objectiveKey,objective,demand,policy);
   last={scenario,quality};attempts.push({attempt,seed:generatedSeed,status:quality.status,notes:[...generated.notes,...quality.checks.filter(c=>c.severity==='error').map(c=>c.observed)]});
   if(quality.status!=='invalid_for_declared_assessment')return {...last,attempts};
  }catch(error){attempts.push({attempt,seed:generatedSeed,status:'generation_error',notes:[error instanceof Error?error.message:String(error)]});}
 }
 if(last)return {...last,attempts};throw new Error(`No valid candidate after ${maxAttempts} bounded attempts: ${attempts.map(a=>a.notes.join('; ')).join(' | ')}`);
}
export const DEFAULT_LEARNING_DEMAND:LearningDemand={contactCount:1,visibility:'clear',sensorCondition:'normal',environment:'urban',timeOfDay:'day',reportDetail:'observation_references',stage:'independent_assessment',durationSeconds:90};

export function validateCurriculumCandidate(scenario:ScenarioDefinition,objectiveKey:string,objective:ObjectiveDefinition,demand:LearningDemand,policy:ScoringPolicy){
 const quality=scenarioQuality(scenario,policy),contract=scenario.trainingContract,b=contract?.competencies.find(b=>b.competency===objective.competency&&b.objectiveId===objective.objectiveId);
 function defect(id:string,observed:string,correction:string){quality.checks.push({id,severity:'error',objective:objective.objectiveId,references:[`catalogue:${objectiveKey}`],seed:scenario.seed,expected:'Candidate satisfies the approved objective and supported demand constraints',observed,correction});quality.status='invalid_for_declared_assessment';}
 if(!b?.contactIds.length)defect('objective-opportunity','No contact supports the declared objective.','Generate another bounded candidate or manually author suitable observations.');
 if(scenario.contacts.length!==demand.contactCount||scenario.visibility!==demand.visibility||scenario.environment!==demand.environment||scenario.timeOfDay!==demand.timeOfDay||scenario.sensor.channels.find(c=>c.channel==='primary')?.actualCondition!==demand.sensorCondition||contract?.stage!==demand.stage)defect('demand-mismatch','The scenario does not implement the requested supported controls.','Regenerate from the recorded demand profile.');
 if(contract?.opportunities.some(o=>o.until-o.atTime<objective.observationConditions.minimumWindowSeconds))defect('objective-window','Observation opportunity is shorter than the declared minimum.','Adjust observation windows or choose a suitable objective version.');
 if(objective.evidenceRequirements.some(e=>!contract?.opportunities.some(o=>b?.contactIds.includes(o.contactId)&&o.evidence.includes(e))))defect('objective-evidence','The original generator did not provide required objective evidence.','Choose supported evidence or manually author and review an exercise.');
 if(objective.constraints.groupRelationship!=='none'&&!scenario.groupTraining?.groups.some(g=>g.relationship===objective.constraints.groupRelationship))defect('objective-group','Declared synthetic group relationship is absent.','Regenerate a supported group-awareness candidate.');
 if(demand.reportDetail==='observation_references'&&!b?.eligibility.requireAcknowledgement)defect('report-detail','Required observation references were disabled.','Restore the declared reporting detail.');
 return quality;
}