# Module 3: Personalized learning

## Architecture and baseline

Module 3 extends the existing React/Zustand application and both existing StorageAdapter implementations. Module 1 remains the scenario/engine authority; Module 2 remains the assessment authority. No backend, network API, model download, or new runtime dependency is required.

Baseline production build and TypeScript passed. The original browser command encountered a 120-second web-server startup timeout; a direct Vite/browser retry was started. Existing source and diagnostic files were preserved.

## Profiles and migration

IndexedDB version 2 adds a trainees store and preserves all version-1 stores and records. Profile data has its own schemaVersion 1 and is validated with Zod. Profile selection persists the trainee ID through existing settings. Completed sessions update only the profile identified by the session, never whichever profile happens to be selected later.

Legacy records require explicit association by session ID. Their original owner and assessment remain unchanged. Sessions without saved assessments are shown as unmeasured, not silently recalculated. Corrupt records are excluded with a warning. Profile imports validate every record and ownership before a single atomic IndexedDB transaction. Import cannot overwrite a local profile or conflicting session. Deleting a profile requires UI confirmation and retains its sessions; archiving preserves profile and history.

Skill assessment history is derived from immutable session snapshots, rather than copying scores into profile fields. Total completed sessions is derived from individual history; completed session IDs are deduplicated in the profile.

## Skill DNA formulas

Ten configurable competency definitions map existing Module 2 contact scores to detection, classification, evidence, calibration, procedure, degraded conditions, multi-contact management, uncertainty, reporting completeness and score consistency. Missing measurements are null. Reporting measures four recorded submission fields; consistency measures 100 minus the population standard deviation of comparable classification scores, and does not imply accuracy.

Each session contributes one mean per measured competency. Recency weights are `0.5 ** (ageDays / halfLifeDays)` with a default 30-day half-life and age measured relative to the latest assessment in the cohort, not the machine clock. The weighted mean is reproducible. Strength/development states require at least three sessions and three observations by default. Trend compares equal-sized early and late halves only when at least three assessment points exist.

Cohorts separate full saved scoring-policy content, policy ID/version, environment, time of day, visibility, weather, difficulty, sensor conditions and single/multi-contact conditions. They are never pooled for trends. Accessible SVG bars and tables expose scores, coverage, evidence sufficiency and drill-down records. Filters never rewrite saved assessments.

Baseline validation completed: build passed; 114/114 unit/component tests passed. Browser baseline: 2 passed, 1 failed before application interaction because Chromium launch exceeded 180 seconds; the first npm browser attempt also timed out starting Vite. These environment startup failures are recorded separately from regressions.
## Longitudinal blind spots

The existing Module 2 detector now optionally exposes sparse observations and exact session/contact references; default behavior is unchanged. Longitudinal analysis uses these predicates, groups compatible policy/condition cohorts, deduplicates records and distinguishes isolated mistakes from recurring patterns. Improvement compares early versus recent error rates only with at least four comparable sessions; it does not infer improvement from an overall score. Legacy associations are projected to the profile only during analysis; original assessment identity is retained.
## Recommendations

A deterministic offline rule engine ranks actual measured gaps, recurring patterns, assigned objectives and coverage. It uses existing objective IDs and bundled scenario references, not hardcoded trainee results. Sparse history produces a baseline recommendation. Active recommendations are deduplicated by target/cohort; identical dismissed evidence is not reissued. Strong repeated performance broadens conditions one tier at a time. Recommendations expose target, objective, reason, source assessments, supported generator constraints, difficulty, priority and status.

IndexedDB v3 adds learningPlans without modifying historical records. Plans persist recommendations and longitudinal pattern evidence. Schema-versioned exercise trace contracts are defined for the next integration milestone.
## Closed-loop adaptive exercises

The adapter invokes Module 1 generateScenario and validates the resulting definition. It searches fresh deterministic seeds for observable contacts and, for uncertainty objectives, an actual acceptable-Unknown branch. It never replaces the generator or changes its answer key. Unsupported direct controls (exact ambiguity, sensor intensity and evidence requirements) are disclosed in the preview. Difficulty is capped to one-tier increases and weak prerequisites simplify practice. The existing difficulty service is used only when its required dimensions are measured; missing inputs are not fabricated.

Every exercise persists recommendation, objective, seed, generator version, full configuration, scenario snapshot, rationale, stage, session link and completion status. Replaying the configuration reproduces the scenario. Practice success leads to an unseen evaluation with a fresh seed. Resolution requires a target score of at least 80 and policy/condition compatibility with practice and, when present, the original cohort. Changed conditions produce continued practice rather than unsupported improvement claims.

Terminal simulation capture saves Module 2 results, updates the correct profile and reconciles its learning plan. Trainee exports now include plans and traces, and import them atomically with profile/session data.
## Progress and refresher planning

Progress exposes baseline/latest measurements separately by compatible cohort, source session IDs, corrective practice, unseen evaluation and follow-up stages. Incompatible comparisons have null deltas and an explicit explanation. Refresher intervals are configurable per trainee (default 30 days); a reminder requires an assigned objective or recorded past difficulty, not elapsed time alone. These are internal foundation/developing/consistent/advanced/refresher training milestones, never operational certifications. Explicit as-of dates make retention calculations reproducible and exclude future observations.
## Offline coach

The coach is a deterministic template/rules service, not an LLM. Eight contextual questions explain saved scores and rule references, missing evidence, calibration, strengths, recurring mistakes, progress and next exercises. Responses cite only the selected trainee's valid completed assessments, disclose insufficient evidence and never invent sensor observations. The UI can open each supporting Module 2 assessment.
## Learning UI and production offline shell

The five learning screens share navigation and preserve selected-trainee boundaries. Post-session UI waits for persistence/learning updates, shows the next evidence-grounded step and can launch it directly. Profile/history/coach reviews can pass an explicitly scoped session set to the existing assessment dashboard. Unfinished assignments can be released without fabricating a result; completed evaluations can be followed by fresh-seed follow-ups.

Learning writes are serialized per trainee to prevent delayed UI loads or simultaneous saves from overwriting newer plans. A read-only `getLearningSnapshot(storage, traineeId, asOf)` contract exposes versioned competency, progress, coverage, pattern, exercise, recommendation and assessment data without implementing Module 4 dashboards or unit analytics.

The production build emits a small service worker that caches only this application's shell/assets. A first successful local/secure-origin load is needed before disconnected reloads; no remote API or inference is required. Direct file-protocol installation is not supplied. Browser offline validation is part of the final test checkpoint.

UI integration checks so far: production bundle and TypeScript passed; 12 profile/adaptive/post-session integration tests passed. Component/browser verification continues in the final validation checkpoint.