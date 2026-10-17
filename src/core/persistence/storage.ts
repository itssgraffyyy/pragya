import type { AssessmentResult } from '../scoring/results';
import type { ScoringPolicy } from '../scoring/policy';
/**
 * Local persistence (offline-first).
 *
 * StorageAdapter abstracts the backing store so tests can use a memory
 * implementation while the app uses IndexedDB. Three record kinds:
 *  - scenarios (instructor-authored + imported)
 *  - sessions   (event log + summary)
 *  - settings   (graphics, accessibility, trainee id)
 */

import type { EventLogExport, ScenarioDefinition, SessionSummaryRecord } from '../types';

export interface StoredSession {
  assessment?: AssessmentResult;
  scoringPolicy?: ScoringPolicy;
  summary: SessionSummaryRecord;
  events: EventLogExport;
}

export interface AppSettings {
  traineeId: string;
  graphicsPreset: 'low' | 'medium' | 'high';
  renderScale: number; // 0.5..1
  reducedMotion: boolean;
  interfaceScale: number; // 0.85..1.3
  audioEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  traineeId: 'trainee-001',
  graphicsPreset: 'medium',
  renderScale: 1,
  reducedMotion: false,
  interfaceScale: 1,
  audioEnabled: false,
};

export interface StorageAdapter {
  init(): Promise<void>;
  // Scenarios
  listScenarios(): Promise<ScenarioDefinition[]>;
  getScenario(id: string): Promise<ScenarioDefinition | undefined>;
  saveScenario(scenario: ScenarioDefinition): Promise<void>;
  deleteScenario(id: string): Promise<void>;
  // Sessions
  listSessions(): Promise<StoredSession[]>;
  getSession(sessionId: string): Promise<StoredSession | undefined>;
  saveSession(session: StoredSession): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  // Settings
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;
  // Maintenance
  clearAll(): Promise<void>;
}
