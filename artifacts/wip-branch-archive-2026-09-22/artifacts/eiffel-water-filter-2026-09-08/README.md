# Eiffel water highlight footprint filter — 2026-09-08

This work changes only `src/render/three/eiffelWater.ts`, its focused test and
Spec 25. It retains the existing ripple-octave filter and material recipe.
No Blender, geometry, city, crowd, camera, production build or full-film budget
change is included. The controlled comparisons use actual WorldScene and Three
GPU programs on dev5590, not a production-bundle camera override.

## Mechanism

The fixed-clock component diagnosis separates stock material specular output
from added emissive sky/sun output. The former dominates the measured narrow
peaks: filtering only the analytic sun substantially improves that small
component but barely changes full radiance. This refines the earlier
`eiffel-paris-shimmer-2026-09-08` diagnosis, which isolated reflection from
diffuse output without identifying which specular path dominates.

The candidate propagates a pixel's world-position footprint through analytic
gradients of the actual procedural noise and its existing finite-difference
normal slope. It does not differentiate an already derivative-filtered normal.
Normal covariance broadens the standard GGX response in squared-alpha space;
the kernel is capped and tends to zero with footprint. Reflection-direction
covariance separately broadens the narrow added sun halo/disc with angular
energy normalization. The broad sky, broad sun halo, Fresnel, underlying ripple
field and deterministic time remain intact. This is an approximation of a
pixel's normal distribution, not an exact area integration or blanket physical
claim.

Three's installed `lights_physical_fragment` adds geometric roughness from
`nonPerturbedNormal`; that flat-sheet derivative does not include this procedural
ripple slope. The new term therefore supplements the actual lighting path,
without changing the water material's global roughness.

Primary context: [Filtering Distributions of Normals for Shading Antialiasing](https://research.nvidia.com/publication/2016-06_filtering-distributions-normals-shading-antialiasing)
and [Improved Geometric Specular Antialiasing](https://yusuketokuyoshi.com/papers/2019/ImprovedGeometricSpecularAA.pdf).
This implementation uses its own local procedural Jacobian and bounded kernel;
it is not a claim of reproducing either paper's complete algorithm.

## Evidence method

- Canvas CSS is explicitly 1440×900 desktop and 390×844 mobile; actual drawing
  buffers and all shader uniforms are recorded. Mobile uses DPR1.35.
- Construction, lighting and animation clocks are fixed. Every program variant
  is warmed before selecting the camera, since initial compiled uniforms have
  a default sun direction until WorldScene feeds them.
- Off/on differs only by the shared `uEiffelHighlightFilter` uniform. Both keep
  the previous ripple-octave filter enabled. Three camera angles per region are
  compared with 4×4 samples per native pixel, averaged in linear HDR radiance.
  The original native octave footprint is held fixed in the reference; otherwise
  supersampling would change the water field's detail level. This is a finite
  supersampled reference, not an analytic ground truth.
- The reference uses a central 192×192 physical-pixel crop. Both profiles keep
  the same world distance, and the camera's exact native physical dimensions
  determine the crop. Tone mapping and postprocessing are excluded from linear
  error; actual composed screenshots retain the normal pipeline.
- Each camera draw restores the chosen camera, isolation, clear state and target
  after WorldScene updates, which normally changes the camera and background.
- Twelve tiny orbit samples additionally track bilinear luminance at projected
  fixed water points. That temporal statistic includes legitimate reflection
  changes; it is supporting evidence, not the acceptance oracle. Static repeat
  images and actual renderer draw/triangle counts are also recorded.

## Admitted bounded result

The combined filter is retained. All 18 profile/region/angle comparisons reduce
linear-radiance RMSE against their matched 4×4 reference, by **40.0–80.5%**.
A larger 8×8 central-fountain reference confirms the ranking: **70.7% lower
RMSE on desktop, 75.0% on mobile**. This is finite-reference evidence, not an
exact integration of every glint.

| Profile / region | Tracked luma change off → on | 4×4-reference RMSE reduction | On/reference crop energy |
|---|---:|---:|---:|
| desktop / fountain | 1.0522 → 0.3343 | 45.6–70.0% | 0.938–0.944 |
| desktop / river | 0.1712 → 0.0877 | 53.0–76.7% | 0.954–0.960 |
| desktop / near | 1.2781 → 0.3178 | 40.0–43.1% | 0.949–0.960 |
| mobile / fountain | 0.5680 → 0.6003 | 61.2–73.1% | 0.903–0.911 |
| mobile / river | 0.5375 → 0.5411 | 58.6–80.5% | 0.941–0.950 |
| mobile / near | 0.2918 → 0.3584 | 46.6–77.9% | 0.962–0.972 |

The raw mobile luminance statistic increases; it is explicitly **not** claimed
as a mobile perceptual shimmer improvement. A separate four-camera experiment
subtracts each frame's matched supersampled radiance before differencing frames:
mobile temporal residual RMS falls from 4.0505 to 1.1240 at the fountain (72.3%)
and 2.1702 to 0.7344 near the water (66.2%). Thus measured reference-relative
alias error improves while legitimate broad reflection and its screen brightness
remain view dependent. Tone mapping/bloom and tracked-point sampling explain
why an unqualified brightness-change statistic is not the acceptance test.

Near 18 m captures were visually inspected on both profiles: resolved wave
ridges and broad glints remain. Central crop energy is biased slightly low
(roughly 3–10% across these cases); the approximation is not globally radiance
exact. The original broad water field, animation phase and sky/Fresnel controls
are unchanged and recorded. This run does not include a separate time-advancing
motion sequence, whole-film GPU budget, or universal viewing-angle certification.

All 12 off/on region/profile static repeats are byte-identical. Water-isolated
pipeline counters match within each pair: desktop 18 calls/84 triangles, mobile
5 calls/71 triangles, including the existing postprocessing geometry. There are
zero page/shader errors. Actual served `eiffelWater.ts` response SHA256 is
`3415a519e89e8c7143129cb163d52df6299af3a1bba476a2030e8aac15b6a732`
on both profiles. `candidate-v2/report.json` retains all module response hashes,
shader uniforms and buffers; its `*-shaders.json` retains actual program strings.

`reference-validation.json` records the 8×8 and temporal-residual checks;
`review-ref.ts` and `ref-check.mjs` reproduce that supplement. `focused-tests.log`
records 3 focused tests passing, and `typecheck.log` records typecheck passing.
No broad suite or app build was run by this subtask.

`before-eiffelWater.ts` preserves the original renderer. `analytic-only-*`
preserves the first candidate and its correctly warmed component diagnosis.
`smoke-v1*` and `component-diagnosis-pre-clear.*` are development diagnostics:
their early raw-reference measurements had camera/clear/warmup defects and are
not acceptance evidence. `component-diagnosis.json` is the corrected warmed
comparison for the combined normal/analytic candidate.

Full-context captures also expose a pre-existing basin/terrain intersection:
rising terrain cuts through the far end of the large flat fountain sheet. That
geometry issue is reported to the parent and is not fixed by shading.

Reproduce the candidate comparison:

```sh
PATH=/Users/hina/.nvm/versions/node/v24.4.0/bin:$PATH WATER_OUT=candidate-v2 node artifacts/eiffel-water-filter-2026-09-08/qa.mjs
```


The subsequent, separately authorized basin-geometry task resolves the recorded
terrain and submerged-paving conflicts. See `pool-ground/README.md`. It also
adds actual paired water-phase captures with unchanged camera/lighting and a
0.4 s shader-phase advance. The original shader comparison, source identity and
admission seal above remain unchanged; do not merge their absolute renderer
budgets with the later geometry context.
