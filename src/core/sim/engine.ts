import { groupStateAt,groupOffset } from '../groups/projection';
import { groupReportSchema,type GroupReport,type GroupView } from '../groups/models';
/**
 * PRAGYA simulation engine (headless).
 *
 * Owns simulation time, contact lifecycle, trainee workflow state and event
 * emission. Deliberately renderer-agnostic: the React layer subscribes and
 * projects `traineeView()` into the UI. Ground truth is only exposed through
 * `groundTruth()`, which trainee-facing components must not read during an
 * active session (enforced by convention + tests).
 *
 * Time: `tick(deltaSeconds)` advances simulation time ONLY while running.
 * Paused/ready/completed states never advance.
 */

import type {
  ContactAssessment,
  ContactDefinition,
  ContactVisibilityState,
  ConfidenceLevel,
  EnvironmentPreset,
  EvidenceItem,
  ProceduralResponse,
  ScenarioDefinition,
  SimulationEvent,
  SimulationState,
  TimeOfDay,
  TraineeClassification,
  VisibilityCondition,
  WeatherEffect,
} from '../types';
import { EventLog } from '../events/eventLog';
import { assertTransition } from './stateMachine';
import { detectTransitions, visibilityAt } from '../contacts/lifecycle';
import { evaluateHeading, evaluateMotion, type Vec3 } from '../contacts/motion';
import {
  rawFeedState,
  rawSensorSnapshot,
  traineeStatus,
  type FeedState,
  type TraineeSensorStatus,
} from '../sensors/degradation';

export interface EngineConfig {
  scenario: ScenarioDefinition;
  sessionId: string;
  traineeId: string;
  /** Optional pre-existing event log (e.g. resumed session). */
  eventLog?: EventLog;
}

/** Trainee-facing contact info — contains NO ground truth. */
export interface TraineeContactView {
  id: string;
  category: string;
  appearance: ContactDefinition['appearance'];
  visibility: ContactVisibilityState;
  position: Vec3 | null;
  heading: number;
  spawnTime: number;
  /** Assessment workflow state owned by the trainee. */
  assessment: ContactAssessment;
}

/** Trainee-facing snapshot of the whole scenario. */
export interface TraineeView {
  groups: GroupView[];
  simTime: number;
  duration: number;
  state: SimulationState;
  environment: EnvironmentPreset;
  timeOfDay: TimeOfDay;
  visibility: VisibilityCondition;
  weather: WeatherEffect;
  difficulty: ScenarioDefinition['difficulty'];
  contacts: TraineeContactView[];
  sensorStatus: TraineeSensorStatus[];
  feedStates: Record<string, FeedState>;
  title: string;
  description: string;
  permittedActions: ScenarioDefinition['permittedActions'];
}

/** Ground truth entry — scoring/summary only. */
export interface ContactGroundTruth {
  contactId: string;
  groundTruthLabel: string;
  category: string;
  assessment: ContactDefinition['assessment'];
}

const CONFIDENCE_ORDER: Record<ConfidenceLevel, number> = { low: 1, medium: 2, high: 3 };

export class SimulationEngine {
  readonly scenario: ScenarioDefinition;
  readonly sessionId: string;
  readonly traineeId: string;
  readonly log: EventLog;

  private _state: SimulationState = 'idle';
  private _simTime = 0;
  private _assessments = new Map<string, ContactAssessment>();
  private _timedEventsFired = new Set<string>();
  private _groupStatesFired = new Set<string>();
  private _error: string | null = null;
  /** Last known rendered positions (for frozen/delayed feeds). */
  private _lastPositions = new Map<string, Vec3>();
  startedAtIso: string | null = null;
  endedAtIso: string | null = null;

  constructor(config: EngineConfig) {
    this.scenario = config.scenario;
    this.sessionId = config.sessionId;
    this.traineeId = config.traineeId;
    this.log = config.eventLog ?? new EventLog();
    for (const contact of config.scenario.contacts) {
      this._assessments.set(contact.id, emptyAssessment(contact.id));
    }
  }

  // -------------------------------------------------------------------------
  // State machine
  // -------------------------------------------------------------------------

  get state(): SimulationState {
    return this._state;
  }

