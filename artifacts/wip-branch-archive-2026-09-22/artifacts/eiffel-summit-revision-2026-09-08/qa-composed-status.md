# Composed V3 summit/sky production QA — 2026-09-08

Final actual production5589 bundle: main-3-ssOnL1.js, SHA
8ac40a36890c04f703cd5f7377642efbfb11fac2aa62ef00da58857bbbf41c13.
Both desktop1440×900 and mobile390×844(DPR1.35) ran101full-film seeks plus9hoist
poses, actual Space playback, reverse116→124→116, and completed summit captures.
Actual native slider values and sampled camera diagnostics are retained.

Desktop PASS:348763peak triangles,166peak calls (limits450000/200).
Mobile PASS:295502peak triangles,149peak calls (limits300000/150).

Both modes: zero console/browser errors, no horizontal overflow, actual Space
advances from.750to.752, reverse scene crop pixel-identical. Served production
bundle and Paris city/receiver/steam-drive/tower-pieces/tower-seated/manifest
hashes match local unchanged bytes. Reports include all hash identity details.

Completed summit desktop/mobile and mobile124s hoist captures were visually
inspected: the revised summit gallery/lantern silhouette is present; no obvious
deck gap or pop in sampled frames. Tower cross-bracing still partly occludes
landing machinery. Production exposes no user zoom/orbit camera, so a closer
user-camera capture is unavailable and was not simulated as a user action.

The failed V2 mobile budget and its source/assets/reports remain preserved in
candidate-v2. V3 uses parent-authored coalesced straight floor strips; no city,
scene-camera or renderer budget relaxation was introduced for this rerun.
These are sampled browser/rendering gates, not proof that all construction
handling omissions or city flicker are resolved.
