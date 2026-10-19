# PRAGYA verification report

Verification date: 19 October 2026. Commands run in the existing local workspace, preserving prior diagnostic files and Modules 1–3. No tests are intentionally skipped.

Latest verified delivery: **208 unit/component tests passed in 38 files; all 17 production browser tests passed in 2.2 minutes without retries, failures or skips; strict TypeScript and production build passed.** Earlier interrupted/flaky runs and the download hardening remain documented below. A warm clean run does not establish cold-start reliability across hardware.

## Regression checkpoint

- Production build: strict TypeScript and Vite passed. Entry bundle 459.27 KB (129.97 KB gzip); lazy 3D chunk 836.59 KB (225.30 KB gzip). The 3D chunk still raises Vite's size advisory.
- Unit/component command: `npm test -- --maxWorkers=2 --minWorkers=1`.
- Browser command: `npm run test:e2e`, production preview, one Chromium worker, existing retries retained.
- Earlier integration checkpoint: 201 tests in 36 files and 14 browser tests passed without skips or retries.
- Final counts and demo verification are appended below after completion.

## Measured performance

Host: Intel Core i5-8250U, four cores/eight logical processors, 7.9 GB RAM. Intel UHD Graphics 620 is installed, but browser automation used ANGLE SwiftShader software rendering. These results do not certify physical integrated-GPU frame rates or a fleet of low-end machines.

| Measurement | Observed result | Scope |
|---|---|---|
| Unit aggregation, 1,000 engine-scored sessions / 10 trainees, isolated run | 1,847.99 ms median of three trials (1,847.99 / 2,196.79 / 1,626.20 ms) | Real unit analytics service, in-memory adapter |
| Same aggregation during full regression/browser workload | 2,485.43 ms median; Node worker RSS 197 MB | Concurrent host load; process sample is not total app/system memory |
| Original single-contact live canvas | 35.30 animation frames/s; p95 interval 50 ms | 120 intervals, low graphics/reduced motion, software renderer |
| Live crew canvas | 51.07 animation frames/s; p95 interval 16.8 ms | Same configuration; browser animation cadence, not instrumented GPU render throughput |
| Pause click → visible paused state | 221 ms | Includes Playwright/UI scheduling |
| Chromium JS heap sample | 13 MB on each live screen | Approximate exposed JS heap, excludes GPU/native browser allocations |
| Native IndexedDB backup restore | 200 sessions, 5 trainees, 1,833,958-byte JSON; validation 3,449 ms, restore 886 ms, unit screen 608 ms | Earlier isolated successful browser measurement; actual database count confirmed 200 |

Performance tests print samples, verify real record counts and positive animation cadence, and impose no unsupported hardware certification threshold. Calendar dates of synthetic benchmark histories are explicitly arranged; assessment events/scores come from the original engine/scorer.

## Offline and integrity coverage

Production service-worker reload and generation; disconnected crew, instructor and commander workflows; native browser backup restore and duplicate rejection; two-tab exclusive crew hosting and paused takeover; additive IndexedDB migration; atomic publication/import rollback; role/scope denial; original assessment immutability; exact-policy/condition comparisons; fractional-time persistence; private crew decisions and separate individual/joint scoring.

The dependency-free loopback launcher is tested for static delivery, traversal rejection and unsupported write methods. Backups are plaintext, SHA-256 checksums detect corruption rather than authenticate data. Local roles demonstrate workflow restrictions, not secure authentication.

## Failures investigated

The initial takeover baseline had seven browser passes and one cold-start Chromium/onboarding timeout. Targeted onboarding subsequently passed; the integration full run passed all 14 tests. Early sandboxed npm launches stalled and were interrupted; later bounded-worker runs completed.

The new browser performance exercise exposed a real paused-final-submission error (`paused -> completed`). The state machine now permits completion because assessment actions are explicitly allowed while paused. A focused engine regression checks completion, unchanged simulation time and one completion event. The crew canvas now honors the same low graphics render-scale cap as the individual canvas. The performance exercise is retained as browser coverage for this path.

## Remaining qualification