  get simTime(): number {
    return this._simTime;
  }

  get error(): string | null {
    return this._error;
  }

  private transition(to: SimulationState): void {
    assertTransition(this._state, to);
    this._state = to;
  }

  /** idle -> loading -> ready. Validates the scenario is runnable. */
  load(): void {
    this.transition('loading');
    try {
      if (this.scenario.contacts.length === 0) {
        throw new Error('Scenario has no contacts');
      }
      this.transition('ready');
    } catch (e) {
      this._error = (e as Error).message;
      this.transition('error');
      this.appendEvent('errorOccurred', { message: this._error });
      throw e;
    }
  }

  /** ready -> running. */
  start(): void {
    this.transition('running');
    this.startedAtIso ??= new Date().toISOString();
    this.appendEvent(
      'sessionStarted',
      { scenarioSeed: this.scenario.seed, difficulty: this.scenario.difficulty },
      rawSensorSnapshot(this.scenario.sensor, this._simTime),
    );
    this.processTransitions(this._simTime, this._simTime);
  }

  /** running -> paused. Time progression stops. */
  pause(): void {
    this.transition('paused');
    this.appendEvent('sessionPaused', {});
  }

  /** paused -> running. Previous state preserved; time resumes. */
  resume(): void {
    this.transition('running');
    this.appendEvent('sessionResumed', {});
  }

  /** Reset all scenario-specific state back to ready. */
  restart(): void {
    this.transition('idle');
    this._simTime = 0;
    this._timedEventsFired.clear();
    this._groupStatesFired.clear();
    this._lastPositions.clear();
    this._error = null;
    this.startedAtIso = null;
    this.endedAtIso = null;
    for (const contact of this.scenario.contacts) {
      this._assessments.set(contact.id, emptyAssessment(contact.id));
    }
    this.log.clear();
    this.load();
    this.appendEvent('sessionRestarted', {});
  }

  /** -> completed. Further trainee actions rejected. */
  complete(): void {
    if (this._state === 'completed') return;
    this.transition('completed');
    this.endedAtIso = new Date().toISOString();
    this.appendEvent(
      'sessionCompleted',
      { assessedContacts: this.submittedAssessments().length, simDuration: this._simTime },
      rawSensorSnapshot(this.scenario.sensor, this._simTime),
    );
  }

  /** -> aborted. Distinguishable from completed. */
  abort(): void {
    if (this._state === 'aborted') return;
    this.transition('aborted');
    this.endedAtIso = new Date().toISOString();
    this.appendEvent('sessionAborted', { simDuration: this._simTime });
  }

  /** Record an engine error without corrupting saved data. */
  fail(message: string): void {
    this._error = message;
    if (this._state !== 'error' && this._state !== 'completed' && this._state !== 'aborted') {
      this.transition('error');
    }
    this.appendEvent('errorOccurred', { message });
  }

  // -------------------------------------------------------------------------
  // Simulation time
  // -------------------------------------------------------------------------

  /**
   * Advance simulation time. Only affects state while running.
   * Returns events emitted during this tick.
   */
  tick(deltaSeconds: number): SimulationEvent[] {
    if (this._state !== 'running') return [];
    const before = this.log.length;
    const prevTime = this._simTime;
    // Clamp to avoid giant jumps after tab suspension.
    const dt = Math.min(Math.max(deltaSeconds, 0), 1);
    this._simTime = Math.min(this._simTime + dt, this.scenario.duration);

    this.processTransitions(prevTime, this._simTime);

    if (this._simTime >= this.scenario.duration) {
      this.complete();
    }
    return [...this.log.getAll()].slice(before);
  }

