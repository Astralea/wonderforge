# Sydney Opera House reference model v3: Claude (Opus 5.5) delegation report, 2026-09-23

## Iteration 2 (second delivery): closure, north foyers, junction repair, datum fit

The first delivery is preserved in `model-first-delivery/`. The current outputs overwrite `model/` and the JSON.
The JSON SHA-256 is `d08faa0fb85c993987cf8775243f34071dc0e18a45e259653f8d1e4e72113a2d`.

The schema is unchanged. The layout is 65×33 × 2 sides, the ids are 0–9, and the hero is still id 3. New top-level extra: `worldOffset`.

### What changed
1. **Enclosed flanks.** The old 35 %-height infill and the clipped louvre-glass strips are gone.
   - For each nested pair (0→2, 2→7, 3→5, 5→8) and each side, a full-height white panel (`*-side-infill-*`, tile) is stitched row by row. It runs from the southern shell's leading arch (`sides[side][u][v=1]`, tucked 0.25 m under the arch) to the northern neighbour's rear edge (`sides[side][u][v=0]`).
   - Each panel has 33 rows × 11 columns. Its outward bulge is 9 % of the span, capped at 2.4 m, and fades to zero at the pedestal and the ridge.
   - The first 6 % of each panel, next to the arch, is a separate narrow bronze `*-louvre-joint-*` detail.
   - Each panel stays outside its neighbour's 75 m sphere by at least 0.60 m (0→2: 1.56 m; 2→7: 0.75 m; 3→5: 1.33 m; 5→8: 0.60 m), so it never cuts a seated roof.
   - No open auditorium and no masking glass remain.
2. **Main/south junction repaired exactly.**
   - The back-to-back pairs (0,1), (3,4) and (9,6) now share one pedestal each: concert (±23, 0, 39.5), opera (±19.5, 0, 31), restaurant (±12, 0, 0).
   - The spheres were re-solved through the pedestal, apex and ridge valley. Each rear edge (v=0) is now the exact intersection circle of the two 75 m spheres, running from the pedestal to the shared ridge valley.
   - The ribs near the rear edge get a direction correction that is exact at v=0 and vanishes at the pedestal and the ridge. Points are re-normalised, so every sample stays on its own sphere.
   - Every sample of each shell lies on or outside its partner's sphere (minimum −0.0000 m).
   - The vertical-ordering scan (same method as the collision report, every same-group pair) finds **no crossing pairs**. 0/1 and 3/4 no longer overlap in plan at all. The nested pairs have one consistent order each: 2 under 0, 7 under 2, 5 under 3, 8 under 5.
   - The ridge rows sit exactly on the hall plane (1e-14 m).
3. **North foyers and podium.**
   - The six-tier full-width grandstand is removed. The deck's north face is now straight at z_b = −62, with banded granite panels between the wings.
   - Two projecting curved, segmented foyer wings run from 2.2 to 14.2 under the concert and opera north arches: 20 and 15 sector slabs.
   - Each wing face carries a granite plinth, two bands and a coping (proud 0.35 m), plus three dark window strips. The strips are `*-north-wing-windows` glass details, reveal 0.82.
   - Foyer glass now falls to a **curved foot** that follows the arch in plan, bows outward by up to 1.4 m and projects 2.5–3.5 m beyond the apex. The glass has a bronze sill along the foot.
   - All 20 pedestals sit on deck-top podium triangles at y = 14.2 (check `unsupportedPedestals: []`).
4. **Datum fit (map not modified).**
   - The NSW SIX aerial georeference puts the map origin at pixel (909.3, 713.4) at 0.3081 m/px.
   - Five landmarks (both hall tips, both south tips, the restaurant centre) agree on a pure translation of the building by world **(+14.0, +8.2)**, with about ±2 m scatter. Yaw (−12°) and scale were already correct.
   - The east deck edge, east wall, stair east bay and a new segmented stair cheek now follow `near-site-shoreline.json` (authoritative), keeping a 2.5 m strip. The west and SW are unchanged; they already had 15–34 m of broadwalk.
   - Minimum margin of any shell, podium or detail vertex inside the traced polygon: **2.12 m**, at `wall-east-00`. World bounds: x −60.9…81.7, z −77.0…107.3.

### Counts / verification (current)
- **Records:** shells 10, podium 249 (was 291: terraces removed, wings added), details 47.
- **Detail breakdown:**
  - 10 ridge caps
  - 7 pedestal footings (back-to-back partners share one)
  - 6 foyer glass + 6 mullion sets
  - 8 side infills + 8 louvre joints
  - 2 wing window sets
