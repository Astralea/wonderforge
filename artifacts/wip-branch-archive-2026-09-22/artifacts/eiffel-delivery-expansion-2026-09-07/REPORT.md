# Main-film ground-delivery expansion — 2026-09-07

**Follow-up:** `CAMPAIGN-SUPPORT-AND-ROUTE-REJECTIONS.md` supersedes endpoint-only campaign feasibility: the14 candidates do not form a supported sequence at the pilot freeze, and all594 tested adjacent-pair prefab routes failed. No new deliveries are admitted.

Read-only census of the current main film after the one-load 122-second integration. Runtime files unchanged. Authoritative context: HANDOFF.md first section. Regeneration scripts and source SHA256 values are recorded beside this report.

## Finding and required runtime change

12,917 of 13,814 kit loads still originate above ground; 896 foundations have ground routes and one NE load has the real 55-second passage. The other upper loads first become visible 1.54–301.49 m above terrain. `eiffelProductionConstruction.ts` creates upper pickup at station base + .9 m minus local minimum Y, gives it an elevated receiver, and sets staging equal to pickup (around lines 267–378). Its upper sampler starts at `staged`, not ground hauling. `EiffelKitSystem.ts:145` skips queued parts. A receiver or renamed state cannot supply the missing material.

Implement a **persistent delivery campaign** in the main production plan: stock inventory → ground carrier arrival → rigging → hoist → rotation/transfer → supported seat → hook recovery. A part must retain one renderer-owned identity throughout. Use a fixed installed crane and explicit support dependencies across multiple loads, not each operation's private station/receiver. Bake geometry-reviewed paths offline; expose unresolved parts honestly. Existing high-origin operations must not silently pass as campaign deliveries.

Timing must change with this architecture. The median legacy upper operation is 9.8501 ms; 4,863 have no moving sample on an ideal 60 Hz clock and 7,863 on a 30 Hz clock. This is a schedule calculation, not measured browser FPS. Inserting the pilot adds 62 integer seconds and leaves those other intervals unchanged. Stage 3's 368 loads share 618.251 ms, each ordinary load getting 6.7201 ms. A minimal review allocation of three 100 ms visible intervals per load requires at least 27.6 seconds at four simultaneous loads, before recovery, dependency, and machinery limits; it is only a readability floor, not realistic operating speed. A slower construction/review clock is necessary.

## Why adding vertical motion to every old pickup fails

Exact vertical swept cargo prisms at the current identity pickup attitude were screened against completed **box** kit at each original operation start. This includes every completed foundation and pylon; 24 non-box cupola gores are excluded. Ground arrival screening uses the existing foundation router's conservative carrier-radius envelope around all 16 completed bearing footprints.

| Stage band | Missing ground provenance | Cargo shaft clear | Shaft + ground endpoint clear |
|---|---:|---:|---:|
| 1–9 lower pylons | 3,111 | 1,078 | 766 |
| 10–21 arches | 1,680 | 1,152 | 980 |
| 23 first platform | 1,296 | 395 | 395 |
| 24–32 middle pylons | 2,320 | 427 | 427 |
| 34 second platform | 704 | 292 | 292 |
| 35–52 shaft | 1,930 | 270 | 270 |
| 54 top platform | 320 | 44 | 44 |
| 55–63 summit | 1,556 | 136 | 136 |
| **Total** | **12,917** | **3,794** | **3,310** |

These are preliminary cargo screens, not accepted lift routes. All 12,917 current receiver floors intersect their own proposed vertical precursor shaft. A direct ground lift must omit that floor or transfer onto it from above via a separately checked approach. 9,123 shafts also intersect completed kit. Crane, ropes, support lifecycle, scenery and simultaneous loads need separate checks.

Three reproducible counterexamples (`delivery-census.json` contains exact poses and timing):

