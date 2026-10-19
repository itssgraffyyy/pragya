# Module 5 — Advanced Training Intelligence

## Baseline and preservation

Workspace G:\projects\pragya, branch main, starting commit 09eda4c; cached origin/main initially matches. Preexisting modified e2e-fixed.txt and untracked build/test diagnostic files are preserved and excluded from commits. No AGENTS.md was found in the workspace file inventory. No new simulation or independent scoring engine will be introduced.

Fresh baseline: strict TypeScript/Vite build passed; 208 unit/component tests passed in 38 files (110.28 seconds). Browser baseline is running. Prior Module 4 history includes cold-start/onboarding/download flakes and a final clean 17-test browser run; these are retained in TEST_REPORT.md.

## Reused contracts and integration points

- src/core/sim/engine.ts, types.ts, events/eventLog.ts: sole simulation clock, trainee projection and canonical append-only events.
- src/core/scenario/schema.ts and bundled/helpers.ts; generator/generator.ts: schema-1 scenario compatibility and seeded construction.
- src/core/scoring/scoreSession.ts, policy.ts, storedSession.ts: sole scoring authority, immutable stored assessments/policy snapshots.
- src/core/learning: Skill DNA, recommendations, adaptive exercises, comparisons and historical validation.
- src/core/instructor/service.ts, unit/service.ts: publication, immutable versions, assignment snapshots and actor/unit/scope checks.
- src/core/crew/runtime.ts, analytics/unitAnalytics.ts: existing crew and explicitly owned unit projections.
- src/core/persistence and transfer/backup.ts: additive versioned records, atomic writes, schema/reference/import conflict checks.
- build/offlineShell.ts, scripts/serve-offline.mjs, src/tests/e2e: production offline cache, local serving and real browser workflows.

## Confirmed gaps and sequence

Phase 0: synthetic group relationships/events, visible group changes and attributable qualified reporting through existing engine/scorer. Phase 1: competency blueprints, opportunity provenance, AssessGuard test bench, publication review and per-competency learning eligibility. Phase 2: editable objective catalogue, bounded constrained generation, review/assignment and coverage. Phase 3: separate evidence/uncertainty feedback, explicit stages and qualified independent evaluation. Phase 4: integrated adversarial/browser/offline/performance verification, research alignment and repeatable demonstration. These later phases are not yet implemented.

Fresh baseline browser result: 17 passed in 2.5 minutes, with no retries/skips. Baseline source build and all 208 unit/component checks passed. Baseline verification preceded the first group-aware build; original production assets were used during the baseline browser run.

## Phase 0 implementation (verification in progress)

Optional groupTraining schema version 1 adds bounded group/state relationships, ordered deterministic changes, allowed reporting categories and educational cues. The original SimulationEngine applies formation offsets to its existing paths, emits canonical group-state/observation/report events, and projects only currently available group cues. It records attributable contact references and qualified reports; it does not infer human perception. Unfinished group reports prevent automatic successful completion; explicit early endings still retain missing-result evidence.

Four bundled examples cover the original single baseline, independent multiple contacts, coordinated synthetic grouping and an ambiguous relationship. These are simplified educational formations, not real-world swarm tactics or validated swarm physics. A new illustrative versioned policy adds group completeness, attribution and qualification feedback inside the original Module 2 scorer, separately from original contact correctness and its legacy overall formula. Saved policies/events/results and instructor assignments preserve snapshots; new group provenance is validated during import. Console forms and the existing assessment/AAR show actual group sources.

AssessGuard, CurriculumForge and EvidenceMind remain subsequent phases; no educational certification or learning-effectiveness claim follows from Phase 0 technical checks.

Phase 0 completion gate: strict build passed; 213 unit/component tests across 39 files passed, plus 14 focused replay/assessment/AAR checks after the last replay extension. All 18 production browser journeys passed in 2.1 minutes without retries/skips, including the offline group-change → attributable observation → qualified report → canonical replay → saved-history reload flow. A live remote check confirmed origin/main still at starting 09eda4c before commit. No historical stored score is rewritten, no database migration/reset is needed for these optional versioned fields, and no runtime dependency was added.

## Phase 1 implementation (verification in progress)

AssessGuard adds optional trainingContract schema 1: competency/learning objective, mode, observable behavior, contact/opportunity/channel references, uncertainty conditions, accepted fictional responses, policy ID/version, explicit eligibility requirements and limitations. Legacy scenarios remain unchanged and playable. A declared assessment is an explicit new authoring operation, never a backfill of historical observations.

