# Paris Exposition revision — 2026-09-07

The owner rejected duplicated buildings, vacant scenery and implausibly long
construction cranes. This revision uses a documented 1889 photograph as the
architectural reference and Anno 1800 imagery as a street-activity reference.

## Reference and interpretation

The parent inspected the actual CNAM image of *Vue d'ensemble des palais du
Champ de Mars*, Rapport général 1889 tome II, 8 Xae 349 (2), photographed from
the Eiffel Tower. Its paired domed palaces, central dome, Galerie des Machines,
formal garden axis and fountains informed the new volumes. This is an original
compressed interpretation; hidden elevations, colors and residential parcels
are authored. It is not a surveyed reconstruction or a photogrammetry result.
Exhibition completion is compressed around the tower erection film.

- [CNAM photograph](https://cnum.cnam.fr/expo_virtuelle/expositions_universelles/1798_1900/page_cartel/cartel.php?id=Paris_1889&num=3)
- [Carnavalet identification, G.30823](https://www.parismuseescollections.paris.fr/fr/musee-carnavalet/oeuvres/vue-d-ensemble-des-palais-du-champs-de-mars)
- [Anno pedestrian-zone art-team reference](https://www.anno-union.com/devblog-pedestrian-zone-pack/)
- [Anno source screenshot on Steam](https://store.steampowered.com/app/1704690/Anno_1800__Pedestrian_Zone_Pack/)
- [Eiffel official steam-crane history](https://www.toureiffel.paris/en/news/history-and-culture/eiffel-tower-and-its-steam-engines)
- [Peugeot historical experimental 1889 vehicle](https://www.peugeot.es/marca/universo-peugeot/historia-y-cultura.html)

Reference captures: `references/cnam-browser.png` and
`references/anno-market-browser.png`. The Anno evidence is an inspected game
screenshot, not a watched video; no game assets were imported.

## Actual Blender workflow

A fresh read-only probe verified the live installed Blender MCP connection.
The parent ran original Python geometry through the installed Blender Lab MCP's
`execute_blender_code`, in a separate scene preserving existing work. No new
plugin or skill installation was necessary. The resulting editable file is
`blender/paris-1889.blend`; its scene name and tool result are recorded in
`blender/mcp-build-result.json`.

Rebuild: `scripts/build-paris-exposition-via-mcp.py`, which executes
`scripts/blender_paris_exposition.py` and `scripts/paris_exposition_geometry.py`.
Current source copies are under `source/`, with SHA-256 hashes in
`asset-provenance.json`. Prior public assets and source remain under `before/`.
`mcp-build-v7.log` is the final city build; `render-v7.log` renders that saved file.

The static city has 222,250 triangles. It contains individually proportioned
residential parcels, the exhibition palaces, gardens, café terraces, market
stalls and a layered north-bank roofscape. The city renderer preserves every
exported triangle and material color, batches spatial cells into one
multi-geometry draw object, and culls cells individually. Subtle stone courses
fade below pixel resolution. The web material also adds antialiased window
patterns to the economical far-bank silhouettes; this finishing detail is a
runtime shader, not additional Blender mesh geometry. City shadow casting is disabled to preserve the
mobile budget; this is an economical stylized diorama, not a photorealistic asset.

Rendered Blender reviews: `renders/cnam-comparison.png`,
`renders/exposition-overview.png`, `renders/market-promenade.png`,
`renders/varied-parcels.png`. Browser close views are in `qa-close/`.

## Period life

The final traffic revision has 520 pedestrians, 24 horse-drawn vehicles,
two steam passenger boats and three moored barges. The fair additions include
market/table visitor pairs and small milling loops, plus palace/garden groups.
Only six of the last 160 additions use detailed actor geometry; 154 use
16-triangle distant silhouettes. This adds 3,712 authored triangles and keeps
520 actual independent actor positions rather than using a crowd texture.

The imported articulated prototypes preserve human scale, limb and wheel
motion, terrain contact, and separate walking/vehicle/river routes. Horses and
carriages replace an ordinary motor-car fleet, which would be inappropriate
for this setting. Remaining crowd limitations include economical distant
silhouettes and authored paths rather than emergent traffic simulation.

The renderer follows the [Three.js BatchedMesh guidance](https://threejs.org/docs/pages/BatchedMesh.html)
for repeated materials and differing geometry/transforms, with individual
frustum culling and explicit GPU-resource disposal. No scene triangles are
removed by the static-city batching step.

## Verification

The full repository suite passes 480 tests in 54 files. TypeScript and the
production build pass. Focused tests independently cover source GLB vertices,
terrain/paving contact, actor contact/clearance, rigid kit round trips, source
compaction, stage/dependency timing, carrier-bed support, operator/hauler soles,
and the fixed crane geometry. The city culling adjustment preserves all source
triangles/colors and only changes submitted off-screen geometry.

`EiffelWorld` now renders the 13,814-piece construction kit and the bounded
production works. Fixed jibs are 8.4 m; mast heights range from 8 to 22 m with
full-height stays. The conservative mast-envelope test probes four motion
fractions per operation. This does not certify swept collisions against every
seated tower member, load capacity or wind stability. Elevated freight delivery
is compressed to a receiving-deck handoff; the full ground-to-floor elevator
journey is not animated. Repetitive erection waves are a time-lapse, with
selected longer continuous lifts.

A startup profile exposed repeated quaternion/face work in the support search.
Caching each transformed face reduced the station-map test wall time from
25.61 s to 6.68 s. This is a test-process measurement, not a claimed device
loading benchmark. The GLTF object trees still incur a first-load cost.

Intermediate captures and optimization reports retain their original scope.
The final production browser report and measured GPU limits are appended below.


### Final local review

Production is served only on loopback at
[the Eiffel film](http://127.0.0.1:5589/?review=paris-1889-v7#/wonder/eiffel-tower).
The verified bundle is `/assets/index-CIjLjOSM.js`.

- 18 desktop/mobile production captures, no console or page errors.
- Native pointer seeking, completed playback, replay and exact-pixel reverse
  seeking passed; reduced motion opens the completed scene.
- Mobile 101-position sweep: peak 296,570 triangles
  at t=0.89, peak 119 calls at t=0.87.
- Desktop/mobile are Chromium viewports on this Mac, not a physical-phone GPU
  benchmark. The gates are 450k/200 calls desktop and 300k/150 calls mobile.
- `verification-summary.json`, `qa-final/report.json` and
  `qa-mobile-sweep/report.json` contain the final evidence. No broad claim of
  complete structural simulation or historical surveying is made.

The owner should review the new film before accepting Eiffel as complete or
starting another wonder. Previous evidence and assets are preserved.
