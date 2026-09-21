# Paris street variety and the 1889 summit flag

The detailed film remains 829.4267707038563 seconds and is the initial selection.
The separate cinematic edit remains 180 seconds. No film chapter, prior Blender
study, narration, or soundtrack was deleted by this refinement.

## Authored scene

Parent rebuilt the forty near-city parcels through the installed Blender Lab
MCP, using five distinct massing families, unequal street-front roof heights,
four roof profiles and lower brick service wings. The 1889 Alphonse Liébert
balloon photograph guides the massing: https://www.loc.gov/pictures/item/92514593/.
The original reference was inspected at
`../paris-stability-followup-2026-09-07/references/loc-balloon-paris-large.jpg`
and remains packed in the editable city source. This is a compressed authored
interpretation, not photogrammetry or a cadastral reconstruction. The shared
facade atlas remains stylized and still repeats individual window motifs.

A new three-stripe cloth flag is attached only after its existing summit mast
has seated. The fixed hoist edge and deterministic wind are tested. The official
history documents the inauguration flag:
https://www.toureiffel.paris/en/news/history-and-culture/french-flag-eiffel-tower-powerful-symbol.
The authored 8 × 5 metre size is inferred for this scene; no surveyed historical
size is claimed. Rouillard's 1889 summit section was also inspected.

## Corrected street intersections

The first actual Cycles review exposed pre-existing intersecting road sheets.
At X−190/Z92, two old road triangles overlapped over 6.587601 m² and crossed
through each other by roughly 1.5 mm. The old grid laid perpendicular strips
independently onto nonlinear terrain. The candidate V3 and old road geometry
were exactly equal, confirming this was not introduced by varied buildings.

V4 replaces the near road/footway strips with their exact planar union on a
shared grid, with at most 8 metre cell sides. Road +0.08m and footway +0.24m
terrain lifts remain. Exterior Exposition and north-bank geometry is unchanged.
The same saved-camera Cycles render now has clean intersections. Original and
intermediate evidence is retained under `before/` and `candidate-v1/` through
`candidate-v3/`; current source/export is V4.

## Editable sources and custody

- `blender/paris-1889.blend`: exported city and period-life source.
- `blender/paris-street-review.blend`: separate reviewed camera scene.
- `blender/near-city-review.png`: actual 1400 × 1000, 24-sample Cycles review.
- `blender/saved-source-readback.json`: 127 saved objects / 95 meshes reloaded.
- `../eiffel-historic-flag-2026-09-08/blender/eiffel-historic-flag.blend`: flag source.
- Corresponding flag directory contains its own saved-source readback and MCP receipts.
- `authored-source-hashes.json`: exact recipes and unchanged public actor asset.
- `admission.json`: city-only adoption and delivered manifest adjustment.

Read-only user Blender probe 9876 preceded authoring. Parent alone used isolated
Blender 11179 on port9877 and stopped it after both saved sources were reloaded;
user Blender62427 was untouched. No plugin installation was needed.

Current city GLB: 193,620 triangles, 14,115,636 bytes; SHA-256
`4dee8334e90fd1288f0837acce43c99bbf18fd49faf72d07f33a50a635c6d79e`.
Old city was 202,324 triangles. Public life GLB remains unchanged; delivered
manifest actor names intentionally retain that asset's original names instead
of the isolated session's generated suffixes.
Flag GLB: 720 triangles; SHA-256
`77dda59458e8abcadfe5807c29c386f537c486688bf3db5bfb2bb9ec6c3d7145`.
The V2 flag hoist lies on the actual 0.09m mast face across its two upper
segments. Its earlier anchor version is retained in the flag artifact
`candidate-v1/`. Parent also saved/reloaded V2 through isolated Blender34890
and stopped that instance; user Blender62427 remains untouched.

## Verification status

Candidate V4 actual-geometry admission passed 9/9 tests, including exported
walls/roof profiles/plinth support, massing witnesses, SAT separation, retained
tree keepouts, exact old planar street coverage, absent duplicate coverage and
unchanged exterior attributes. The adopted asset passed all 25 tests across
four affected suites. The V2 flag passed five tests including contact with the
actual exported mast geometry.

The first full run passed 1,015 tests and failed one outdated mocked-world
disposal fixture (`full-tests.log`, 204.45s). The fixture now includes the new
flag owner and asserts its disposal. The production disposal requirement was
not weakened. Final full suite: **1,017/1,017 in 192 files, 204.92 seconds**, followed by
passing typecheck and production build.

Final composed Chromium review: **110/110 sampled frames, zero errors**.
Desktop maxima 420,173 triangles / 154 calls; mobile 288,834 / 141. All four
fresh contexts defaulted to Detailed. Parent inspected the final desktop and
mobile wide frames, early city frame, and the before/after Cycles streets.
The flag is visible at the summit and the five near-block massing families
remain distinguishable. Original dusk lighting remains subdued.

`final-verification.json` ties the exact served `main-CDwvfOaW.js` bundle
(SHA256 `d7fe92b8d09d8daaf98adbb85f58430a19783742bbd5cfdcd011a53d89de6a2b`)
to the 21 HTTP-delivered files and 511 source/spec/test hashes.
`ui-source-binding.json` preserves 20 prior UI/audio/related source identities;
the changed EiffelWorld is covered by this production review. Film clocks,
playback, captions and audio hooks are byte-identical to the prior delivery.

Review: http://127.0.0.1:5589/?review=paris-variety-CDwvfOaW#/wonder/eiffel-tower

After this gate passed, one recorded random draw selected **forbidden-city**
from the four verified legacy candidates. See `next-wonder-eligibility.json`
and `../forbidden-city-rebuild-2026-09-09/` for next-stage preparation.
The original broader goal remains active. No other wonder renderer changed.

No whole-film mechanical, native-device FPS or photorealism certification is
claimed. Current review must preserve the existing 450,000/200 desktop and
300,000/150 mobile triangle/draw-call limits. The broader goal remains active.
