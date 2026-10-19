# Visual overhaul QA report

Starting source checkpoint: 5f2da00, main. Existing diagnostics are preserved. This report records actual checks, including intermediate failures, and does not treat a build as visual verification.

Milestones A-G are committed/pushed; milestone H verification and direct screenshot inspection are complete. The delivery message supplies the final remote-confirmed H commit. Screenshots are captured from the actual production application by src/tests/e2e/visual.spec.ts into docs/visual/before and docs/visual/after. The suite checks 1366×768, 1440×900 and 1920×1080 dashboard widths and exercises real rendered scenes, saved synthetic assessments, instructor and unit workflows.

Actual untouched baseline: strict TypeScript/Vite build passed; 278 unit/component tests passed across 44 files (108.77 s); all original 26 browser journeys passed (4.4 minutes), zero retries. Before-capture browser check passed (56.5 s); dashboard at three desktop sizes, library, urban day, rural group, night fog and degraded scene PNGs were captured. Dashboard and urban screenshot were directly inspected: flat card grid, sparse scenery, tall box silhouettes and an underspecified horizon confirm the audit.

Baseline software-rendered single/crew cadence 37.5/60 frames/s, p95 33.4/16.8 ms, approximate heaps 15 MB; single pause UI 186.08 ms. Independent multiple contacts: 38.5 frames/s, p95 33.4 ms, heap 18 MB. Coordinated group: 60 frames/s, p95 16.8 ms, heap 12 MB. These are host-specific short SwiftShader animation-cadence samples. Legacy/qualified native restoration and analytics remain passing; no hardware guarantee follows.

Milestone A: original route/permission boundaries retained inside a grouped, collapsible navigation shell, context top bar, skip link, keyboard focus and shared graphite/teal tokens. Existing local user field name is name (a first typecheck caught an incorrect displayName mapping; corrected). Four existing role/learning component checks passed. Production build and focused browser check follow.

Milestone A gate: strict build passed (entry 453.76 KB / 129.90 KB gzip; unchanged 3D 836.75 KB); four role/learning component checks and the original local-unit/identity/scope/reload browser journey passed (9.9 s). No role service, route, simulation or scoring contract changed.

Milestone B replaces the flat card grid with an explicit training route, primary training/generator/assignment actions, scoped actual-history summaries, recent outcomes, a labeled synthetic-demo entry and grouped secondary workflows. Missing measurements remain unassessed. A first focused browser run passed responsive/keyboard/viewport checks but failed the original trainee-denial journey because the dashboard hid its restricted-editor entry. The entry is retained with an explicit instructor-access-required caption; role-sensitive sidebar hiding and existing permission denial remain intact. The actual new 1440px dashboard screenshot was directly inspected; hierarchy and contrast are visibly improved over the captured baseline. Rebuilt verification follows.

Milestone B gate: strict build passed (entry 458.82 KB); both focused browser journeys passed in 10.5 s without retries, including the unchanged original denied-editor assertion. Actual 1366/1440/1920 dashboard captures, keyboard skip link, collapse/expand navigation, no horizontal overflow and a >600×400 laptop viewport were verified. No analytics constants or new assessment logic were added.

Milestone C verification resumed on 20 October 2026 after the prior automatic approval review could not run a command because its usage limit was reached. No action was executed for that rejected call; the resumed reviewed browser command is now running normally. The preserved local scenery build passes strict TypeScript/Vite. Twenty-seven original group/motion/sensor checks passed before interruption, with no canonical engine/scorer edits.

The first scenery capture exposed excessive nearest-filter ground grain; linear filtering/mipmaps and an original lightweight vertex-colored sky gradient were added. Urban, rural and dense-fog screenshots were directly inspected. Dense fog intentionally remains strongly occluding under the original scenario's visibility settings; clear-night generation is captured separately rather than weakening that contract. Initial low-preset single/crew samples were 28.57/54.97 frames/s. After texture/sky refinement, the resumed sample is 33.18/52.17 frames/s, p95 66.6/33.4 ms, approximate JS heap 12 MB, pause UI 153.39 ms. These remain short SwiftShader host observations; preset optimization and final comparison continue in later milestones.

Milestone C gate: strict build and 27 focused canonical tests passed. Live simulator/crew browser benchmark passed; the final world screenshot journey passed (1.7 min). The first screenshot rerun exposed ambiguous select accessible names; explicit generator aria-labels fixed the production controls. Updated urban/rural and clear-night images were directly inspected; clear night retains silhouettes and sparse warm fixtures without changing fog. C changes are presentation-only.


