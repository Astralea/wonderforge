# Paris north-bank urban blocks — 2026-09-08

The main Eiffel film now uses connected, unequal street blocks instead of the
previous detached north-bank grid. Review:
http://127.0.0.1:5589/?review=paris-urban-blocks-v18#/wonder/eiffel-tower
Final bundle: main-Cqh2Lic5.js. The full construction/Paris goal remains active.

## Actual Blender source and visible change

Parent used the installed Blender Lab MCP on isolated port9877, after a
successful read-only probe. Final model was saved and reloaded through MCP:
blender/paris-1889.blend, one saved scene,127 objects/95 meshes including the
existing period-life prototypes and historical reference boards. A useful
north-bank camera is saved. renders/north-bank-blender.png is an actual Cycles
render of that saved model. Temporary parent-owned Blender56253 was stopped
after all saves/verification; the user's original Blender62427 was untouched.
No plugin or skill installation was required.

-89 street parcels with79 courts;24 have additional attached rear wings.
-1053 individually roofed frontage/wing pieces, with unequal eaves and widths.
-Unequal street alignments and a diagonal avenue create polygonal corner plots.
-Street walls occupy the street edge instead of leaving repeated grass moats.
-Same-material road/footway junctions are polygon unions. The discarded early
 overlapped strips produced visible Cycles shadow stripes; final render removes
 them. Float32 export dust is removed without deleting visible land surfaces.

The existing near-city buildings,24 riverfront houses,Palais reserve, exhibition
landmarks, construction works and traffic routes remain. City geometry is
202324triangles /14663452bytes. The production life GLB and population are
unchanged: this revision improves urban layout, not a new crowd count.

## References and interpretation

[Liébert1889 balloon photograph](https://www.loc.gov/pictures/item/92514593/)
was inspected by parent and reference agent; its local image is already packed
in the Blender source. The reference agent also inspected the
[Neurdein1889 Trocadéro view](https://catalogue.bnf.fr/ark:/12148/cb444645996).
See ../paris-north-bank-reference-2026-09-08/README.md for exact primary records
and visual evidence. The photographs inform continuous street fronts, unequal
rear wings, courts and the bridge/garden/city hierarchy. Coordinates, exact
junction locations, hidden elevations and facade colors remain authored,
compressed interpretation. This is not cadastral surveying or automatic
single-photo photogrammetry. The existing facade atlas remains original art.

## Verification

-748tests/127files, typecheck and production build pass; final-*.log.
-Updated tests use convex polygon SAT for parcels, roads, the Palais reserve,
 wing/courtyard occupancy and1394 disjoint same-material street-surface pieces.
 They check actual exported eave corners, upward ground normals and actual
 existing pedestrian foot contacts, plus sampled plinth support along edges.
-Sparse culling pieces merge only within the same104m parent and40m union
 radius. Exact triangle/color/normal/surface-tag/UV retention is tested.
-Actual production desktop:11seeks +Space playback; camera matches expected
 poses and still advances. No page errors/overflow. Parent inspected late film.
-Actual production mobile:101seeks, peak297242triangles/149calls; no errors or
 overflow. Browser-delivered city and JS bytes were hashed against final files.
 See production-mobile/report.json and production-desktop/qa-desktop.json.
-Parent inspected final Blender render, close city desktop/mobile A/B, and
 production desktop240s. These are sampled browser/render gates, not a claim
 of measured real-phone FPS or complete absence of aliasing.
-All15 earlier joint-campaign mechanical seal entries still match. This pass
 did not modify the construction schedule or tower assets.

Final citySHA:0655c59d789822aead5703399199b9cc96afd22ca581d29ffb016d209da263ae.
Full source/model hashes: asset-source-hashes.json. Earlier candidates and failed
numeric/export checks are retained; finalV9 and production-* evidence supersede
candidate/dev counters. The separate lifeGLB generated with this source is an
editable prototype export; public lifeGLB was intentionally not replaced.

## Remaining goal

The close-quay band still has repeated frontages and unused space, and distant
people are not yet Anno-like in screen readability. Some water/architectural
coverage shimmer and sky/summit quality remain. The parallel water-reflection
quadrature experiment was rejected after correct warmup showed no benefit;
production water code was restored. See ../eiffel-water-reflection-2026-09-08/.

Prioritize actual main-film ground→first-floor→onward material handling next.
../eiffel-main-transport-audit-2026-09-08/README.md identifies integration files
and the exact existing real cargo. The isolated hoist remains attached after
landing; release/human access and onward relay are not complete. An opaque
editorial omission must not be called evidence that the full process is physical.
No next wonder has been selected; the full Eiffel goal is not complete.
