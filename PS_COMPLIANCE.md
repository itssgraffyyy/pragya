# Problem statement compliance and differentiator validation

Status describes verified evidence, not a completion percentage. Results apply to synthetic training and the tested local environment. Final command counts and measurements are in TEST_REPORT.md.

## Mandatory problem statement matrix

| Requirement | Status | Implementation / evidence | Limits |
|---|---|---|---|
| Desktop or VR-capable simulator | Verified desktop | `src/render/SimScene.tsx`, `src/core/sim/engine.ts`; original browser user journey; offline launcher test | Browser desktop application. VR and native packaged executable are not implemented. |
| Single-contact and synthetic group/swarm awareness | Verified bounded educational group awareness | Existing single/multiple contacts plus `src/core/scenario/bundled/scenariosGroup.ts`, `src/core/groups`, original engine and canonical scorer; `groups.test.ts`, Module 5 offline browser journey | Bounded educational cluster/line changes and ambiguous relationships, with recorded per-contact/group reports. Not validated real swarm physics or tactical coordination. |
| Day/night, urban/rural, degraded observations and ambiguity | Verified synthetic variations | Bundled scenarios, scenario schema/generator, sensor degradation; `schema-validation`, `sensor-degradation`, `motion-lifecycle`, `generator` tests; visual/sensor crew projections | Synthetic shapes/feeds; no physical sensor fidelity or field validation is claimed. |
| Scripted and procedural authoring with deterministic seeds | Verified | Existing editor extended with drafts/publication/version protection/import/export; original generator; `instructor`, `publication`, `generator`, `adaptive` tests and assignment browser journey | Exact ambiguity/intensity controls not supported by the original generator remain disclosed. |
| Decision-tree scoring of timing/classification/approved response decisions | Verified technical workflow | Existing Module 2 policy schema/scorer, nested rules, evidence/calibration, immutable snapshots; scoring/assessment/instructor integration tests | Bundled policies are illustrative fictional training. Institutional approval is supplied by the training owner. |
| Individual/unit AAR, crew review and repeated-session tracking | Verified | Existing assessment/replay, longitudinal AAR, separate notes, crew communication review, unit heatmaps/coverage; `aar`, `crew`, `unit-analytics` and browser workflows | Event replay, not recorded video. Incompatible or missing policy snapshots do not establish equivalence. |
| Adjustable difficulty/randomization and unseen exercises | Verified | Existing difficulty service, seeded generator and adaptive adapter; difficulty/generator/adaptive tests and complete learning-loop browser journey | Deterministic rules, not a trained AI model. Unsupported generator controls are reported. |
| Minimal specialized hardware and offline use | Partial hardware qualification; offline verified | Local built resources, loopback launcher, production service worker, all offline workflows, persistence/backup checks | Measurements cover the available host. Integrated-GPU/low-end fleet qualification and physical VR testing are not supplied. |

## Five differentiators

| Capability | Source / UI entry | Data and validation | Demonstration and limitation |
|---|---|---|---|
| Skill DNA and blind spots | `src/core/learning/skillDNA.ts`, `longitudinal.ts`, existing blind-spot detector; Skill DNA / Instructor review | Saved assessable results, exact source IDs, compatible policy/condition cohorts, recency/sample thresholds; skillDNA/longitudinal/blindSpots tests and weakness-based browser journey | Open a measured profile and its supporting assessments. Sparse patterns stay provisional; these are training observations, not psychological diagnoses. |
| Sensor trust and confidence calibration | Original sensor degradation, evidence evaluator and calibration scorer; simulation / assessment | Synthetic degraded/conflicting conditions, recorded confidence and evidence; sensor-degradation/scoring/assessment/crew tests | Review the degraded/conflicting scenario and confidence feedback. No real sensor measurements or physics validation are fabricated. |
| Adaptive training | Existing recommendation/adapter/progress services; Adaptive Training / Learning Progress | Actual assessment → measured gap → original generator → fresh-seed practice/evaluation → comparable result; adaptive/integration tests and closed-loop browser journey | Show the recorded before/practice/evaluation comparison. Rules-based personalization is labeled; changed conditions yield no improvement percentage. |
| Explainable decision replay | Existing `src/core/scoring/replay.ts`, AAR extensions; session review | Actual event prefix, evidence, policy/rule references and separate annotations; assessment/aar tests and browser AAR | Move the event slider and open the applied rule. Missing history is labeled; replay is not historical video. |
| Duo Crew Intelligence | `src/core/crew`, CrewScreen, crew AAR and local host lease | Two profiles, one original engine/clock, private commitments, explicit shared messages, individual/joint assessments and separate crew metrics; crew/aar tests and offline/two-tab browser journeys | Share observations, flag/acknowledge uncertainty, confirm a report, compare individual and crew results. Single-laptop mode only; LAN synchronization and secure authentication are not claimed. |

These are implemented product capabilities. Comparative market novelty or market-first status has not been established.

## Remaining qualification work

Validated physical swarm dynamics, VR, authenticated multi-user deployment, closed-LAN synchronization and native packaging are outside the delivered runtime. Broader physical hardware qualification and institution-specific content approval are required before making those claims. The source/test evidence above remains available regardless of these limits.

The labeled synthetic walkthrough is implemented in `src/core/demo` and Home → Synthetic Demo, with actual calculated histories and a production offline browser journey (`src/tests/e2e/demo.spec.ts`). DEMO_GUIDE.md gives the five-minute sequence for all five differentiators and explains why coordination, recognition accuracy and measured improvement must be interpreted separately.
