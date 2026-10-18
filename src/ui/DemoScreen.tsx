import { useEffect,useState } from 'react';
import { initStorage } from '../core/persistence/appStorage';
import { DEFAULT_SETTINGS } from '../core/persistence/storage';
import { records } from '../core/unit/service';
import type { TrainingRecords } from '../core/unit/models';
import { installDemo,previewDemoReset,resetDemo } from '../core/demo/service';
import { useIdentityStore } from '../store/identityStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSimulationStore } from '../store/simulationStore';
import { useUiStore,type Screen } from '../store/uiStore';

export function DemoScreen(){
 const userId=useIdentityStore(s=>s.userId),navigate=useUiStore(s=>s.navigate);
 const [manifest,setManifest]=useState<TrainingRecords['demoManifests']|null>(null),[names,setNames]=useState<Record<string,string>>({});
 const [preview,setPreview]=useState<Awaited<ReturnType<typeof previewDemoReset>>|null>(null),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function refresh(){const storage=await initStorage();setManifest((await records(storage,'demoManifests'))[0]??null);setNames(Object.fromEntries((await storage.listTrainees()).map(p=>[p.id,p.displayName])));}
 useEffect(()=>{if(!userId)void refresh().catch(e=>setError(String(e)));},[userId]);
 async function run(action:()=>Promise<void>){setBusy(true);setError('');setMessage('');try{const engine=useSimulationStore.getState().engine;if(engine&&['ready','running','paused'].includes(engine.state))throw new Error('Finish or abort the current individual exercise before managing demo data.');await action();await refresh();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 function learner(index:number,screen:Screen){if(!manifest)return;useSettingsStore.getState().update({traineeId:manifest.traineeIds[index]});useIdentityStore.getState().select('');navigate(screen);}
 async function role(role:'instructor'|'commander',screen:Screen){if(!manifest)return;const storage=await initStorage();const memberships=await records(storage,'memberships');const member=memberships.find(m=>m.unitId===manifest.unitId&&m.role===role&&!m.archived);if(!member)throw new Error('Demo role missing');useIdentityStore.getState().select(member.userId);navigate(screen);}
 if(userId)return <main className="p-6 space-y-4"><h1>Synthetic Demo</h1><p>Select Unrestricted local demo in Units &amp; Identities to load or reset synthetic data. This is local-owner tooling.</p><button onClick={()=>navigate('units')}>Units &amp; Identities</button><button onClick={()=>navigate('home')}>Home</button></main>;
 return <main className="p-6 max-w-4xl mx-auto space-y-4"><button onClick={()=>navigate('home')}>Home</button><h1 className="text-2xl">Synthetic Demo</h1>
 <p>Scripted synthetic participants and decisions, scored by the original simulation engine. Calendar dates are arranged for demonstration. No genuine trainee performance or real-world readiness is represented.</p>
 <p>Installation appends a separate labeled unit and new identities. Existing records are preserved. Use DEMO_GUIDE.md for the five-minute walkthrough.</p>
 {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 {!manifest?<button disabled={busy} onClick={()=>void run(async()=>{await installDemo(await initStorage());setMessage('Synthetic demo installed. Calculated histories are ready.');})}>Load synthetic demo</button>:<section className="panel p-4 space-y-3" data-testid="demo-installed"><h2>Installed synthetic histories</h2>
 <ul>{manifest.traineeIds.map((id,i)=><li key={id}>{names[id]??id} <button disabled={busy} onClick={()=>learner(i,'learning')}>View Skill DNA {i+1}</button></li>)}</ul>
 <button disabled={busy} onClick={()=>learner(0,'progress')}>View corrected mistake and progress</button>{' '}<button disabled={busy} onClick={()=>learner(0,'adaptive')}>Open adaptive learning</button>{' '}
 <button disabled={busy} onClick={()=>void run(()=>role('instructor','instructor'))}>Open demo instructor</button>{' '}<button disabled={busy} onClick={()=>void run(()=>role('instructor','crew'))}>Open demo crew AAR</button>{' '}<button disabled={busy} onClick={()=>void run(()=>role('commander','analytics'))}>Open demo unit intelligence</button>
 <p>Reset removes this demo unit, its original identities and their histories, including further exercises recorded exclusively for them. It refuses outside references, extra identities, authored scenarios, active crew hosts or concurrent data changes. Export any demo work you want to keep first.</p>
 <button disabled={busy} onClick={()=>void run(async()=>{setPreview(await previewDemoReset(await initStorage()));setConfirmation('');})}>Preview demo reset</button>
 {preview&&<div><pre data-testid="demo-reset-counts">{JSON.stringify(preview.counts,null,2)}</pre><label>Type RESET DEMO<input aria-label="Reset confirmation" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label><button disabled={busy||confirmation!=='RESET DEMO'} onClick={()=>void run(async()=>{const storage=await initStorage();await resetDemo(storage,preview);if(manifest.traineeIds.includes(useSettingsStore.getState().traineeId))useSettingsStore.getState().update({traineeId:(await storage.listTrainees())[0]?.id??DEFAULT_SETTINGS.traineeId});setPreview(null);setConfirmation('');setMessage('Synthetic demo removed. Other local records preserved.');})}>Reset synthetic demo only</button></div>}
 </section>}
 </main>;
}