  /** Process visibility transitions and timed events between two times. */
  private processTransitions(prevTime: number, currTime: number): void {
    if (currTime > prevTime) {
      const transitions = detectTransitions(this.scenario.contacts, prevTime, currTime);
      for (const tr of transitions) {
        if (tr.to === 'visible') {
          this.appendEvent(
            'contactSpawned',
            { spawnTime: this.contactDef(tr.contactId).spawnTime },
            undefined,
            tr.contactId,
          );
        } else if (tr.to === 'occluded') {
          this.appendEvent('contactOccluded', {}, undefined, tr.contactId);
        } else if (tr.to === 'despawned') {
          this.appendEvent('contactDespawned', {}, undefined, tr.contactId);
        }
      }
      for (const te of this.scenario.timedEvents) {
        if (te.atTime >= prevTime && te.atTime < currTime && !this._timedEventsFired.has(te.id)) {
          this._timedEventsFired.add(te.id);
          this.applyTimedEvent(te.id, te.type, te.data);
        }
      }
    }
    for(const group of this.scenario.groupTraining?.groups??[])for(const state of group.states){
      if(state.atTime<=currTime&&!this._groupStatesFired.has(state.id)){
        this._groupStatesFired.add(state.id);this.appendEvent('groupStateChanged',{groupId:group.id,stateId:state.id,members:state.members,formation:state.formation,scheduledAt:state.atTime});
      }
    }
    this.updateLastPositions(currTime);
  }

  private applyTimedEvent(
    id: string,
    type: string,
    data: Record<string, string | number | boolean>,
  ): void {
    if (type === 'sensorChange') {
      const channel = String(data.channel ?? 'primary') as 'primary' | 'secondary';
      const condition = String(data.condition ?? 'normal') as ScenarioDefinition['sensor']['channels'][number]['actualCondition'];
      const intensity = typeof data.intensity === 'number' ? data.intensity : 0.6;
      const target = this.scenario.sensor.channels.find((c) => c.channel === channel);
      if (target) {
        const previous = target.actualCondition;
        target.actualCondition = condition;
        target.intensity = Math.min(Math.max(intensity, 0), 1);
        this.appendEvent(
          'sensorStateChanged',
          { from: previous, to: condition, intensity: target.intensity, timedEventId: id },
          rawSensorSnapshot(this.scenario.sensor, this._simTime),
        );
      }
    } else if (type === 'environmentShift') {
      this.appendEvent('environmentChanged', { timedEventId: id, ...data });
    } else {
      this.appendEvent('timedEventOccurred', { timedEventId: id, eventType: type });
    }
  }

  private updateLastPositions(t: number): void {
    for (const contact of this.scenario.contacts) {
      const vis = visibilityAt(contact, t);
      if (vis === 'visible' || vis === 'occluded') {
        this._lastPositions.set(contact.id, evaluateMotion(contact.motion, t - contact.spawnTime));
      }
    }
  }

  private contactDef(id: string): ContactDefinition {
    const def = this.scenario.contacts.find((c) => c.id === id);
    if (!def) throw new Error(`Unknown contact id: ${id}`);
    return def;
  }


  // -------------------------------------------------------------------------
  // Trainee workflow actions (all reject once terminal or not permitted)
  // -------------------------------------------------------------------------

  private assertActionsAllowed(): void {
    if (this._state !== 'running' && this._state !== 'paused') {
      throw new Error(`Trainee actions are not allowed in state "${this._state}"`);
    }
  }

  acknowledgeContact(contactId: string): void {
    this.assertActionsAllowed();
    if (!this.scenario.permittedActions.acknowledge) throw new Error('Acknowledge not permitted in this scenario');
    const a = this.assessment(contactId);
    if (a.submitted) throw new Error(`Assessment for ${contactId} already submitted`);
    const vis = visibilityAt(this.contactDef(contactId), this._simTime);
    if (vis !== 'visible' && vis !== 'occluded') {
      throw new Error(`Contact ${contactId} is not currently observable`);
    }
    a.acknowledged = true;
    if (a.detectionState === 'notDetected' || a.detectionState === 'detected') {
      a.detectionState = 'acknowledged';
    }
    this.appendEvent('contactAcknowledged', { detectionState: a.detectionState }, undefined, contactId);
  }

  markUncertain(contactId: string): void {
    this.assertActionsAllowed();
    const a = this.assessment(contactId);
    if (a.submitted) throw new Error(`Assessment for ${contactId} already submitted`);
    a.detectionState = 'markedUncertain';
    this.appendEvent('contactMarkedUncertain', {}, undefined, contactId);
  }

