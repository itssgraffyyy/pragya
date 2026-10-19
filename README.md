# PRAGYA

Personalized Readiness & Adaptive Guidance for Aerial Threat Awareness is an offline-first desktop-browser training platform for synthetic contact recognition, evidence interpretation, uncertainty, communication and fictional instructor-approved response workflows.

## Run locally

```sh
npm ci
npm run build
npm run offline
```

Open **http://localhost:5173**. After the first successful load, Home reports offline-resource readiness. The launcher uses only Node built-ins and the already built `dist` directory. Prepared offline laptops need Node, `dist/` and `scripts/serve-offline.mjs` with their directory relationship; `node_modules` is unnecessary to serve the built application. Windows PowerShell users can use `npm.cmd` when script policy blocks `npm.ps1`.

Keep the same hostname, port and browser profile to access the same IndexedDB records. See [offline deployment and recovery](docs/OFFLINE_DEPLOYMENT.md).

## Training workflows

- **Assessment integrity:** Instructor Editor → AssessGuard test bench → exact-version review/publication; instrumented text observations → per-competency eligibility in AAR and Skill DNA. Historical scores remain intact. See [Module 5](MODULE_5.md) for contracts, validation and limits.
- **CurriculumForge:** scoped instructor gap review ? editable objective versions/prerequisites ? bounded original-generator candidates ? AssessGuard review ? immutable publication/assignment ? separate availability, coached and independent coverage.
- **EvidenceMind:** pre-decision synthetic observation references ? original rubric correctness plus separate evidence/uncertainty/reporting feedback ? explicit guided/independent/reserved-evaluation/follow-up stages ? qualified compatible progress. Practice is retained without entering independent Skill DNA.
- **Individual:** select a trainee → scripted or seeded scenario → submit classification/confidence/evidence/response → explainable assessment and recorded-event replay.
- **Personal learning:** Skill DNA and recurring patterns → evidence-based recommendation → tailored practice → unseen evaluation → comparable progress and refresher planning. Intelligence and coaching are deterministic offline rules, not a trained language model.
- **Crew:** two profiles → one authoritative scenario/clock → separate individual commitments → structured evidence sharing and acknowledgments → confirmed joint report → individual and crew AAR. One local tab holds control; a saved paused prefix supports takeover.
- **Instructor:** designated trainees/cohorts → original scenario editor and immutable policy versions → assignments → original outcomes, learning history and separately attributed feedback/follow-ups.
- **Unit:** authorized summaries → condition/policy-separated heatmaps and coverage → cohort/period filters → supporting AAR with additional instructor scope → aggregate JSON/CSV.
- **Synthetic demo:** Home → Synthetic Demo loads a separate labeled unit with a reviewed curriculum assignment, linked baseline/practice/reserved-evaluation history, group AAR, invalid-draft detection, supported-versus-unsupported judgment examples, and crew AAR; previewed reset preserves genuine records. See DEMO_GUIDE.md.
- **Recovery:** validated local backups and portable records → checksum/ownership/conflict checks → atomic restoration without clearing training records.

Create local units, identities, memberships, cohorts and instructor scopes in **Units & Identities**. An instructor needs explicit trainee scope; commander summary permission does not by itself expose raw decisions or replay. Unrestricted local demo is local-owner tooling.

## Verification

```sh
npm run build
npm test -- --maxWorkers=1 --minWorkers=1
npx playwright install chromium
npm run test:e2e
```

Browser tests serve the production build and real offline service worker. They exercise actual local persistence and scoring services. See [test and performance report](TEST_REPORT.md), [PS compliance](PS_COMPLIANCE.md), [architecture](ARCHITECTURE.md), [Module 5](MODULE_5.md), [research alignment](RESEARCH_ALIGNMENT.md), [Module 4](MODULE_4.md), [Module 3](MODULE_3.md) and [Module 2](docs/MODULE_2.md). Demonstration instructions are in [DEMO_GUIDE.md](DEMO_GUIDE.md).

## Explicit limits

Local identity selection is **not secure authentication**. A person with the browser/OS profile or developer tools can inspect or alter local records. Use separate OS/browser profiles and host filesystem protections for private local operation. Backups contain private records; SHA-256 is a corruption check, not encryption or a signature.

Duo Mode is single-laptop training. Closed-LAN synchronization, a packaged desktop executable and VR are not implemented. Bounded synthetic group formations support educational group awareness; validated physical swarm dynamics are not implemented. Synthetic sensors and internal simulator learning metrics are not validated real-world sensing or operational readiness measures. Reserved answer/evidence variants reduce recorded answer-family leakage; they do not certify human unfamiliarity. Missing reliable inputs and incompatible/sparse evaluations do not produce a new competency deficit or improvement claim. Hardware observations apply only to the tested host; consult TEST_REPORT.md before making broader claims.

## Product workspace and rendering

The application now has a grouped, collapsible workspace sidebar. Training contains the scenario library, generator, console and Duo crew; Assessment & learning contains saved AAR and personalized learning; Instruction contains curriculum/assignments and Editor/AssessGuard; Organization contains scoped unit intelligence and local identities. System contains the labeled synthetic demo, backup/transfer and settings. Existing Home buttons and route/service permission boundaries remain available, including explicitly restricted entries that show a denial when access is unavailable.

The new urban district and rural landscape are original offline procedural geometry. Contact models consume only the trainee projection. Camera orbit, zoom and reset are fixed-world presentation controls; cosmetic aircraft motion samples simulation time and freezes on pause. Settings offer Low, Balanced (the compatible persisted `medium` value) and High budgets. Choose Low for software rendering or constrained devices; see measured host results before choosing higher settings.

See [UI design](UI_UX_DESIGN.md), [rendering and asset provenance](VISUAL_RENDERING.md), and [actual visual/test evidence](VISUAL_QA_REPORT.md). Before/after application captures live in `docs/visual/`; none are mockups or generated images.