The canonical engine emits generated, available/unavailable, presented and acknowledged opportunity events. Text presentation is instrumented only after IntersectionObserver and animation-frame callbacks confirm a visible document/panel. This is software presentation provenance, not human perception. Visual/indicator channels currently require expert review because the text instrumentation does not establish their presentation. Final conclusions remain separate response/inference events.

The deterministic scenario test bench checks shape/references, missing observations, contradictory uncertainty/policy conditions, unreachable rule branches, disabled actions, answer-key leakage and known channel limitations. Seven controlled software participants execute the existing engine/scorer; their outcomes are fixtures, not empirical human-subject results. Execution is bounded to 600 seconds and reports that limitation.

Per-competency eligibility is eligible, partially_eligible, ineligible, requires_instructor_review or legacy_unknown with reasons and event sources. The original numerical score remains unchanged. Skill DNA omits unsupported declared competency/contact evidence; completely ineligible declared sessions do not count as measured, but useful partial sessions remain. Longitudinal recommendations/patterns use qualified sources. Legacy summaries retain explicit missing-metadata labels.

Instructor reviews record author/unit, exact scenario key/version, policy snapshot, passed checks, warning waivers and rationale. Clearly invalid integrity errors cannot be waived. Declared publication requires exact-version approval, and assignment policy must match that review. Review/version records participate in existing atomic publication and backup graph validation; the generic IndexedDB training store needs no destructive migration. Supported UI is integrated into the existing editor, simulation console, AAR and Skill DNA.

Phase 1 completion gate: 229 unit/component tests passed across 40 files (68.61 s); 25 focused integrity/replay/assessment/AAR checks passed after final contradiction/provenance extensions. Strict TypeScript/Vite build passed; all 20 production browser tests passed in 2.4 minutes without failures, retries or skips. The instructor editor/test bench are lazy-loaded; entry 494.92 KB (140.60 KB gzip), shared 3D 836.75 KB (225.39 KB gzip), retaining the existing 3D advisory. New instrumentation remains text-panel only; automated reachability/answer-leak checks cover known rule/value/identifier defects, not arbitrary semantic validity. Stage behavior, curriculum coverage and independently qualified progress remain subsequent phases, not claims of Phase 1 completion.

## Phase 2 implementation (verification in progress)

CurriculumForge uses versioned unit-owned objective definitions, explicit instructor approval, prerequisites, evidence requirements, supported scenario constraints, allowed training modes, policy references, observation-window conditions and limitations. Approved definition content cannot be overwritten; edits create a new version, and archive retains history. Supported canonical objective IDs remain shared with the original generator/profiles; arbitrary new semantic competencies are not silently invented.

Generation calls the original seeded generator, applies the declared competency/opportunity adapter and existing bounded group model, then runs AssessGuard plus objective/demand validation. It records requested/actual seeds, demand, bounded attempts, unsupported controls and reviewable failures. Unknown controls are rejected. Editable demand currently supports contact count, visibility, sensor condition, environment/time, reporting detail, stage and duration. Continuous ambiguity estimates, competing-event density, automatic familiarity certification, physical sensor calibration and automatic crew generation are disclosed as unsupported. Thermal-text observation requirements are not guaranteed by this generator; unavailable requirements are flagged for another bounded candidate or manual authoring.

A scoped instructor can view actual learning-gap summaries, edit/approve catalogue versions, generate/reject or regenerate drafts, preview observations, record review/waiver/prerequisite override rationales, approve/publish and assign through the existing instructor screen without JSON editing. Existing publication transactions commit scenario/version/candidate provenance together; existing assignment transactions commit captured assignments and candidate links together. Repeated assignment requests reuse the original records. Prerequisite evidence remains insufficient when explicitly overridden; the override does not fabricate history.

Coverage separates published exercise availability, declared opportunity count, eligible records, coached practice, independent assessments, repeated evidence, unassessed coverage and further independent evaluation needs. Services enforce actor/unit/trainee scope. New objective/candidate/review/assignment references are included in existing backup validation. Generic IndexedDB training records need no destructive migration. The original default objective remains basic-recognition; the added group objective no longer changes legacy generator fallbacks.

Phase 2 completion gate: strict build passed; 242 unit/component tests across 41 files passed (85.46 s), and all 21 production browser journeys passed (2.9 minutes), without retries or skips. The full instructor form journey includes version edit/approval, bounded generation, publication, assignment, offline reload, real trainee completion and scoped outcome review. Group qualification additionally requires actual cue presentation before the recorded group observation/report; its original numerical score remains unchanged. A missing-evidence fixture initially depended on random unit-derived seeds; it now explicitly removes the tested cue before validation. No application assertion or timeout was relaxed. Stage effects and qualified adaptive progress are Phase 3 work.
