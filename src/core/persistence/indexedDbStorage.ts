import type { TrainingKind, TrainingRecord } from '../unit/models';
import type { LearningPlan } from '../learning/plan';
import type { TraineeProfile } from '../learning/profile';
/**
 * IndexedDB storage adapter for the desktop app.
 * Database: pragya-local / version 4 (additive migrations)
 * Stores: scenarios (key: id), sessions (key: summary.sessionId), settings (key: 'app')
 */

import type { ScenarioDefinition } from '../types';
import type { AppSettings, StorageAdapter, StoredSession } from './storage';
import { DEFAULT_SETTINGS } from './storage';

const DB_NAME = 'pragya-local';
const DB_VERSION = 4;
const STORE_SCENARIOS = 'scenarios';
const STORE_SESSIONS = 'sessions';
const STORE_SETTINGS = 'settings';
const SETTINGS_KEY = 'app';

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export class IndexedDbStorage implements StorageAdapter {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB is not available in this environment');
    }
    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('training')) db.createObjectStore('training', {keyPath:['kind','id']});
        if (!db.objectStoreNames.contains('learningPlans')) db.createObjectStore('learningPlans', { keyPath: 'traineeId' });
        // v2 adds profiles without rewriting v1 scenario/session/settings records.
        if (!db.objectStoreNames.contains('trainees')) db.createObjectStore('trainees', { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORE_SCENARIOS)) {
          db.createObjectStore(STORE_SCENARIOS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
          db.createObjectStore(STORE_SESSIONS, { keyPath: 'summary.sessionId' });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    });
  }

  private tx(store: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) throw new Error('IndexedDB not initialized — call init() first');
    return this.db.transaction(store, mode).objectStore(store);
  }

  async listScenarios(): Promise<ScenarioDefinition[]> {
    return promisifyRequest(this.tx(STORE_SCENARIOS, 'readonly').getAll());
  }

  async getScenario(id: string): Promise<ScenarioDefinition | undefined> {
    return promisifyRequest(this.tx(STORE_SCENARIOS, 'readonly').get(id));
  }

  async saveScenario(scenario: ScenarioDefinition): Promise<void> {
    await promisifyRequest(this.tx(STORE_SCENARIOS, 'readwrite').put(scenario));
  }

  async saveScenarioPublication(scenario:ScenarioDefinition,records:TrainingRecord[]):Promise<void> {
    if(!this.db)throw new Error('Storage not initialized');
    await new Promise<void>((resolve,reject)=>{const tx=this.db!.transaction([STORE_SCENARIOS,'training'],'readwrite');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('Scenario publication aborted'));try{tx.objectStore(STORE_SCENARIOS).put(scenario);for(const record of records)tx.objectStore('training').put(record);}catch(error){tx.abort();reject(error);}});
  }
  async deleteScenario(id: string): Promise<void> {
    await promisifyRequest(this.tx(STORE_SCENARIOS, 'readwrite').delete(id));
  }

  async listSessions(): Promise<StoredSession[]> {
    return promisifyRequest(this.tx(STORE_SESSIONS, 'readonly').getAll());
  }

  async getSession(sessionId: string): Promise<StoredSession | undefined> {
    return promisifyRequest(this.tx(STORE_SESSIONS, 'readonly').get(sessionId));
  }

  async saveSession(session: StoredSession): Promise<void> {
    await promisifyRequest(this.tx(STORE_SESSIONS, 'readwrite').put(session));
  }

  async deleteSession(sessionId: string): Promise<void> {
    await promisifyRequest(this.tx(STORE_SESSIONS, 'readwrite').delete(sessionId));
  }

  async getSettings(): Promise<AppSettings> {
    const stored = await promisifyRequest< AppSettings | undefined>(
      this.tx(STORE_SETTINGS, 'readonly').get(SETTINGS_KEY),
    );
    return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await promisifyRequest(this.tx(STORE_SETTINGS, 'readwrite').put(settings, SETTINGS_KEY));
  }

  async listTrainingRecords(kind:TrainingKind):Promise<TrainingRecord[]> {
    const all:TrainingRecord[]=await promisifyRequest(this.tx('training','readonly').getAll());return all.filter(r=>r.kind===kind);
  }
  async saveTrainingRecords(records:TrainingRecord[]):Promise<void> {
    if(!this.db)throw new Error('Storage not initialized');
    await new Promise<void>((resolve,reject)=>{ const tx=this.db!.transaction('training','readwrite');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('Training write aborted'));for(const r of records)tx.objectStore('training').put(r); });
  }
  async listTrainees(): Promise<TraineeProfile[]> { return promisifyRequest(this.tx('trainees', 'readonly').getAll()); }
  async getTrainee(id: string): Promise<TraineeProfile | undefined> { return promisifyRequest(this.tx('trainees', 'readonly').get(id)); }
  async saveTrainee(profile: TraineeProfile): Promise<void> { await promisifyRequest(this.tx('trainees', 'readwrite').put(profile)); }
  async deleteTrainee(id: string): Promise<void> { await promisifyRequest(this.tx('trainees', 'readwrite').delete(id)); await this.deleteLearningPlan(id); }
  async saveTraineeBundle(profile: TraineeProfile, sessions: StoredSession[], plan?: LearningPlan): Promise<void> {
    if (!this.db) throw new Error('Storage not initialized');
    await new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(['trainees', STORE_SESSIONS, 'learningPlans'], 'readwrite');
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error ?? new Error('Import aborted'));
      tx.objectStore('trainees').put(profile);
      if(plan)tx.objectStore('learningPlans').put(plan);
      for (const s of sessions) tx.objectStore(STORE_SESSIONS).put(s);
    });
  }
  async getLearningPlan(id: string): Promise<LearningPlan | undefined> { return promisifyRequest(this.tx('learningPlans', 'readonly').get(id)); }
  async saveLearningPlan(plan: LearningPlan): Promise<void> { await promisifyRequest(this.tx('learningPlans', 'readwrite').put(plan)); }
  async deleteLearningPlan(id: string): Promise<void> { await promisifyRequest(this.tx('learningPlans', 'readwrite').delete(id)); }
  async clearAll(): Promise<void> {
    await promisifyRequest(this.tx('training','readwrite').clear());
    await promisifyRequest(this.tx('learningPlans', 'readwrite').clear());
    await promisifyRequest(this.tx('trainees', 'readwrite').clear());
    await promisifyRequest(this.tx(STORE_SCENARIOS, 'readwrite').clear());
    await promisifyRequest(this.tx(STORE_SESSIONS, 'readwrite').clear());
    await promisifyRequest(this.tx(STORE_SETTINGS, 'readwrite').clear());
  }
}
