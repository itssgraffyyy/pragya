import type { StorageAdapter } from '../persistence/storage';
import { traineeProfileSchema } from './profile';
import { traineeHistory } from './trainees';
import { calculateSkillDNA } from './skillDNA';
import { longitudinalPatterns } from './longitudinal';
import { learningProgress } from './progress';
import { learningPlanSchema } from './plan';
/** Read-only, per-trainee contract for future consumers. No unit analytics or readiness classification. */
export async function getLearningSnapshot(storage:StorageAdapter,traineeId:string,asOf:string){
  const raw=await storage.getTrainee(traineeId);if(!raw)throw new Error('Trainee profile not found');const profile=traineeProfileSchema.parse(raw);
  const history=await traineeHistory(storage,profile);const sessions=history.sessions.filter((s)=>s.summary.endedAt<=asOf);
  const rawPlan=await storage.getLearningPlan(traineeId);const plan=rawPlan?learningPlanSchema.parse(rawPlan):null;
  const skillDNA=calculateSkillDNA(profile,sessions);const progress=learningProgress(profile,sessions,plan,asOf);
  return {contractVersion:1 as const,traineeId,asOf,skillDNA,progress,patterns:longitudinalPatterns(profile,sessions),recommendations:plan?.recommendations??[],exercises:plan?.exercises??[],assessments:sessions.filter((s)=>s.assessment).map((s)=>s.assessment!),warnings:history.warnings,
    nonSensitiveMetrics:{completedSessions:sessions.filter((s)=>s.summary.status==='completed').length,measuredSessions:skillDNA.measuredSessions,completedExercises:plan?.exercises.filter((e)=>e.status==='completed').length??0,unassessedCompetencies:progress.unassessed.length}};
}
export type TraineeLearningSnapshot=Awaited<ReturnType<typeof getLearningSnapshot>>;
