import { z } from 'zod';
import type { StorageAdapter, StoredSession } from '../persistence/storage';
import { traineeProfileSchema, type TraineeProfile } from './profile';
import { storedSessionSchema, validSession } from './validation';

export interface TraineeHistory { sessions: StoredSession[]; warnings: string[] }
export async function traineeHistory(storage: StorageAdapter, profile: TraineeProfile): Promise<TraineeHistory> {
  const warnings: string[] = [];
  const profiles = await storage.listTrainees();
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
  const profiles = await storage.listTrainees();
  if (profiles.some((p) => p.id !== profile.id && (p.id === s.summary.traineeId || p.legacySessionIds.includes(sessionId)))) throw new Error('Session already belongs to another profile');
  const updated = traineeProfileSchema.parse({ ...profile, legacySessionIds: [...new Set([...profile.legacySessionIds, sessionId])] });
  await storage.saveTrainee(updated); return updated;
}
export async function recordProfileSession(storage: StorageAdapter, session: StoredSession): Promise<void> {
  const p = await storage.getTrainee(session.summary.traineeId);
  if (!p) return; // Legacy IDs are never silently assigned to the active profile.
  const completedSessionIds = session.summary.status === 'completed' ? [...new Set([...p.completedSessionIds, session.summary.sessionId])] : p.completedSessionIds;
  await storage.saveTrainee({ ...p, completedSessionIds, lastActiveAt: session.summary.endedAt });
}
export async function exportTrainee(storage: StorageAdapter, profile: TraineeProfile) {
  const history = await traineeHistory(storage, profile);
  return { kind: 'pragya-trainee-export' as const, exportVersion: 1 as const, profile, sessions: history.sessions };
}
const bundleSchema = z.object({ kind: z.literal('pragya-trainee-export'), exportVersion: z.literal(1), profile: traineeProfileSchema, sessions: z.array(storedSessionSchema).max(10000) }).strict();
export async function importTrainee(storage: StorageAdapter, value: unknown): Promise<TraineeProfile> {
  const bundle = bundleSchema.parse(value);
  const existingProfiles = await storage.listTrainees();
  if (await storage.getTrainee(bundle.profile.id)) throw new Error('Profile ID already exists; import cannot overwrite it');
  const sessions = bundle.sessions as StoredSession[];
  for (const s of sessions) {
    if (s.summary.traineeId !== bundle.profile.id && !bundle.profile.legacySessionIds.includes(s.summary.sessionId)) throw new Error('Foreign trainee session in import');
    if (existingProfiles.some((p) => p.id === s.summary.traineeId || p.legacySessionIds.includes(s.summary.sessionId))) throw new Error('Session owned by another local profile');
    const existing = await storage.getSession(s.summary.sessionId);
    if (existing && JSON.stringify(existing) !== JSON.stringify(s)) throw new Error('Conflicting session ID; original record preserved');
  }
  await storage.saveTraineeBundle(bundle.profile, sessions);
  return bundle.profile;
}
