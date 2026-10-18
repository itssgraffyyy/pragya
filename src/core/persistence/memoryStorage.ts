import { localDataFingerprint,type LocalDeletion } from './localDeletion';
import type { LocalDataBundle,LocalDataKind } from './storage';
import type { TrainingKind, TrainingRecord } from '../unit/models';
import type { LearningPlan } from '../learning/plan';
import type { TraineeProfile } from '../learning/profile';
/**
 * In-memory storage adapter — used by unit tests and as a fallback when
 * IndexedDB is unavailable (e.g. private browsing quirks).
 */

import type { ScenarioDefinition } from '../types';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  StorageAdapter,
  StoredSession,
} from './storage';

export class MemoryStorage implements StorageAdapter {
  private training = new Map<string, TrainingRecord>();
  async listTrainingRecords(kind:TrainingKind):Promise<TrainingRecord[]> { return structuredClone([...this.training.values()].filter(r=>r.kind===kind)); }
  async saveTrainingRecords(records:TrainingRecord[],insertOnly=false):Promise<void> { const values=structuredClone(records);if(insertOnly&&values.some(r=>this.training.has(r.kind+':'+r.id)))throw new Error('Record already exists');for(const r of values)this.training.set(r.kind+':'+r.id,r); }
  private plans = new Map<string, LearningPlan>();
  private trainees = new Map<string, TraineeProfile>();
  private scenarios = new Map<string, ScenarioDefinition>();
  private sessions = new Map<string, StoredSession>();
  private settings: AppSettings = { ...DEFAULT_SETTINGS };

  async saveLocalBundle(input:LocalDataBundle,insertOnly:readonly LocalDataKind[]=[]):Promise<void>{const b=structuredClone(input);if(insertOnly.includes('scenarios')&&b.scenarios.some(x=>this.scenarios.has(x.id))||insertOnly.includes('sessions')&&b.sessions.some(x=>this.sessions.has(x.summary.sessionId))||insertOnly.includes('trainees')&&b.trainees.some(x=>this.trainees.has(x.id))||insertOnly.includes('plans')&&b.plans.some(x=>this.plans.has(x.traineeId))||insertOnly.includes('training')&&b.training.some(x=>this.training.has(x.kind+':'+x.id)))throw new Error('Import commit conflict; local records preserved');for(const x of b.scenarios)this.scenarios.set(x.id,x);for(const x of b.sessions)this.sessions.set(x.summary.sessionId,x);for(const x of b.trainees)this.trainees.set(x.id,x);for(const x of b.plans)this.plans.set(x.traineeId,x);for(const x of b.training)this.training.set(x.kind+':'+x.id,x);if(b.settings)this.settings=b.settings;}
  async deleteLocalRecords(expected:LocalDataBundle,remove:LocalDeletion):Promise<void>{
    const current={scenarios:[...this.scenarios.values()],sessions:[...this.sessions.values()],trainees:[...this.trainees.values()],plans:[...this.plans.values()],training:[...this.training.values()]};
    if(localDataFingerprint(current)!==localDataFingerprint(expected))throw new Error('Local data changed; review the demo reset again. No records removed.');
    for(const id of remove.scenarios)this.scenarios.delete(id);for(const id of remove.sessions)this.sessions.delete(id);for(const id of remove.trainees)this.trainees.delete(id);for(const id of remove.plans)this.plans.delete(id);for(const [kind,id] of remove.training)this.training.delete(kind+':'+id);
  }
  async init(): Promise<void> {
    // Nothing to initialize.
  }

  async listScenarios(): Promise<ScenarioDefinition[]> {
    return [...this.scenarios.values()];
  }

  async getScenario(id: string): Promise<ScenarioDefinition | undefined> {
    return this.scenarios.get(id);
  }

  async saveScenario(scenario: ScenarioDefinition): Promise<void> {
    this.scenarios.set(scenario.id, scenario);
  }

  async saveScenarioPublication(scenario:ScenarioDefinition,records:TrainingRecord[]):Promise<void> {
    const bundle=structuredClone({scenario,records});if(bundle.records.some(r=>r.kind==='scenarioVersions'&&this.training.has(r.kind+':'+r.id)))throw new Error('Scenario version already exists');this.scenarios.set(bundle.scenario.id,bundle.scenario);for(const r of bundle.records)this.training.set(r.kind+':'+r.id,r);
  }
  async deleteScenario(id: string): Promise<void> {
    this.scenarios.delete(id);
  }

  async listSessions(): Promise<StoredSession[]> {
    return [...this.sessions.values()];
  }

  async getSession(sessionId: string): Promise<StoredSession | undefined> {
    return this.sessions.get(sessionId);
  }

  async saveSession(session: StoredSession): Promise<void> {
    this.sessions.set(session.summary.sessionId, session);
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async getSettings(): Promise<AppSettings> {
    return { ...this.settings };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    this.settings = { ...settings };
  }

  async listTrainees(): Promise<TraineeProfile[]> { return structuredClone([...this.trainees.values()]); }
  async getTrainee(id: string): Promise<TraineeProfile | undefined> { return structuredClone(this.trainees.get(id)); }
  async saveTrainee(profile: TraineeProfile): Promise<void> { this.trainees.set(profile.id, structuredClone(profile)); }
  async deleteTrainee(id: string): Promise<void> { this.trainees.delete(id); this.plans.delete(id); }
  async saveTraineeBundle(profile: TraineeProfile, sessions: StoredSession[], plan?: LearningPlan): Promise<void> {
    for (const s of sessions) this.sessions.set(s.summary.sessionId, structuredClone(s));
    await this.saveTrainee(profile);
    if(plan) await this.saveLearningPlan(plan);
  }
  async listLearningPlans():Promise<LearningPlan[]> { return structuredClone([...this.plans.values()]); }
  async getLearningPlan(id: string): Promise<LearningPlan | undefined> { return structuredClone(this.plans.get(id)); }
  async saveLearningPlan(plan: LearningPlan): Promise<void> { this.plans.set(plan.traineeId, structuredClone(plan)); }
  async deleteLearningPlan(id: string): Promise<void> { this.plans.delete(id); }
  async clearAll(): Promise<void> {
    this.training.clear();
    this.plans.clear();
    this.trainees.clear();
    this.scenarios.clear();
    this.sessions.clear();
    this.settings = { ...DEFAULT_SETTINGS };
  }
}
