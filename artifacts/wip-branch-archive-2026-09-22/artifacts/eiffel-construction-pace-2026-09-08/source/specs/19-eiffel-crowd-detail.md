# Eiffel camera-selected pedestrian detail

Replace permanent actor-index detail assignments with a stateless, deterministic
selection from the existing Blender-authored man and woman prototypes. Routes,
actor identities, timing, human scale and transformed sole contact stay unchanged.

Keep exactly the previous detailed slot count separately for each pedestrian
kind; keep the previous silhouette slot count too. Visible actors at least 12 CSS pixels tall rank first; actors outside the
frustum fill remaining slots before unresolved visible people. Within each
priority, larger projected height ranks first with stable actor-ID ties.
This threshold reserves articulation for readable nearby people. This preserves the complete prior geometry allocation and draw cohorts.
Per-instance frustum culling remains active; whole-batch cached bounds are disabled
because reassigned slots travel outside their initial allocation.
Every actor occupies exactly one representation, including during reverse seek
and paused user orbit. No history, hysteresis, crossfade or scaling hides LOD
transitions. Silhouette colors bind to actor identity rather than reassigned slots.
Before the camera is supplied, retain the original assignment.

The renderer receives the final PerspectiveCamera through setCrowdCamera(camera, viewportCssHeight) after
camera controls and before rendering. Pure selection takes numeric projection
scores only. Vehicles, boats, source GLBs and other wonders are unchanged.

Tests must establish frustum priority, nearest projected detail, stable ties,
fixed kind capacities, exact complement, reverse determinism, actual renderer
slot ownership/contact and unchanged allocated triangle cost. Desktop/mobile GPU
QA must inspect a previously low-detail near walker, a paused approach and reverse
seek, plus full-scene limits of 450k/200 desktop and 300k/150 mobile. A source/test
pass alone does not establish improved legibility or whole-scene GPU compliance.
