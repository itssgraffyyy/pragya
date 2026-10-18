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

UI checkpoint validation passed: production bundle, TypeScript, 12 profile/adaptive/post-session integration tests and seven adaptive/component checks. Final expanded validation is recorded below.
## Read-only integration contract

`getLearningSnapshot(storage, traineeId, asOf)` returns `TraineeLearningSnapshot` with `contractVersion: 1`, the requested trainee ID, timestamp, Skill DNA cohorts, progress history, pattern evidence, recommendation statuses, exercise completions, coverage and original session assessments. `nonSensitiveMetrics` contains completed/measured session counts, completed exercise count and unassessed-competency count. It omits display names and reference codes. Future consumers should call this API rather than recomputing scores or merging incompatible cohorts. No Module 4 commander dashboard, multiplayer or unit-wide analytics is implemented.

## Validation scope and known limitations

The final browser configuration serves the production bundle on port 5174, including its actual offline shell; run the production build before browser tests. The five Module 3 journeys use real profile import, generator, engine, scoring and IndexedDB services. Initial history fixtures are produced by the real simulation/scoring engine, and primary journeys complete actual exercises through the UI. They do not mock assessment/recommendation responses.

The initial aggregation, recommendation and coach rules are transparent heuristics, not trained models or validated operational readiness measures. Cohort comparisons group broad synthetic conditions and still span different scenes/seeds; they are learning indicators, not controlled causal proof. Practice success alone is not transfer. Follow-up assessments do not advance the same curriculum objective twice.

Exact ambiguity, evidence requirements and sensor intensity cannot be directly overridden through Module 1 GeneratorConfig. The adapter reports this limitation and uses existing generator behavior. No native desktop installer is added. Disconnected reload requires a first successful production-shell installation on a local/secure HTTP origin with service-worker support. Profile file imports are limited to 20 MB in the UI. The pre-existing large JavaScript bundle advisory remains; no additional runtime dependencies were introduced.

Corrupted profile/session records are excluded with warnings and preserved in storage. Imported plan references and exercise seed/configuration consistency are checked before atomic writes. Existing assessment scores are never silently recalculated. Awaiting unseen evaluations take precedence over unrelated recommendations.
## Final validation and completion

- `npm run build`: passed, including strict TypeScript and the production offline shell.
- `npm test -- --maxWorkers=2 --minWorkers=1`: 155 passed, 0 failed, 0 skipped across 24 files. Worker limits reduce test-run memory; no test is excluded.
- `npm run test:e2e`: 8 passed, 0 failed, 0 skipped. All five Module 3 journeys and all three existing Module 1 browser journeys passed without retry in the final run.
- Offline verification: the production shell was installed, browser networking disabled, the application reloaded, saved Skill DNA opened and a real personalized exercise generated from local history.
- Browser tests use the bundled Chromium headless shell with software ANGLE/SwiftShader rendering and the app's low graphics preset. UI assertion/action timeouts are unchanged. This avoids host-specific cold-launch/compositor failures seen during baseline and alternative-browser checks.
- Offline regression: manifest-owned static asset cache lookup handles preview-server `Vary: Origin` differences between precache and module requests. Primary launch assertions wait for the actual ready screen before inspecting committed exercise state.
- Legacy review-time recalculations are explicitly labeled and excluded from Skill DNA. All-unobservable sessions are not counted as measured history. Competency views list highest/lowest measured scores and declining comparable measurements with sufficiency indicators.

All twenty Module 3 definition-of-done conditions are implemented and verified within the documented rule-based training scope. No required feature is left incomplete. Unsupported generator controls, first-load offline installation, archive-size limits and unvalidated heuristic interpretation remain explicit limitations, not fabricated capabilities. Modules 1 and 2 remain functional. Module 4 itself has not been started; only its requested typed reuse contract is prepared.

## Tested Git checkpoints

| Milestone | Commit |
| --- | --- |
| Trainee profiles and assessment history | 9846b5c |
| Skill DNA and visualizations | 13a9a75 |
| Longitudinal blind spots | 8a4c190 |
| Personalized recommendations | 38e3505 |
| Closed-loop adaptive generation | 5a79432 |
| Progress and refresher planning | 5e1fd4d |
| Offline coach | 9c33095 |
| Integrated learning UI/offline shell | 4feb274 |
| Final regression validation | See final `test: validate Module 3 learning workflows and regressions` commit in git log |

Each milestone was pushed to origin/main after relevant validation. Existing diagnostic files were retained and excluded from implementation commits.