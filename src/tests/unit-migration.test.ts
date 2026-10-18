import { beforeEach,describe,it,expect } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { IndexedDbStorage } from '../core/persistence/indexedDbStorage';
import { initializeLocalUnit,records } from '../core/unit/service';
import { createProfile } from '../core/learning/profile';
import { learningSession } from './learningFixtures';
beforeEach(()=>{globalThis.indexedDB=new IDBFactory();});
describe('training storage upgrade',()=>{
 it('upgrades v3 without changing historical sessions, profiles, plans, scenarios or settings',async()=>{
 const profile=createProfile('One',undefined,'t1'),session=learningSession();
 await new Promise<void>((resolve,reject)=>{const req=indexedDB.open('pragya-local',3);req.onupgradeneeded=()=>{const db=req.result;db.createObjectStore('sessions',{keyPath:'summary.sessionId'});db.createObjectStore('trainees',{keyPath:'id'});db.createObjectStore('learningPlans',{keyPath:'traineeId'});db.createObjectStore('scenarios',{keyPath:'id'});db.createObjectStore('settings');};req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result;const tx=db.transaction(['sessions','trainees','learningPlans','scenarios','settings'],'readwrite');tx.objectStore('sessions').put(session);tx.objectStore('trainees').put(profile);tx.objectStore('learningPlans').put({traineeId:'t1',original:true});tx.objectStore('scenarios').put(session.summary.scenarioSnapshot);tx.objectStore('settings').put({traineeId:'t1'},'app');tx.oncomplete=()=>{db.close();resolve();};};});
 const storage=new IndexedDbStorage();await storage.init();expect(await storage.getSession('s1')).toEqual(session);expect(await storage.getTrainee('t1')).toEqual(profile);expect(await storage.getLearningPlan('t1')).toEqual({traineeId:'t1',original:true});expect(await storage.getScenario(session.summary.scenarioId)).toEqual(session.summary.scenarioSnapshot);expect((await storage.getSettings()).traineeId).toBe('t1');
 const {user}=await initializeLocalUnit(storage,'Commander','Unit');expect((await records(storage,'users'))[0].id).toBe(user.id);expect(await records(storage,'ownership')).toEqual([]);
 const copy=new IndexedDbStorage();await copy.init();expect(await records(copy,'users')).toHaveLength(1);await storage.clearAll();expect(await records(copy,'users')).toEqual([]);
 });
});
