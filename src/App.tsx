import { TraineeProfilesScreen } from './ui/TraineeProfilesScreen';
/**
 * App shell — screen router + persistence hydration.
 */

import { useEffect, useState } from 'react';
import { useUiStore } from './store/uiStore';
import { useSettingsStore } from './store/settingsStore';
import { HomeScreen } from './ui/HomeScreen';
import { ScenarioSelectionScreen } from './ui/ScenarioSelectionScreen';
import { GeneratorScreen } from './ui/GeneratorScreen';
import { SimulationConsoleScreen } from './ui/SimulationConsoleScreen';
import { SessionSummaryScreen } from './ui/SessionSummaryScreen';
import { InstructorEditorScreen } from './ui/InstructorEditorScreen';
import { SettingsScreen } from './ui/SettingsScreen';
import { HistoryScreen } from './ui/HistoryScreen';
import { initStorage } from './core/persistence/appStorage';

export default function App() {
  const screen = useUiStore((s) => s.screen);
  const interfaceScale = useSettingsStore((s) => s.interfaceScale);
  const hydrate = useSettingsStore((s) => s.hydrate);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    initStorage()
      .then(async (storage) => {
        if (cancelled) return;
        const settings = await storage.getSettings();
        hydrate(settings);
      })
      .catch((e) => {
        if (!cancelled) setBootError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  // Persist settings whenever they change (after hydration).
  const settings = useSettingsStore();
  useEffect(() => {
    if (!settings.hydrated) return;
    const rest = {
      traineeId: settings.traineeId,
      graphicsPreset: settings.graphicsPreset,
      renderScale: settings.renderScale,
      reducedMotion: settings.reducedMotion,
      interfaceScale: settings.interfaceScale,
      audioEnabled: settings.audioEnabled,
    };
    initStorage()
      .then((storage) => storage.saveSettings(rest))
      .catch(() => {
        /* persistence is best-effort */
      });
  }, [settings]);

  return (
    <div style={{ fontSize: `${Math.round(16 * interfaceScale)}px` }} className="h-full">
      {bootError && (
        <div className="bg-console-warn/20 text-console-warn text-sm px-4 py-1">
          Storage unavailable: {bootError} (running in-memory)
        </div>
      )}
      {screen === 'home' && <HomeScreen />}
      {screen === 'scenarios' && <ScenarioSelectionScreen />}
      {screen === 'generator' && <GeneratorScreen />}
      {screen === 'console' && <SimulationConsoleScreen />}
      {screen === 'summary' && <SessionSummaryScreen />}
      {screen === 'editor' && <InstructorEditorScreen />}
      {screen === 'settings' && <SettingsScreen />}
      {screen === 'history' && <HistoryScreen />}
      {screen === 'trainees' && <TraineeProfilesScreen />}
    </div>
  );
}
