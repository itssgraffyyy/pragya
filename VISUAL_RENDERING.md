# PRAGYA visual rendering

The renderer remains a presentation layer over the original engine's trainee projection. No source change to canonical timing, trajectories, observation availability, policy, answer keys or scoring is needed for this overhaul.

## Original assets and provenance

All new scenery, contact geometry, procedural surface noise, symbols and layouts are authored in this repository. No game asset, proprietary map, external texture, web font, CDN, image-generation output or downloaded model is used. Three.js/R3F/drei remain existing dependencies under their existing package licenses. System fonts use the host installation. The named game references supplied by the user inform craft and information hierarchy only; no claim of equivalent rendering fidelity is made.

## World assets

UrbanDistrict composes an authored street grid with varied low/mid-rise plots, pitched/flat roofs, roof plant, instanced windows/sills, footpaths, markings, poles, restrained parked civilian props and planted setbacks. The central observation corridor remains open rather than introducing foreground high-rise clutter. RuralLandscape uses field parcels, a winding dirt track, fences, small pitched-roof structures, broadleaf stands and sparse shrubs. Terrain has distant undulation and a locally generated 128px repeating surface texture. The two environments have distinct geometry, layout and material identities.

WorldBatch shares one geometry/material/draw call per instanced decorative family. Low quality removes secondary decorative detail and disables shadows; medium/high retain controlled directional shadows. Night uses a separate environmental lighting palette and sparse emissive fixture/window surfaces, not a screen-darkening overlay. Existing visibility fog densities and reduced-contrast multiplier are preserved. Rain remains conditional on the scenario's existing weather value with a bounded deterministic particle count. No expensive post-processing chain is introduced; ACES tone mapping and linear-light material rendering provide the base presentation.

Canvas ownership, model/camera behavior, measured budgets and screenshot findings are documented further as milestones complete in VISUAL_QA_REPORT.md. Synthetic visual plausibility is distinct from physical sensor fidelity or empirical educational validity.

## Aircraft, camera and quality budgets
Contact root pose, scale, broad category and visibility come exclusively from TraineeView. Original modular rotor bodies/arms/hubs/blades, landing feet, fixed wings/tail and bird outlines replace placeholder geometry. Indistinct descriptors stay indistinct. Beyond 110 world units, and on Low, only cosmetic undercarriage/canopy parts disappear; silhouette, contact availability and classification rules remain identical. Rotor, wing and navigation-light phases use the supplied simTime, so pause freezes them. Reduced motion holds rotor/wing phases still. There is no second simulation clock, inferred target truth, auto-tracking, aim assistance or trajectory interpolation.

Camera starts at [16,48,115], looking at [0,22,-65], 52° FOV; orbit is bounded above terrain, zoom 20–320, and Reset view returns to this fixed-world pose. Solo and crew share the same SimScene DPR cap. Low: .6 maximum DPR, 16-segment terrain, no shadows, 220 rain points, secondary decorations omitted. Balanced (persisted medium): 1.25 DPR, 32 terrain segments, 1024 shadow map, 450 rain points. High: 1.75 DPR, 48 segments, 2048 shadow map, 600 rain points. User render scale can reduce these maxima. Canonical atmosphere and visible contact silhouettes do not vary with quality. Canvas data attributes expose actual renderer counters/camera/cosmetic-time for browser QA, without extra timers or telemetry.

## Shadow cost and accessible camera controls

The final QA optimization caches each directional shadow map after the static scenery is drawn. Only authored scenery casts shadows; animated contacts have no shadow caster. Environment, preset or time-of-day changes remount the light and request a fresh map. Camera orbit does not invalidate a fixed-world directional shadow map. This avoids redrawing identical caster geometry every frame while preserving the chosen shadow resolution and world lighting. Final measurements are recorded in the QA report; higher-preset software rendering remains a limitation regardless of optimization.

Labeled orbit-left/right and zoom-in/out buttons complement drag/wheel, allowing keyboard activation. Reset flushes residual damping before restoring the fixed world pose. None of these controls reads target positions or selects an assessment answer. Renderer counters report the current color pass (shadow work is not included in that draw-call counter); JS heap is not total process/GPU memory.
