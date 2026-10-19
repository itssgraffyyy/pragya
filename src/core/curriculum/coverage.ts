import type { StorageAdapter } from '../persistence/storage';
import type { LocalActor } from '../unit/models';
import { curriculumTargets } from './objectiveService';
import { curriculumWorkspace } from './service';
import { authorizedHistory } from '../unit/service';
import { learningEligible } from '../assessGuard/eligibility';
/** Availability, assessment opportunity and independent evidence are separate counts. */
export async function curriculumCoverage(storage:StorageAdapter,actor:LocalActor,unitId:string,traineeIds:string[]){
 const ids=await curriculumTargets(storage,actor,unitId,traineeIds),workspace=await curriculumWorkspace(storage,actor,unitId),sessions=(await Promise.all(ids.map(id=>authorizedHistory(storage,actor,unitId,id)))).flat();
 return workspace.objectives.filter(o=>!o.archived).map(row=>{
  const candidates=[...new Map(workspace.candidates.filter(c=>c.objectiveKey===row.id&&['published','assigned'].includes(c.status)).map(c=>[c.scenarioSnapshot.id+'@'+c.scenarioSnapshot.version,c])).values()],matching=sessions.filter(s=>s.summary.status==='completed'&&s.summary.scenarioSnapshot.trainingContract?.competencies.some(b=>b.objectiveId===row.definition.objectiveId)&&s.summary.scenarioSnapshot.curriculum?.objectiveKey===row.id&&learningEligible(s,row.definition.competency));
  const coached=matching.filter(s=>s.summary.scenarioSnapshot.trainingContract!.stage==='guided_practice'),independent=matching.filter(s=>s.summary.scenarioSnapshot.trainingContract!.stage!=='guided_practice');
  return {objectiveKey:row.id,objectiveId:row.definition.objectiveId,version:row.definition.version,availableExercises:candidates.length,declaredAssessmentOpportunities:candidates.reduce((n,c)=>n+(c.scenarioSnapshot.trainingContract?.opportunities.length??0),0),eligibleHistory:matching.length,coachedPractice:coached.length,independentAssessments:independent.length,legacyRubricHistory:sessions.filter(s=>!s.summary.scenarioSnapshot.trainingContract&&s.summary.scenarioSnapshot.learningObjectives.some(o=>o.id===row.definition.objectiveId)).length,repeatedIndependentEvidence:independent.length>=3,needsIndependentEvaluation:coached.length>0&&independent.length===0,unassessed:independent.length===0,sourceSessionIds:matching.map(s=>s.summary.sessionId),explanation:'Exercise availability is not demonstrated competence. Repeated simulator evidence is not mastery or real-world readiness.'};
 });
}
