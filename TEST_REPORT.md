# PRAGYA verification report

Verification date: 19 October 2026. Commands run in the existing local workspace, preserving prior diagnostic files and Modules 1–3. No tests are intentionally skipped.

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
