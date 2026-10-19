/**
 * Procedural scenario generator screen.
 * Same seed + same options => identical scenario (determinism is tested).
 */

import { useState } from 'react';
import { generateScenario } from '../core/generator/generator';
import { useUiStore } from '../store/uiStore';
import { useSimulationStore } from '../store/simulationStore';
import { useSettingsStore } from '../store/settingsStore';
import type {
  DifficultyTier,
  EnvironmentPreset,
  ScenarioDefinition,
  TimeOfDay,
  VisibilityCondition,
  WeatherEffect,
} from '../core/types';

const EMPTY = 'random' as const;

interface Preview {
  title: string;
  description: string;
  notes: string[];
  contactCount: number;
  duration: number;
}

export function GeneratorScreen() {
  const navigate = useUiStore((s) => s.navigate);
  const loadScenario = useSimulationStore((s) => s.loadScenario);
  const traineeId = useSettingsStore((s) => s.traineeId);

  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [environment, setEnvironment] = useState<EnvironmentPreset | typeof EMPTY>(EMPTY);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | typeof EMPTY>(EMPTY);
  const [visibility, setVisibility] = useState<VisibilityCondition | typeof EMPTY>(EMPTY);
  const [weather, setWeather] = useState<WeatherEffect | typeof EMPTY>(EMPTY);
  const [difficulty, setDifficulty] = useState<DifficultyTier | typeof EMPTY>(EMPTY);
  const [generated, setGenerated] = useState<{ preview: Preview; scenario: ScenarioDefinition } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const regenerate = () => {
    setError(null);
    try {
      const result = generateScenario({ seed, environment, timeOfDay, visibility, weather, difficulty });
      setGenerated({
        preview: {
          title: result.scenario.title,
          description: result.scenario.description,
          notes: result.notes,
          contactCount: result.scenario.contacts.length,
          duration: result.scenario.duration,
        },
        scenario: result.scenario,
      });
    } catch (e) {
      setError((e as Error).message);
      setGenerated(null);
    }
  };

  const begin = () => {
    if (!generated) return;
    loadScenario(generated.scenario, `sess-${Date.now().toString(36)}`, traineeId);
    navigate('console');
  };

  return (
    <div className="min-h-full p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Scenario Generator</h2>
        <button onClick={() => navigate('home')} className="text-console-accent hover:underline">
          &larr; Home
        </button>
      </div>

      <div className="panel p-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Seed
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Math.abs(parseInt(e.target.value || '0', 10)))}
            className="mt-1 w-full bg-console-bg border border-console-border rounded px-2 py-1"
            data-testid="gen-seed"
          />
        </label>
        <label className="text-sm">
          Difficulty
          <select
            aria-label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as DifficultyTier | typeof EMPTY)}
            className="mt-1 w-full bg-console-bg border border-console-border rounded px-2 py-1"
          >
            <option value={EMPTY}>Random</option>
            <option value="basic">Basic</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label className="text-sm">
          Environment
          <select
            aria-label="Environment"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as EnvironmentPreset | typeof EMPTY)}
            className="mt-1 w-full bg-console-bg border border-console-border rounded px-2 py-1"
          >
            <option value={EMPTY}>Random</option>
            <option value="urban">Urban</option>
            <option value="rural">Rural</option>
          </select>
        </label>
        <label className="text-sm">
          Time of day
          <select
            aria-label="Time of day"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay | typeof EMPTY)}
            className="mt-1 w-full bg-console-bg border border-console-border rounded px-2 py-1"
          >
            <option value={EMPTY}>Random</option>
            <option value="day">Day</option>
            <option value="dusk">Dusk</option>
            <option value="night">Night</option>
          </select>
        </label>
        <label className="text-sm">
          Visibility
          <select
            aria-label="Visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as VisibilityCondition | typeof EMPTY)}
            className="mt-1 w-full bg-console-bg border border-console-border rounded px-2 py-1"
          >
            <option value={EMPTY}>Random</option>
            <option value="clear">Clear</option>
            <option value="lightFog">Light fog</option>
            <option value="denseFog">Dense fog</option>
          </select>
        </label>
        <label className="text-sm">
          Weather
          <select
            aria-label="Weather"
            value={weather}
            onChange={(e) => setWeather(e.target.value as WeatherEffect | typeof EMPTY)}
            className="mt-1 w-full bg-console-bg border border-console-border rounded px-2 py-1"
          >
            <option value={EMPTY}>Random</option>
            <option value="none">None</option>
            <option value="rain">Rain</option>
            <option value="reducedContrast">Reduced contrast</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={regenerate}
          className="bg-console-accent/90 hover:bg-console-accent text-black font-medium px-4 py-1.5 rounded"
          data-testid="gen-generate"
        >
          Generate
        </button>
        <button
          onClick={begin}
          disabled={!generated}
          className="border border-console-border px-4 py-1.5 rounded disabled:opacity-40"
          data-testid="gen-begin"
        >
          Begin exercise
        </button>
      </div>

      {error && (
        <p className="mt-4 text-console-danger text-sm" data-testid="gen-error">
          {error}
        </p>
      )}

      {generated && (
        <div className="panel p-4 mt-4" data-testid="gen-preview">
          <h3 className="font-semibold">{generated.preview.title}</h3>
          <p className="text-sm text-console-muted mt-1">{generated.preview.description}</p>
          <p className="text-xs text-console-muted mt-2">
            {generated.preview.contactCount} contact(s) · {generated.preview.duration}s · seed {seed}
          </p>
          {generated.preview.notes.length > 0 && (
            <ul className="mt-2 text-xs text-console-muted list-disc pl-4">
              {generated.preview.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

