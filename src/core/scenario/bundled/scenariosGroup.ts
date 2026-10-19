import { buildScenario,buildContact } from './helpers';
import type { ScenarioDefinition } from '../../types';
import { SCENARIO_SINGLE_RECOGNITION,SCENARIO_MULTI_CONTACT } from './scenariosA';
export const GROUP_EXAMPLES:ScenarioDefinition[]=[
 {...structuredClone(SCENARIO_SINGLE_RECOGNITION),id:'scn-group-single',title:'Group awareness A — Single contact baseline'},
 {...structuredClone(SCENARIO_MULTI_CONTACT),id:'scn-group-independent',title:'Group awareness B — Independent contacts'},
 ...(['coordinated','ambiguous'] as const).map((relationship,index)=>build(relationship,index)),
];
function build(relationship:'coordinated'|'ambiguous',index:number):ScenarioDefinition{
 const members=['c1','c2','c3'];const scenario=buildScenario({id:index?'scn-group-ambiguous':'scn-group-coordinated',title:index?'Group awareness D — Ambiguous relationship':'Group awareness C — Synthetic coordinated group',description:'Educational synthetic relationship exercise. Record contact observations and qualify a group report. Motion is a simplified instructional model, not real swarm dynamics.',seed:5200+index,duration:90,difficulty:'intermediate',environment:'rural',timeOfDay:'day',visibility:index?'lightFog':'clear',weather:'none',learningObjectives:[{id:'synthetic-group-awareness',label:'Record and qualify synthetic group observations'},{id:'multi-contact-tracking',label:'Attribute multiple observations'}],contacts:members.map((id,i)=>buildContact({id,category:'smallMultirotor',groundTruth:'smallMultirotor',spawnTime:1,motion:{profile:'straight',origin:relationship==='coordinated'?[0,0,-75]:[i*22-22,0,-75-i*12],speed:relationship==='coordinated'?1:.6+i*.3},assessment:{correctResponse:'recordAndReport'}}))});
 scenario.scoringRuleRefs=['policy-synthetic-group-awareness'];
 scenario.groupTraining={schemaVersion:1,groups:[{id:'g1',label:'Observation set 1',relationship,acceptedReports:[relationship==='coordinated'?'observedGrouping':'relationshipUncertain'],states:[{id:'g1-cluster',atTime:1,members,formation:'cluster',cue:index?'Several contacts are visible; a shared relationship cannot be established from these observations.':'Three synthetic contacts maintain a visible relative arrangement.'},{id:'g1-line',atTime:8,members,formation:'line',cue:index?'Relative appearance changes, but identity and group relationship remain unresolved.':'The synthetic arrangement changes from a cluster into a line while retaining the same contact references.'}]}]};
 return scenario;
}
