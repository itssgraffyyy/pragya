import type { GroupReport } from '../core/groups/models';
import { reconcileAssignment } from '../core/instructor/service';
import type { ScoringPolicy } from '../core/scoring/policy';
export interface AssignmentContext { assignmentId?:string; unitId?:string; policy:ScoringPolicy }
const assignmentContexts=new WeakMap<SimulationEngine,AssignmentContext>();
import { reconcileLearningSession } from '../core/learning/adaptive';
import { recordProfileSession } from '../core/learning/trainees';
import { initStorage } from '../core/persistence/appStorage';
/**
 * Simulation store (Zustand).
 *
 * Wraps a SimulationEngine instance and mirrors its state into React.
 * The engine itself is not serializable, so it lives outside the store
 * state; the store exposes a version counter to trigger re-renders plus
 * the trainee view projection.
 *
 * IMPORTANT: trainee-facing components must read `traineeView` only.
 * Ground truth is available via `engine.groundTruth()` for instructor/
 * summary screens after the session ends.
 */

import { create } from 'zustand';
import type { ScenarioDefinition, SimulationState } from '../core/types';
import { SimulationEngine } from '../core/sim/engine';
import type { TraineeView } from '../core/sim/engine';
import { buildSessionSummary, type SessionExportEnvelope, buildSessionExport } from '../core/sim/sessionSummary';
import type { SessionSummaryRecord } from '../core/types';
import { useUiStore } from './uiStore';

export interface SimulationStore {
  engine: SimulationEngine | null;
  /** Bumped on every engine mutation so React re-renders. */
  revision: number;
  scenario: ScenarioDefinition | null;
  state: SimulationState;
  simTime: number;
  lastActionError: string | null;
  lastSummary: SessionSummaryRecord | null;
  lastExport: SessionExportEnvelope | null;
  learningPending: boolean;
  learningRevision: number;

  /** Load a scenario and prepare the session (idle -> ready). */
  loadScenario: (scenario: ScenarioDefinition, sessionId: string, traineeId: string, context?:AssignmentContext) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  endSession: () => void;
  abort: () => void;
  /** Advance time by dt seconds (called from the render loop). */
  tick: (dt: number) => void;

  // Trainee workflow
  acknowledge: (contactId: string) => void;
  markUncertain: (contactId: string) => void;
  requestVerification: (contactId: string) => void;
  classify: (contactId: string, c: string) => void;
  setConfidence: (contactId: string, c: 'low' | 'medium' | 'high') => void;
  toggleEvidence: (contactId: string, item: string, selected: boolean) => void;
  selectResponse: (contactId: string, r: string) => void;
  submitAssessment: (contactId: string) => void;

  presentOpportunity:(id:string)=>void;
  acknowledgeOpportunity:(id:string)=>void;
  presentGroupCue:(groupId:string,stateId:string)=>void;
  recordGroupObservation:(groupId:string,contactIds:string[])=>void;
  submitGroupReport:(groupId:string,report:GroupReport,confidence:'low'|'medium'|'high')=>void;
  clearError: () => void;
}