Milestone D gate: strict build passed; three browser checks passed (1.6 min), including all preset caps, fixed-world reset, unchanged paused canonical clock and frozen cosmetic time. Directly inspected Balanced screenshot. Actual paused urban samples: Low 32 fps / 10,588 triangles, Balanced 7 / 17,272, High 6 / 19,832; each 22 draw calls, 22 geometries, 1/2/2 textures. Live low solo/crew: 25.44/57.6 fps, p95 66.7/16.8 ms, heap 14 MB, pause 239.15 ms. SwiftShader is fill/shadow limited; use Low on this host. These do not certify ordinary GPU performance. Aircraft LOD removes cosmetic parts only; broad silhouettes and original trainee projection stay intact.

Milestone E gate: strict build passed. Original synthetic-group and saved EvidenceMind guided-practice/reserved-evaluation journeys passed, including offline scoring and observation instrumentation. The desktop console test passed at 1366x768, 1440x900 and 1920x1080 (46.1 s), with viewport >600x400, no horizontal overflow and reachable submit controls. Actual console-1366.png was directly inspected: header stays compact, viewport dominates, and the decision pane scrolls independently. Existing stage identifiers and test selectors remain intact.

Milestone F gate: strict build passed; 36 focused unit/component checks passed (16.22 s); all six unchanged Module 5 offline browser journeys plus actual screenshot capture passed (7 tests, 3.2 min), without retries. Directly inspected after-action-review, evidence-mind-aar and curriculum-instructor PNGs: recorded scores precede qualified eligibility, six judgment dimensions are separately readable, and curriculum fields/steps have coherent spacing. Scoring, eligibility and candidate services are unchanged.

Milestone G gate: strict build passed. Seven institutional/demo/visual journeys passed; the unchanged commander denial journey initially failed because the dashboard hid its restricted analytics entry. Restoring that explicitly labeled entry leaves the sidebar and service authorization unchanged; rebuilt original regression passed (11.6 s, no retry). All original Module 4 and demo workflows have therefore passed on the institutional changes, including independent commitments, single-host takeover and atomic backup. Actual AAR, curriculum, unit and crew captures pass workspace/document overflow checks at all three requested desktop sizes. Directly inspected unit-intelligence and duo-active screenshots. Final QA will refine coverage-cell wrapping and keep participant identity beside decision fields.

## Final QA scope

The final run preserves all original 278 unit/component tests and 26 browser journeys, adding one deterministic demo-composition regression and four browser checks for actual screenshots, dashboard/keyboard navigation, graphics/pause/camera controls and three-size console access. Production strict build passed (entry 461.87 KB / 132.19 KB gzip; lazy 3D 845.53 KB / 228.95 KB gzip). The pre-existing >500 KB 3D chunk warning remains; no additional heavy dependency or downloaded asset was introduced.

Final QA corrected coverage cells that wrapped words into narrow fragments and retained the existing local table scroll. Participant name, role and channel now remain next to participant-local crew inputs. Camera buttons support keyboard activation. A first stronger camera test caught residual orbit damping after reset; flushing it before restoring the fixed pose passed the repeated check. Static shadow maps now avoid repeated identical caster rendering; the measured software-rendered preset cadence did not materially improve (Low 23, Balanced 7, High 6 fps in that repeat). No speedup is claimed.

Accessibility checks include keyboard skip navigation, visible focus, collapse/expand state, labeled orbit/zoom/reset, selected contact/confidence states, native details, text-backed heatmap statuses, SVG chart alternatives and label association checks on captured forms. This is practical browser verification, not a formal WCAG certification. Required desktop sizes are 1366x768, 1440x900 and 1920x1080; no phone or physical-device fleet qualification is claimed.

The first full unit gate found a pre-existing randomized demo comparison defect (277/278 passed): curriculum generation may add a degraded secondary source even when its primary is normal, while adaptive evaluation requests one normal channel. The existing qualification correctly excluded that cross-cohort comparison. Demo-only bounded seed preflight now chooses a genuinely matching existing-generator baseline before publication; no score, trajectory, generator, eligibility or comparison rule is changed. The deterministic regression uses a known degraded-secondary candidate and verifies both the fallback and unchanged original generator output. Original assertions remain intact.

## Milestone commit history

| Checkpoint | Commit |
| --- | --- |
| Original five-module foundation | 5f2da00 |
| A: shell, tokens and role-sensitive navigation | 3e2cc10 |
| B: contextual training dashboard | 3df5121 |
| C: authored urban/rural environments | cdf3c16 |
| D: aircraft, camera and graphics budgets | fd81200 |
| E: viewport-first console workflow | 8f79d51 |
| F: assessment and learning UI | 13fd1e1 |
| G: institutional, crew and unit UI | 4fd398a |
| Demo composition blocker found in full QA | 7e43cef |
| H: final evidence and documentation | Commit containing this report; exact SHA supplied in delivery message |

