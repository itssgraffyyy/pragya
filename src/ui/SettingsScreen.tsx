import { WorkspaceIntro } from './WorkspacePrimitives';
/**
 * Settings — graphics quality, accessibility, trainee profile.
 * Changes apply at runtime; low presets reduce render scale and effects.
 */

import { useSettingsStore } from '../store/settingsStore';
import { useUiStore } from '../store/uiStore';

export function SettingsScreen() {
  const navigate = useUiStore((s) => s.navigate);
  const s = useSettingsStore();

  return (
    <div className="institutional-workspace min-h-full p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <button onClick={() => navigate('home')} className="text-console-accent hover:underline">
          &larr; Home
        </button>
      </div>

      <WorkspaceIntro eyebrow="WORKSPACE PREFERENCES">Choose a rendering budget for this device, then adjust readability and motion. Training records and scoring stay independent of graphics quality.</WorkspaceIntro><div className="panel p-4 flex flex-col gap-4"><h3>Profile and rendering</h3>
        <label className="text-sm">
          Trainee ID
          <input
            value={s.traineeId}
            onChange={(e) => s.update({ traineeId: e.target.value })}
            className="mt-1 w-full bg-console-bg border border-console-border rounded px-2 py-1"
            data-testid="settings-trainee-id"
          />
        </label>

        <label className="text-sm">
          Graphics preset
          <select
            aria-label="Graphics preset"
            value={s.graphicsPreset}
            onChange={(e) => s.update({ graphicsPreset: e.target.value as 'low' | 'medium' | 'high' })}
            className="mt-1 w-full bg-console-bg border border-console-border rounded px-2 py-1"
            data-testid="settings-graphics"
          >
            <option value="low">Low (reduced decoration, no shadows, 0.6× maximum pixel ratio)</option>
            <option value="medium">Balanced (shadows, 1.25× maximum pixel ratio)</option>
            <option value="high">High (fine terrain, 2048px shadows, 1.75× maximum pixel ratio)</option>
          </select>
        </label>

        <label className="text-sm">
          Render scale: {Math.round(s.renderScale * 100)}%
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.05}
            value={s.renderScale}
            onChange={(e) => s.update({ renderScale: parseFloat(e.target.value) })}
            className="mt-1 w-full"
            data-testid="settings-render-scale"
          />
        </label>

        <h3 className="settings-section-heading">Readability and motion</h3><label className="text-sm">
          Interface scale: {Math.round(s.interfaceScale * 100)}%
          <input
            type="range"
            min={0.85}
            max={1.3}
            step={0.05}
            value={s.interfaceScale}
            onChange={(e) => s.update({ interfaceScale: parseFloat(e.target.value) })}
            className="mt-1 w-full"
            data-testid="settings-interface-scale"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.reducedMotion}
            onChange={(e) => s.update({ reducedMotion: e.target.checked })}
            data-testid="settings-reduced-motion"
          />
          Reduced motion (hold rotor/wing animation; disable camera damping and antialiasing)
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.audioEnabled}
            onChange={(e) => s.update({ audioEnabled: e.target.checked })}
            data-testid="settings-audio"
          />
          Audio cues enabled
        </label>
      </div>

      <p className="mt-4 text-xs text-console-muted">
        Settings persist locally (IndexedDB) and never leave this machine. The app is fully
        offline — no accounts, no telemetry.
      </p>
    </div>
  );
}