  requestVerification(contactId: string): void {
    this.assertActionsAllowed();
    if (!this.scenario.permittedActions.requestVerification) {
      throw new Error('Verification requests not permitted in this scenario');
    }
    const a = this.assessment(contactId);
    if (a.submitted) throw new Error(`Assessment for ${contactId} already submitted`);
    a.detectionState = 'verificationRequested';
    this.appendEvent('verificationRequested', {}, undefined, contactId);
  }

  setClassification(contactId: string, classification: TraineeClassification): void {
    this.assertActionsAllowed();
    if (!this.scenario.permittedActions.classify) throw new Error('Classification not permitted in this scenario');
    const a = this.assessment(contactId);
    if (a.submitted) throw new Error(`Assessment for ${contactId} already submitted`);
    a.classification = classification;
    const ev = this.appendEvent('classificationSubmitted', {}, undefined, contactId);
    ev.classification = classification;
  }

  setConfidence(contactId: string, confidence: ConfidenceLevel): void {
    this.assertActionsAllowed();
    if (!this.scenario.permittedActions.setConfidence) throw new Error('Confidence selection not permitted');
    const a = this.assessment(contactId);
    if (a.submitted) throw new Error(`Assessment for ${contactId} already submitted`);
    a.confidence = confidence;
    const ev = this.appendEvent('confidenceChanged', {}, undefined, contactId);
    ev.confidence = confidence;
  }


  toggleEvidence(contactId: string, item: EvidenceItem, selected: boolean): void {
    this.assertActionsAllowed();
    if (!this.scenario.permittedActions.selectEvidence) throw new Error('Evidence selection not permitted');
    const a = this.assessment(contactId);
    if (a.submitted) throw new Error(`Assessment for ${contactId} already submitted`);
    const idx = a.evidence.indexOf(item);
    if (selected && idx === -1) a.evidence.push(item);
    if (!selected && idx !== -1) a.evidence.splice(idx, 1);
    const ev = this.appendEvent(
      selected ? 'evidenceSelected' : 'evidenceDeselected',
      { item },
      undefined,
      contactId,
    );
    ev.evidence = [...a.evidence];
  }

  setProceduralResponse(contactId: string, response: ProceduralResponse): void {
    this.assertActionsAllowed();
    if (!this.scenario.permittedActions.proceduralResponse) {
      throw new Error('Procedural response not permitted');
    }
    const a = this.assessment(contactId);
    if (a.submitted) throw new Error(`Assessment for ${contactId} already submitted`);
    a.proceduralResponse = response;
    const ev = this.appendEvent('proceduralResponseSelected', {}, undefined, contactId);
    ev.proceduralResponse = response;
  }

  /**
   * Submit the full assessment for a contact. Requires classification,
   * confidence and a procedural response. Cannot be undone.
   */
  submitAssessment(contactId: string): void {
    this.assertActionsAllowed();
    const a = this.assessment(contactId);
    if (a.submitted) throw new Error(`Assessment for ${contactId} already submitted`);
    if (!a.classification) throw new Error('A classification (or "unknown") is required before submitting');
    if (!a.confidence) throw new Error('A confidence level is required before submitting');
    if (!a.proceduralResponse) throw new Error('A procedural response is required before submitting');
    a.submitted = true;
    a.submittedAt = this._simTime;
    const ev = this.appendEvent('assessmentSubmitted', {}, undefined, contactId);
    ev.classification = a.classification;
    ev.confidence = a.confidence;
    ev.evidence = [...a.evidence];
    ev.proceduralResponse = a.proceduralResponse;

    if (this.completionSatisfied()) {
      this.complete();
    }
  }

