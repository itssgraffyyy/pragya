# Module 4 — collaborative training and unit intelligence

## Workspace audit and reuse

Development continues from main at 4b54100, preserving the uncommitted diagnostic files. No clone, reset, forced update, or replacement of Modules 1–3 is used.

Completed foundations: the original simulation engine and strict scenario format; deterministic policy scoring and saved policy snapshots; recorded-event replay and assessment exports; persistent profiles, cohort-separated Skill DNA, adaptive learning, progress and coaching; IndexedDB v3 and production offline shell.

Partial foundations: the existing JSON scenario editor validates, previews and exports but its Save action did not persist. Assessment policy editing previews scores but has no instructor-owned version library. Individual and longitudinal review exist but have no instructor annotations or crew integration.

Missing at takeover: local identities/roles, units/memberships/cohorts, instructor scopes and assignments, one-clock Duo training, structured crew communication/scoring/review, unit analytics, unit backups and deployment/compliance documentation.

## Phase 1: local identities and units

`core/unit/models.ts` validates versioned users, roles, units, memberships, instructor scopes, cohorts, training assignments, explicit session ownership and annotations. `service.ts` enforces active membership and instructor-to-trainee scope before restricted reads/writes. Commander aggregate rights do not grant access to individual trainee reports. The last commander cannot be archived. Membership archival preserves histories. Multiple units can be created; unit-bound records cannot be moved to another unit.

IndexedDB v4 adds the `training` object store keyed by kind and ID. Existing five stores and records are retained. Related identity/membership writes resolve after transaction completion. MemoryStorage implements the same contract. Session-to-unit associations are explicit and verify original ownership; no historical session is assigned by the migration.

The Home screen links Local identities & units, with first-run commander setup, identity selection, unit creation/metadata, memberships, cohorts, instructor scope and permission-checked history/Skill DNA/assessment review. RoleBoundary restricts existing screens when an identity is selected; unrestricted local demo mode preserves original single-user workflows. Permission services independently check access.

### Security assumptions

Identity selection is a demonstration workflow, **not authentication**. A person with browser developer tools or OS/browser-profile access can inspect or modify IndexedDB and local identity selection. No encryption, tamper resistance, password isolation or hostile-user security is claimed. Separate OS accounts/browser profiles and filesystem protections are necessary for private local operation. A secured multi-user deployment requires an authenticated server or desktop trust boundary and remains outside this demo implementation.

Original storage adapters and Module 1–3 services are internal trusted APIs, not an authenticated network boundary. Module 4 restricted service methods check actor membership and scope. Trainee sessions and historical assessment/policy snapshots remain unchanged by role selection or review.

## Validation in progress

Baseline build passed; existing bundle-size advisory remains. Initial sandbox build/test invocations stalled and were interrupted; checks were restarted with runtime access and bounded unit workers. Baseline unit/component suite: 155 passed, zero failed/skipped. Browser baseline: 7 passed, 1 failed (Chromium launch timeout, then Settings click timeout during setup). The failed onboarding journey subsequently passed on a focused rerun; it is recorded as a baseline environment flake, not silently erased.

Milestone checks: seven new permission, migration and UI tests passed; 12 existing persistence/profile regressions also passed. Production build and strict TypeScript passed. The real browser role journey (setup, trainee membership, instructor scope, cohort, own review, denied editor access and persistence on reload) passed. Browser testing identified and fixed an ambiguous Role selector label.

## Remaining milestones

Duo crew training; instructor control/assignments; unified AAR and annotations; unit analytics; validated data transfer/offline hardening; full integration; compliance and differentiator verification; full regression/performance report; repeatable demo data and documentation. These are not implemented by Phase 1.

## Phase 2: Duo Crew Intelligence

`core/crew/runtime.ts` owns exactly one original SimulationEngine. Participants share its seed and clock; participant observations, detections, committed decisions and structured communication are separately attributed and timestamped. Visual and synthetic-indicator roles receive distinct scripted cue projections. These cues are explicitly synthetic scenario content, not inferred real measurements. Role labels and acknowledgment window are configurable. The three bundled crew definitions cover conflicting cues, multiple ambiguous contacts and degraded information.

