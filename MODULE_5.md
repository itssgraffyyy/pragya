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
