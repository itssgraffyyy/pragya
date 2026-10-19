import { presentationFamily } from '../evidenceMind/stages';
import { evaluateProcedural } from '../scoring/procedural';
import { scenarioDefinitionSchema } from '../scenario/schema';
import { scoringPolicySchema,type ScoringPolicy,type DecisionNode } from '../scoring/policy';
import type { ScenarioDefinition } from '../types';
import { LEARNING_OBJECTIVES } from '../objectives';
import type { QualityReport } from './models';
const choices:Record<DecisionNode['kind'],string[]>={classificationMatch:['smallMultirotor','largeMultirotor','fixedWing','birdLike','civilianLike','unidentified','decoy','unknown'],proceduralMatch:['continueObservation','requestVerification','recordAndReport','escalateSupervisor','instructorBranch'],evidencePresent:['rotorSilhouette','wingShape','flightPattern','sizeEstimate','lightSignature','soundSignature','thermalSignature','absenceOfFeatures'],confidenceReasonable:['low','medium','high']};
/** Conservative deterministic linting, not scientific validation or educational certification. */
export function scenarioQuality(input:unknown,policyInput:unknown):QualityReport{
 const parsed=scenarioDefinitionSchema.safeParse(input),policyParsed=scoringPolicySchema.safeParse(policyInput);
 const seed=parsed.success?parsed.data.seed:0,checks:QualityReport['checks']=[],passedCheckIds:string[]=[];
 const issue=(id:string,severity:'error'|'warning'|'info',objective:string,references:string[],expected:string,observed:string,correction:string|null)=>checks.push({id,severity,objective,references,seed,expected,observed,correction});
 if(!parsed.success)issue('scenario-schema','error','configuration',parsed.error.issues.map(x=>x.path.join('.')),'Valid scenario schema',parsed.error.issues.map(x=>x.message).join('; '),'Correct the referenced schema fields.');else passedCheckIds.push('scenario-schema');
 if(!policyParsed.success)issue('policy-schema','error','configuration',policyParsed.error.issues.map(x=>x.path.join('.')),'Valid scoring policy','Invalid scoring policy','Correct policy validation errors.');else passedCheckIds.push('policy-schema');
 if(!parsed.success||!policyParsed.success)return {schemaVersion:1,status:'invalid_for_declared_assessment',seed,checks,passedCheckIds,limitations:['Automated checks do not establish educational validity.']};
 const scenario=parsed.data as ScenarioDefinition,policy=policyParsed.data as ScoringPolicy,contract=scenario.trainingContract;
 if(!contract)issue('legacy-blueprint','warning','coverage',['trainingContract'],'Declared competency blueprint','Legacy scenario has no opportunity metadata','Preserve legacy playability; declare a new version before making qualified competency claims.');
 else {
  for(const c of scenario.contacts)if(c.assessment.requiredEvidence.includes('absenceOfFeatures')&&c.assessment.requiredEvidence.length>1)issue(`contradictory-evidence-${c.id}`,'error','configuration',[`contact:${c.id}`],'Required evidence compatible with the canonical contradiction rule','Answer key requires absenceOfFeatures alongside other evidence, which the scorer marks contradictory','Author a consistent evidence key or choose another bounded candidate.');
  const opportunityIds=new Set<string>(),blueprintIds=new Set<string>();
  for(const opportunity of contract.opportunities){
   const ref=`opportunity:${opportunity.id}`,contact=scenario.contacts.find(c=>c.id===opportunity.contactId);
   if(opportunityIds.has(opportunity.id))issue(`duplicate-${opportunity.id}`,'error','configuration',[ref],'Unique observation ID','Duplicate observation ID','Use a unique opportunity identifier.');opportunityIds.add(opportunity.id);
   if(!contact||opportunity.atTime>=opportunity.until||opportunity.until>scenario.duration||!contact.observable||opportunity.until<=contact.spawnTime||contact.despawnTime!==-1&&opportunity.atTime>=contact.despawnTime)issue(`opportunity-${opportunity.id}`,'error','observation',[ref],'Reachable observable contact and time window','Missing or impossible observation opportunity','Provide an observable contact and overlapping opportunity window.');
   if(contact&&opportunity.cue.toLowerCase().includes(contact.groundTruthLabel.toLowerCase()))issue(`answer-leak-${opportunity.id}`,'error','assessment-integrity',[ref],'Observation cue without answer-key identifiers','Cue includes the answer category identifier','Describe evidence instead of naming the answer.');
   if(opportunity.channel!=='text')issue(`presentation-${opportunity.id}`,'warning','observation',[ref],'Reliably instrumented presentation channel',`${opportunity.channel} presentation cannot yet be established by the text-panel instrumentation`,'Use a supported text cue or obtain expert review; do not fabricate presentation.');
  }
  for(const b of contract.competencies){
   const refs=[`blueprint:${b.id}`],objective=b.objectiveId;
   if(blueprintIds.has(b.id))issue(`duplicate-blueprint-${b.id}`,'error',objective,refs,'Unique competency blueprint','Duplicate blueprint identifier','Use a unique identifier.');blueprintIds.add(b.id);
   if(!LEARNING_OBJECTIVES.some(o=>o.id===objective))issue(`objective-${b.id}`,'error',objective,refs,'Known learning objective','Unknown objective','Choose a catalogue objective.');
   if(b.policyRef.id!==policy.policyId||b.policyRef.version!==policy.policyVersion)issue(`policy-ref-${b.id}`,'error',objective,refs,`${b.policyRef.id}@${b.policyRef.version}`,`${policy.policyId}@${policy.policyVersion}`,'Select the referenced immutable policy version.');
   if(b.contactIds.some(id=>{const c=scenario.contacts.find(c=>c.id===id);return c&&!b.acceptedResponses.includes(c.assessment.correctResponse);}))issue(`responses-key-${b.id}`,'error',objective,refs,'Declared accepted reporting categories consistent with the scenario key','Accepted responses contradict the answer key','Align the blueprint and fictional response rubric.');
   if(b.competency==='classification'&&policy.classificationScores.correct<=policy.classificationScores.incorrect)issue(`classification-rubric-${b.id}`,'error',objective,refs,'Correctness credit distinguishable from an incorrect answer','Policy cannot support the declared higher-is-better classification inference','Correct the policy scoring convention.');
   if(b.competency==='uncertainty'&&b.uncertainty==='required'&&policy.classificationScores.acceptableUnknown<=policy.classificationScores.incorrect)issue(`unknown-rubric-${b.id}`,'error',objective,refs,'Appropriate unknown response distinguished from an incorrect answer','Policy contradicts the declared uncertainty objective','Review unknown-response credit.');
   if(b.competency==='procedure'&&b.contactIds.some(id=>{const c=scenario.contacts.find(c=>c.id===id);return c&&evaluateProcedural(c,c.assessment.correctResponse,c.assessment.acceptableClassifications[0],policy,c.assessment.requiredEvidence,c.assessment.acceptableClassifications[0]==='unknown'?'low':'high').score<=0;}))issue(`procedural-rubric-${b.id}`,'error',objective,refs,'Declared correct fictional response has reachable positive credit','Policy rejects the scenario-correct response','Align the scenario key and decision tree.');
   if(b.competency==='evidence'&&b.contactIds.some(id=>scenario.contacts.find(c=>c.id===id)?.assessment.requiredEvidence.length===0))issue(`evidence-key-${b.id}`,'error',objective,refs,'A declared evidence task has specified evidence','No evidence criterion is defined','Define observable evidence or remove the unsupported competency claim.');
   if(b.assessmentMode!==contract.stage)issue(`mode-${b.id}`,'error',objective,refs,contract.stage,b.assessmentMode,'Align declared assessment mode with the training stage.');
   if(new Set(b.contactIds).size!==b.contactIds.length||b.contactIds.some(id=>!scenario.contacts.some(c=>c.id===id)))issue(`contacts-${b.id}`,'error',objective,refs,'Distinct existing contact references','Missing/duplicate competency contact','Correct contact references.');
   const required=b.requiredOpportunityIds.map(id=>contract.opportunities.find(o=>o.id===id));
   if(required.some(o=>!o||!b.contactIds.includes(o.contactId)||!b.channels.includes(o.channel)))issue(`observations-${b.id}`,'error',objective,[...refs,...b.requiredOpportunityIds],'Existing opportunities for the declared contacts/channels','Missing or incompatible required observation','Add the expected observation or correct the blueprint.');
   if(b.uncertainty==='required'&&b.contactIds.some(id=>!scenario.contacts.find(c=>c.id===id)?.assessment.acceptableClassifications.includes('unknown')))issue(`uncertainty-key-${b.id}`,'error',objective,refs,'Unknown accepted for a declared uncertainty task','Answer key contradicts required uncertainty','Correct the answer key or declared objective.');
   if(!scenario.permittedActions.classify||!scenario.permittedActions.proceduralResponse||b.eligibility.requireAcknowledgement&&!scenario.permittedActions.acknowledge)issue(`actions-${b.id}`,'error',objective,refs,'Required response controls enabled','Declared behavior cannot be submitted','Enable required response controls.');
   if(b.eligibility.minimumIndependentResponses>b.contactIds.length)issue(`responses-${b.id}`,'error',objective,refs,'Attainable independent-response count','Required count exceeds available contacts','Lower the count or provide appropriate contacts.');
   if(b.uncertainty==='required'&&b.contactIds.some(id=>scenario.contacts.find(c=>c.id===id)?.assessment.minimumConfidence==='high'))issue(`certainty-key-${b.id}`,'error',objective,refs,'Confidence condition compatible with ambiguity','Required high confidence conflicts with uncertainty','Revise the confidence requirement.');
  }
  if(contract.stage!=='guided_practice'&&contract.assistance.hints)issue('independent-hints','error','assessment-integrity',['assistance'],'Independent stage without hints','Hints enabled outside guided practice','Disable assistance or change the stage.');
  if(contract.reservation&&(contract.reservation.featureKey!==presentationFamily(scenario)||contract.reservation.priorFeatureKeys.includes(contract.reservation.featureKey)))issue('reservation-integrity','error','assessment-integrity',['reservation'],'A different controlled answer/evidence family','Evaluation repeats prior family or metadata does not match the scenario','Generate a genuinely different supported variant.');
  if(['unseen_evaluation','retention_followup'].includes(contract.stage)&&!contract.reservation)issue('reservation-unknown','warning','assessment-integrity',['reservation'],'History-checked reserved evaluation variant','No recorded reservation history; unseen status is unverified','Use the adaptive reserved-variant workflow; do not infer unfamiliarity from a new seed.');
  if(contract.assistance.answersExposed&&contract.stage!=='guided_practice')issue('answer-exposure','error','assessment-integrity',['assistance'],'Independent assessment without exposed answers','Answers exposed outside guided practice','Remove answer exposure or change the stage.');
 }
 const nodeIds=new Set<string>();
 function visit(node:DecisionNode,constraints:Partial<Record<DecisionNode['kind'],string[]>>){
  if(nodeIds.has(node.id))issue(`rule-duplicate-${node.id}`,'error','policy',[node.id],'Unique rule ID','Duplicate decision-rule identifier','Give each rule a unique ID.');nodeIds.add(node.id);
  let next={...constraints};
  if(node.expected?.length){const valid=node.expected.filter(x=>choices[node.kind].includes(x));const intersection=constraints[node.kind]?valid.filter(x=>constraints[node.kind]!.includes(x)):valid;
   if(!valid.length||node.kind!=='evidencePresent'&&!intersection.length)issue(`unreachable-${node.id}`,'error','policy',[node.id],'Reachable pass branch','No permitted response can satisfy this branch','Correct the rule values or contradictory ancestor conditions.');
   if(valid.length!==node.expected.length)issue(`rule-values-${node.id}`,'warning','policy',[node.id],'Supported decision-rule values','Rule contains unsupported values','Review unsupported values.');
   if(node.kind!=='evidencePresent')next={...next,[node.kind]:intersection};
  }
  for(const child of node.children??[])visit(child,next);
 }
 for(const node of policy.decisionTrees)visit(node,{});
 if(scenario.groupTraining&&!policy.groupReporting)issue('group-rubric','error','synthetic-group-awareness',['groupTraining','groupReporting'],'Versioned group-reporting rubric','Group exercise policy omits its reporting rubric','Select a group-reporting policy.');
 if(!checks.some(c=>c.id.startsWith('unreachable-')))passedCheckIds.push('rule-reachability');
 if(!checks.some(c=>c.id.startsWith('answer-leak-')))passedCheckIds.push('trainee-projection-answer-key-check');
 if(!checks.some(c=>c.severity==='error'))passedCheckIds.push('declared-observation-consistency');
 return {schemaVersion:1,status:checks.some(c=>c.severity==='error')?'invalid_for_declared_assessment':checks.some(c=>c.severity==='warning')?'needs_revision':'ready_for_instructor_review',seed,checks,passedCheckIds,limitations:['Deterministic configuration checks are not educational certification.','Rendered/presented information does not establish human perception.','Institutional fictional response rubrics require authorized training-owner review.']};
}
