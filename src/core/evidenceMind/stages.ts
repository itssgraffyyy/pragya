import type { ScenarioDefinition } from '../types';
/** Deliberately excludes seed, IDs, timestamps and incidental coordinates. */
export function presentationFamily(s:ScenarioDefinition):string{
 return JSON.stringify(s.contacts.map(c=>({category:c.category,evidence:[...c.assessment.requiredEvidence].sort(),answers:[...c.assessment.acceptableClassifications].sort()})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
}
export function independentScenario(s:ScenarioDefinition):boolean{return !s.trainingContract||s.trainingContract.stage!=='guided_practice'&&!s.trainingContract.assistance.hints&&!s.trainingContract.assistance.answersExposed;}
export function comparisonIdentity(s:ScenarioDefinition):string|null{
 const c=s.trainingContract;if(!c)return null;
 return c.comparisonKey??JSON.stringify({objectives:c.competencies.map(b=>[b.objectiveId,b.competency,b.uncertainty,b.channels]).sort(),version:s.curriculum?.objectiveVersion??s.version,reportDetail:s.curriculum?.demand.reportDetail??'declared',contacts:s.contacts.length});
}
