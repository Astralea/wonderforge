# First-floor occupancy correction — 2026-09-07

This checkpoint improves stage 23. It does **not** complete Eiffel mechanics.

## Result

- 1,085 of 1,296 first-floor operations use new routes validated at 81 phase samples each, plus independent off-grid regression samples.
- **211 stage 23 operations remain explicitly `upperClearance: 'unresolved'`** and retain the prior motion. IDs are in `upper-route-bake.json`.
- Independent original-audit sampling: stage 23 non-final-overlap collision pairs **967 → 51** (94.7% reduction).
- Whole-film sampled collision pairs **5,489 → 4,524**. This includes the separately implemented foundation haul fix. Most remaining collisions are outside this checkpoint's stage 23 scope.
- Receiver solid intersections across the whole film **5,068 → 4,266**. Counts are sample/solid pairs, not unique faulty objects. The rest of the film remains mechanically unfinished.

The original `platform-1-0-01-m000-c004` hoist and `platform-1-0-01-m000-c002` receiver failures are fixed. Regressions retain their original failing world geometry and verify the matching operation phase after dependency timing changes. The old timestamps no longer identify the same phase because supported stations now create different stage 23 dependency barriers.

## What changed

`eiffelOccupancy.ts` provides exact oriented-box SAT and an 8 m grid containing every cell touched by each actual completed box. It checks completed iron rather than merely crane-mast distance. Contact tolerance is 0.00001 m; it was not widened to make geometry pass.

`eiffelUpperClearance.ts` searches clear receiver positions and separates lifting, rotating, slewing and lowering. Cargo remains the identical rigid body. Crane mast height stays at or below 22 m and the jib stays 8.4 m. The complete deck and conservative bounding boxes around both grillage members must clear completed solids. The own support member is exempted at the grillage attachment, where the member terminates on its real surface. This is a geometric endpoint/support contract, not a structural capacity calculation.

Stage23 station selection may use a completed deck face up to 4 m above the final load underside. A crane can lower a part from such a station; the old algorithm's requirement that all crane feet be below the destination incorrectly forced receivers through the finished deck. Station selection favors less vertical rise. If one saddle pair sends the grillage through other members, both saddles may move along the same actual support face. Tests transform all accepted saddle points back into the support's canonical frame and verify they remain on its bounded surface.

During lowering only, authored final joint overlaps may be admitted up to their final penetration. This is not a blanket same-source or final-pair exemption across the route. Cargo, receiver and support geometry remain visible; rejected operations are not hidden or deleted.

## Runtime and provenance

The occupancy search runs **offline**, using `scripts/generate-eiffel-upper-routes.ts`. Runtime uses `src/data/eiffelUpperRoutes.json` through `eiffelUpperRouteCache.ts`; full-kit and per-operation fingerprints reject stale baked corrections. There is no runtime occupancy search. The JSON is 1,060,081 bytes. Baked SHA256 is recorded in `upper-routes-SHA256.txt`; generator source/manifest/GLB SHA256 values are recorded in `upper-route-bake.json`.

Indicative Node24 same-machine measurement (`upper-runtime-benchmark.json`): first skip-search plan 6.75 s, baked plans 6.85 s and 6.93 s, later skip-search plan 9.81 s under variable CPU load. The complete manifest fingerprint alone took 66.7 ms. Offline search took roughly 4.5 s. These are not browser/GPU timings. Existing plan generation still takes several seconds; this checkpoint removes a new multi-second search cost but does not certify responsive application startup.

Regenerate from repository root:

```sh
node --input-type=module -e "import {build} from 'esbuild'; await build({entryPoints:['scripts/generate-eiffel-upper-routes.ts'],outfile:'artifacts/eiffel-resume-2026-09-07/generate-upper-routes.mjs',bundle:true,format:'esm',platform:'node',packages:'external'});"
node artifacts/eiffel-resume-2026-09-07/generate-upper-routes.mjs
```

Focused validation: **14 tests in 4 files pass**, and `npm run typecheck` passes. Suites: upper-clearance, station-map, production-construction, production-works. Upper tests independently check original counterexamples, every accepted route at 11 off-grid samples, final poses, crane reach/rope, actual saddle contacts and receiver grillage clearance. No Blender, full build, server or browser QA was performed by this subagent; parent owns integration QA.

## Next unresolved work

The 211 unresolved first-floor candidates need alternate actual support members or separately authored receiving falsework, not a more permissive collision tolerance. A concrete crowded-pylon example is `platform-1-0-00-m001-c000`: all original receiver angles sent one or both grillage members through completed `lower-nw-08` braces near the selected face. Sliding saddle points on that same face improved 88 additional operations but did not resolve every packed joint.

There are still clear first-floor transport failures, e.g. `platform-1-0-02-m000-c004` at t=.3067993015872949 (hoist .20) intersects `platform-1-0-01-m000-c010` by 1.06980895 m; it is tagged unresolved. Do not call the first floor or whole tower physically cleared. Broader work must solve the remaining support/receiver placements, routes on other stages, simultaneous moving loads, slings/jibs/crew, and representative visible delivery timing. The finite sample checks are not a continuous swept-volume certificate.

Retain the baseline report and executable. `clearance-baseline-count.json` and `clearance-after.json` are independent comparisons; `support-after.json` preserves remaining receiver collisions. The captured after executable predates formatting-only changes but contains the same route geometry and current foundation haul correction.
