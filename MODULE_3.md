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