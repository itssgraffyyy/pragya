import type { ScenarioDefinition } from '../types';
import { POLICY_BASIC_RECOGNITION } from './samplePolicies';
import type { ScoringPolicy } from './policy';
export const POLICY_GROUP_AWARENESS:ScoringPolicy={...structuredClone(POLICY_BASIC_RECOGNITION),policyId:'policy-synthetic-group-awareness',policyVersion:'1.0.0',title:'Illustrative synthetic group reporting',description:'Fictional educational recognition/reporting rubric; institutional approval is required. Group observation completeness, attribution and qualified reporting remain separate from original contact accuracy.',groupReporting:{schemaVersion:1,completeness:.4,attribution:.2,qualification:.4}};
export function defaultPolicyFor(scenario:ScenarioDefinition):ScoringPolicy{return scenario.groupTraining?POLICY_GROUP_AWARENESS:POLICY_BASIC_RECOGNITION;}
