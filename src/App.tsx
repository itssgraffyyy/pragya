import { DataTransferScreen } from './ui/DataTransferScreen';
import { UnitAnalyticsScreen } from './ui/UnitAnalyticsScreen';
import { InstructorScreen } from './ui/InstructorScreen';

import { RoleBoundary } from './ui/RoleBoundary';
import { UnitManagementScreen } from './ui/UnitManagementScreen';
import { CoachScreen } from './ui/CoachScreen';
import { ProgressScreen } from './ui/ProgressScreen';
import { AdaptiveTrainingScreen } from './ui/AdaptiveTrainingScreen';
import { LearningScreen } from './ui/LearningScreen';
import { TraineeProfilesScreen } from './ui/TraineeProfilesScreen';
/**
 * App shell — screen router + persistence hydration.
 */

import { lazy,Suspense,useEffect,useState } from 'react';
import { useUiStore } from './store/uiStore';
import { useSettingsStore } from './store/settingsStore';
import { HomeScreen } from './ui/HomeScreen';
import { ScenarioSelectionScreen } from './ui/ScenarioSelectionScreen';
import { GeneratorScreen } from './ui/GeneratorScreen';

import { SessionSummaryScreen } from './ui/SessionSummaryScreen';
import { InstructorEditorScreen } from './ui/InstructorEditorScreen';
import { SettingsScreen } from './ui/SettingsScreen';
import { HistoryScreen } from './ui/HistoryScreen';
import { initStorage,getStorageWarning } from './core/persistence/appStorage';

const CrewScreen=lazy(()=>import('./ui/CrewScreen').then(m=>({default:m.CrewScreen})));
const SimulationConsoleScreen=lazy(()=>import('./ui/SimulationConsoleScreen').then(m=>({default:m.SimulationConsoleScreen})));
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
        setBootError(getStorageWarning());
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
      <Suspense fallback={<p role="status">Loading training view…</p>}><RoleBoundary screen={screen}>
      {screen === 'transfer' && <DataTransferScreen />}
      {screen === 'analytics' && <UnitAnalyticsScreen />}
      {screen === 'instructor' && <InstructorScreen />}
      {screen === 'crew' && <CrewScreen />}
      {screen === 'units' && <UnitManagementScreen />}
      {screen === 'home' && <HomeScreen />}
      {screen === 'scenarios' && <ScenarioSelectionScreen />}
      {screen === 'generator' && <GeneratorScreen />}
      {screen === 'console' && <SimulationConsoleScreen />}
      {screen === 'summary' && <SessionSummaryScreen />}
      {screen === 'editor' && <InstructorEditorScreen />}
      {screen === 'settings' && <SettingsScreen />}
      {screen === 'history' && <HistoryScreen />}
      {screen === 'trainees' && <TraineeProfilesScreen />}
      {screen === 'learning' && <LearningScreen />}
      {screen === 'adaptive' && <AdaptiveTrainingScreen />}
      {screen === 'progress' && <ProgressScreen />}
      {screen === 'coach' && <CoachScreen />}
      </RoleBoundary></Suspense>
    </div>
  );
}