Coordinated swarm dynamics, VR, closed-LAN transport, authenticated deployment, native executable packaging and physical hardware qualification are not verified capabilities. No market-first claim, field readiness certification or invented improvement percentage is made. See PS_COMPLIANCE.md for requirement-level evidence and limitations.

Browser regression checkpoint: **16 passed in 3.6 minutes**, zero retries, failures or skips. The full-run 200-session browser sample measured validation 6,916 ms, restoration 776 ms and analytics navigation 484 ms; the database contained exactly 200 sessions. The parallel unit run stalled while initializing component environments after its core tests passed; it was interrupted and rerun with one worker. No test assertions or configuration were weakened.

Final regression checkpoint: **203 unit/component tests passed in 37 files (73.12 seconds)** using one worker; **16 browser tests passed (3.6 minutes)**; strict production build passed. Zero skipped tests. The clean rerun had no failures or retries. The prior interrupted parallel run is disclosed above rather than counted as a pass. The isolated rerun aggregation median was 2,802.20 ms (3,638.55 / 2,802.20 / 2,712.66 ms), with a 196 MB Node worker RSS sample; timing varies with host load.

## Final demo regression

The final unit/component run passed **208 tests in 38 files (76.24 seconds)** with one worker. No failures or skips. Five demo integration checks cover real calculated correction/strength/unassessed histories, assignment and crew records, backup round-trip, genuine-data preservation, external-reference refusal, stale reset on both adapters and refusal to use an imported manifest to mark preexisting data as demo records.

The targeted production browser demo test passed offline in 7.5 seconds (13.9 seconds total invocation). It reviews saved adaptive progress, crew AAR and unit heatmaps, refuses reset while a crew host lock is held, then deletes the synthetic dataset while retaining a genuine profile. The final complete browser run follows below.

The final unit-run aggregation sample was 3,292.07 ms median over three trials (3,292.07 / 3,347.76 / 2,306.23 ms), Node worker RSS 173 MB, heap 37 MB before / 64 MB after. Samples fluctuate with host load and garbage collection; isolated and concurrent measurements above are retained rather than selecting only the fastest result.

Final production build: **passed**, including strict `tsc --noEmit`. Main entry 462.72 KB (130.97 KB gzip); lazy demo 11.83 KB (4.69 KB gzip); lazy crew UI 17.20 KB (5.52 KB gzip); shared 3D chunk remains 836.59 KB (225.30 KB gzip) with the disclosed Vite size advisory. No dependencies were added for Module 4.

Final browser run note: the original Module 3 onboarding test intermittently timed out clicking the resolved Start exercise button (15-second action timeout). Its existing first retry passed in 13.1 seconds. No selectors, assertions, timeouts or retry policy were weakened. Earlier complete 16-test regression was clean; the final run must retain this flaky classification. Cold-start/software-renderer responsiveness on this host remains a presentation/reliability limitation requiring qualification, rather than a hidden clean-pass claim.

During demo test development, the external-reference fixture initially created an invalid foreign cohort; backup validation correctly rejected that graph. The fixture was corrected to add a legitimate cross-unit membership before the cohort, then verified that reset refuses a valid outside reference without changing records. An unused callback parameter caught by TypeScript was removed before the final build. The final 208-test run includes these corrected checks.

Full demo-inclusive browser run before download hardening: **15 passed, 2 flaky, 0 failed or skipped (7.4 minutes)**. Onboarding and full-backup download each passed their existing first retry. The backup page reported success, but the download event exceeded the 15-second test deadline. Inspection found immediate object-URL revocation in the shared JSON helper; it now attaches the anchor and defers URL cleanup while the browser initiates the download. This removes a possible download race; it does not establish the sole cause of host timeouts. Browser verification is repeated after this source change; no test deadlines or assertions were loosened.

That run's live canvas samples were 34.95 / 59.02 animation frames/s (individual / crew), p95 49.9 / 16.7 ms, pause UI response 69.87 ms and approximate Chromium JS heap 12 MB. The 200-session native IndexedDB sample measured validation 6,449 ms, restore 1,022 ms and analytics navigation 545 ms, with exactly 200 stored sessions. Software-renderer and sampling limitations remain unchanged.

