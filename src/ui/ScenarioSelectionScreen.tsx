/**
 * Scenario Selection — bundled scripted scenarios + link to the generator.
 * Ground truth is never shown here; only training metadata.
 */

import { useState } from 'react';
import { BUNDLED_SCENARIOS } from '../core/scenario/bundled';
import { useUiStore } from '../store/uiStore';
import { useSimulationStore } from '../store/simulationStore';
import { useSettingsStore } from '../store/settingsStore';

const DIFFICULTY_BADGE: Record<string, string> = {
  basic: 'bg-console-ok/20 text-console-ok',
  intermediate: 'bg-console-warn/20 text-console-warn',
  advanced: 'bg-console-danger/20 text-console-danger',
};

export function ScenarioSelectionScreen() {
  const navigate = useUiStore((s) => s.navigate);
  const openScenario = useUiStore((s) => s.openScenario);
  const loadScenario = useSimulationStore((s) => s.loadScenario);
  const traineeId = useSettingsStore((s) => s.traineeId);
  const [filter, setFilter] = useState<'all' | 'basic' | 'intermediate' | 'advanced'>('all');

  const scenarios = BUNDLED_SCENARIOS.filter(
    (s) => filter === 'all' || s.difficulty === filter,
  );

  const begin = (scenarioId: string) => {
    const scenario = BUNDLED_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) return;
    const sessionId = `sess-${Date.now().toString(36)}`;
    loadScenario(scenario, sessionId, traineeId);
    openScenario(scenarioId, 'console');
  };

  return (
    <div className="min-h-full p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Scenario Selection</h2>
        <button onClick={() => navigate('home')} className="text-console-accent hover:underline">
          &larr; Home
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'basic', 'intermediate', 'advanced'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm border ${
              filter === f
                ? 'border-console-accent text-console-accent'
                : 'border-console-border text-console-muted'
            }`}
            data-testid={`filter-${f}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {scenarios.map((s) => (
          <div key={s.id} className="panel p-4 flex flex-col gap-2" data-testid={`scenario-card-${s.id}`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{s.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded ${DIFFICULTY_BADGE[s.difficulty]}`}>
                {s.difficulty}
              </span>
            </div>
            <p className="text-sm text-console-muted">{s.description}</p>
            <div className="text-xs text-console-muted">
              {s.environment} · {s.timeOfDay} · {s.visibility} · {s.weather} · {s.duration}s ·{' '}
              {s.contacts.length} contact{s.contacts.length === 1 ? '' : 's'}
            </div>
            <div className="flex flex-wrap gap-1">
              {s.learningObjectives.map((o) => (
                <span key={o.id} className="text-[11px] px-1.5 py-0.5 rounded bg-console-bg border border-console-border">
                  {o.label}
                </span>
              ))}
            </div>
            <button
              onClick={() => begin(s.id)}
              className="mt-2 bg-console-accent/90 hover:bg-console-accent text-black font-medium py-1.5 rounded"
              data-testid={`begin-${s.id}`}
            >
              Begin exercise
            </button>
          </div>
        ))}
        {scenarios.length === 0 && (
          <p className="text-console-muted">No scenarios match this filter.</p>
        )}
      </div>

      <div className="mt-6">
        <button onClick={() => navigate('generator')} className="text-console-accent hover:underline">
          Or generate a procedural scenario &rarr;
        </button>
      </div>
    </div>
  );
}
