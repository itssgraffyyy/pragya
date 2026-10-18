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