  /** Attributable group observation; never substitutes for a person's perception. */
  recordGroupObservation(groupId:string,contactIds:string[]):void{
    this.assertActionsAllowed();const view=this.traineeView().groups.find(g=>g.id===groupId);
    if(!view?.available)throw new Error('Group information is not currently available');
    if(!contactIds.length||new Set(contactIds).size!==contactIds.length||contactIds.some(id=>!view.members.includes(id)||!this._assessments.get(id)?.acknowledged))throw new Error('Reference distinct, acknowledged current contacts');
    if(view.report)throw new Error('Group report already committed');
    this.appendEvent('groupObservationRecorded',{groupId,stateId:view.stateId,contactIds});
  }
  submitGroupReport(groupId:string,report:GroupReport,confidence:ConfidenceLevel):void{
    this.assertActionsAllowed();groupReportSchema.parse(report);
    if(!['low','medium','high'].includes(confidence))throw new Error('Invalid group confidence');
    const view=this.traineeView().groups.find(g=>g.id===groupId);
    if(!view?.available||!view.recordedContactIds.length)throw new Error('Record available group observations before reporting');
    if(view.report)throw new Error('Group report already committed');
    this.appendEvent('groupReportSubmitted',{groupId,stateId:view.stateId,report,confidence,contactIds:view.recordedContactIds});
    if(this.completionSatisfied())this.complete();
  }
  /** True when the scenario's completion conditions are satisfied. */
  completionSatisfied(): boolean {
    if((this.scenario.groupTraining?.groups??[]).some(g=>!this.log.getAll().some(e=>e.type==='groupReportSubmitted'&&e.actionDetails?.groupId===g.id)))return false;
    const submitted = this.submittedAssessments().length;
    const c = this.scenario.completion;
    if (c.requireAllContactsAssessed && submitted < this.scenario.contacts.length) return false;
    return submitted >= c.requiredAssessments;
  }

  /** May the trainee end the session early right now? */
  canEndEarly(): boolean {
    return (
      (this._state === 'running' || this._state === 'paused') &&
      (this.scenario.completion.allowEarlyEnd || this.completionSatisfied())
    );
  }

  private assessment(contactId: string): ContactAssessment {
    const a = this._assessments.get(contactId);
    if (!a) throw new Error(`Unknown contact id: ${contactId}`);
    return a;
  }

  submittedAssessments(): ContactAssessment[] {
    return [...this._assessments.values()].filter((a) => a.submitted);
  }

  allAssessments(): ContactAssessment[] {
    return [...this._assessments.values()];
  }


  // -------------------------------------------------------------------------
  // Views
  // -------------------------------------------------------------------------

  /**
   * Trainee-facing snapshot. Contains NO ground truth — safe for the
   * trainee-facing UI during an active session.
   */
  traineeView(): TraineeView {
    const t = this._simTime;
    const primaryFeed = rawFeedState(this.scenario.sensor, 'primary', t);
    const contacts: TraineeContactView[] = this.scenario.contacts.map((def) => {
      const visibility = observableVisibility(def, t, primaryFeed);
      const position =
        visibility === 'visible' || visibility === 'occluded'
          ? ([...this.displayPosition(def, primaryFeed, t)] as Vec3)
          : null;
      if(position){const offset=groupOffset(this.scenario.groupTraining,def.id,Math.max(0,t-primaryFeed.delaySeconds));position[0]+=offset[0];position[1]+=offset[1];position[2]+=offset[2];}
      return {
        id: def.id,
        category: def.category,
        appearance: def.appearance,
        visibility,
        position,
        heading: visibility === 'visible' ? evaluateHeading(def.motion, t - def.spawnTime) : 0,
        spawnTime: def.spawnTime,
        assessment: { ...this._assessments.get(def.id)!, evidence: [...this._assessments.get(def.id)!.evidence] },
      };
    });
    const feedStates: Record<string, FeedState> = {
      primary: primaryFeed,
    };
    if (this.scenario.sensor.channels.some((c) => c.channel === 'secondary')) {
      feedStates.secondary = rawFeedState(this.scenario.sensor, 'secondary', t);
    }
    return {
      groups:(this.scenario.groupTraining?.groups??[]).flatMap(group=>{
        const state=groupStateAt(group,t);if(!state)return [];
        const members=state.members.filter(id=>contacts.some(c=>c.id===id&&c.visibility==='visible'&&c.position!==null&&this.contactDef(id).observable));
        const available=primaryFeed.feedLive&&members.length>=2;
        const observations=this.log.getAll().filter(e=>e.type==='groupObservationRecorded'&&e.actionDetails?.groupId===group.id&&e.actionDetails?.stateId===state.id);
        const recordedContactIds=[...new Set(observations.flatMap(e=>e.actionDetails?.contactIds as string[]??[]))];
        const report=this.log.getAll().find(e=>e.type==='groupReportSubmitted'&&e.actionDetails?.groupId===group.id)?.actionDetails?.report as GroupReport|undefined;
        return [{id:group.id,label:group.label,members,available,cue:available?state.cue:'Group information unavailable',stateId:state.id,recordedContactIds,report:report??null}];
      }),
      simTime: t,
      duration: this.scenario.duration,
      state: this._state,
      environment: this.scenario.environment,
      timeOfDay: this.scenario.timeOfDay,
      visibility: this.scenario.visibility,
      weather: this.scenario.weather,
      difficulty: this.scenario.difficulty,
      contacts,
      sensorStatus: this.scenario.sensor.channels.map((c) => traineeStatus(this.scenario.sensor, c.channel)),
      feedStates,
      title: this.scenario.title,
      description: this.scenario.description,
      permittedActions: this.scenario.permittedActions,
    };
  }