Post-download-hardening production build passed strict TypeScript and Vite. Shared JSON exports retain original data/filenames while delaying object-URL cleanup. The size advisory remains confined to the disclosed shared 3D chunk. No tests were skipped, disabled or relaxed.

Post-download-hardening samples: individual/crew animation cadence **35.82 / 60.00 frames/s**, p95 intervals **33.4 / 16.8 ms**, pause response **352.68 ms**, approximate Chromium JS heap **14 MB** on each screen. Native 200-session backup validation **1,321 ms**, restore **263 ms**, analytics navigation **835 ms**, exact persisted count **200**. These remain software-renderer, short-window, host-dependent observations; prior slower samples remain disclosed above.

Latest full production browser rerun after download hardening: **17 passed in 2.2 minutes; zero retries, failures or skips**. Original individual simulation, all learning journeys, role workflows, offline crew/assignments/analytics, backup transfer, host takeover, native storage/performance and synthetic demo reset all passed. Final unit/component checkpoint remains 208 passed across 38 files; strict build passed. Prior cold-start/download flakes are retained as qualification history; this clean warm run does not certify all cold hardware starts.

## Module 5 baseline (19 October 2026)

Before Module 5 integration: strict TypeScript/Vite build passed; 208 unit/component tests passed across 38 files (110.28 s); all 17 production browser tests passed in 2.5 minutes without retries or skips. The baseline retains the existing shared-3D bundle advisory. Host/software renderer caveats above still apply. The baseline 1,000-session aggregation median was 3,106.10 ms (3,538.78 / 1,741.24 / 3,106.10 ms), Node worker RSS 194 MB. Browser animation cadence was 33.8/60.0 frames/s for individual/crew, with p95 intervals 50/16.7 ms; native 200-session validation/restore/navigation measured 808/708/828 ms. No fleet-wide or physical GPU certification is inferred.

Phase 0 first checks: 213 unit/component tests passed in 39 files (53.61 s); strict production build passed. The first new browser test reached complete 100/100 group reporting but then failed because its test selector requested exact Home while the existing summary button is labeled ← Home. The selector was corrected without changing application navigation, timeouts or assertions. Group event-prefix replay was also extended to include actual group state/observation/report details; verification follows.

Module 5 Phase 0 final gate: strict TypeScript/Vite build passed; full unit/component suite 213 passed in 39 files, followed by 14 focused replay/assessment/AAR passes after the final replay change. All 18 browser tests passed in 2.1 minutes, zero failures/retries/skips. Latest software-rendered individual/crew cadence was 39.35/60 frames/s, p95 33.4/16.7 ms; native 200-session validation/restore/navigation measured 550/465/809 ms. Group tests verify real-engine examples, deterministic formation changes, qualification, provenance/import validation and event-prefix replay. The initial test selector failure is retained above.

Module 5 Phase 1: full unit/component suite **229 passed in 40 files (68.61 s)**, followed by **25 focused integrity/replay/assessment/AAR passes** after the final checks. Strict build passed. All **20 production browser tests passed in 2.4 minutes**, no retries/failures/skips. New offline journeys verify exact-version review/publication, actual text presentation/acknowledgement, qualified AAR, reload and invalid-publication prevention. Sixteen AssessGuard cases include contradictory rubrics, opportunity defects, valid ambiguity/difficulty, unsupported guesses, partial eligibility, interruption, legacy metadata, warning overrides, profile/pattern exclusion, immutability, deterministic controlled actors, projection keys and review transfer. Source instrumentation is software presentation evidence, not measured human perception.

Phase 1 measurements: 1,000-session aggregation median 3,224.36 ms (3,446.61 / 3,152.12 / 3,224.36 ms), Node worker RSS 200 MB. Browser individual/crew cadence 35.12/60 frames/s, p95 50/16.7 ms, pause 299.47 ms, approximate JS heap 12 MB; 200-session validation/restore/navigation 1,284/503/1,338 ms with exact database count 200. Host/software-renderer limitations remain. Lazy editor/test-bench loading keeps the entry at 494.92 KB/140.60 KB gzip; 3D chunk 836.75 KB/225.39 KB gzip retains its advisory.
