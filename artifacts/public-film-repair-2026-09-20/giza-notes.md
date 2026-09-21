# Giza repair evidence — 2026-09-20

Implementation delegate: scoped Giza construction, renderer ownership and camera.
No server/browser was started by this delegate, no deployment/commit/publication.

## Changes

- Spec 02/08 first: a compacted continuous incline and level foot/crest landings
  replace the incompatible tall stair top as the actual haul surface.
- `GizaRampSurface` binds the five routes to typed course transition times and
  support heights. `gizaRampSupport.ts` provides the pure profile, rigid sled
  bearing solve and pitched local offsets. The renderer uses those same knots
  to build actual earthen triangles. Ramp footprint keep-outs derive from the
  profile endpoints, including the lead crew's crest landing. Landing lengths
  remain fixed in metres on long routes; five geometry instances replace the
  original single shared shape to preserve those physical landing lengths.
- Course scheduling reserves each course's delivery tail within its existing
  weighted time window. The next course begins after that tail is seated;
  the ramp changes height before its first ascent. This is necessary to avoid
  two simultaneous loads demanding different heights from one ramp. Overall
  film duration and monument time windows remain; individual delivery times
  are adjusted.
- Stone, deck and runners now share rigid YXZ pitch and unit structural scale.
  Both runner ends bear on the linear incline. At the convex crest a rigid
  runner rocks over its middle bearing: it does not bury the middle in order
  to force both ends down. This distinction is checked against rendered
  triangles rather than against the engine's own height equation.
- Every worker foot and the rope's lead-hand height sample its own horizontal
  position. Other operation legs also sample their own route position.
- Terminal haul routes are also repaired: short Khufu-south/Khafre-south ramps
  stop after courses 9/7, respectively. Higher loads use extended eastern and
  western approaches. Menkaure's legacy `menkaure-south` route ID now follows a
  western incline, with its supply approach passing around x=-143 outside
  Khafre's earthwork. The block schedule is unchanged by this route correction.
  Final ramp feet: Khufu east [111,-1], Khafre west [-133,-33], Menkaure [-117,-60].
- Actual final inclined triangle angles: Khufu south **13.04°**, Khufu east
  **14.56°**, Khafre south **13.70°**, Khafre west **14.62°**, Menkaure **14.22°**.
  All satisfy the <=15° gate. Short southern ramps strike after their own last
  load rather than following the monument's later high-course construction.
- Visible roads now follow all five typed quarry/dressing/queue/foot routes.
  Their embankments and raised-plateau ramp foundations reach the actual ground
  plane. The low plateau foundations remain after the temporary incline is
  struck; they are permanent prepared ground, not floating surfaces.
- Khafre-west width narrows from 10 to 6 units and Menkaure's approach width is
  6 units. Ramp keep-outs continue to preserve existing dust-lane clearance.
- `BlockSystem` caches core state by active course and ready-cell prefix;
  completed or unchanged core frames do not upload matrices/colors. The
  renderer caches unchanged ramp profiles too.
- BlockSystem, WorkerSystem and GizaEnvironment explicitly dispose every
  scene-owned InstancedMesh. Shared material ownership remains with the
  existing material library.
- Cinematic south-haul view eases in over `.08–.14`, holds through `.24`, and
  eases out by `.30`. Its radius is 64% of the prior operation radius, with
  target on the ramp. Later monument handoffs and ensemble reveal are intact.

## Verification executed

```
bunx vitest run tests/construction.test.ts tests/giza-camera.test.ts tests/giza-ramp-contact.test.ts tests/giza-world.test.ts tests/giza-pyramid-solidity.test.ts tests/site-clearance.test.ts tests/giza-environment.test.ts tests/giza-foreground.test.ts tests/giza-campfires.test.ts tests/giza-river.test.ts --maxWorkers=2
```

Result: **10 files / 104 tests passed** (latest run 16:10 JST).

The new renderer test covers five routes × three course heights × nine climb
positions × forward/reverse = **270 rendered operation samples**. It raycasts
101 points along each actual runner, checks no penetration >0.003, and requires
an actual bearing within 0.03; at the middle incline both end contacts must be
within 0.03. It also checks each actual cylinder-leg foot, actual stone/deck
matrix contact, non-overlapping course delivery tails, core upload versions,
reverse restoration, and instance-owner disposal events. Three further tests
check actual terminal triangle slopes, 510 sampled operation frames along
approach corridors against other occupied rendered earthworks, and actual
foundation/road geometry bottoms against the plateau datum.

Camera tests project the haul surface endpoints through the actual camera on
desktop and 390×844 aspect ratios; radius/target continuity and existing reveal
frustum tests pass. This is CPU projection evidence, not a browser screenshot.

`bunx tsc --noEmit -p tsconfig.app.json` **passed** after the terminal-route
correction (16:09 JST). Root owns the final combined check.

Root owns full-suite/typecheck/build and browser QA.

## Useful browser checkpoints

- Audited block `khufu-c41-s0-b00` raised midpoint is now
  **t = 0.5000923496918069**. It now uses the gentle eastern ramp; its
  rigid ground-origin Y is 11.7142857143 and the stone pitches with the surface. The old t=.5002578037435307 now samples
  this course's alignment/seating tail. Capture both wall-time and operation
  checks rather than assuming the old phase still applies.
- `.14`, `.20`, `.24`: closer south-ramp/haul composition.
- `.8444`: first Menkaure operation begins; its new western supply approach
  must leave the still-striking Khafre-west earthwork clear.
- `.94`, `.96`, `1`: original ensemble reveal.

The old audit probe compares `state.groundY` under the stone's origin X/Z.
Its old single-mesh lookup must also become recursive, because each ramp owns
its geometry with fixed-length landings. Origin sampling is no longer a valid
pitched-sled contact measurement: the stone center
is offset along the surface normal. Use the actual runner matrices or the new
renderer contact test to measure support.

## Remaining limits

- Return traffic/parking remains a separate, previously audited secondary
  site-life improvement; this repair does not introduce that new delivery
  return graph. The terminal slope defect is resolved, not deferred.
- Existing crest-to-seat alignment/cribbing remains the prior authored system;
  this pass verifies actual incline, feet, and stone/deck contact, not a new
  complete physical simulation or exhaustive masonry occupancy proof.
- No browser/GPU, sustained frame-rate, audio, or physical-phone claim is made
  by this delegate. Root performs desktop/portrait review before final report.

## Files changed

- specs/02-animation-engine.md
- specs/08-scene-realism.md
- src/data/constructionTypes.ts
- src/data/gizaConstruction.ts
- src/engine/construction.ts
- src/engine/gizaRampSupport.ts (new)
- src/engine/gizaCamera.ts
- src/render/three/BlockSystem.ts
- src/render/three/Environment.ts
- src/render/three/WorkerSystem.ts
- tests/construction.test.ts
- tests/giza-camera.test.ts
- tests/giza-ramp-contact.test.ts (new)
