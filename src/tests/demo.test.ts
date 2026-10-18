import { describe,it,expect } from 'vitest';
import { IndexedDbStorage } from '../core/persistence/indexedDbStorage';
import { MemoryStorage } from '../core/persistence/memoryStorage';
import { indexedDB } from 'fake-indexeddb';
import type { StorageAdapter } from '../core/persistence/storage';
import { installDemo,previewDemoReset,resetDemo } from '../core/demo/service';
import { createProfile } from '../core/learning/profile';
import { getLearningSnapshot } from '../core/learning/contracts';
import { records,initializeLocalUnit,manageUnit } from '../core/unit/service';
import { createLocalBackup,restoreLocalBackup,backupChecksum } from '../core/transfer/backup';
import { localDataFingerprint } from '../core/persistence/localDeletion';
import { learningSession } from './learningFixtures';
const now='2026-10-19T10:00:00.000Z';
async function genuine(s:StorageAdapter){await s.saveTrainee(createProfile('Genuine trainee',now,'genuine'));await s.saveSession(learningSession('genuine-session','genuine'));const {unit,user}=await initializeLocalUnit(s,'Genuine commander','Genuine unit');return {unit,user};}

describe('calculated synthetic demo and safe reset',()=>{
 it('records distinct histories, real corrected outcomes, assignments, crew messages and a valid transferable graph',async()=>{
  const s=new MemoryStorage();const existing=await genuine(s);const original=await createLocalBackup(s);const demo=await installDemo(s,null,now);
  expect((await s.getSession('genuine-session'))!.assessment).toEqual(original.payload.sessions[0].assessment);
  const a=await getLearningSnapshot(s,demo.traineeIds[0],new Date(Date.now()+86400000).toISOString());
  expect(a.progress.completedCorrectiveExercises).toBe(1);expect(a.exercises.filter(e=>e.status==='completed')).toHaveLength(2);
  expect(a.recommendations.some(r=>r.competency==='calibration'&&r.status==='resolved')).toBe(true);
  expect(a.progress.comparisons.some(c=>c.stage==='unseenEvaluation'&&c.comparable&&c.delta!==null&&c.delta>0)).toBe(true);
  const b=await getLearningSnapshot(s,demo.traineeIds[1],new Date(Date.now()+86400000).toISOString());expect(b.skillDNA.cohorts.some(c=>c.competencies.some(x=>x.id==='classification'&&x.state==='consistentStrength'))).toBe(true);
  expect((await getLearningSnapshot(s,demo.traineeIds[2],now)).nonSensitiveMetrics.completedSessions).toBe(0);
  expect((await records(s,'assignments')).map(a=>a.status).sort()).toEqual(['assigned','completed']);
  const crew=(await records(s,'crews'))[0];expect(crew.events.some(e=>e.kind==='flagUncertainty')).toBe(true);expect(crew.individualSessions[0].assessment!.categories.classification).toBe(0);expect(crew.jointSession!.assessment!.categories.classification).toBe(60);
  const backup=await createLocalBackup(s);const restored=new MemoryStorage();await restoreLocalBackup(restored,backup);expect((await records(restored,'demoManifests'))[0]).toEqual(demo);
  await expect(installDemo(s,null,now)).rejects.toThrow('already installed');await expect(previewDemoReset(s,{userId:existing.user.id})).rejects.toThrow('Unrestricted');
  const preview=await previewDemoReset(s);expect(preview.counts.sessions).toBe(11);await resetDemo(s,preview);
  expect(localDataFingerprint((await createLocalBackup(s)).payload)).toBe(localDataFingerprint(original.payload));
 });
 it('refuses external references and preserves every record',async()=>{
  const s=new MemoryStorage();const existing=await genuine(s);const demo=await installDemo(s,null,now);
  const trainee=(await records(s,'users')).find(u=>u.traineeId===demo.traineeIds[0])!;
  await manageUnit(s,{userId:existing.user.id},'memberships',{schemaVersion:1,id:'external-membership',unitId:existing.unit.id,userId:trainee.id,role:'trainee',archived:false,joinedAt:now});
  await manageUnit(s,{userId:existing.user.id},'cohorts',{schemaVersion:1,id:'outside-reference',unitId:existing.unit.id,name:'Outside cohort',traineeIds:[demo.traineeIds[0]],archived:false});
  const before=localDataFingerprint((await createLocalBackup(s)).payload);await expect(previewDemoReset(s)).rejects.toThrow('Other records reference');expect(localDataFingerprint((await createLocalBackup(s)).payload)).toBe(before);
 });
 it('cannot mark preexisting records as resettable demo data through a partial backup manifest',async()=>{
  const source=new MemoryStorage();await installDemo(source,null,now);const full=await createLocalBackup(source);const manifest=full.payload.training.filter(r=>r.kind==='demoManifests');
  const payload={...full.payload,training:full.payload.training.filter(r=>r.kind!=='demoManifests')};const target=new MemoryStorage();await restoreLocalBackup(target,{...full,payload,checksum:await backupChecksum(payload)});
  const partial={scenarios:[],sessions:[],trainees:[],plans:[],training:manifest};const before=localDataFingerprint((await createLocalBackup(target)).payload);
  await expect(restoreLocalBackup(target,{...full,payload:partial,checksum:await backupChecksum(partial)})).rejects.toThrow('existing records cannot become demo data');
  expect(localDataFingerprint((await createLocalBackup(target)).payload)).toBe(before);
 });
 for(const adapter of ['memory','indexeddb'] as const)it(`rejects stale reset snapshots and deletes only demo records atomically in ${adapter}`,async()=>{
  if(adapter==='indexeddb')Object.defineProperty(globalThis,'indexedDB',{value:indexedDB,configurable:true});const s:StorageAdapter=adapter==='memory'?new MemoryStorage():new IndexedDbStorage();await s.init();await s.clearAll();await genuine(s);await installDemo(s,null,now);const old=await previewDemoReset(s);
  await s.saveTrainee(createProfile('Concurrent genuine profile',now,'concurrent'));await expect(s.deleteLocalRecords(old.expected,old.remove)).rejects.toThrow('Local data changed');expect(await s.getSession('genuine-session')).toBeDefined();expect(await records(s,'demoManifests')).toHaveLength(1);
  await expect(resetDemo(s,old)).rejects.toThrow('Local data changed');await resetDemo(s,await previewDemoReset(s));expect(await s.getTrainee('concurrent')).toBeDefined();expect(await s.getTrainee('genuine')).toBeDefined();expect(await records(s,'demoManifests')).toHaveLength(0);
 });
});
