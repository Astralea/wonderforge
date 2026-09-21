# Stonehenge repair — 2026-09-20

Scope: source and CPU Three.js object verification. No server, browser, full build,
commit or deployment was run by this repair worker.

## Implemented

- The upright centre is derived from the same YXZ rigid pose that transforms its
  local butt into the authored heel. The rope starts at the transformed local
  head. Horizontal approach uses the same roll side as its subsequent raise.
- Authored XZ angles now convert to Three.js yaw with the correct sign. This
  repairs the final bearing direction of all five trilithon and 30 outer lintels.
  Their worked undersides stay flat while their top/edge weathering remains.
- Cribs grow from turf as fixed 0.16 m timber courses; no 22-course cap can move
  their bottom into the air. The narrow footprint fits between the upright pair
  and spans the entire 1.15 m guided traverse. Fixed guide rails remain on the
  grounded stack through final settle. Fixed-length timber levering bars rotate
  about those rails to carry the continuous height between timber courses.
- Guide/crib/lever support stays present until joint contact. Added lever instance
  buffers are disposed with the existing work system. Crew feet now sample their
  own terrain positions.
- Early upright/first lintel shots receive 78–82 m desktop holds instead of the
  original 100 m early hold. The existing solstice camera axis and reveal remain.
- Sarsen/bluestone diffuse midtones are brighter while retaining rough materials
  and the existing procedural recipes. No extra light, emissive, post pass or
  texture was added.
- Far shrubs and tree crowns retain instance counts and silhouettes at lower
  geometric detail; distant vegetation no longer submits shadow geometry. Site,
  terrain, grass, stones, crews, mechanisms and solstice long shadows remain.

## Verification

`bun x vitest run tests/stonehenge-rendered-support.test.ts tests/stonehenge-construction.test.ts tests/stonehenge-world.test.ts --maxWorkers=2`

Result: 3 files / 29 tests passed. Before implementation, the new rigid-pose and
bearing tests failed (butt/heel residual 8.069 m; central lintel ray missed its
support outright).

New tests inspect actual renderer instance matrices and geometry:

- Every upright at four raise samples: transformed butt/heel and rope/head
  residuals under 0.00001 m.
- Every lintel at nine lift/traverse/settle samples: first layer meets turf,
  successive layers touch, guide bottoms meet the top course, fixed timber
  dimensions persist, and actual lever tops reach the soffit within 3 cm.
- Rays fired up from both upright heads hit the actual worked lintel underside
  within 3 cm for all 35 lintels.
- 201 full-world samples count all main geometry plus every shadow caster once,
  without camera/light-frustum culling. Worst CPU submission bound is **110,230
  triangles at t=0.69** (76,487 main + 33,743 shadow), below the 120k portrait
  triangle target. This conservative geometry count is not an FPS measurement.

## Files

- specs/10-stonehenge-reference-scene.md
- src/data/stonehengeConstruction.ts
- src/engine/stonehengeConstruction.ts
- src/engine/stonehengeCamera.ts
- src/render/three/StonehengeWorkSystem.ts
- src/render/three/StonehengeStoneSystem.ts
- src/render/three/StonehengeEnvironment.ts
- tests/stonehenge-world.test.ts
- tests/stonehenge-rendered-support.test.ts

## Browser checks owned by parent

Check upright t≈0.075, first lintel t≈0.20–0.24, later crib t≈0.58–0.69,
and solstice/reveal t=0.82/1 at desktop and portrait. Verify the brighter stone
midtones, close early composition, continuous mechanisms, actual GPU diagnostics,
and caption layout. Raising bars are a compressed authored reconstruction, with
fixed members re-seated as each timber course is inserted; historical certainty
is not claimed. Existing crew count and phase compression remain.

Reference pass: Spec 10/48, Stonehenge portions of HANDOFF, audit construction and
visual reviews/probe; project graphics render recipes, technical art,
implementation blueprint, model recipes, material-lighting and performance-safe
checklists. Asset decision: bounded repairs of the existing procedural scene;
no new external asset or generation claim. Memory registry lines 1001–1031
provided prior contact-test cautions, independently reverified here.