Departure pauses the shared engine. Both participants must return before resuming. Persisted unfinished sessions recover paused, reconstructing the original engine to the recorded millisecond clock and retaining its recorded log; a recovery event is disclosed. No unrecorded video or messages are reconstructed.

Each participant commits an individual decision; the joint report requires a reference-linked confirmation from the other participant. Individual and joint assessment projections use the existing Module 2 scorer and original policy snapshot. Wrong individual decisions remain wrong even when a later joint report corrects them. Profile history receives two distinct saved individual sessions, idempotently. Crew records preserve the shared scenario, role assignments, communication, observations, individual IDs, joint result and transparent coordination metrics.

Crew scoring separately measures supported information sharing, timely acknowledgments, decision reconciliation, structured-message clarity, evidence-backed procedural reporting and joint completion. Acknowledgment timing earns no credit for unsupported information. These are educational coordination measures, not real-world readiness metrics. Weight configuration is validated and versioned with the definition.

Home → Duo Crew Mode supports two existing profiles on one laptop, visual scene/indicator projections, turn selection, private individual commitments, eight structured message types, pause/leave/rejoin, completion, shared/individual timelines, missing acknowledgments, discrepancies, original decision dashboards and JSON export. In role mode an instructor must have scope over both trainees; saved crew history is restricted to scoped instructors and participating trainees. Local demo mode remains explicitly unrestricted. Mode B closed-LAN networking is **not implemented or claimed**.

Integration fixed a source timing mismatch: engine events round to milliseconds, while summaries previously retained finer time precision. New summary end times now use the same millisecond precision, preventing a valid last submission from being filtered as a future event. Existing stored summaries are unchanged. A fractional-clock regression verifies the actual saved assessment.

Validation: crew lifecycle/communication/scoring/recovery/persistence tests, permission/isolation checks, recorded-identity validation and fractional-time regression. The real two-person browser journey records both decisions and evidence shares, acknowledgments and a confirmed joint report; it verifies separate assessments, a calculated crew score and persisted AAR after reload. Instructor annotations and broader unified review are subsequent milestones.

## Phase 3: instructor control and assignments

The original scenario editor now actually persists its work. It uses the existing strict scenario schema and offers draft storage (including invalid JSON), validation/publication, immutable published versions, duplication with a fresh ID, archive, bounded import/export and original-engine preview. Scenario content and publication metadata commit atomically. Drafts/archived documents are excluded from assignments. Unit libraries do not expose another unit's saved scenario overrides. The regular scenario selector now includes permitted saved scenarios, preserving bundled content.

Instructor control lists real assigned trainees/cohorts, published scenarios, assignments, completion, recent results and sessions awaiting review. It provides explicit association of historical sessions without changing their original owner. The policy UI exposes numeric weights, detection thresholds and classification credit, with complete JSON configuration for decision trees, evidence documentation, explanation templates and version fields. Validation reuses Module 2. Saved policy versions are immutable; changes require a new version. Preview calculates on a real selected session without rewriting its recorded result.

Individual/cohort assignments validate every target before writing. Each stores exact scenario and policy snapshots, objectives, optional due date, attempt number and predecessor. Only its trainee can start it. The actual SimulationStore captures its chosen policy, saves the real assessment, then reconciles completion and explicitly establishes unit ownership. Cancellation and reassignment preserve previous attempts. Restarting an assigned session under the same ID is refused to protect historical results. Adaptive recommendations remain independent.

Review reuses AssessmentDashboard, event replay, calculated Skill DNA and recurring-pattern evidence. Instructor notes persist separately with author/time/objectives and never mutate scoring. Commander unit setup can create trainees through the existing profile model, rather than requiring unrestricted demo mode. Permission rendering is keyed to the current identity/profile/screen so previous authorized content does not flash during a switch.

Validation includes immutable policy/scenario tests, malformed drafts, archives, all-or-nothing cohort authorization, foreign completion rejection, real engine completion, instructor-note score preservation, actual store capture of a non-default policy, and restart protection. The browser journey duplicates/publishes a scenario in the existing editor, assigns it, completes the real simulation as its trainee, then verifies instructor review and feedback preserve the original score.
