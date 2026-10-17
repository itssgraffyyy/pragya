/**
 * Instructor Editor — create/edit/validate/import/export scenarios.
 * Validation uses the same schema as the runtime; broken scenarios are
 * never playable. Ground truth IS visible here (instructor tool).
 */

import { useState } from 'react';
import { parseScenarioJson } from '../core/scenario/validate';
import { BUNDLED_SCENARIOS } from '../core/scenario/bundled';
import { useUiStore } from '../store/uiStore';
import { useSimulationStore } from '../store/simulationStore';
import { useSettingsStore } from '../store/settingsStore';
import { SCHEMA_VERSION } from '../core/types';

export function InstructorEditorScreen() {
  const navigate = useUiStore((s) => s.navigate);
  const loadScenario = useSimulationStore((s) => s.loadScenario);
  const traineeId = useSettingsStore((s) => s.traineeId);
  const [selectedId, setSelectedId] = useState<string>(BUNDLED_SCENARIOS[0]?.id ?? '');
  const [text, setText] = useState(() => JSON.stringify(BUNDLED_SCENARIOS[0], null, 2));
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const loadIntoEditor = (id: string) => {
    const scenario = BUNDLED_SCENARIOS.find((s) => s.id === id);
    if (!scenario) return;
    setSelectedId(id);
    setText(JSON.stringify(scenario, null, 2));
    setValidation(null);
    setSaved(null);
  };

  const doValidate = () => {
    const result = parseScenarioJson(text);
    setValidation({ valid: result.valid, errors: result.errors });
  };

  const doSave = () => {
    const result = parseScenarioJson(text);
    setValidation({ valid: result.valid, errors: result.errors });
    if (result.valid) setSaved(result.scenario!.id);
  };

  const doImport = (file: File) => {
    file.text().then((t) => {
      setText(t);
      const result = parseScenarioJson(t);
      setValidation({ valid: result.valid, errors: result.errors });
      if (result.valid) setSelectedId(result.scenario!.id);
    });
  };

  const doExport = () => {
    const result = parseScenarioJson(text);
    if (!result.valid) {
      setValidation({ valid: false, errors: result.errors });
      return;
    }
    const blob = new Blob([JSON.stringify(result.scenario, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.scenario!.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doPreview = () => {
    const result = parseScenarioJson(text);
    setValidation({ valid: result.valid, errors: result.errors });
    if (result.valid) {
      loadScenario(result.scenario!, `preview-${Date.now().toString(36)}`, traineeId);
      navigate('console');
    }
  };

  return (
    <div className="min-h-full p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Instructor Editor</h2>
        <button onClick={() => navigate('home')} className="text-console-accent hover:underline">
          &larr; Home
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <select
          value={selectedId}
          onChange={(e) => loadIntoEditor(e.target.value)}
          className="bg-console-bg border border-console-border rounded px-2 py-1 text-sm"
          data-testid="editor-scenario-select"
        >
          {BUNDLED_SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <button onClick={doValidate} className="border border-console-border px-3 py-1 rounded text-sm" data-testid="editor-validate">
          Validate
        </button>
        <button onClick={doSave} className="border border-console-border px-3 py-1 rounded text-sm" data-testid="editor-save">
          Save
        </button>
        <button onClick={doExport} className="border border-console-border px-3 py-1 rounded text-sm" data-testid="editor-export">
          Export JSON
        </button>
        <label className="border border-console-border px-3 py-1 rounded text-sm cursor-pointer">
          Import JSON
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
            data-testid="editor-import"
          />
        </label>
        <button onClick={doPreview} className="bg-console-accent/90 text-black px-3 py-1 rounded text-sm" data-testid="editor-preview">
          Preview scenario
        </button>
        <span className="text-xs text-console-muted">schemaVersion {SCHEMA_VERSION}</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        className="w-full h-[480px] bg-console-bg border border-console-border rounded p-3 font-mono text-xs text-console-text"
        data-testid="editor-textarea"
      />

      {validation && (
        <div
          className={`mt-3 p-3 rounded border ${
            validation.valid ? 'border-console-ok text-console-ok' : 'border-console-danger text-console-danger'
          }`}
          data-testid="editor-validation"
        >
          {validation.valid ? (
            <p>✓ Scenario is valid.</p>
          ) : (
            <ul className="list-disc pl-4 text-sm">
              {validation.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {saved && <p className="mt-2 text-console-ok text-sm">Saved "{saved}" to working set.</p>}
    </div>
  );
}
