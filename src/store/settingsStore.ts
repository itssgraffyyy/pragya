/**
 * App settings store — persisted to local storage adapter by App.tsx on boot.
 * Graphics quality must adapt at runtime without requiring a restart.
 */

import { create } from 'zustand';
import type { AppSettings } from '../core/persistence/storage';
import { DEFAULT_SETTINGS } from '../core/persistence/storage';

interface SettingsStore extends AppSettings {
  hydrated: boolean;
  update: (partial: Partial<AppSettings>) => void;
  hydrate: (settings: AppSettings) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,
  update: (partial) => set(partial),
  hydrate: (settings) => set({ ...settings, hydrated: true }),
}));