- **Triangles:** shells 81,920 + podium 7,664 + details 26,120 = **115,704**. The GLB re-imports at 115,704.
- **Round trip:** `verify.json`, .blend vs JSON max abs error 3.8e-6 m for shells, podium **and details**. GLB shell top-Y error 1.7e-6. Six cameras and five `SOH_*` materials were saved before export.
- **Heights:** highest tip 67.0 m ASL (concert main); opera main 62.1. Concert and opera are at least 4.26 m apart.
- **Renders:** `model/renders/*-eevee.png` re-rendered and inspected (aerialNW, lowW, north, top, south, eastLow). The `*-workbench.png` files in `model/renders/` are stale first-pass images (copies are in `model-first-delivery/`).

### Photo comparison, honestly
- **aerialNW vs `user-aerial.png`:** white nested vaults now read as closed halls. The only dark areas are the foyer glass and thin bronze joints, and there are no sky holes. The concert north wing shows banded window strips like the photo's foyer bays.
- **lowW vs `user-side.png`:** the tip order is unchanged, and the flanks under the arches are now white.
- **north:** two strong foyer volumes with three window bands, like the two volumes in the photo.
- **top vs NSW aerial:** each hall reads as one continuous leaf, closer to the aerial than before.

### Remaining gaps
- The side panels are ruled-plus-bulge surfaces, not true spherical side shells (D5–D8) or warped infill. They are labelled `approximation:true`.
- The foyer wings are solid sectors with applied strips. There is no interior, lower broadwalk terrace or entry.
- The foyer glass is still one ruled fold per side. Real north glass is a set of cone/cylinder segments.
- There are no tile chevrons, and the rib segmentation is metadata only.
- The west wall stays straight. Its 15–20 m margin looks right on the aerial's Western Broadwalk, but it was not traced separately.
- **Runtime impact for the parent:**
  - Every world coordinate moved by (+14.0, 0, +8.2), so hero cameras need re-aiming.
  - Podium ids changed: `north-terrace-*` removed; `*-foyer-wing-*` and `wall-north-*` added; `bay-r00` now starts at z_b −62.
  - Detail names changed: `*-louvre-glass`/`*-louvre-mullions` removed; `*-louvre-joint-*` and `*-north-wing-windows` added.

---
## First delivery notes (superseded where they conflict with the above)

Status: **implemented and verified**. The files are saved, the renders were inspected and compared
against the photographs and CMP drawings, and the model was iterated three times.
No git, installs, publication, spec or other source edits. The active Blender UI session (PID 1373)
was not touched: every run used `Blender -b --factory-startup`.

## Owned outputs
| Path | What |
|---|---|
| `scripts/build-sydney-reference-model.py` | Single generator. The pure-Python geometry writes the JSON. Blender builds meshes from the *same rounded arrays*, then saves the .blend, exports the GLB and renders. `--json-only` runs without Blender (1.3 s). `--verify` reopens the .blend and GLB and diffs them against the JSON |
| `src/data/generated/sydneyBlenderModel.json` | Runtime contract v3, 4.0 MB |
| `…/model/sydney-reference-model.blend` | Scene with collections `SOH_Model` (exported) and `SOH_RenderAids_not_exported`, 6 cameras, sun, world, 5 `SOH_*` materials. Shells and tile infills carry a display-only Solidify of 0.22 m |
| `…/model/sydney-reference-model.glb` | `SOH_Model` only, +Y up, so the GLB is in runtime coordinates. Modifiers are not applied, so the GLB equals the JSON surfaces. Custom properties are exported as extras |
| `…/model/renders/{aerialNW,lowW,north,top,south,eastLow}-eevee.png` | Final EEVEE daylight renders |
| `…/model/renders/*-workbench.png` | First Workbench validation pass (iteration 1: narrower shells, no louvre glass); kept as evidence |
| `…/model/build-report.json`, `verify.json` | Per-shell checks and round-trip verification |

Rebuild: `/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python scripts/build-sydney-reference-model.py -- --engine eevee`, then the same command with `-- --verify`.

## Exported counts (final)
- shells **10** (65×33 grid × 2 sides each), podium **291** pieces, details **48**
- triangles: shells 81,920 + podium 6,136 + details 20,128 = **108,184** (GLB re-import: 108,184). Budget 180k.
- `verify.json`: .blend vs JSON max abs error 3.8e-6 m for shells and podium (float32). GLB shell top-Y error 1.7e-6.
  The .blend has 349 mesh objects (10 shells, 291 podium pieces, 48 details), 6 cameras and 5 materials.
- Every shell's sphere error is below 3e-14. Pedestal row spread is 0, so u=0 is a single point. Ridge row |x| is 0 (it lies on the hall plane). The lowest rib point is at the deck (0.0), never below it.
- Highest tip **67.0 m ASL** (concert main). Opera main 62.1. Concert and opera shells are at least 3.28 m apart.
- World bounds x −74.9…71.9, y 2.2…67.3, z −96.6…101.4 (see caveat 1).

