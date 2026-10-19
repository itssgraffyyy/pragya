import { GroupObservationPanel } from './GroupObservationPanel';
/**
 * Simulation Console — trainee-facing exercise screen.
 *
 * Ground truth is intentionally NOT accessible here: everything rendered
 * comes from TraineeView (categories only, no groundTruthLabel).
 */

import { useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { useSettingsStore } from '../store/settingsStore';
import { useUiStore } from '../store/uiStore';
import { SimScene } from '../render/SimScene';
import { SimClockDriver } from '../render/SimClockDriver';
import type { TraineeContactView } from '../core/sim/engine';
import {
  EVIDENCE_LABELS,
  PROCEDURAL_RESPONSE_LABELS,
  type ConfidenceLevel,
  type EvidenceItem,
  type ProceduralResponse,
  type TraineeClassification,
} from '../core/types';

const CLASSIFICATIONS: TraineeClassification[] = [
  'smallMultirotor', 'largeMultirotor', 'fixedWing', 'birdLike',
  'civilianLike', 'unidentified', 'decoy', 'unknown',
];

const CONFIDENCES: ConfidenceLevel[] = ['low', 'medium', 'high'];

const RESPONSES: ProceduralResponse[] = [
  'continueObservation', 'requestVerification', 'recordAndReport',
  'escalateSupervisor', 'instructorBranch',
];

const CATEGORY_LABELS: Record<string, string> = {
  smallMultirotor: 'Small multirotor-like',
  largeMultirotor: 'Large multirotor-like',
  fixedWing: 'Fixed-wing-like',
  birdLike: 'Bird-like',
  civilianLike: 'Civilian-like object',
  unidentified: 'Unidentified contact',
  decoy: 'Decoy-like object',
};

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SimulationConsoleScreen() {
  const engine = useSimulationStore((s) => s.engine);
  const revision = useSimulationStore((s) => s.revision);
  const lastActionError = useSimulationStore((s) => s.lastActionError);
  const store = useSimulationStore;
  const navigate = useUiStore((s) => s.navigate);
  const graphicsPreset = useSettingsStore((s) => s.graphicsPreset);
  const renderScale = useSettingsStore((s) => s.renderScale);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  void revision; // re-render on every engine mutation

  if (!engine) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4">
        <p className="text-console-muted">No session loaded.</p>
        <button onClick={() => navigate('scenarios')} className="text-console-accent hover:underline">
          Choose a scenario
        </button>
      </div>
    );
  }

  const view = engine.traineeView();
  const running = view.state === 'running';
  const paused = view.state === 'paused';
  const terminal = view.state === 'completed' || view.state === 'aborted';
  const interactive = running || paused;
  const selected = view.contacts.find((c) => c.id === selectedId) ?? null;
  const effScale = graphicsPreset === 'low' ? Math.min(renderScale, 0.6) : renderScale;

  return (
    <div className="console-grid">
      <SimClockDriver />

      {/* Top bar */}
      <header className="col-span-full flex items-center gap-3 px-4 bg-console-panel border-b border-console-border">
        <span className="font-semibold text-console-accent">PRAGYA</span>
        <span className="text-sm text-console-muted truncate">{view.title}</span>
        <span className="ml-auto font-mono text-sm" data-testid="sim-clock">
          T+{formatClock(view.simTime)} / {formatClock(view.duration)}
        </span>
        <StateBadge state={view.state} />
        {running && (
          <button onClick={() => store.getState().pause()} className="text-sm border border-console-border px-2 py-0.5 rounded" data-testid="btn-pause">
            Pause
          </button>
        )}
        {paused && (
          <button onClick={() => store.getState().resume()} className="text-sm border border-console-border px-2 py-0.5 rounded" data-testid="btn-resume">
            Resume
          </button>
        )}
        {interactive && (
          <button
            onClick={() => store.getState().endSession()}
            className="text-sm border border-console-warn text-console-warn px-2 py-0.5 rounded"
            data-testid="btn-end"
          >
            End session
          </button>
        )}
        {terminal && (
          <button onClick={() => navigate('summary')} className="text-sm bg-console-accent/90 text-black px-2 py-0.5 rounded" data-testid="btn-summary">
            View summary
          </button>
        )}
        <button onClick={() => navigate('home')} className="text-sm text-console-muted hover:text-console-text">
          Exit
        </button>
      </header>

      {/* 3D viewport */}
      <div className="relative min-h-0" data-testid="sim-viewport">
        <SimScene
          view={view}
          selectedContactId={selectedId}
          onSelectContact={setSelectedId}
          interactive={interactive}
          renderScale={effScale}
          reducedMotion={reducedMotion}
        />
        {/* Feed-loss blackout overlay */}
        {view.feedStates.primary && !view.feedStates.primary.feedLive && (
          <div className="absolute inset-0 bg-black flex items-center justify-center" data-testid="feed-lost">
            <span className="text-console-danger font-mono">SIGNAL LOSS</span>
          </div>
        )}
        {view.state === 'ready' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
            <p className="text-lg">Ready — start when you are.</p>
            <button
              onClick={() => store.getState().start()}
              className="bg-console-ok text-black font-medium px-6 py-2 rounded"
              data-testid="btn-start"
            >
              Start exercise
            </button>
          </div>
        )}
        {paused && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-xl font-semibold tracking-widest">PAUSED</span>
          </div>
        )}
      </div>

      {/* Right panel: contacts + assessment */}
      <aside className="min-h-0 overflow-y-auto bg-console-panel border-l border-console-border p-3 flex flex-col gap-3">
        {view.groups.map(group=><GroupObservationPanel key={group.id} group={group} interactive={interactive}/>)}
        {/* Sensor status (trainee-facing wording only) */}
        <section className="panel p-2" data-testid="sensor-status">
          <h3 className="text-xs uppercase tracking-wide text-console-muted mb-1">Sensor status</h3>
          {view.sensorStatus.map((s) => (
            <div key={s.channel} className="flex items-center gap-2 text-sm">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  s.status === 'nominal' ? 'bg-console-ok' : s.status === 'degraded' ? 'bg-console-warn' : 'bg-console-danger'
                }`}
              />
              <span className="capitalize">{s.channel}</span>
              <span className="text-console-muted">{s.description}</span>
            </div>
          ))}
        </section>

        {/* Contact list */}
        <section>
          <h3 className="text-xs uppercase tracking-wide text-console-muted mb-1">Contacts</h3>
          <ul className="flex flex-col gap-1" data-testid="contact-list">
            {view.contacts.map((c) => (
              <ContactRow key={c.id} contact={c} selected={c.id === selectedId} onSelect={() => setSelectedId(c.id)} />
            ))}
          </ul>
        </section>

        {/* Assessment panel */}
        {selected && interactive && (
          <AssessmentPanel contact={selected} />
        )}
        {selected && !interactive && selected.assessment.submitted && (
          <p className="text-sm text-console-ok">Assessment submitted at T+{selected.assessment.submittedAt?.toFixed(0)}s.</p>
        )}

        {lastActionError && (
          <p className="text-sm text-console-danger" role="alert" data-testid="action-error">
            {lastActionError}
          </p>
        )}
      </aside>
    </div>
  );
}


function StateBadge({ state }: { state: string }) {
  const color =
    state === 'running' ? 'bg-console-ok/20 text-console-ok'
    : state === 'paused' ? 'bg-console-warn/20 text-console-warn'
    : state === 'completed' ? 'bg-console-accent/20 text-console-accent'
    : state === 'aborted' ? 'bg-console-danger/20 text-console-danger'
    : state === 'error' ? 'bg-console-danger/20 text-console-danger'
    : 'bg-console-border/40 text-console-muted';
  return (
    <span className={`text-xs px-2 py-0.5 rounded capitalize ${color}`} data-testid="state-badge" data-state={state}>
      {state}
    </span>
  );
}

function ContactRow({
  contact,
  selected,
  onSelect,
}: {
  contact: TraineeContactView;
  selected: boolean;
  onSelect: () => void;
}) {
  const a = contact.assessment;
  const stateLabel =
    a.submitted ? 'submitted'
    : a.detectionState === 'verificationRequested' ? 'verification requested'
    : a.detectionState === 'markedUncertain' ? 'uncertain'
    : a.acknowledged ? 'acknowledged'
    : contact.visibility === 'visible' ? 'new'
    : contact.visibility === 'occluded' ? 'occluded'
    : contact.visibility === 'lost' ? 'no return'
    : 'pending';
  const stateColor =
    a.submitted ? 'text-console-ok'
    : a.acknowledged || a.detectionState !== 'notDetected' ? 'text-console-warn'
    : 'text-console-muted';
  const known = contact.visibility !== 'notYetSpawned' && contact.visibility !== 'despawned';
  return (
    <li>
      <button
        onClick={onSelect}
        className={`w-full text-left px-2 py-1 rounded border text-sm ${
          selected ? 'border-console-accent bg-console-accent/10' : 'border-console-border'
        } ${known ? '' : 'opacity-40'}`}
        data-testid={`contact-row-${contact.id}`}
      >
        <span className="font-mono mr-2">{contact.id}</span>
        <span>{known ? CATEGORY_LABELS[contact.category] ?? contact.category : '—'}</span>
        <span className={`float-right text-xs ${stateColor}`}>{stateLabel}</span>
      </button>
    </li>
  );
}


function AssessmentPanel({ contact }: { contact: TraineeContactView }) {
  const store = useSimulationStore;
  const a = contact.assessment;
  const id = contact.id;
  if (a.submitted) {
    return (
      <section className="panel p-2" data-testid={`assessment-${id}`}>
        <h3 className="text-xs uppercase tracking-wide text-console-muted mb-1">Assessment — {id}</h3>
        <p className="text-sm text-console-ok">Submitted. Awaiting session end.</p>
      </section>
    );
  }
  const visible = contact.visibility === 'visible' || contact.visibility === 'occluded';
  return (
    <section className="panel p-2 flex flex-col gap-2" data-testid={`assessment-${id}`}>
      <h3 className="text-xs uppercase tracking-wide text-console-muted">
        Assessment — <span className="font-mono">{id}</span>
      </h3>

      {/* Step 1: observation workflow */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => store.getState().acknowledge(id)}
          disabled={!visible || a.acknowledged}
          className="text-xs border border-console-border px-2 py-0.5 rounded disabled:opacity-40"
          data-testid={`btn-ack-${id}`}
        >
          Acknowledge
        </button>
        <button
          onClick={() => store.getState().markUncertain(id)}
          className={`text-xs border px-2 py-0.5 rounded ${
            a.detectionState === 'markedUncertain' ? 'border-console-warn text-console-warn' : 'border-console-border'
          }`}
          data-testid={`btn-uncertain-${id}`}
        >
          Mark uncertain
        </button>
        <button
          onClick={() => store.getState().requestVerification(id)}
          className={`text-xs border px-2 py-0.5 rounded ${
            a.detectionState === 'verificationRequested' ? 'border-console-warn text-console-warn' : 'border-console-border'
          }`}
          data-testid={`btn-verify-${id}`}
        >
          Request verification
        </button>
      </div>

      {/* Step 2: classification */}
      <label className="text-xs text-console-muted">
        Classification
        <select
          value={a.classification ?? ''}
          onChange={(e) => store.getState().classify(id, e.target.value)}
          className="mt-1 w-full bg-console-bg border border-console-border rounded px-2 py-1 text-sm text-console-text"
          data-testid={`select-classification-${id}`}
        >
          <option value="" disabled>
            Select…
          </option>
          {CLASSIFICATIONS.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c] ?? c}
            </option>
          ))}
        </select>
      </label>

      {/* Step 3: confidence */}
      <div>
        <div className="text-xs text-console-muted mb-1">Confidence</div>
        <div className="flex gap-1">
          {CONFIDENCES.map((c) => (
            <button
              key={c}
              onClick={() => store.getState().setConfidence(id, c)}
              className={`text-xs border px-2 py-0.5 rounded capitalize ${
                a.confidence === c ? 'border-console-accent text-console-accent' : 'border-console-border'
              }`}
              data-testid={`btn-confidence-${c}-${id}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Step 4: evidence */}
      <div>
        <div className="text-xs text-console-muted mb-1">Supporting observations</div>
        <div className="grid grid-cols-1 gap-0.5">
          {(Object.keys(EVIDENCE_LABELS) as EvidenceItem[]).map((item) => (
            <label key={item} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={a.evidence.includes(item)}
                onChange={(e) => store.getState().toggleEvidence(id, item, e.target.checked)}
                data-testid={`check-evidence-${item}-${id}`}
              />
              {EVIDENCE_LABELS[item]}
            </label>
          ))}
        </div>
      </div>

      {/* Step 5: procedural response */}
      <label className="text-xs text-console-muted">
        Procedural response
        <select
          value={a.proceduralResponse ?? ''}
          onChange={(e) => store.getState().selectResponse(id, e.target.value)}
          className="mt-1 w-full bg-console-bg border border-console-border rounded px-2 py-1 text-sm text-console-text"
          data-testid={`select-response-${id}`}
        >
          <option value="" disabled>
            Select…
          </option>
          {RESPONSES.map((r) => (
            <option key={r} value={r}>
              {PROCEDURAL_RESPONSE_LABELS[r]}
            </option>
          ))}
        </select>
      </label>

      <button
        onClick={() => store.getState().submitAssessment(id)}
        disabled={!a.classification || !a.confidence || !a.proceduralResponse}
        className="mt-1 bg-console-accent/90 hover:bg-console-accent text-black text-sm font-medium py-1 rounded disabled:opacity-40"
        data-testid={`btn-submit-${id}`}
      >
        Submit assessment
      </button>
    </section>
  );
}


