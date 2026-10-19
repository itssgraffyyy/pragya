# PRAGYA visual rendering

The renderer remains a presentation layer over the original engine's trainee projection. No source change to canonical timing, trajectories, observation availability, policy, answer keys or scoring is needed for this overhaul.

## Original assets and provenance

All new scenery, contact geometry, procedural surface noise, symbols and layouts are authored in this repository. No game asset, proprietary map, external texture, web font, CDN, image-generation output or downloaded model is used. Three.js/R3F/drei remain existing dependencies under their existing package licenses. System fonts use the host installation. The named game references supplied by the user inform craft and information hierarchy only; no claim of equivalent rendering fidelity is made.

## World assets

UrbanDistrict composes an authored street grid with varied low/mid-rise plots, pitched/flat roofs, roof plant, instanced windows/sills, footpaths, markings, poles, restrained parked civilian props and planted setbacks. The central observation corridor remains open rather than introducing foreground high-rise clutter. RuralLandscape uses field parcels, a winding dirt track, fences, small pitched-roof structures, broadleaf stands and sparse shrubs. Terrain has distant undulation and a locally generated 128px repeating surface texture. The two environments have distinct geometry, layout and material identities.

WorldBatch shares one geometry/material/draw call per instanced decorative family. Low quality removes secondary decorative detail and disables shadows; medium/high retain controlled directional shadows. Night uses a separate environmental lighting palette and sparse emissive fixture/window surfaces, not a screen-darkening overlay. Existing visibility fog densities and reduced-contrast multiplier are preserved. Rain remains conditional on the scenario's existing weather value with a bounded deterministic particle count. No expensive post-processing chain is introduced; ACES tone mapping and linear-light material rendering provide the base presentation.

Canvas ownership, model/camera behavior, measured budgets and screenshot findings are documented further as milestones complete in VISUAL_QA_REPORT.md. Synthetic visual plausibility is distinct from physical sensor fidelity or empirical educational validity.