## Schema as written (stable; extra fields are additive)
Top level: `{version:3, authoring, units:'metres', radius:75, deck:14.2, ground:2.2, rows:65, cols:33, shellThickness:0.22, heroShellId:3, frame, pointLayout, bounds, counts, shells, podium, details}`.

**Shells:**
- Contract fields: `id` (0–9 sequential), `group`, `name`, `position`, `rotation:[0,0,0]`, `dimensions` (whole bounds), `height` (y span), `yaw` (hall + building yaw, rad), `centreX:0`, `centreY:0`, `length` (local z span), `ribCount:10`, `rows:65`, `cols:33`, `points`, `normals`, `sphereCenters:[[neg],[pos]]` (world).
- Extras: `opens`, `topY`, `corners{pedestal,apex,ridgeValley}` (world, [neg,pos]), `minRibHeightAboveDeck`.
- Layout: `((side*65+row)*33+col)*3`. Side 0 is the negative half, side 1 the positive half. Row u=0 is the pedestal (identical across v), u=1 the ridge on the hall plane. Column v=0 is the rear edge (to the ridge valley R), v=1 the leading arch (to the apex A).
- Normals are unit radial, pointing away from each half's own sphere centre.

**Podium:**
- Contract fields: `id`, `vertices` (non-indexed world triangles), `position`, `dimensions`.
- Extras: `kind`, `material` (all `granite`), `stage`, `sequence`.
- `stage` takes the values `podium-bays`, `north-foyer-terraces`, `podium-walls` and `monumental-steps`. `sequence` counts up from north to south within each build pass.
- The minimum y is 2.2.

**Details:**
- Contract fields: `name`, `material`, `vertices`, `reveal`.
- Extras: `shellId`, `approximation`.

| Detail | Material | Reveal | Count |
|---|---|---|---|
| Ridge caps | concrete | 0.84 | 10 |
| Pedestal footings | concrete | 0.82 | 10 |
| Foyer glass | glass | 0.90 | 6 (ids 1, 4, 6, 7, 8, 9) |
| Louvre glass | glass | 0.90 | 4 (ids 0, 2, 3, 5) |
| Mullions / transoms | bronze | 0.91 | 10 |
| Side infills | tile | 0.86 | 8 |

Nothing in the details lifts.

## ID map (original seven preserved in role)
| id | name | group | opens | apex above deck | notes |
|---|---|---|---|---|---|
| 0 | concert-main | concert | N | 52.8 (67.0 ASL) | tallest; louvre glass |
| 1 | concert-south | concert | S | 29.7 | opposing shell, south foyer glass |
| 2 | concert-middle | concert | N | 40.0 | louvre glass |
| **3** | **opera-main** | opera | N | 47.9 (62.1 ASL) | **hero**, main structural shell |
| 4 | opera-south | opera | S | 19.8 | opposing shell, south foyer glass |
| 5 | opera-middle | opera | N | 35.5 | louvre glass |
| 6 | restaurant-south | restaurant | S | 17.0 | glass |
| 7 | concert-north | concert | N | 28.5 | new; north foyer glass |
| 8 | opera-north | opera | N | 26.1 | new; north foyer glass |
| 9 | restaurant-north | restaurant | N | 16.0 | new; glass |

## Geometry method
Each half-shell is solved in the hall-local frame: x is lateral, y is height above the deck, z runs along the hall with +z south. The frame's origin is the main tip station.
1. **Sphere.** Take the corners P (pedestal on the deck), A (leading apex) and R (ridge valley). A and R lie on x=0. Find the circumcentre and plane normal of P, A and R. Place the sphere centre along that normal so the radius is 75, choosing the solution with smaller x (inward), so every half is convex outward.
2. **Ridge.** The ridge is the small circle where the sphere meets x=0, taking the upper arc from R to A.
3. **Ribs.** Each rib is a great-circle slerp from P to ridge(v). The result is a curvilinear spherical triangle touching the deck **only at P**, with ribs fanning out from the pedestal.
4. **Mirror.** The negative half is the mirror of the positive half in x=0 and has its own mirrored centre.
5. **Placement.** Hall yaw is applied first, then the building yaw of −12°, then the deck height of 14.2.

## Sources and fitted parameters
Source classes: S = sourced exact, D = derived from S, P = photo/plan approximation.

**Tip heights (D).** Traced from the CMP 2017 longitudinal sections, Fig 1.7 and 1.8 (`cmp-sections.png`).
- Scale: 0.2335 m/px, anchored so the highest tip is 67 m ASL on a 14.2 deck.
- Concert: north 28.5, middle 40, main 52.8, valley 19, south 29.7. These are the three rising north-facing tips plus one opposing shell, as instructed.
- Opera: 26.1, 35.5, 47.9, valley 14, south 19.8.

