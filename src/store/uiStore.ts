/**
 * UI / navigation store.
 * Screens: home, scenarios, generator, console, summary, editor, settings, history.
 */

import { create } from 'zustand';

export type Screen =
  | 'home'
  | 'scenarios'
  | 'generator'
  | 'console'
  | 'summary'
  | 'editor'
  | 'settings'
  | 'history'
  | 'trainees'
  | 'learning'
  | 'adaptive'
  | 'progress'
  | 'coach';

interface UiStore {
  screen: Screen;
  /** Scenario selected for preview in the editor or for play. */
  pendingScenarioId: string | null;
  navigate: (screen: Screen) => void;
  openScenario: (scenarioId: string, target: 'console' | 'editor') => void;
}

export const useUiStore = create<UiStore>((set) => ({
  screen: 'home',
  pendingScenarioId: null,
  navigate: (screen) => set({ screen }),
  openScenario: (scenarioId, target) =>
    set({ pendingScenarioId: scenarioId, screen: target === 'editor' ? 'editor' : 'console' }),
}));
