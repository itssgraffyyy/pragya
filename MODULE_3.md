# Module 3: Personalized learning

## Architecture and baseline

Module 3 extends the existing React/Zustand application and both existing StorageAdapter implementations. Module 1 remains the scenario/engine authority; Module 2 remains the assessment authority. No backend, network API, model download, or new runtime dependency is required.

Baseline production build and TypeScript passed. The original browser command encountered a 120-second web-server startup timeout; a direct Vite/browser retry was started. Existing source and diagnostic files were preserved.

## Profiles and migration

IndexedDB version 2 adds a trainees store and preserves all version-1 stores and records. Profile data has its own schemaVersion 1 and is validated with Zod. Profile selection persists the trainee ID through existing settings. Completed sessions update only the profile identified by the session, never whichever profile happens to be selected later.

Legacy records require explicit association by session ID. Their original owner and assessment remain unchanged. Sessions without saved assessments are shown as unmeasured, not silently recalculated. Corrupt records are excluded with a warning. Profile imports validate every record and ownership before a single atomic IndexedDB transaction. Import cannot overwrite a local profile or conflicting session. Deleting a profile requires UI confirmation and retains its sessions; archiving preserves profile and history.

Skill assessment history is derived from immutable session snapshots, rather than copying scores into profile fields. Total completed sessions is derived from individual history; completed session IDs are deduplicated in the profile.
