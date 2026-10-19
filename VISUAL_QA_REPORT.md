# Visual overhaul QA report

Starting source checkpoint: 5f2da00, main. Existing diagnostics are preserved. This report records actual checks, including intermediate failures, and does not treat a build as visual verification.

Baseline build/unit/browser and screenshot runs are in progress. No new visual milestone is yet claimed verified. Screenshots are captured from the actual production application by src/tests/e2e/visual.spec.ts into docs/visual/before and docs/visual/after. The suite checks 1366×768, 1440×900 and 1920×1080 dashboard widths and exercises real rendered scenes, saved synthetic assessments, instructor and unit workflows.

Actual untouched baseline: strict TypeScript/Vite build passed; 278 unit/component tests passed across 44 files (108.77 s); all original 26 browser journeys passed (4.4 minutes), zero retries. Before-capture browser check passed (56.5 s); dashboard at three desktop sizes, library, urban day, rural group, night fog and degraded scene PNGs were captured. Dashboard and urban screenshot were directly inspected: flat card grid, sparse scenery, tall box silhouettes and an underspecified horizon confirm the audit.

Baseline software-rendered single/crew cadence 37.5/60 frames/s, p95 33.4/16.8 ms, approximate heaps 15 MB; single pause UI 186.08 ms. Independent multiple contacts: 38.5 frames/s, p95 33.4 ms, heap 18 MB. Coordinated group: 60 frames/s, p95 16.8 ms, heap 12 MB. These are host-specific short SwiftShader animation-cadence samples. Legacy/qualified native restoration and analytics remain passing; no hardware guarantee follows.

Milestone A: original route/permission boundaries retained inside a grouped, collapsible navigation shell, context top bar, skip link, keyboard focus and shared graphite/teal tokens. Existing local user field name is name (a first typecheck caught an incorrect displayName mapping; corrected). Four existing role/learning component checks passed. Production build and focused browser check follow.

Milestone A gate: strict build passed (entry 453.76 KB / 129.90 KB gzip; unchanged 3D 836.75 KB); four role/learning component checks and the original local-unit/identity/scope/reload browser journey passed (9.9 s). No role service, route, simulation or scoring contract changed.
