import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { MemoryStorage } from '../core/persistence/memoryStorage';
import { IndexedDbStorage } from '../core/persistence/indexedDbStorage';
import { createProfile, traineeProfileSchema } from '../core/learning/profile';
import { associateLegacy, exportTrainee, importTrainee, recordProfileSession, traineeHistory } from '../core/learning/trainees';
import { learningSession } from './learningFixtures';

const profile = () => createProfile('Trainee One', '2026-10-01T00:00:00.000Z', 't1');
describe('trainee profiles and history', () => {
  it('creates, edits, archives and persists profiles without deleting sessions', async () => {
    const s = new MemoryStorage(); const p=profile(); await s.saveTrainee(p);
    await s.saveTrainee({ ...p, displayName:'Edited', archived:true });
    expect((await s.getTrainee('t1'))?.displayName).toBe('Edited');
    const session=learningSession(); await s.saveSession(session); await recordProfileSession(s,session); await recordProfileSession(s,session);
    expect((await s.getTrainee('t1'))?.completedSessionIds).toEqual(['s1']);
    await s.deleteTrainee('t1'); expect(await s.getSession('s1')).toBeDefined();
  });
  it('isolates trainee histories and requires explicit legacy association', async () => {
    const s=new MemoryStorage(); const p=profile(); await s.saveTrainee(p); await s.saveTrainee(createProfile('Other',p.createdAt,'t2'));
    await s.saveSession(learningSession('s1','t1')); await s.saveSession(learningSession('s2','t2')); await s.saveSession(learningSession('old','legacy'));
    expect((await traineeHistory(s,p)).sessions.map((x)=>x.summary.sessionId)).toEqual(['s1']);
    const linked=await associateLegacy(s,p,'old'); expect((await traineeHistory(s,linked)).sessions).toHaveLength(2);
    expect((await s.getSession('old'))?.summary.traineeId).toBe('legacy');
    await expect(associateLegacy(s,p,'s2')).rejects.toThrow('another profile');
  });
  it('round trips an export and rejects conflicting or foreign data before writing', async () => {
    const s=new MemoryStorage(); await s.saveTrainee(profile()); await s.saveSession(learningSession());
    const bundle=await exportTrainee(s,profile()); const dest=new MemoryStorage(); await importTrainee(dest,bundle);
    expect((await traineeHistory(dest,profile())).sessions[0].assessment).toEqual(bundle.sessions[0].assessment);
    await expect(importTrainee(dest,bundle)).rejects.toThrow('already exists');
    const bad=structuredClone(bundle); bad.sessions[0].assessment!.traineeId='foreign';
    await expect(importTrainee(new MemoryStorage(),bad)).rejects.toThrow();
  });
  it('rejects invalid profile and corrupt saved history without recalculating old scores', async () => {
    expect(()=>traineeProfileSchema.parse({ ...profile(), displayName:'' })).toThrow();
    const s=new MemoryStorage(); await s.saveTrainee(profile()); const invalid=learningSession(); invalid.assessment!.overall=NaN; await s.saveSession(invalid);
    const h=await traineeHistory(s,profile()); expect(h.sessions).toEqual([]); expect(h.warnings.length).toBe(1);
    const legacy=learningSession('legacy'); delete legacy.assessment; await s.saveSession(legacy);
    expect((await traineeHistory(s,profile())).sessions[0].assessment).toBeUndefined();
  });
  it('migrates IndexedDB v1 records intact and persists profiles in v2', async () => {
    await new Promise<void>((resolve,reject)=>{ const r=indexedDB.open('pragya-local',1); r.onupgradeneeded=()=>{
      r.result.createObjectStore('scenarios',{keyPath:'id'}); const sessions=r.result.createObjectStore('sessions',{keyPath:'summary.sessionId'}); sessions.put(learningSession()); r.result.createObjectStore('settings');
    }; r.onsuccess=()=>{r.result.close();resolve();};r.onerror=()=>reject(r.error); });
    const s=new IndexedDbStorage(); await s.init(); expect((await s.getSession('s1'))?.assessment?.overall).toBe(100);
    await s.saveTraineeBundle(profile(),[learningSession('s2')]); expect((await s.getTrainee('t1'))?.displayName).toBe('Trainee One');
    expect(await s.listSessions()).toHaveLength(2);
  });
});
