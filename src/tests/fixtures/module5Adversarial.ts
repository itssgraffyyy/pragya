import type { ScenarioDefinition } from '../../core/types';
import type { ScoringPolicy } from '../../core/scoring/policy';
import { declareAssessment } from '../../core/assessGuard/declare';
import type { ControlledParticipant } from '../../core/assessGuard/testBench';
import { SCENARIO_SINGLE_RECOGNITION } from '../../core/scenario/bundled/scenariosA';
import { SCENARIO_AMBIGUOUS } from '../../core/scenario/bundled/scenariosB';
import { GROUP_EXAMPLES } from '../../core/scenario/bundled/scenariosGroup';
import { defaultPolicyFor } from '../../core/scoring/defaultPolicy';
export interface AdversarialCase {id:string;scenario:ScenarioDefinition;policy:ScoringPolicy;participant:ControlledParticipant;classificationEligibility:string;measured:boolean;expected:string;references:string[]}
/** Stable golden expectations over original-engine fixtures, not human-training results. */
export function module5AdversarialCases():AdversarialCase[]{
 const make=(id:string,change?:(s:ScenarioDefinition,p:ScoringPolicy)=>void,participant:ControlledParticipant='supported',classificationEligibility='eligible',measured=true,expected='Original rubric retained; qualified evidence remains reviewable.'):AdversarialCase=>{const scenario=declareAssessment(SCENARIO_SINGLE_RECOGNITION,['classification','evidence']),policy=structuredClone(defaultPolicyFor(scenario));change?.(scenario,policy);return {id,scenario,policy,participant,classificationEligibility,measured,expected,references:['trainingContract','canonical event stream','immutable scoringPolicy']};};
 const cases=[
 make('missing-information',s=>{s.trainingContract!.competencies.forEach(b=>b.requiredOpportunityIds=['missing']);},'supported','ineligible',false,'Missing observation cannot establish competency.'),
 make('contradictory-answer-key',s=>s.contacts[0].assessment.requiredEvidence.push('absenceOfFeatures'),'supported','ineligible',false,'Known contradiction prevents new inference, preserving raw scores.'),
 make('unreachable-rule',(_s,p)=>{p.decisionTrees=[{id:'parent',description:'Fixed parent',kind:'classificationMatch',expected:['smallMultirotor'],passScore:1,failScore:0,children:[{id:'unreachable',description:'Conflicting child',kind:'classificationMatch',expected:['fixedWing'],passScore:1,failScore:0}]}];},'supported','ineligible',false,'Unreachable policy branch must be corrected.'),
 make('unsupported-presentation',s=>{s.trainingContract!.opportunities.forEach(o=>o.channel='indicator');s.trainingContract!.competencies.forEach(b=>b.channels=['indicator']);},'supported','requires_instructor_review',false,'Indicator presentation is not established by text instrumentation.'),
 make('correct-unsupported-guess',undefined,'unsupported_guess','eligible',true,'Same correctness credit, insufficient evidence support.'),
 make('partially-eligible',s=>{s.trainingContract!.competencies[1].requiredOpportunityIds=['missing'];},'supported','eligible',true,'Classification retained; evidence is unassessable.'),
 make('interrupted',undefined,'interrupted','requires_instructor_review',false,'Interrupted observations do not establish independent competence.'),
 make('policy-version-mismatch',(_s,p)=>{p.policyVersion='9.0.0';},'supported','ineligible',false,'Policy mismatch is an assessment defect.'),
 make('legacy-metadata',s=>{delete s.trainingContract;},'supported','legacy_unknown',true,'Original legacy rubric remains separately labeled; no backfill.'),
 make('coached-contamination',s=>{s.trainingContract!.stage='guided_practice';s.trainingContract!.assistance.hints=true;s.trainingContract!.competencies.forEach(b=>b.assessmentMode='guided_practice');},'supported','eligible',false,'Guided correctness is not independent Skill DNA.'),
 make('incompatible-comparison',s=>{s.timeOfDay='night';},'supported','eligible',true,'Changed conditions have separate cohorts and no direct delta.'),
 ];
 const ambiguous=declareAssessment(SCENARIO_AMBIGUOUS,['classification','uncertainty']);cases.push({id:'valid-ambiguity',scenario:ambiguous,policy:defaultPolicyFor(ambiguous),participant:'uncertain',classificationEligibility:'eligible',measured:true,expected:'Approved unknown remains a valid response.',references:['acceptableClassifications','opportunityPresented','opportunityAcknowledged']});
 const group=declareAssessment(GROUP_EXAMPLES[3],['classification','multiContact']);group.trainingContract!.competencies[1].objectiveId='synthetic-group-awareness';cases.push({id:'valid-group-ambiguity',scenario:group,policy:defaultPolicyFor(group),participant:'supported',classificationEligibility:'eligible',measured:true,expected:'A qualified relationshipUncertain report receives its declared group credit.',references:['groupCuePresented','groupObservationRecorded','groupReportSubmitted']});
 return cases;
}
