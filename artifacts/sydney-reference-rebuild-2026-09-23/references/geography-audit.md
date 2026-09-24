# Sydney reference rebuild: geographic and architectural audit

2026-09-23. Reference-first reset following the user's rejection. Previous scene scores do not accept the rebuilt architecture. Modern imagery supports enduring site geometry, not a claim that its buildings/landscaping existed in 1973. Measurements below are manual digitization, not a survey.

## Final geographic status

Frozen geography: **82 garden trees** (24 western, 36 landward, 22 eastern), **161 total figs**, and **84,611 shadow-weighted environment triangles** against a115,000 ceiling. Garden data cap90. Continuous quay/coping and terrain-conforming roads are implemented; the former road sawtooth issue is resolved. Owned geography/boat/garden tests passed20/20 and typecheck passed. Detailed chronology below preserves intermediate measurements, which are not the final budget. Whole-scene acceptance and final production evidence belong to the parent review.

## Evidence inspected

- User images `user-aerial.png` and `user-side.png`: undated modern photographic shape references.
- [Sydney Opera House Conservation Management Plan 2017](https://www.sydneyoperahouse.com/sites/default/files/collaborodam_assets/soh-cmp-interactive-1.pdf), downloaded as `official-cmp-2017.pdf`. PDF page 13 (printed 10–11), site/roof plan: `cmp-site-plan.png`. PDF page 14 (printed 12–13), floor plans: `cmp-plans.png`. PDF page 15 (printed 14–15), longitudinal sections: `cmp-sections.png`. Floor/section plates rotate north toward the left; do not infer north from page up. The principal halls occupy west/east positions; the separate restaurant is southwest. Water surrounds the point on west, north and east; the land connection is south.
- [NSW SIX imagery service](https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/LPI_Imagery_Best/MapServer). North-up downloaded `nsw-harbour-aerial.png`, `nsw-site-aerial.png`; companion JSON preserves exact EPSG:3857 extent/request. Composite acquisition date not established. Request `f=image` supplies image directly; the service's generated `href` returned 404. No Google image reuse.
- [NSW historical imagery](https://www.spatial.nsw.gov.au/products_and_services/aerial_and_historical_imagery) is the appropriate next source for dated city/vegetation comparisons. Current imagery must not supply a modern high-rise skyline to a 1973 reveal.
- [Transport for NSW bridge history](https://www.transport.nsw.gov.au/system/files/media/documents/2023/harbour-bridge-history.pdf): main arch 503 m, total length 1,149 m, top 134 m, pylons 89 m, deck approximately 49 m above water. Deck clearance varies with datum/tide; model dimensions are approximate.
- [Opera House spherical solution](https://www.sydneyoperahouse.com/our-story/the-spherical-solution): the final roof is the developed spherical solution, not the earlier Red Book sketch. Shared spherical curvature does not imply interchangeable pointed vaults.
- [Opera House completion](https://www.sydneyoperahouse.com/our-story/peter-hall-and-completion-opera-house): the glass walls are part of the completed external form and must be represented with their faceted support geometry.

## Datum and usable map controls

`map-controlpoints.json` records points digitized from the harbour aerial. Adopt WGS84 longitude **151.2150309475**, latitude **−33.8569744291** as scene origin; ground metres with east +X, south +Z, up +Y. Conversion: X=R cos(latitude0) Δlongitude; Z=−R Δlatitude, radians, R=6,378,137. Raw Web Mercator metres are not local ground metres: neglecting the cosine scale inflates Sydney by about 20%.

| Landmark | X east m | Z south m | Distance / bearing from origin |
|---|---:|---:|---|
| Bennelong northern seawall | 15 | −97 | 98 m / 9° |
| Southern forecourt neck | −27 | 164 | 166 m / 189° |
| Circular Quay inner seawall | −368 | 474 | 600 m / 218° |
| Dawes Point shore | −472 | −134 | 491 m / 286° |
| Main bridge span midpoint | −414 | −524 | 668 m / 322° |
| Milsons Point shore | −228 | −685 | 722 m / 342° |
| Kirribilli Point | 335 | −477 | 583 m / 35° |
| Farm Cove head | 310 | 700 | 766 m / 156° |
| Mrs Macquaries Point | 633 | 249 | 680 m / 112° |
| Fort Denison | 985 | −232 | 1,012 m / 77° |

Estimated landmark digitizing uncertainty approximately 5–20 m (not surveyed accuracy); the selected point within a named site matters. The 322° bridge bearing is from Opera House to bridge centre, **not** the bridge's own axis. The bridge axis points approximately 30° east of north. Building/podium axes run approximately 12° east of north, with the two halls fanning rather than remaining exactly parallel. The initial geography handoff proposed the rotation `(cosθ*x + sinθ*z, −sinθ*x + cosθ*z)`, θ=−12°. **Final hero registration adds world offset(+14.0,+8.2)m after that rotation**, as exported by `scripts/build-sydney-reference-model.py`. The engine yard helper uses a separate rotation-only field frame around the same datum. Terrain/boats/harbour remain true-compass coordinates. Exported hero positions are already world-space and must not receive the offset again.

`near-site-shoreline.json` contains a detailed approximate shoreline trace (an estimated 2–5 m digitizing tolerance) from the site aerial. Key points: north cap (+12.5,−97.8), northwest (−36.8,−89.2), northeast (+66.8,−82.4); eastern walk (+60,+31), (+47.7,+93); western walk (−72.5,+46), (−95,+88). At Z≈120, forecourt land spans roughly X−104..+49; at Z≈175 it spans X−142..+69. It widens southwest into the mainland. The initial rotation-only roof proposal reaching local Z−105 risked crossing this cap. That warning predates the final hero translation; judge the final exported footprint in world coordinates and retain room for the northern glass foyer and promenade. Yard local Z140..170, X−45..+25 lies safely in the southern forecourt when rotated.

## Findings in the rejected scene

1. **Critical — `src/engine/sydneyTerrain.ts`, peninsulaHeight/cityHeight/northShoreHeight:** analytic capsule, rectangular quay, oval garden and sinusoidal coast compress opposing shores into an artificial channel. Real north shore is roughly 500–700 m from the site; Farm Cove head is about 700 m south. Replace these with digitized connected shore polygons. Keep a single southern point-to-mainland neck; do not add land north or east of the point.
2. **Major — SYDNEY_BRIDGE and `SydneyEnvironment.createBridge`:** existing 140 m arch, deck32/top≈83 and constant-X alignment are materially undersized/misoriented. Use approximately503m arch,134m top,89m pylons,49m road and diagonal bridge axis, grounded bearings and continuous approaches.
3. **Major — `src/data/sydneyShells.ts`:** repeated independent paired vaults share parallel hall axes and omit the plan's stagger/fan and the full northern glass-foyer profiles. Restaurant location is too central. Reconstruct from the roof plan plus both longitudinal sections; match each envelope, mouth, eave, springing and overlap before adding tile detail. A75m spherical radius alone is not shape validation.
4. **Major — `src/data/sydneyConstruction.ts`, podium generation:** repeated96×138m rectangular block grid and generic frontal stairs do not reproduce the long stepped, articulated podium visible in both user photos. Current highest roof~67m is a useful retained height anchor; plan must be remeasured rather than simply scaling all dimensions. The often cited183×120m overall building envelope is not a rectangular podium instruction.
5. **Major — harbour context/lots/boats:** every placement depends on the rejected compressed geography. Move quays, streets, residential clusters and voyages together. A count-based test cannot validate water clearance or geographic identity; check continuous routes, hull extents and dry building corners against the new coast.

## Rebuild acceptance

First accept plan-view silhouette over the north-up aerial: connected southern land, separate Sydney Cove west and Farm Cove east, true bridge centre/axis/scale and opposing shore distance. Then accept hero orthographic north/south/east/west and roof plan against CMP and both photos. Finally judge the entire desktop/portrait film, including construction support, water transit and camera framing. Modern imagery anchors enduring coastline only; background buildings remain explicitly interpreted period types until dated evidence is assembled. This report does not certify an as-built digital twin or archaeological reconstruction.

## Implementation handoff (same-day authorized follow-up)

The reference audit now drives `sydneyTerrain.ts`, `sydneyHarbourContext.ts`, `sydneyHarbourLots.ts`, `sydneyBoats.ts` and the geography/bridge/parked-yard sections of `SydneyEnvironment.ts`. The north-up metre datum is shared; the hero/crew agent owns the separate hero registration (−12° rotation then +14.0,+8.2m world offset); the yard helper retains a rotation-only field frame. Detailed point shoreline and broader mainland polygons replace the analytic capsule. Terrain beyond the digitized aerial is a coarse contextual continuation, not a geospatially verified survey. Ground elevations are interpreted; shoreline X/Z is image-grounded.

The bridge uses a503m steel span centred at(−414,−524), a30° east-of-north axis,49m deck and134m top, with masonry pylons about±285m along its axis. Pylons sit outside the steel springing points. [OpenStreetMap south-pylon primary geometry](https://www.openstreetmap.org/api/0.6/way/382401361/full.json) and [north-pylon geometry](https://www.openstreetmap.org/api/0.6/way/156584774/full.json) were retrieved to cross-check shoreline-hidden bases. This is an approximate placement: the scene southern pylon group centre differs by about24m from the OSM outline bounding-box centre, and the northern group by about3m. Do not claim these bases are within the5–20m district tracing tolerance or survey-exact. Compact supported abutments fill only the obscured bridge/shore junction, never the open channel. Community map data attribution: © OpenStreetMap contributors, ODbL. The scene is not a cadastral product.

The five moving voyages and three berths are relocated together with the waterfront. Existing full rendered hull/cabin/mast clearance tests sample301 film times and the full conservative hull AABB, preserving the1m shoreline buffer, wharf exclusion, boat spacing and forward bow direction. The sixty-second film does not make the background a physically exact historical operations replay.

Verification: `npx vitest run tests/sydney-harbour-context.test.ts tests/sydney-boat-motion.test.ts tests/sydney-garden-composition.test.ts` passed18/18. Typecheck passed after the new Blender JSON became available. Tests include independent aerial landmark controls, south-only immediate land continuity, actual metres/bridge span/top, ground-route cross sections, rotated pylon bases, lot corners/street exclusions, and garden lawn/canopy containment. The renderer's existing115,000 shadow-weighted environment triangle ceiling remains passing. This is implementation evidence; full production desktop/portrait film acceptance is still required from the parent review.

## Quay and canopy correction,21:13 local

Replaced spaced water-level wall blocks with a joined vertical stone quay face from Y−1.2 to the actual ground-height coping. Adjacent sections share endpoint positions; the walk stays dry, with a narrow low-opacity waterline strip outside it. This does not extrude a sloping land skirt. Added a geometry regression for face verticality, upward coping and continuous joins.

Garden budget is now90, with82 accepted garden trees in three groups (24western,36landward,22eastern);161 total figs. Near shoulders extend toward the actual garden behind the forecourt, preserving all worksite, road, dry-ground, open-lawn and water clearances. Adjacent garden crowns may overlap up to3m in conservative footprints, with at least6m between trunks; only fig-to-fig packing within the garden receives this rule. This supports connected natural crowns instead of prohibiting all foliage contact. Other obstacles retain full-crown exclusion.

Intermediate environment budget before the road correction:97,825 shadow-weighted triangles, below115,000. Owned tests19/19; typecheck passes. Latest matched reference views are `../quay-garden-connected/` (18captures); inspected desktop northwest, roof-plan and portrait northwest across iterations. The reference harness reports an aborted `/@vite/client` resource and its associated console message, so its report is not a zero-error claim. Actual player capture `../quay-garden-yard/desktop.png` at t.58 has no console or page errors and shows the continuous wall, clear work lanes and denser adjacent trees. No model, camera or construction schedule changes made by this correction. At this intermediate capture, existing road/terrain sawtooth clipping remained visible; the correction below resolves it. This scope does not certify the whole rebuilt scene.

## Road depth correction,21:16 local

The separate sawtooth road issue above is now fixed. Ground routes previously used flat4m boxes raised from their centre sample; these intersected the sloping ground. Road footprints now clip directly against rendered terrain triangles and sit6cm above the same planes. Terrain elevations, coast, routes, camera and worksite layout are unchanged. An independent downward-ray regression checks every nondegenerate road triangle centroid against the actual rendered terrain and confirms the6cm gap, including sloped faces. Owned suites now20/20 and typecheck clean. `../quay-garden-road-final/desktop.png` is this audit’s latest actual-player t.58 evidence; inspected road is a continuous band with the previous triangular cuts gone. Its browser report has no console/page errors. These still/geometry checks do not claim universal zero flicker throughout the full rotating film.
Final environment budget after replacing road boxes: **84,611 shadow-weighted triangles** (115,000 ceiling); canopy remains82 garden trees/161figs. Temporary diagnostic tests used solely to print budgets were removed; the permanent regression tests remain.

## Final source/spec audit

Spec13 now records the final datum, approximate bridge placement,82-tree garden/90-instance cap,84,611 measured environment budget and terrain-conforming roads. The obsolete no-instance-increase/old-roof-preservation paragraph is superseded explicitly. Compass wording is tightened to bridge northwest and Circular Quay southwest. The bridge position is contextual, not survey-exact; modern aerials and interpreted1966 background remain clearly distinguished. No application source was changed during this audit.