  /** Display position honouring frozen/delayed feed states. */
  private displayPosition(def: ContactDefinition, feed: FeedState, t: number): Vec3 {
    if (feed.frozen) {
      return this._lastPositions.get(def.id) ?? evaluateMotion(def.motion, 0);
    }
    if (feed.delaySeconds > 0) {
      return evaluateMotion(def.motion, Math.max(0, t - feed.delaySeconds - def.spawnTime));
    }
    return evaluateMotion(def.motion, t - def.spawnTime);
  }

  /** Ground truth — scoring/summary/instructor only. */
  groundTruth(): ContactGroundTruth[] {
    return this.scenario.contacts.map((def) => ({
      contactId: def.id,
      groundTruthLabel: def.groundTruthLabel,
      category: def.category,
      assessment: def.assessment,
    }));
  }

  /** Append an event with session context. */
  private appendEvent(
    type: SimulationEvent['type'],
    actionDetails?: SimulationEvent['actionDetails'],
    sensorState?: Record<string, string>,
    contactId?: string,
  ): SimulationEvent {
    return this.log.append({
      sessionId: this.sessionId,
      traineeId: this.traineeId,
      scenarioId: this.scenario.id,
      scenarioVersion: this.scenario.version,
      simTimestamp: round3(this._simTime),
      type,
      contactId,
      actionDetails,
      sensorState,
    });
  }
}

function emptyAssessment(contactId: string): ContactAssessment {
  return {
    contactId,
    acknowledged: false,
    detectionState: 'notDetected',
    classification: null,
    confidence: null,
    evidence: [],
    proceduralResponse: null,
    submitted: false,
    submittedAt: null,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Visibility as seen through the primary feed: `missingObservations` hides a
 * subset of contacts entirely (deterministic by id hash), and occlusion
 * windows hide the contact while active.
 */
function observableVisibility(
  def: ContactDefinition,
  t: number,
  feed: FeedState,
): ContactVisibilityState {
  const base = visibilityAt(def, t);
  if (!def.observable) {
    // Non-observable contacts never show up visually, but may still appear
    // on the synthetic contact list after their spawn time.
    return base === 'visible' ? 'visible' : base;
  }
  if (feed.hideContacts) {
    // Deterministically hide ~1/3 of contacts based on id hash.
    let h = 0;
    for (let i = 0; i < def.id.length; i++) h = (h * 31 + def.id.charCodeAt(i)) >>> 0;
    if (h % 3 === 0 && t >= def.spawnTime && (def.despawnTime === -1 || t < def.despawnTime)) {
      return 'lost';
    }
  }
  return base;
}

/** Whether a false-positive marker should currently be displayed. */
export function falsePositiveActive(feed: FeedState, t: number): boolean {
  if (!feed.falsePositive) return false;
  // Deterministic pulse: 4s on, 6s off.
  return Math.floor(t / 5) % 2 === 0;
}

/** Confidence ordering helper (low < medium < high). */
export function confidenceAtLeast(a: ConfidenceLevel | null, b: ConfidenceLevel): boolean {
  if (!a) return false;
  return CONFIDENCE_ORDER[a] >= CONFIDENCE_ORDER[b];
}
