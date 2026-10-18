import { LearningNav } from './LearningNav';
import { useEffect, useState } from 'react';
import { initStorage } from '../core/persistence/appStorage';
import { createProfile, traineeProfileSchema, type TraineeProfile } from '../core/learning/profile';
import { associateLegacy, exportTrainee, importTrainee, traineeHistory } from '../core/learning/trainees';
import type { StoredSession } from '../core/persistence/storage';
import { useSettingsStore } from '../store/settingsStore';
import { useUiStore } from '../store/uiStore';
import { LEARNING_OBJECTIVES } from '../core/objectives';
import { AssessmentDashboard } from './AssessmentDashboard';
import { downloadJson } from './download';

export function TraineeProfilesScreen() {
  const traineeId = useSettingsStore((s) => s.traineeId);
  const [profiles, setProfiles] = useState<TraineeProfile[]>([]);
  const [draft, setDraft] = useState<TraineeProfile>(() => createProfile('New trainee'));
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [review, setReview] = useState<StoredSession | null>(null);
  const [error, setError] = useState('');
  const [legacyId, setLegacyId] = useState('');
  const [busy, setBusy] = useState(false);
  const selected = profiles.find((p) => p.id === traineeId);
  async function refresh() { const storage = await initStorage(); const rows=await storage.listTrainees();const valid=rows.flatMap((p)=>{const parsed=traineeProfileSchema.safeParse(p);return parsed.success?[parsed.data]:[];});setProfiles(valid);if(valid.length!==rows.length)setError('A corrupt profile was excluded. Original stored data was retained.'); }
  async function run(fn: () => Promise<void>) { setError(''); setBusy(true); try { await fn(); await refresh(); } catch(e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); } }
  useEffect(() => { void refresh().catch((e: Error) => setError(e.message)); }, []);
  useEffect(() => { setSessions([]); setReview(null); if (!selected) return; let active = true;
    void initStorage().then((s) => traineeHistory(s, selected)).then((h) => { if (active) { setSessions(h.sessions); setError(h.warnings.join(' ')); } }).catch((e: Error) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [selected]);
  return <main className="p-6 max-w-5xl mx-auto space-y-4">
    <header className="flex justify-between"><h2 className="text-2xl">Trainee profiles</h2><button onClick={() => useUiStore.getState().navigate('home')}>Home</button></header><LearningNav/>
    {error && <p role="alert">{error}</p>}
    <p>Profiles and training records stay on this device. Archived profiles retain their history.</p>
    <label>Profile selector <select aria-label="Profile selector" className="bg-console-bg border p-2" value={selected?.id ?? ''} disabled={busy} onChange={(e) => void run(async () => {
      const p = profiles.find((x) => x.id === e.target.value); if (!p || p.archived) return;
      const storage = await initStorage(); const settings = { ...await storage.getSettings(), traineeId: p.id }; await storage.saveSettings(settings); useSettingsStore.getState().update({ traineeId: p.id }); setDraft(p);
    })}><option value="">Select a profile</option>{profiles.map((p) => <option key={p.id} value={p.id} disabled={p.archived}>{p.displayName}{p.archived ? ' (archived)' : ''}</option>)}</select></label>
    <section className="panel p-4 space-y-2">
      <h3>{profiles.some((p) => p.id === draft.id) ? 'Edit profile' : 'Create profile'}</h3>
      <label className="block">Display name <input aria-label="Display name" className="bg-console-bg border p-1" value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}/></label>
      <label className="block">Reference code (optional) <input aria-label="Reference code" className="bg-console-bg border p-1" value={draft.referenceCode} onChange={(e) => setDraft({ ...draft, referenceCode: e.target.value })}/></label>
      <label className="block">Experience <select aria-label="Experience" className="bg-console-bg border p-1" value={draft.experience} onChange={(e) => setDraft({ ...draft, experience: e.target.value as TraineeProfile['experience'] })}>{['foundation','developing','experienced'].map((v) => <option key={v}>{v}</option>)}</select></label>
      <fieldset><legend>Assigned learning objectives</legend>{LEARNING_OBJECTIVES.map((o) => <label key={o.id} className="block text-sm"><input type="checkbox" checked={draft.objectiveIds.includes(o.id)} onChange={(e) => setDraft({ ...draft, objectiveIds: e.target.checked ? [...draft.objectiveIds, o.id] : draft.objectiveIds.filter((id) => id !== o.id) })}/> {o.label}</label>)}</fieldset>
      <button className="border px-3 py-1" disabled={busy} onClick={() => void run(async () => {
        const p = traineeProfileSchema.parse(draft); const storage = await initStorage(); await storage.saveTrainee(p);
        await storage.saveSettings({ ...await storage.getSettings(), traineeId: p.id }); useSettingsStore.getState().update({ traineeId: p.id });
      })}>Save profile</button>{' '}
      <button className="border px-3 py-1" onClick={() => setDraft(createProfile('New trainee'))}>New profile</button>
    </section>
    {selected && <section className="panel p-4 space-y-2"><h3>Selected: {selected.displayName}</h3><p>Latest assessment: {sessions.filter((s)=>s.assessment).slice(-1)[0]?.assessment?.overall.toFixed(1)??'unassessed'} / 100</p><p data-testid="profile-history-count">{sessions.filter((s) => s.summary.status === 'completed').length} completed sessions</p>
      <button className="border px-3 py-1" onClick={() => setDraft(selected)}>Edit selected</button>{' '}
      <button className="border px-3 py-1" onClick={() => void run(async () => { await (await initStorage()).saveTrainee({ ...selected, archived: !selected.archived }); })}>{selected.archived ? 'Restore profile' : 'Archive profile'}</button>{' '}
      <button className="border px-3 py-1" onClick={() => void run(async () => { downloadJson(`pragya-trainee-${selected.id}.json`, await exportTrainee(await initStorage(), selected)); })}>Export profile data</button>{' '}
      <button className="border px-3 py-1" onClick={() => { if (window.confirm('Delete this profile? Session records will be retained for explicit legacy association.')) void run(async () => { await (await initStorage()).deleteTrainee(selected.id); useSettingsStore.getState().update({ traineeId: 'trainee-001' }); }); }}>Delete profile</button>
      <label className="block">Legacy session ID <input aria-label="Legacy session ID" className="bg-console-bg border p-1" value={legacyId} onChange={(e) => setLegacyId(e.target.value)}/></label>
      <button className="border px-3 py-1" onClick={() => void run(async () => { await associateLegacy(await initStorage(), selected, legacyId); })}>Associate legacy session</button>
      {sessions.map((s) => <div key={s.summary.sessionId}><button className="underline" onClick={() => setReview(s)}>{s.summary.sessionId}: {s.summary.scenarioTitle} ({s.summary.endedAt})</button>{!s.assessment && ' - legacy record: no saved assessment; excluded from Skill DNA'}</div>)}
    </section>}
    <label className="block">Import profile data <input aria-label="Import profile data" type="file" accept=".json" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void run(async () => { if (file.size > 20_000_000) throw new Error('Import exceeds 20 MB'); await importTrainee(await initStorage(), JSON.parse(await file.text())); }); e.target.value = ''; }}/></label>
    {review && <AssessmentDashboard key={review.summary.sessionId} session={review} historySessions={sessions}/>}
    {profiles.filter((p) => p.archived).map((p) => <button key={p.id} className="border p-2" onClick={() => void run(async () => { await (await initStorage()).saveTrainee({ ...p, archived: false }); })}>Restore {p.displayName}</button>)}
  </main>;
}
