# Steam-drive support and clearance audit — final V4

Independent read-only geometry audit of the actual final Blender GLBs. No Blender/MCP session, production files, main source files or models were modified by this audit. Evidence was written only in this directory.

All bounded gates below pass for V4. V3 had a cylinder foot extending 15 mm beyond the engine bed; its failed report is preserved in `v3/`. V4 extends the bed to world X [-25.39, -23.72], resolving that footprint failure without a new surrounding-structure collision.

| Check | Result |
| --- | --- |
| Existing environment | All 64 exported addon mesh enclosing boxes clear 11,856 obstacles: stage <=45 tower bounds, 449 bridge prisms and 21 receiver-frame prisms. |
| Rotating environment envelope | Full-circle enclosing boxes of all crank-group meshes clear the same environment. |
| Floor support | All 16 exported bottom vertices across the engine bed, boiler foot and two boots raycast to actual stage-45 tower triangles. |
| Bed support | All 16 bottom corners across two bearing pedestals and two cylinder feet raycast to the actual engine bed. |
| Boiler support | All exported boiler-shell bottom contact vertices meet the actual boiler foot. |
| Contact tolerance | All floor, bed and boiler contact residuals are within the 20 micrometre export tolerance. |
| Cylinder saddles | Both foot top centers meet the actual cylinder underside within 1.646 micrometres. |
| Shaft clearance | Actual faceted bearing inner surfaces retain at least 1.868 mm radial clearance around the shaft circumradius. |
| Rod pin clearance | Large/small pin bores retain 0.889/0.913 mm radial clearance; centers coincide and pins cover the rings axially. |
| Rod vs crank web | Actual axial separation is 17.9995 mm. |
| Actual gear identity | Exactly one replacement drum gear. Exported XY vertices match the authored profiles within 0.775 micrometres (pinion) / 3.505 micrometres (drum). Both gear faces occupy the intended same axial slab. |
| Actual-profile gear sweep | 1,441 angular samples across one drum tooth period (15 degrees, equivalent to all revolutions by tooth symmetry); no boundary crossing or containment. Minimum sampled gap 2.721 mm; continuous authored-polygon lower bound 2.635 mm. |

## Asset identity

`final-addon.json` hashes all seven inputs. Principal final V4 assets, relative to `artifacts/eiffel-long-load-main-2026-09-08/`:

- `model/steam-drive.glb`: 398,956 bytes, SHA-256 `3b7f1f4dd44d305d0981fde40b6b5a301ec79a80cb80dff42e96ad2253b2b9ce`.
- `model/receiver-driven.glb`: 295,328 bytes, SHA-256 `4582dea01f7b6efcd053a7083a834c66deff45fecb9f0a644182f0e9e17efdd8`.
- `drive-design.json`: SHA-256 `dd9246f4dfbc93811e8e86a059d2969b2cf8fe80adf88ae4ef08a219481928d0`.

These match the V4 hashes supplied by the parent.

## Method and limits

`final-addon.ts` loads the actual GLBs through Three.js, uses each object's world transform, and compares complete mesh enclosing boxes against convex obstacles via separating axes. A clear enclosing box establishes clearance. Tower obstacles are conservative oriented bounds; bridge and receiver-frame obstacles are their authored convex prisms. Full-circle enclosing boxes cover every intermediate crank angle against those external obstacles. Support rays intersect actual exported tower, bed or boiler-foot triangles.

Bore clearances measure inner polygon edges, accounting for faceting. Ring/pin fits and rod/web separation are checked at the exported initial pose. This audit does not exhaustively test every pair of moving internal parts or independently execute the web sampler.

`gear-actual-sweep.mjs` uses final `drive-design.json` outlines, with the pinion phase already baked in. It applies drum angle -theta and pinion angle 2*theta at a center distance of 0.63 m. Segment intersection, containment and segment distance checks determine clearance. Maximum boundary travel to the nearest sample is 0.085903 mm, giving the stated continuous lower bound for the authored piecewise-linear profiles. GLB vertex matching is recorded separately; it is not presented as a full mesh-topology proof. The independent 16-sample/flank formula check remains in `gear-sweep.json` as supplementary earlier evidence.

Intentional backlash means the visible teeth remain separated in these prescribed poses. This is not exact loaded tooth contact, contact-force simulation, boiler/power validation, brake capacity validation, structural anchorage/stability certification or exhaustive scene physics. Browser behavior, appearance and renderer budgets belong to the parent's production QA.

## Reproduce

From the repository root with Node 24 selected:

```sh
node_modules/.bin/esbuild artifacts/eiffel-long-load-main-2026-09-08/support-audit/final-addon.ts --bundle --platform=node --format=esm --outfile=artifacts/eiffel-long-load-main-2026-09-08/support-audit/final-addon.mjs
node artifacts/eiffel-long-load-main-2026-09-08/support-audit/final-addon.mjs
node artifacts/eiffel-long-load-main-2026-09-08/support-audit/gear-actual-sweep.mjs
```

`final-addon.json` and `.log` contain final V4 per-object checks. `gear-actual-sweep.json` contains all 1,441 samples, and `gear-actual-worst.svg` illustrates the closest sampled phase. `v3/` preserves the failed V3 support report. Planning checks and the independent analytical gear-profile check are retained as earlier evidence.
