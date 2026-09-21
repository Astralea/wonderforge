# Current Paris flicker audit — 2026-09-08

Read-only source/asset audit; no main source or Blender mutation. This is not a new browser reproduction. Parent is conducting camera QA separately.

## Immediate implementation candidates

1. **Remaining unfiltered procedural terrain detail (distance alias, not depth conflict).** `src/render/three/EiffelEnvironment.ts:130` injects compacted-earth into the visible rebuilt terrain; `src/data/materialDetail.ts:303` defines grain scale 2.2/amplitude .03. `src/render/three/proceduralDetail.ts:43-44,62-77` samples both noise octaves into albedo/roughness without any screen footprint attenuation. The water-only wrapper does not filter grass. At a 1 m pixel footprint, even the coarse grain has 2.2 cells/pixel. Apply an Eiffel-only footprint-filtered recipe wrapper to terrain first, preserving low-frequency mean color and near detail. Capture frozen-clock orbit A/B over the broad grass/apron region before broadening to other materials. This is a concrete missing filter; magnitude of current displayed shimmer remains UNVERIFIED.

2. **Residual water reflection lobe has no footprint integration (specular alias).** `src/render/three/proceduralDetail.ts:203-210` evaluates a power-650 halo and fixed-width .0024 sun step into emissive radiance. `eiffelWater.ts:19-28` filters input noise octaves only; it does not filter the reflection response. Partial surviving normal variation can cross the narrow reflected-sun lobe inside one pixel. An Eiffel-only derivative-aware reflection transition/energy-preserving lobe integration is the bounded next experiment. Do not simply increase base roughness: this custom emissive lobe bypasses BRDF roughness. Existing measured water improvement was 84.9%, not zero flicker. Current residual attribution needs frozen-water matched orbit A/B, retaining actual wave motion afterward.

3. **Thin contrasting city geometry survives at arbitrary distance (coverage alias).** `scripts/paris_exposition_geometry.py:69-71` retains narrow palace crossbars; `:152-155` authors Galerie vault ribs with .32 m total square thickness; `:27-32` authors dome ribs with .20 m thickness. `src/render/three/eiffelParis.ts:342-347` preserves them in one roughness-.85 opaque batch; no projected-size representation change occurs. At distant/mobile projections these are subpixel edges. The facade atlas and analytic courses already filter; another near-plane change will not repair these edges. Next bounded experiment: isolate rib/window-frame ROIs, measure projected widths, compare an authored mip-filtered distant surface representation with the unchanged near GLB. Avoid deleting or fading architectural silhouettes indiscriminately. No LOD was implemented here.

## What current actual GLB rules out

Ran `audit-planes.mjs` against current `public/models/paris-1889/paris-city.glb` (158,642 triangles), stripping embedded texture references only for CPU parsing. No geometry was changed. `geometry-audit.json` contains evidence.

- 2,790 axis-aligned glass triangles; no glass center had a coincident stone plane under this planar-bounds screening.
- 338 screen candidates have <.02 m separation (many are float-rounded .02 m); 1,654 <.08 m; 485 <.13 m. This is a broad-phase centroid/rectangle check, not occlusion or exact triangle overlap proof.
- 140 exact coincident different-material triangle pairs at 0.1 mm key precision. **All 140 are opposed-facing; zero same-facing pairs.** They are primarily shared solid contacts. Do not label these as proven visible z-fighting or delete one arbitrary side. Internal-face/MSAA seam behavior is possible but requires the separate shared-face proof and visible ROI reproduction.
- Fountain water is terrain+.32 (`EiffelEnvironment.ts:336`), basin stone top terrain+.10 (`paris_exposition_geometry.py:180`): nominal .22 m separation. Some paving crosses the second pool, but remains below the water; it is not evidence of coplanar water conflict.
- Current Eiffel camera near=5, facade trilinear mipmapping/anisotropy8, procedural-course fading, water octave filtering, grain-free final grade, and composer 4x MSAA already exist. Do not reimplement them or claim absent MSAA.

Recommended order: terrain-filter A/B first (small, demonstrable current omission); water lobe A/B second; asset-specific distant rib representation only after its ROI is confirmed. Main glass depth stripes were previously demonstrated/fixed; no new visible glass z-fighting is established by this audit.

## Terrain candidate implemented for parent A/B

`src/render/three/eiffelTerrainDetail.ts` wraps the real shared compacted-earth
shader only on rebuilt Eiffel terrain; `EiffelEnvironment.ts` applies it after
recipe injection. The largest singular value of the 2x2 screen-to-noise
Jacobian retires each octave independently between .15 and .5 cells/pixel.
Resolved input samples and far expected mean .5 are retained; grain, mottle,
existing relief, authored vertex colors and shader lighting remain intact.
No new draw, geometry, texture, frame clock or render pass.

A/B control: find terrain mesh material with
`material.userData.eiffelTerrainFilter`; set its `.value` to 0 or 1. All compiled
program variants share the same uniform object (`uEiffelTerrainFilter`). The
terrain mesh has no new public UI controls. Default is filtered (1).

Focused verification: `npx vitest run tests/eiffel-terrain-detail.test.ts` —
3 pass. Tests compose actual Three ShaderLib + material recipe, confirm only
the noise function changes, preserve vertex shader and remaining fragment
shader exactly, verify program-variant uniform identity, isolation from another
wonder's material, idempotence and explicit failure if the recipe is missing.
These are shader composition tests, not GPU or image validation. Parent owns
frozen-time desktop/mobile orbit A/B and broad checks/build. No dist rebuild was
performed by this agent.

### Derivative review correction (v2)

Before promotion, source review caught an unsafe composition in the initial
candidate: filtered `wfDetail` depended on screen derivatives, and the shared
bump shader differentiated it again. GLSL ES 3.00 section 8.9 defines these
higher-order derivatives as undefined:
https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf

The v2 helper now copies the *actual injected* compacted-earth height expression
into `wfEiffelBumpHeight`, using a derivative-free copy of the original noise
function. Only this unfiltered height feeds bump derivatives. Filtered height
continues to drive albedo and roughness. The original bump strength and footprint
fade stay exact; near/baseline normals therefore retain the original expression.
All three focused tests pass again and now verify derivative-path separation
and exact preservation of the original height expression. GPU performance and
visual comparison must use v2, not the superseded candidate.

Implementation scope caveat: the bump path remains the preexisting unfiltered
height with its preexisting fade; this change does not claim to improve that
path's aliasing. No claim of whole-scene flicker elimination is made.

## Final GPU and integration evidence

terrain-web/qa.json records20frozen-clock orbit frames per variant on desktop
and mobile, with all other meshes hidden only for metric isolation. Tracked
terrain-point mean temporal luma delta falls .3530195 to .0219476 (93.78%) on
desktop, .2988414 to .0213612 (92.85%) on mobile. No page/console/GPU errors.
This is a terrain-only proxy, not a93% whole-scene flicker claim. Full-scene
before/after images were captured separately; parent inspected both filtered
views. Parent stopped/rejected the first nested-derivative candidate, preserving
partial captures under terrain-web-rejected-nested-derivative/.

Final implementation keeps derivative-free raw height for bump and filters
albedo/roughness only; function declaration ordering was also corrected.
Final748tests/127files, typecheck, build pass (final-*.log). Final production
bundle main-Cnbc0nra.js; production-smoke.mjs and production/qa.json retain
actual website shader smoke evidence. Review orbit-terrain-v17 on5589.
