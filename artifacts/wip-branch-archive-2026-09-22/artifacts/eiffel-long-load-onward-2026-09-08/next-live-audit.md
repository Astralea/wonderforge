# Next live construction defect (read-only, 2026-09-08)

The current `summit-crown-m072-c002` (stage63) is a4.6667 m mast segment.
Manifest final extent307.333–312 m, production start0.8995834287321787/end.9.
In the551-second film this becomes544.9750057–545.0000000 seconds (24.994 ms).
It is queued/hidden before start (`EiffelWorld.ts:54–63`), then begins at the
301.6600 m pickup (`eiffelProductionConstruction.ts:267–274,393–401`) and moves
6.47 m laterally plus~8 m upward in less than two60Hz frames (`:411–452`).
Its elevated receiving/support gear exists only while staged (`:454–490`).
Ordinary-wave division causes the compressed times (`eiffelConstructionTiming.ts:74–95`).

The smallest honest interim change would use an explicit summit-prefetch
omission and a readable stage63 clock. It would still omit the ground/summit
relay; do not claim otherwise. A connected replacement needs current-V3 stock
and receiver geometry plus the first-floor, second-floor and197 m relay chain.
This audit made no code/model changes. Consult current files before implementing.

## Next Paris readability and shimmer candidates

Most foreground people are permanently low detail by actor index
(`src/data/eiffelTraffic.ts:139`). `EiffelEnvironment.ts:763` represents them as
cone/octahedron; updates at924 only translate/yaw with no articulated gait.
A bounded existing-actor pool promoted by projected size could improve nearby
human readability without increasing population or changing routes. Verify
tracked actors, gait/support and the unchanged mobile300k/150 budget.

Palace glazing crossbars14–22 cm (`scripts/paris_exposition_geometry.py:69`) and
explicit vault ribs (`:155`) are plausible subpixel edge shimmer sources.
Facade textures already use trilinear mipmaps/anisotropy8 (`eiffelParis.ts:290`).
Freeze clocks and compare small matched orbits with flat diffuse shading before
authoring a filtered distant representation. This is a source-grounded
hypothesis, not a new live reproduction or evidence of glass/water z-fighting.
The prior warmed reflection-quadrature experiment remains rejected.
