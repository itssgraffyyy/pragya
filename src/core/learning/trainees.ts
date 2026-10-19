import { assertLearningPlanSources } from './planIntegrity';
import { records } from '../unit/service';
import { serializeLearning } from './queue';
import { stableKey } from './skillDNA';
import { learningPlanSchema } from './plan';
import { z } from 'zod';
import type { StorageAdapter, StoredSession } from '../persistence/storage';
import { traineeProfileSchema, type TraineeProfile } from './profile';
import { storedSessionSchema, validSession } from './validation';

export interface TraineeHistory { sessions: StoredSession[]; warnings: string[] }
export async function traineeHistory(storage: StorageAdapter, profile: TraineeProfile): Promise<TraineeHistory> {
  const warnings: string[] = [];
  const profiles = (await storage.listTrainees()).flatMap((p)=>{const parsed=traineeProfileSchema.safeParse(p);if(parsed.success)return [parsed.data];return [];});
  if(profiles.length!==(await storage.listTrainees()).length)warnings.push('A corrupt trainee profile was excluded.');
  const sessions = (await storage.listSessions()).filter((s) => {
    if (!validSession(s)) { warnings.push('A corrupt session was excluded.'); return false; }
    const owner = profiles.find((p) => p.id === s.summary.traineeId || p.legacySessionIds.includes(s.summary.sessionId));
    return (s.summary.traineeId === profile.id || profile.legacySessionIds.includes(s.summary.sessionId)) && (!owner || owner.id === profile.id);
  });
  return { sessions: [...new Map(sessions.map((s) => [s.summary.sessionId, s])).values()].sort((a,b) => a.summary.endedAt.localeCompare(b.summary.endedAt) || a.summary.sessionId.localeCompare(b.summary.sessionId)), warnings };
}
export async function associateLegacy(storage: StorageAdapter, profile: TraineeProfile, sessionId: string): Promise<TraineeProfile> {
  const s = await storage.getSession(sessionId);
  if (!s || !validSession(s)) throw new Error('Valid legacy session not found');
  const profiles = (await storage.listTrainees()).flatMap((p)=>{const parsed=traineeProfileSchema.safeParse(p);if(parsed.success)return [parsed.data];return [];});
  if (profiles.some((p) => p.id !== profile.id && (p.id === s.summary.traineeId || p.legacySessionIds.includes(sessionId)))) throw new Error('Session already belongs to another profile');
  const updated = traineeProfileSchema.parse({ ...profile, legacySessionIds: [...new Set([...profile.legacySessionIds, sessionId])] });
  await storage.saveTrainee(updated); return updated;
}
export function profileWithSession(profile:TraineeProfile,session:StoredSession):TraineeProfile {
  if(profile.id!==session.summary.traineeId)throw new Error('Session/profile owner mismatch');
  return {...profile,completedSessionIds:session.summary.status==='completed'?[...new Set([...profile.completedSessionIds,session.summary.sessionId])]:profile.completedSessionIds,lastActiveAt:Date.parse(session.summary.endedAt)>Date.parse(profile.lastActiveAt)?session.summary.endedAt:profile.lastActiveAt};
}
export async function recordProfileSession(storage: StorageAdapter, session: StoredSession): Promise<void> {
  return serializeLearning(session.summary.traineeId, async()=>{
  const p = await storage.getTrainee(session.summary.traineeId);
  if (!p) return; // Legacy IDs are never silently assigned to the active profile.
  await storage.saveTrainee(profileWithSession(p,session));
  });
}
export async function exportTrainee(storage: StorageAdapter, profile: TraineeProfile) {
  const history = await traineeHistory(storage, profile);
  return { kind: 'pragya-trainee-export' as const, exportVersion: 1 as const, profile, sessions: history.sessions, plan: await storage.getLearningPlan(profile.id) };
}
const bundleSchema = z.object({ kind: z.literal('pragya-trainee-export'), exportVersion: z.literal(1), profile: traineeProfileSchema, sessions: z.array(storedSessionSchema).max(10000), plan: learningPlanSchema.optional() }).strict();
export async function importTrainee(storage: StorageAdapter, value: unknown): Promise<TraineeProfile> {
  const bundle = bundleSchema.parse(value);
  if(bundle.plan && (bundle.plan.traineeId !== bundle.profile.id || bundle.plan.recommendations.some((r)=>r.traineeId!==bundle.profile.id) || bundle.plan.exercises.some((e)=>e.traineeId!==bundle.profile.id)))throw new Error('Foreign learning plan in import');
  const existingProfiles = await storage.listTrainees();
  if (await storage.getTrainee(bundle.profile.id)) throw new Error('Profile ID already exists; import cannot overwrite it');
  const sessions = bundle.sessions as StoredSession[];if(bundle.plan)assertLearningPlanSources(bundle.profile,bundle.plan,sessions);
  for (const s of sessions) {
    if (s.summary.traineeId !== bundle.profile.id && !bundle.profile.legacySessionIds.includes(s.summary.sessionId)) throw new Error('Foreign trainee session in import');
    if (existingProfiles.some((p) => p.id === s.summary.traineeId || p.legacySessionIds.includes(s.summary.sessionId))) throw new Error('Session owned by another local profile');
    const existing = await storage.getSession(s.summary.sessionId);
    if (existing && stableKey(existing) !== stableKey(s)) throw new Error('Conflicting session ID; original record preserved');
  }
  if(bundle.plan){
    const references=[...bundle.plan.recommendations.flatMap((r)=>r.evidenceSessionIds),...bundle.plan.exercises.flatMap((e)=>e.sessionId?[e.sessionId]:[]),...bundle.plan.patterns.flatMap((p)=>p.evidence.map((e)=>e.sessionId))];
    for(const id of new Set(references)){const s=sessions.find((s)=>s.summary.sessionId===id)??await storage.getSession(id);if(!s||(s.summary.traineeId!==bundle.profile.id&&!bundle.profile.legacySessionIds.includes(id)))throw new Error('Unknown or foreign assessment reference in learning plan');}
    if(bundle.plan.exercises.some((e)=>e.seed!==e.config.seed||e.seed!==e.scenario.seed))throw new Error('Exercise seed/configuration mismatch');
  }
  await storage.saveTraineeBundle(bundle.profile, sessions, bundle.plan);
  return bundle.profile;
}

export async function deleteProfileSafely(storage:StorageAdapter,id:string){if((await records(storage,'users')).some(u=>u.traineeId===id))throw new Error('Archive unit trainees instead of deleting their linked profile; unit history must remain attributable.');await storage.deleteTrainee(id);}