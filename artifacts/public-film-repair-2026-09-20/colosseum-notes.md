# Colosseum repair — 2026-09-20

Spec 12 updated before implementation. Scoped role: construction/renderer repair;
root owns the integrated build, real browser captures, continuous playback and
publication decisions. No deployment, commit, asset deletion or external generation.

Implemented:

- A shared Hermite route includes the previously missing road-to-ellipse leg.
  Adjacent spans share tangents; heading follows travel and turns continuously
  into the quarry/staging orientations. The 12.1626 m discontinuity is gone.
- Actual wagon deck top is the payload bottom. Wheels are outside the deck/load
  footprint and each samples terrain at its own position, with its bottom at
  the road (the previous wheel bottom was 0.20 m underground).
- Crane station is fixed from operation data; mast and jib keep fixed lengths.
  The jib luffs/slews over the existing vertical-lift/traverse/lower path. A
  stationary timber platform and four ground-rooted legs carry both mast feet.
- Final scaffold strike removes complete fixed lifts down to ground in staggered
  station windows. The 60 fps regression bounds removal at four lifts total per
  frame and at most one per station, with no bulk drop at 98%.
- Sky fog blending now uses world elevation. The removed camera-space elevation
  made the sky blue at the world horizon even where terrain was fully fogged.
- All 366 insulae, 28 palaces, 441 pines and 132 cypress lots remain. Authored
  prototype shapes/materials remain the source. Runtime windows/course strips
  discard hidden faces; all five lobes of each authored umbrella-pine crown
  remain at lower subdivision. Prototype triangles: insula576→176,
  palace214→174, pine428→128, cypress108→108. Original GLB unchanged.
- Static Rome/foliage batches receive light/shadows but no longer cast remote
  shadows. Before rendering, CPU frustum tests compact only visible instances
  from immutable complete matrix/color arrays. Reverse seeks and resize restore
  exact matrices/colors. Async kit resources are disposed after flattening and
  on disposal-during-load.
- Terrain concentrates 64×64 cells near the valley/hills rather than using a
  uniform128×128 grid across a 4.4 km square. Capped six-sided scaffold posts
  become four-sided open posts (internal caps were invisible). Planar masonry
  boxes drop redundant subdivisions. Desktop arches use six curve segments.
- Portrait arches use four curve segments and seating six treads per wedge;
  every bay, complete bowl, part transform and bounding extent is retained.
  Desktop geometry is restored on resize. Portrait camera fits the projected
  ellipse to horizontal FOV; tests cover390×844 and320×844.

Integration: WorldScene must pass `this.pipeline.camera` as the fifth argument
of both ColosseumWorld.update calls; root acknowledged this edit. Without that
argument, the scene works but uses uncropped city batches and desktop stone
geometry. No shared pipeline changes are needed for the horizon repair.

Executed verification:

```sh
bunx vitest run tests/colosseum-repair.test.ts tests/colosseum-construction.test.ts tests/colosseum-world.test.ts --maxWorkers=2
```

3 files /30 tests passed, including8 new regressions. Actual instance vertices
establish wagon deck/wheel contact; actual mast/jib matrix scales establish
rigidity; platform/support bounds establish a ground load path. Internal route
waypoint tests include every new ellipse span. Deterministic city restoration,
portrait projected bounds and reversible geometry detail are covered.

CPU geometry inventory (not actual GPU submissions/FPS):

```sh
bun artifacts/public-film-repair-2026-09-20/colosseum-cpu-cost.ts
```

| View | t=.32 | t=.58 | t=.86 | t=1 |
|---|---:|---:|---:|---:|
| Desktop1.6 aspect |120,364|156,822|187,266|152,166|
| Portrait390/844 |103,050|139,058|125,784|88,464|

These totals include every shadow caster before light-frustum culling; actual
renderCosts must be checked by root. They exclude postprocessing full-screen
triangles. Audited published t=.86 was1,166,258 desktop/1,166,221 portrait; the
new CPU inventory is a conservative estimate, not an apples-to-apples GPU
measurement. Strict180k/120k targets are not declared met from this probe.

Remaining acceptance work: root desktop/portrait screenshots, exact horizon
transition, silhouette quality of simplified distant prototypes, continuous
wagon/crane/98% strike playback, measured GPU submissions/frame time, audio,
and integrated test/typecheck/build. This scoped pass does not certify the
historical capacity of the compressed Roman crane kit, every structure/traffic
occupancy pair, or physical-phone performance. A dedicated crane close-up has
not been newly authored; root should judge mechanism readability after the
rig and UI fixes in the retained wide film.

Graphics references read: project threejs-aaa-graphics-builder SKILL.md,
implementation-blueprint.md, technical-art.md, render-recipes.md,
model-recipes.md, shader-cookbook.md and performance-safe-visual-detail.md.
Asset sourcing: reuse/optimize the existing authored Rome kit. External asset
generation was outside the authorized scoped repair; no provider called.

## Final shadow-budget follow-up (supersedes earlier cost table)

Root's real portrait .86 render measured125,787 triangles before this follow-up,
matching the earlier125,784 CPU estimate plus three postprocessing triangles.
Root visually accepted horizon and framing. The final changes below preserve
all main-pass bowl and arch geometry from that accepted frame.

- Every visible fixed scaffold lift remains. Eighty continuous corner columns
  replace up to1,280 individual timber segments in the shadow pass. Their main
  material disables color/depth writes; its640 main triangles are explicitly
  counted, as are its640 shadow triangles. This uses no camera layer trick:
  Three.js shadow traversal tests main-camera layers too.
- Inner ambulacrum arches remain visible and receive light/shadows, in a
  separate main batch. Exterior arches and active lifts cast shadows; inner
  arches no longer duplicate the surrounding facade/vault shadow geometry.
- Crew torso shadows preserve worker contact. Arms/legs do not cast extra
  shadows at either overview size; portrait also omits head and wagon-wheel
  shadows. Portrait mixing tubs, timber-yard stocks and the remote aqueduct
  omit additional shadow submissions. All corresponding visible geometry is
  retained. Main scene proportions and camera remain unchanged.

Final focused verification after code freeze:3 files /31 tests passed.
`colosseum-repair.test.ts` now includes a complete visible-arch-count contract,
proxy ground contact and budget checks at audit checkpoints plus discovered
peak times. Root runs the final integrated typecheck/full suite/build.

Reproduce attribution and complete60 fps CPU sampling:

```sh
bun artifacts/public-film-repair-2026-09-20/colosseum-cpu-cost.ts --details
bun artifacts/public-film-repair-2026-09-20/colosseum-cpu-cost.ts --sweep-60fps
```

3,601 samples per view,7,202 total, over the full60-second film:

| View | Maximum modeled scene submissions | t |
|---|---:|---:|
| Desktop1440×900 |178,198|0.8377777777777777|
| Portrait390×844 |119,856|0.6186111111111111|

These include all shadow casters and the proxy's main draw, before light
frustum culling; they exclude full-screen postprocessing triangles. They are
CPU geometry accounting, not GPU frame time, FPS, or physical-device results.
Root must confirm new actual submissions and shadow appearance in the build.
