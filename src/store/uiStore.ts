/**
 * UI / navigation store.
 * Screens: home, scenarios, generator, console, summary, editor, settings, history.
 */

import { create } from 'zustand';

export type Screen =
  | 'transfer'
  | 'analytics'
  | 'instructor'
  | 'crew'
  | 'units'
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
  pendingReviewNoteId:string|null;
  assignFromReview:(id:string)=>void;
  /** Scenario selected for preview in the editor or for play. */
  pendingScenarioId: string | null;
  navigate: (screen: Screen) => void;
  openScenario: (scenarioId: string, target: 'console' | 'editor') => void;
}

export const useUiStore = create<UiStore>((set) => ({
  screen: 'home',
  pendingReviewNoteId:null,
  assignFromReview:(id)=>set({pendingReviewNoteId:id,screen:'instructor'}),
  pendingScenarioId: null,
  navigate: (screen) => set({ screen }),
  openScenario: (scenarioId, target) =>
    set({ pendingScenarioId: scenarioId, screen: target === 'editor' ? 'editor' : 'console' }),
}));