- `lower-ne-00-m033-c002`, stage 1, start .065178219407: old pickup [60.75,1.70,-40.78197] projects through bearing `foundation-ne-2`, including `foundation-ne-2-m000-c001`; swept-prism SAT depth .16 m. Ground endpoint is also inside its inflated bearing footprint.
- `platform-1-0-00-m012-c000`, stage 23, start .285: old pickup [-31.12272,58.21500,-27.51689] intersects 19 completed members on a ground extension; deepest `lower-nw-04-m017-c000`, prism depth 1.86918 m. Existing `sampled-clear` upper status therefore does not establish ground provenance.
- `beacon-lower-balcony-m097-c000`, stage 60, start .836454200634: old pickup [-1.43783,284.335,0] projects through `summit-apartment-roof-m000-c003` and c002, prism depth .8 m. Summit cargo needs an actual clear hoist opening or exterior delivery/handoff.

The depth above measures the exact whole swept prism overlap, not an asserted per-frame payload penetration depth.

## Concrete next campaign and reuse limits

Stage 3 NE has 92 loads, representing 32 source members. The current actual NE station's final **hook** gate admits 14 endpoints (pilot + 13), using the existing 1.575 m fixed slings, 5.5–12 m horizontal annulus, 60–121.65 degree sector, and positive rope clearance. Exact IDs and hook coordinates: `campaign-screen.json`. This is a coherent next face campaign, not yet a proven 14-load delivery. It needs dependency order and actual external geometry checking before integration. The remaining 78 NE loads require other supported positions/geometry; symmetry cannot turn this one-sided sector into a whole-pylon solution.

Of the 13 additional endpoints, 8 also have clear old pickup shafts and ground endpoints. The 18 stage-3 NE old-shaft candidates were routed from the existing [82,72] yard with the current foundation router. All 18 paths passed cargo and conservative all-steering carrier envelope samples every ≤.5 m against completed box kit; lengths 106.59–132.55 m. These are ground routing evidence, not paths to the pilot pickup or a swept proof, and they omit scenery, workers and concurrent carriers. Do not rebrand these as validated NE crane routes.

Straightforward reuse of each 55-second pilot cadence for 14 loads would expand the movie from 122 to 837 seconds, retaining the existing seven seconds of preparation/dismantling cards. Ground delivery may overlap safely with previous hoist work only after cart/worker occupancy and stock identity are authored. This figure illustrates the need for a deliberate slower mode, not a recommended final pacing decision.

## Prefabrication is not a count-only shortcut

The kit retains genuine `sourceMember` and `sourceGroup` identity. Stage-3 NE's 92 boxes correspond to 32 source members; 16 of those members fit the 4-tonne limit under the **rendered solid box × 7,800 kg/m³ assumption**, while 8 individual kit pieces already exceed it. This is not a historical mass survey. The whole NE stage group would be 187.59 tonnes under that model, so cannot be treated as one crane payload.

Example `lower-ne-02/member-013`: four 4.688 m pieces total 1.622 tonnes, but merging them produces an 18.752 m member. Only two existing child seats are in the current station sector. It would reintroduce conspicuously long cargo and require new long-load slings, cart and swept-clearance evidence. Preserve actual useful prefab joints and do not fuse `sourceGroup` just to reduce animation operations.

## Reproduce and limitations

Run from repository root:

```sh
node_modules/.bin/esbuild artifacts/eiffel-delivery-expansion-2026-09-07/census.ts --bundle --platform=node --format=esm --outfile=artifacts/eiffel-delivery-expansion-2026-09-07/census.mjs
node artifacts/eiffel-delivery-expansion-2026-09-07/census.mjs
node_modules/.bin/esbuild artifacts/eiffel-delivery-expansion-2026-09-07/ground-route-screen.ts --bundle --platform=node --format=esm --outfile=artifacts/eiffel-delivery-expansion-2026-09-07/ground-route-screen.mjs
node artifacts/eiffel-delivery-expansion-2026-09-07/ground-route-screen.mjs
python3 artifacts/eiffel-delivery-expansion-2026-09-07/campaign-screen.py
```

No Blender, builds, servers or browser QA used for this census. New campaign path implementation was separately requested after these findings; any later campaign evidence must supersede endpoint-only feasibility before claiming coverage.
