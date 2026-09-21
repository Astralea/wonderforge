# Composed V2 summit/sky production QA — 2026-09-08

Tested actual production5589 with main-CjCxQsss.js, SHA
5afb2415f2b6d5330df792ff1c8362be5d957fa9f9841217df5c750f60787c4c.
Both desktop1440×900 and mobile390×844(DPR1.35) ran101full-film seeks plus9hoist
poses, actual Space playback, reverse116→124→116, and completed summit captures.
Actual native slider values and sampled camera diagnostics are retained.

Desktop passes:356305peak triangles,166peak calls (limits450000/200).
Mobile fails triangle budget:302595at t=.98 and302474at t=1 (limit300000).
Mobile149peak calls passes150limit; all9hoist poses remain≤296559triangles.

Both modes: zero console/browser errors, no horizontal overflow, actual Space
advances, reverse scene crop pixel-identical. Served production bundle and
Paris city/receiver/steam-drive/tower-pieces/tower-seated/manifest hashes match
local unchanged bytes. Reports include hash identity details.

Completed summit desktop/mobile and mobile124s hoist captures were visually
inspected: new summit gallery/lantern silhouette is present; no obvious hole or
pop in sampled frames. Tower cross-bracing still partly occludes landing
machinery. Production exposes no user zoom/orbit camera, so a closer user-camera
capture is unavailable and was not simulated as a user action.

Do not mark the composed mobile gate green until the triangle budget is fixed
and actual production verification is rerun. This report predates any subsequent
budget correction; retain both attempts.