All listed overhaul checkpoints were pushed normally to origin/main. The final push is verified against the remote tip before delivery. Original local diagnostic files remain outside these commits.

Final full unit gate: all 279 tests passed across 45 files (65.65 s), including every original test plus the deterministic demo-cohort regression. The focused fix also passed thirty independently identified real demo installations and all seven original/new demo checks. Canonical engine/scorer/learning qualification and store diffs remain empty; the only core changes are the isolated demo preflight helper and its composition call.

## Screenshot index

All paths below refer to actual production-app PNGs under docs/visual/after, refreshed by browser QA. Baseline captures remain under docs/visual/before; intermediate world captures remain under docs/visual/world. Multi-size suffixes -1366 and -1920 accompany selected critical views; the corresponding unsuffixed critical-view capture is 1440x900. Quality-preset and manual close-view images use the browser test default 1280x720.

| View | Actual capture |
| --- | --- |
| Dashboard | [dashboard-1440.png](docs/visual/after/dashboard-1440.png) |
| Scenario library | [scenario-library.png](docs/visual/after/scenario-library.png) |
| Urban daylight | [urban-day.png](docs/visual/after/urban-day.png) |
| Rural daylight / coordinated group | [rural-day-group.png](docs/visual/after/rural-day-group.png) |
| Clear night | [night-clear.png](docs/visual/after/night-clear.png) |
| Original dense-fog night | [night-fog.png](docs/visual/after/night-fog.png) |
| Degraded sources | [degraded-observation.png](docs/visual/after/degraded-observation.png) |
| Active laptop console | [console-1366.png](docs/visual/after/console-1366.png) |
| Actual paused camera close view | [aircraft-close-view.png](docs/visual/after/aircraft-close-view.png) |
| Quality presets | [Low](docs/visual/after/quality-low.png), [Balanced](docs/visual/after/quality-medium.png), [High](docs/visual/after/quality-high.png) |
| Recorded AAR | [after-action-review.png](docs/visual/after/after-action-review.png) |
| Invalid saved draft | [assessguard.png](docs/visual/after/assessguard.png) |
| Actual AssessGuard console | [assessguard-console.png](docs/visual/after/assessguard-console.png) |
| CurriculumForge | [curriculum-instructor.png](docs/visual/after/curriculum-instructor.png) |
| EvidenceMind | [evidence-mind-aar.png](docs/visual/after/evidence-mind-aar.png) |
| Skill DNA | [skill-dna.png](docs/visual/after/skill-dna.png) |
| Adaptive learning | [adaptive-learning.png](docs/visual/after/adaptive-learning.png) |
| Learning progress | [learning-progress.png](docs/visual/after/learning-progress.png) |
| Live two-profile crew | [duo-active.png](docs/visual/after/duo-active.png) |
| Crew AAR | [duo-crew.png](docs/visual/after/duo-crew.png) |
| Unit Intelligence | [unit-intelligence.png](docs/visual/after/unit-intelligence.png) |
| Backup / settings / demo | [backup-transfer](docs/visual/after/backup-transfer.png), [settings](docs/visual/after/settings.png), [synthetic-demo](docs/visual/after/synthetic-demo.png) |

## Remaining limitations

The authored world and aircraft are deliberately stylized synthetic assets, not photoreal game-engine scenes or physical sensor models. Targets retain original distance/scale/ambiguity and may remain small or fog-obscured; camera controls do not auto-find them. High quality is expensive on SwiftShader, so Low is the practical measured-host choice. Static shadow caching reduced redundant work but did not establish an FPS gain. No physical GPU/laptop-fleet, mobile, screen-reader or formal contrast/WCAG certification is claimed. JS heap and render counters exclude total GPU/process memory. The existing large lazy Three.js chunk warning remains. Existing local-role security and lack of multi-client LAN mode are unchanged.

## Measured performance comparison

Host: Chromium 156 on Windows, ANGLE Vulkan SwiftShader software renderer, 8 reported logical cores. These are short requestAnimationFrame cadence samples during actual canvases, not a physical GPU benchmark or a certified display frame rate. They vary with host load. The separate final strict typecheck completed successfully during the full browser run; no build overwrote dist while tests ran.

