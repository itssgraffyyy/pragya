



import { RoleBoundary } from './ui/RoleBoundary';
import { UnitManagementScreen } from './ui/UnitManagementScreen';
import { CoachScreen } from './ui/CoachScreen';
import { ProgressScreen } from './ui/ProgressScreen';
import { AdaptiveTrainingScreen } from './ui/AdaptiveTrainingScreen';

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



import { SettingsScreen } from './ui/SettingsScreen';

import { initStorage,getStorageWarning } from './core/persistence/appStorage';

const InstructorEditorScreen=lazy(()=>import('./ui/InstructorEditorScreen').then(m=>({default:m.InstructorEditorScreen})));
const DemoScreen=lazy(()=>import('./ui/DemoScreen').then(m=>({default:m.DemoScreen})));
const CrewScreen=lazy(()=>import('./ui/CrewScreen').then(m=>({default:m.CrewScreen})));
const SimulationConsoleScreen=lazy(()=>import('./ui/SimulationConsoleScreen').then(m=>({default:m.SimulationConsoleScreen})));
const DataTransferScreen=lazy(()=>import('./ui/DataTransferScreen').then(m=>({default:m.DataTransferScreen})));
const UnitAnalyticsScreen=lazy(()=>import('./ui/UnitAnalyticsScreen').then(m=>({default:m.UnitAnalyticsScreen})));
const InstructorScreen=lazy(()=>import('./ui/InstructorScreen').then(m=>({default:m.InstructorScreen})));
const SessionSummaryScreen=lazy(()=>import('./ui/SessionSummaryScreen').then(m=>({default:m.SessionSummaryScreen})));
const HistoryScreen=lazy(()=>import('./ui/HistoryScreen').then(m=>({default:m.HistoryScreen})));
const LearningScreen=lazy(()=>import('./ui/LearningScreen').then(m=>({default:m.LearningScreen})));
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
      {screen === 'demo' && <DemoScreen />}
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
