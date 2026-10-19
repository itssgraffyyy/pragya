import { EvidenceMindPanel } from './EvidenceMindPanel';
import { AssessmentIntegrity } from './AssessmentIntegrity';
import { ReviewLearningContext } from './ReviewLearningContext';
import { useEffect, useMemo, useState } from 'react';
import type { StoredSession } from '../core/persistence/storage';
import { getStorage } from '../core/persistence/appStorage';
import { assessStoredSession, scoringInputFor } from '../core/scoring/storedSession';
import { SAMPLE_POLICIES, POLICY_BASIC_RECOGNITION } from '../core/scoring/samplePolicies';
import { validateScoringPolicy } from '../core/scoring/policy';
import { detectBlindSpots } from '../core/intelligence/blindSpots';
import { assessmentCsv, assessmentExport } from '../core/scoring/exports';
import { decisionReplay } from '../core/scoring/replay';

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export function AssessmentDashboard({ session, historySessions }: { session: StoredSession; historySessions?: StoredSession[] }) {
  const [policy, setPolicy] = useState(session.scoringPolicy ?? POLICY_BASIC_RECOGNITION);
  const [draft, setDraft] = useState(JSON.stringify(policy, null, 2));
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [history, setHistory] = useState<StoredSession[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [frameIndex, setFrameIndex] = useState(0);
  const result = useMemo(() => !preview && session.assessment ? session.assessment : assessStoredSession(session, policy), [session, policy, preview]);
  const frames = useMemo(() => decisionReplay(scoringInputFor(session)), [session]);
  const frame = frames[frameIndex];
  useEffect(() => {
    if(historySessions){setHistory(historySessions);return;}
    let active = true;
    getStorage().listSessions().then((all) => { if (active) setHistory(all); }).catch(() => { if (active) setHistoryError('Session history unavailable; showing this session only.'); });
    return () => { active = false; };
  }, [historySessions]);
  const findings = useMemo(() => detectBlindSpots([
    ...history.filter((s) => s.summary.traineeId === session.summary.traineeId && s.summary.sessionId !== session.summary.sessionId)
      .map((s) => s.assessment ?? assessStoredSession(s, s.scoringPolicy ?? POLICY_BASIC_RECOGNITION)), result,
  ]), [history, session, result]);
  function apply() {
    try {
      const parsed = validateScoringPolicy(JSON.parse(draft));
      if (!parsed.ok) { setError(parsed.errors.join('; ')); return; }
      setPolicy(parsed.policy); setPreview(true); setError('');
    } catch { setError('Enter valid scoring-policy JSON.'); }
  }
  return <section className="panel p-4 my-4 space-y-4" data-testid="assessment-dashboard">
    <h3 className="font-semibold text-xl">Decision assessment</h3>
    <AssessmentIntegrity session={session}/><EvidenceMindPanel session={session}/>
    <p>{preview ? 'Policy preview' : session.assessment ? 'Recorded assessment' : 'Legacy recalculation (excluded from Skill DNA)'}: {result.policyId}@{result.policyVersion}</p>
    <p className="text-2xl" data-testid="assessment-overall">Overall: {result.overall.toFixed(1)} / 100</p>
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(result.categories).map(([name, value]) => <div key={name}>{name}: {name === 'confidenceCalibration' ? `${(value * 100).toFixed(1)}% (separate metric)` : `${value.toFixed(1)} / 100`}</div>)}
    </div>
    {result.groupAwareness&&<section data-testid="group-assessment" className="panel p-3"><h4>Synthetic group reporting — separate from contact classification</h4>{result.groupAwareness.groups.length===0&&<p>The selected policy does not define a group-reporting rubric; no group score is inferred.</p>}{result.groupAwareness.groups.map(g=><div key={g.groupId}><p>{g.groupId}: observation completeness {g.observationCompleteness}; attribution {g.attribution}; qualified reporting {g.qualification}; weighted group result {g.overall}/100.</p><p>{g.explanation}</p><p>Rubric {g.policyRef}; recorded sources {g.sourceEventIds.join(', ')||'none'}.</p></div>)}</section>}
    <p>Missed: {result.missedContacts.join(', ') || 'none'}. Unassessable: {result.unassessableContacts.join(', ') || 'none'}.</p>
    <details><summary>Configure scoring policy</summary>
      <label className="block">Sample policy <select aria-label="Sample scoring policy" className="bg-console-bg border p-1" value="" onChange={(e) => {
        const selected = SAMPLE_POLICIES.find((p) => p.policyId === e.target.value); if (selected) setDraft(JSON.stringify(selected, null, 2));
      }}><option value="">Choose a sample</option>{SAMPLE_POLICIES.map((p) => <option key={p.policyId} value={p.policyId}>{p.title}</option>)}</select></label>
      <label className="block">Policy JSON<textarea aria-label="Scoring policy JSON" className="w-full h-64 font-mono bg-console-bg border p-2" value={draft} onChange={(e) => setDraft(e.target.value)} /></label>
      <button className="border px-3 py-1" onClick={apply}>Apply policy preview</button>
      <p>Preview changes do not replace the recorded assessment. Exports include the evaluated policy.</p>
      {error && <p role="alert">{error}</p>}
    </details>
    <div className="flex gap-3">
      <button className="border px-3 py-1" onClick={() => download(`pragya-assessment-${result.sessionId}.json`, JSON.stringify(assessmentExport(session, result, policy), null, 2), 'application/json')}>Export assessment JSON</button>
      <button className="border px-3 py-1" onClick={() => download(`pragya-assessment-${result.sessionId}.csv`, assessmentCsv(result), 'text/csv')}>Export assessment CSV</button>
    </div>
    <div><h4 className="font-semibold">Cognitive blind-spot observations</h4>
      <p className="text-sm">Patterns describe recorded decisions, with at least three observations. They do not diagnose traits.</p>
      {historyError && <p role="status">{historyError}</p>}
      {findings.length === 0 && <p>Insufficient evidence for a pattern.</p>}
      {findings.map((f) => <details key={f.patternId}><summary>{f.patternName}: {f.strength} ({f.relevantObservations} observations)</summary><p>{f.explanation}</p><ul>{f.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul><p>Revisit: {f.recommendedObjective}</p></details>)}
    </div>
    <div><h4 className="font-semibold">Explainable decision replay</h4>
      {frames.length > 0 ? <>
        <label>Replay event <input aria-label="Replay event" type="range" min="0" max={frames.length - 1} value={frameIndex} onChange={(e) => setFrameIndex(Number(e.target.value))} /></label>
        {frame && <div data-testid="replay-frame"><p>T+{frame.event.simTimestamp}s: {frame.event.type} {frame.event.contactId}</p>
          <p>Logged decision-time observations:</p><ul>{frame.observations.map((e) => <li key={e.eventId}>T+{e.simTimestamp}: {e.type} {e.evidence?.join(', ')} {e.sensorState && JSON.stringify(e.sensorState)} {(e.type.startsWith('group')||e.type.startsWith('opportunity'))&&JSON.stringify(e.actionDetails)}</li>)}</ul>
          {frame.decision?.type==='groupReportSubmitted'&&<p>Group report: {JSON.stringify(frame.decision.actionDetails)}</p>}
          {frame.decision && frame.decision.type!=='groupReportSubmitted' && <p>Submitted: {frame.decision.classification}; confidence: {frame.decision.confidence}; evidence: {frame.decision.evidence?.join(', ') || 'none'}; procedure: {frame.decision.proceduralResponse}.</p>}
        </div>}
      </> : <p>No logged events available.</p>}
    </div>
    <div><h4 className="font-semibold">Post-session scoring explanations</h4>
      {result.contacts.map((c) => <details key={c.contactId}><summary>{c.contactId}: {c.assessable ? c.classificationOutcome : 'unassessable'}</summary>
        {c.unassessableReason && <p>{c.unassessableReason}</p>}
        {result.explanations.filter((e) => e.contactId === c.contactId).map((e) => <div className="my-2" key={e.category}><strong>{e.category}</strong><p>{e.whatHappened} {e.why}</p><p>{e.availableInfo}</p><p className="text-xs">Rule: {e.ruleRef}. Revisit: {e.revisitObjective}</p></div>)}
      </details>)}
    </div>
    <ReviewLearningContext session={session} history={history}/>
  </section>;
}
