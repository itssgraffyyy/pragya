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
  private scenarios = new Map<string, ScenarioDefinition>();
  private sessions = new Map<string, StoredSession>();
  private settings: AppSettings = { ...DEFAULT_SETTINGS };

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

  async clearAll(): Promise<void> {
    this.scenarios.clear();
    this.sessions.clear();
    this.settings = { ...DEFAULT_SETTINGS };
  }
}
