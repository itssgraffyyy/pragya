import { ScenarioQualityPanel } from './ScenarioQualityPanel';
import { initStorage } from '../core/persistence/appStorage';
import { scenarioLibrary,saveScenarioDocument } from '../core/instructor/service';
import { records } from '../core/unit/service';
import { useIdentityStore } from '../store/identityStore';
import type { ScenarioDefinition } from '../core/types';
import type { TrainingRecords } from '../core/unit/models';
/**
 * Instructor Editor — create/edit/validate/import/export scenarios.
 * Validation uses the same schema as the runtime; broken scenarios are
 * never playable. Ground truth IS visible here (instructor tool).
 */

import { useEffect, useState } from 'react';
import { parseScenarioJson } from '../core/scenario/validate';
import { BUNDLED_SCENARIOS } from '../core/scenario/bundled';
import { useUiStore } from '../store/uiStore';
import { useSimulationStore } from '../store/simulationStore';
import { useSettingsStore } from '../store/settingsStore';
import { SCHEMA_VERSION } from '../core/types';

export function InstructorEditorScreen() {
  const userId=useIdentityStore(s=>s.userId);const [library,setLibrary]=useState<ScenarioDefinition[]>(BUNDLED_SCENARIOS);const [documents,setDocuments]=useState<TrainingRecords['scenarioDocuments'][]>([]);const [unitId,setUnitId]=useState<string|null>(null);
  async function refresh(){const storage=await initStorage();const memberships=await records(storage,'memberships');const preferred=localStorage.getItem('pragya-instructor-unit');const allowed=memberships.filter(m=>m.userId===userId&&!m.archived&&m.role==='instructor');const selected=userId?(allowed.find(m=>m.unitId===preferred)?.unitId??allowed[0]?.unitId??null):null;setUnitId(selected);setLibrary(await scenarioLibrary(storage,selected));setDocuments((await records(storage,'scenarioDocuments')).filter(d=>d.unitId===selected));}
  useEffect(()=>{void refresh().catch(e=>setValidation({valid:false,errors:[String(e)]}));},[userId]);
  const navigate = useUiStore((s) => s.navigate);
  const loadScenario = useSimulationStore((s) => s.loadScenario);
  const traineeId = useSettingsStore((s) => s.traineeId);
  const [selectedId, setSelectedId] = useState<string>(BUNDLED_SCENARIOS[0]?.id ?? '');
  const [text, setText] = useState(() => JSON.stringify(BUNDLED_SCENARIOS[0], null, 2));
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [approvalId,setApprovalId]=useState<string|undefined>();

  const loadIntoEditor = (id: string) => {
    const document=documents.find(d=>d.scenarioId===id);const scenario = library.find((s) => s.id === id);
    if(document){setSelectedId(id);setText(document.draftText);setValidation(null);setSaved(null);return;}
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

  const persist = async (status:'draft'|'published'|'archived') => {
    try{const storage=await initStorage();const document=await saveScenarioDocument(storage,userId?{userId}:null,unitId,text,status,selectedId,approvalId);setSelectedId(document.scenarioId);setSaved(`${document.scenarioId} (${status})`);setValidation({valid:true,errors:[]});await refresh();}catch(e){setValidation({valid:false,errors:[(e as Error).message]});}
  };
  const doSave = () => {void persist('published');};
  const doImport = (file: File) => {
    if(file.size>500000){setValidation({valid:false,errors:['Scenario file exceeds 500 KB']});return;}
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
      loadScenario(result.scenario!, `preview-${Date.now().toString(36)}`, userId?`preview:${userId}`:traineeId);
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
          {library.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} {documents.find(d=>d.scenarioId===s.id)?.status??''}
            </option>
          ))}
          {documents.filter(d=>!library.some(s=>s.id===d.scenarioId)).map(d=><option key={d.id} value={d.scenarioId}>{d.title} ({d.status})</option>)}
        </select>
        <button onClick={doValidate} className="border border-console-border px-3 py-1 rounded text-sm" data-testid="editor-validate">
          Validate
        </button>
        <button onClick={doSave} className="border border-console-border px-3 py-1 rounded text-sm" data-testid="editor-save">
          Save
        </button>
<button onClick={()=>void persist('draft')} className="border p-2">Save draft</button><button onClick={()=>{const result=parseScenarioJson(text);if(!result.valid){setValidation({valid:false,errors:result.errors});return;}const copy={...result.scenario!,id:`custom-${crypto.randomUUID()}`,title:`${result.scenario!.title} (copy)`,version:'1.0.0'};setSelectedId(copy.id);setText(JSON.stringify(copy,null,2));setSaved(null);}}>Duplicate scenario</button><button onClick={()=>void persist('archived')} className="border p-2">Archive scenario</button>
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

      <ScenarioQualityPanel text={text} actor={userId?{userId}:null} unitId={unitId} onDeclare={scenario=>{setSelectedId(scenario.id);setText(JSON.stringify(scenario,null,2));setSaved(null);}} onApproved={setApprovalId}/>
      {validation && (
        <div
          className={`mt-3 p-3 rounded border ${
            validation.valid ? 'border-console-ok text-console-ok' : 'border-console-danger text-console-danger'
          }`}
          data-testid="editor-validation"
        >
          {validation.valid ? (
            <p>✓ Input accepted.</p>
          ) : (
            <ul className="list-disc pl-4 text-sm">
              {validation.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {saved && <p className="mt-2 text-console-ok text-sm">Saved "{saved}" to local storage.</p>}
    </div>
  );
}