| Scene, Low / reduced motion | Original baseline cadence | Final full-run cadence | Final p95 interval | Approximate final JS heap |
| --- | ---: | ---: | ---: | ---: |
| Single urban contact | 37.5 fps | 20.51 fps | 83.4 ms | 15 MB |
| Two-profile crew canvas | 60 fps | 55.82 fps | 16.8 ms | 15 MB |
| Independent multiple contacts | 38.5 fps | 22.15 fps | 83.4 ms | 20 MB |
| Coordinated group | 60 fps | 32 fps | 66.7 ms | 15 MB |

The authored scenery costs more than the original sparse world on this software renderer. This is a measured regression, not a claimed performance improvement. Low disables shadows/AA and caps DPR; choose it on the measured host. Earlier Low samples varied from about 23 to 33 fps for the urban view. Balanced/High software samples remain about 7/6 fps; ordinary GPU qualification is still outstanding. Static shadow caching does not remove the software cost of shaded pixels and did not establish a cadence gain. Final single pause UI response was 161.17 ms versus original 186.08 ms; short UI timings are not universal latency guarantees.

The original aggregation benchmark over 1,000 engine-scored sessions (10 trainees) recorded trials 3482.37 / 2075.14 / 2407.35 ms, median 2407.35 ms; approximate Node heap 43 to 131 MB and worker RSS 201 MB. Over 200 declared assessments including 40 group reports, median was 568.65 ms and worker RSS 231 MB. No analytics algorithm changed, and no causal speedup is inferred from run-to-run timing differences.

Native IndexedDB browser restoration: 200 legacy sessions validated in 1847 ms, restored in 300 ms, analytics navigation 1217 ms; 100 qualified sessions including 20 group histories validated in 703 ms, restored in 212 ms, analytics navigation 532 ms. Actual restored counts were checked. Timings include browser UI and remain synthetic-host observations.

Final preset sample in the full browser run: Low 22 fps, Balanced 7 fps, High 6 fps. The measured single-contact color pass used 22 draw calls, 10,588 / 17,272 / 19,832 triangles, 22 geometries and 1 / 2 / 2 textures respectively. These are actual scene samples, not a universal contact-count budget. The final close-view screenshot was directly inspected: manual fixed-world zoom shows the authored rotor silhouette and undercarriage; canonical clock remains paused and Reset returns to the original pose.

The full browser run passed all 29 functional/performance cases, then its new screenshot/form-label check found the original editor scenario selector and JSON textarea lacked associated accessible names. Production aria-labels were added; the check was retained. Screenshot inspection also identified rural track rectangles slanting against their centerline; the existing segment count now follows each segment tangent with a small overlap. The strict final rebuild passed. The affected original group/editor offline cases and the full visual/accessibility journey are rerun on that build. Initial full-run logs are retained alongside the final rerun; failures are not hidden.

Raw evidence: [final unit log](docs/visual/final-unit-tests.txt), [initial full browser log](docs/visual/initial-final-browser-tests.txt), [final affected-browser rerun](docs/visual/final-browser-tests.txt), and [extracted actual performance samples](docs/visual/performance-samples.json). The earlier unit failure is preserved in initial-final-unit-tests.txt.

## Final milestone H gate

Final affected-browser rerun: all four cases passed (2.8 min), without a retry, including the retained form-label assertion and all requested desktop overflow checks. Playwright last-run state is passed with an empty failedTests list. The 29 functional/performance cases had passed in the complete run; all 30 distinct browser cases are therefore verified, with the visual/editor regression repaired and rerun rather than omitted. The final unit suite passed 279/279 tests across 45 files. The final production strict TypeScript/Vite build passed. Raw PowerShell capture includes NativeCommandError records for the non-failing NO_COLOR/FORCE_COLOR stderr warnings; Playwright reports four passed and its persisted run status confirms success.

Direct inspection covered the final dashboard/library, urban daylight, corrected rural/group scene, degraded and dense-fog scenes, clear night, actual manual aircraft close view, AAR, AssessGuard console and invalid draft, CurriculumForge, EvidenceMind, Skill DNA, Adaptive Learning, Learning Progress, live crew identity/private/shared sections, crew AAR, Unit Intelligence, backup/transfer, settings and labeled demo. No fabricated imagery was used. The unit table keeps deliberate internal horizontal scrolling rather than shrinking statuses into unreadable fragments; document/workspace overflow checks passed at the requested desktop sizes.

All original tests and all five modules are retained. git diff against the foundation shows no changes in canonical simulation, generator, scoring, learning-qualification or store files; the sole core exception is the separately tested demo-composition repair. User-owned diagnostic files are left untouched and excluded from staging. Remaining qualifications and performance regressions are stated above.