function syncFromEngine(
  set: (partial: Partial<SimulationStore>) => void,
  engine: SimulationEngine | null,
): void {
  set({
    engine,
    state: engine?.state ?? 'idle',
    simTime: engine?.simTime ?? 0,
    scenario: engine?.scenario ?? null,
  });
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  engine: null,
  revision: 0,
  scenario: null,
  state: 'idle',
  simTime: 0,
  lastActionError: null,
  lastSummary: null,
  lastExport: null,
  learningPending: false,
  learningRevision: 0,

  loadScenario: (scenario, sessionId, traineeId, context) => {
    try {
      const engine = new SimulationEngine({ scenario, sessionId, traineeId });
      engine.load();
      if(context)assignmentContexts.set(engine,structuredClone(context));
      syncFromEngine(set, engine);
      set((s) => ({ revision: s.revision + 1, lastActionError: null, lastSummary: null, lastExport: null }));
    } catch (e) {
      set({ lastActionError: (e as Error).message });
    }
  },

  start: () => {
    const { engine } = get();
    if (!engine) return;
    try {
      engine.start();
      syncFromEngine(set, engine);
    } catch (e) {
      set({ lastActionError: (e as Error).message });
    }
    set((s) => ({ revision: s.revision + 1 }));
  },

  pause: () => {
    const { engine } = get();
    if (!engine) return;
    try {
      engine.pause();
    } catch (e) {
      set({ lastActionError: (e as Error).message });
    }
    set((s) => ({ revision: s.revision + 1 }));
  },

  resume: () => {
    const { engine } = get();
    if (!engine) return;
    try {
      engine.resume();
    } catch (e) {
      set({ lastActionError: (e as Error).message });
    }
    set((s) => ({ revision: s.revision + 1 }));
  },

  restart: () => {
    const { engine } = get();
    if (!engine) return;
    try {
      if(assignmentContexts.has(engine))throw new Error('Assigned exercises require a new instructor assignment before restarting.');
      capturedSessions.delete(engine);
      engine.restart();
      set({ lastSummary: null, lastExport: null, lastActionError: null });
    } catch (e) {
      set({ lastActionError: (e as Error).message });
    }
    set((s) => ({ revision: s.revision + 1 }));
  },

  /** End the session and produce the summary (running|paused -> completed). */
  endSession: () => {
    const { engine } = get();
    if (!engine) return;
    try {
      if (engine.state === 'running' || engine.state === 'paused') {
        // Distinguish "ended early with remaining work" from a clean finish.
        if (!engine.completionSatisfied() && !engine.canEndEarly()) {
          throw new Error('This scenario requires all contacts to be assessed before ending.');
        }
        engine.complete();
      }
      const summary = buildSessionSummary(engine);
      set({ lastSummary: summary, lastExport: captureSession(engine, set) });
      // The Module 1 journey ends on the summary screen — navigate there
      // automatically so "End session" lands on Session Summary.
      useUiStore.getState().navigate('summary');
    } catch (e) {
      set({ lastActionError: (e as Error).message });
    }
    set((s) => ({ revision: s.revision + 1 }));
  },

  abort: () => {
    const { engine } = get();
    if (!engine) return;
    try {
      if (engine.state !== 'aborted' && engine.state !== 'completed') {
        engine.abort();
      }
      const summary = buildSessionSummary(engine);
      set({ lastSummary: summary, lastExport: captureSession(engine, set) });
    } catch (e) {
      set({ lastActionError: (e as Error).message });
    }
    set((s) => ({ revision: s.revision + 1 }));
  },

  tick: (dt) => {
    const { engine } = get();
    if (!engine) return;
    engine.tick(dt);
    if (engine.state === 'completed') {
      // Auto-capture summary on natural completion.
      const summary = buildSessionSummary(engine);
      set({ lastSummary: summary, lastExport: captureSession(engine, set) });
    }
    set((s) => ({ revision: s.revision + 1, simTime: engine.simTime, state: engine.state }));
  },

  // --- Trainee workflow -----------------------------------------------------

  acknowledge: (contactId) => guard(set, get, (e) => e.acknowledgeContact(contactId)),
  markUncertain: (contactId) => guard(set, get, (e) => e.markUncertain(contactId)),
  requestVerification: (contactId) => guard(set, get, (e) => e.requestVerification(contactId)),
  classify: (contactId, c) =>
    guard(set, get, (e) =>
      e.setClassification(contactId, c as Parameters<SimulationEngine['setClassification']>[1]),
    ),
  setConfidence: (contactId, c) =>
    guard(set, get, (e) => e.setConfidence(contactId, c)),
  toggleEvidence: (contactId, item, selected) =>
    guard(set, get, (e) =>
      e.toggleEvidence(contactId, item as Parameters<SimulationEngine['toggleEvidence']>[1], selected),
    ),
  selectResponse: (contactId, r) =>
    guard(set, get, (e) =>
      e.setProceduralResponse(contactId, r as Parameters<SimulationEngine['setProceduralResponse']>[1]),
    ),
  submitAssessment: (contactId) => {
    guard(set, get, (e) => e.submitAssessment(contactId));
    const { engine } = get();
    if (engine && engine.state === 'completed') {
      const summary = buildSessionSummary(engine);
      set({ lastSummary: summary, lastExport: captureSession(engine, set) });
    }
  },

  presentOpportunity:id=>guard(set,get,e=>e.presentOpportunity(id)),
  acknowledgeOpportunity:id=>guard(set,get,e=>e.acknowledgeOpportunity(id)),
  presentGroupCue:(id,stateId)=>guard(set,get,e=>e.presentGroupCue(id,stateId)),
  recordGroupObservation:(groupId,contactIds)=>guard(set,get,e=>e.recordGroupObservation(groupId,contactIds)),
  submitGroupReport:(groupId,report,confidence)=>{
    guard(set,get,e=>e.submitGroupReport(groupId,report,confidence));
    const {engine}=get();if(engine?.state==='completed'){syncFromEngine(set,engine);set({lastSummary:buildSessionSummary(engine),lastExport:captureSession(engine,set)});}
  },
  clearError: () => set({ lastActionError: null }),
}));

function guard(
  set: (partial: Partial<SimulationStore>) => void,
  get: () => SimulationStore,
  action: (engine: SimulationEngine) => void,
): void {
  const { engine } = get();
  if (!engine) return;
  try {
    action(engine);
    set({ lastActionError: null });
  } catch (e) {
    set({ lastActionError: (e as Error).message });
  }
  set({ revision: get().revision + 1 });
}

/** Convenience selector for the trainee view (re-renders on revision). */
export function useTraineeView(): TraineeView | null {
  const engine = useSimulationStore((s) => s.engine);
  const revision = useSimulationStore((s) => s.revision);
  void revision; // dependency: recompute view on every mutation
  return engine ? engine.traineeView() : null;
}

/** Capture once per terminal engine state; retain failures in the visible store error. */
const capturedSessions = new WeakMap<SimulationEngine, SessionExportEnvelope>();
function captureSession(engine: SimulationEngine, set: (partial: Partial<SimulationStore>) => void): SessionExportEnvelope {
  const existing = capturedSessions.get(engine);
  if (existing && existing.summary.endedAt === engine.endedAtIso) return existing;
  const context=assignmentContexts.get(engine);
  const envelope = buildSessionExport(engine,context?.policy);
  capturedSessions.set(engine, envelope);
  set({ learningPending: true });
  void initStorage().then((storage) => storage.saveSession(envelope).then(() => recordProfileSession(storage, envelope)).then(() => reconcileLearningSession(storage, envelope)).then(()=>context?.assignmentId?reconcileAssignment(storage,context.assignmentId,envelope):undefined)).then(() => {
    set({ learningPending: false, learningRevision: useSimulationStore.getState().learningRevision + 1 });
  }).catch((error: unknown) => {
    set({ learningPending: false, lastActionError: `Session or learning update failed: ${error instanceof Error ? error.message : String(error)}` });
  });
  return envelope;
}