**Stations (D).** Also from the sections, relative to the main tip.
- Concert: north −41.6, middle −29.1, valley +45.4, south +76.7. These are the section stations scaled ×1.08 so the tip-to-tip length is the 121 m traced on the aerial. The draft positions were not used.
- Opera: north −34, middle −15, valley +36.4, south +65.6, at section scale. That gives a 99.6 m length, which matches the aerial's 98.6 m.

**Hall axes (D).** From the NSW SIX aerial (0.308 m/px after the cos-latitude correction) and the CMP site-plan dash-dot axes, which meet at the brass plaque.
- Concert yaw is +0.197 rad and opera −0.194 in the building frame. Their world bearings are about −1° and −23°, which match the aerial.
- The measured splay is about 22°, not the 17° draft.

**Hall and restaurant positions (D/P).** Main tip stations in the building frame: concert (−26.7, −32.8), opera (30.6, −33.0). Restaurant centre (−33.9, 60.5), yaw +0.03. The traced restaurant lozenge is about 42 × 26 m.

**Pedestal laterals (P).** Concert 23–26 m, opera 18–22.5 m, restaurant 12 m. These were widened after iteration 1 so the concert leaf reaches the aerial's ~55 m width. The ridge valleys R of the middle and north shells are placed under the next shell (P).

**Glass (P).**
- Foyer walls are ruled surfaces from the leading arch down to a V base line (from P to a foot 3–4 m beyond the apex station). They fold on a central crease and project outward. Mullions follow the rulings, with four transoms.
- Louvre glass under the main and middle arches is cut off at the nested neighbour's ridge-valley height.

**Side infills (P).** Ruled triangles running from the main arch (up to 35 % of the apex height) down to the deck line between adjacent pedestals, with a 1.2 m outward bulge.

**Podium (P, within the S 183 × 120 envelope).**
- Deck: x ±56, z −78…50 in the building frame, as 64 bays of 14 × 16 m.
- Restaurant platform: 9 bays.
- West and east walls: vertical granite, each panel with two projecting bands and a coping (20 panels plus the platform's south wall).
- North end: curved stepped foyer terraces in six tiers from 12.7 down to 5.2, in 12 segments each, reaching z −95.
- Monumental steps: x −16…56, z 50…91.5, 31 treads × 4 bays, from 14.2 down to 2.2. The steps sit east of the restaurant platform.
- Stair cheek walls.
- The envelope runs 183 m from z −95 to 91.5 in the building frame.
- No broadwalk, seawall or terrain is authored. The rounded grey slab and the water in the renders are Blender-only render aids and are not exported.

## Photo comparison (inspected)
- **lowW vs `user-side.png`:** the tip order matches. Low north, then the middle, then the tallest, then the opposing south shell and the separate low restaurant pair to the right. Tips overhang their bases, and glass fills the mouths.
- **aerialNW vs `user-aerial.png`:** nested shells, each on one pedestal per half. Dark glass in the mouths, banded vertical west wall, curved stepped north end, and the restaurant at the SW.
- **top vs `nsw-site-aerial.png` and CMP Fig 1.2:** the two splayed leaves are there, the concert hall is west and larger, the restaurant lozenge is at the SW, the steps are south and east of the restaurant, and the north end is curved.
- **Iterations:**
  1. Leaves too narrow (about 44 m against 55 m) → pedestals widened.
  2. Glass read gold and bright; the sun came from the SE → darkened to topaz; sun set to the NW for a southern-hemisphere afternoon.
  3. Full-height louvre glass turned the silhouette dark → clipped at the neighbour's ridge valley.

## Caveats / for the parent and the historian
1. **Map fit.** The world x extent (−74.9…71.9) exceeds the suggested ±65. A 183 × 120 envelope yawed −12° cannot fit inside ±65. The overshoot comes from the SW platform corner and the SE stair corner. Options: trim the platform or stair width, or accept the overshoot. z −96.6…101.4 fits within ±110.
2. **Origin.** The model origin is the building-envelope centre, not the map's `opera-reference-centre`. The historian should register it using the podium corners.
3. **Shell junctions.** Neighbouring shells meet near pedestals and valleys. Surfaces overlap slightly there; no clearance solver was used beyond the concert/opera check.
4. **Coarse geometry.** Louvre glass, side infills, footings, glass fold and projection are labelled approximations (`approximation:true`). Real tile chevrons, rib segments and the exact Arup setting-out are not modelled: 10 ribs is metadata, and the grid is 33 columns.
5. **Sphere radius.** Lewis gives 74.98 m; the contract's 75 m was used.
6. **Hero camera.** Shell ids 0 and 3 kept their roles, but their positions and shapes changed. The hero camera for id 3 needs re-aiming.
