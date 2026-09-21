# Paris historical-image detail and flicker correction — 2026-09-07

The parent inspected two historical images and built the updated Paris scene
through the installed Blender Lab MCP. The fresh read-only probe reported
Blender 5.2.1 LTS before edits. No new plugin, remote model service, downloaded
geometry or game asset was used.

## Historical evidence and interpretation

- Library of Congress, [92519631](https://www.loc.gov/pictures/item/92519631/):
  1889 albumen photograph from the Trocadéro. The original JPEG is
  `references/loc-1889-trocadero.jpg`.
- Musée Carnavalet, [G.30823](https://www.parismuseescollections.paris.fr/fr/musee-carnavalet/oeuvres/vue-d-ensemble-des-palais-du-champs-de-mars):
  1889 photomechanical print, explicitly catalogued as an *estampe*, CC0.
  `references/carnavalet-manifest.json` preserves the actual IIIF metadata;
  `references/carnavalet-g30823.jpg` is the unmodified museum image.

Visible features informed projecting three-arch palace entrances, divided
glazing, cornice bands and round drum windows. These are real mesh details.
Both images are packed into the Blender source in a separate reference
collection excluded from GLB export. This is original, reference-led modeling;
it is not automatic single-image reconstruction or photogrammetry. Distances,
colors and unseen elevations remain authored. The scene is still stylized;
photographic material quality and a denser, less regular city remain open.

## Editable source and runtime

- `blender-final/paris-1889.blend` is the final editable checkpoint.
- `mcp-build-final.log` and `blender-final/mcp-build-result.json` are actual MCP
  execution results. `mcp-render-result.json` records the Blender render call.
- `renders/palace-detail.png` and `renders/photo-axis.png` show the Blender model.
- `public/models/paris-1889/paris-city.glb` is the integrated asset:
  233,722 triangles, down from 239,430. Smaller distant arches use fewer segments
  to pay for the new photo-visible detail. Prior asset/manifest are retained in
  `before-model/`; the first revised Blender checkpoint also remains.
- Builders: `scripts/blender_paris_exposition.py` and
  `scripts/paris_exposition_geometry.py`.

## Confirmed flicker defects

The parallel visual audit demonstrated two independent problems. Full evidence
is in `../eiffel-flicker-2026-09-07/`.

1. Thinly separated glass and backing walls lose depth precision at city
   distances. Eiffel's camera now uses near=5m instead of 0.5m. Same-camera A/B
   shows striped panes become solid. Actual transformed city/tower bounds clear
   the complete near-frustum at 402 desktop/mobile orbit positions.
2. Procedural water noise was unfiltered at subpixel scale. Eiffel-only shader
   filtering smoothly attenuates unresolved noise octaves, removing the dense
   fountain sun speckle in A/B captures. No geometry or draw calls are added.

Neither finding is a claim that all shadow/edge flicker is eliminated. The
near-plane contract covers the authored cinematic orbit, not arbitrary future
close-up cameras. Preserve this constraint when adding ground-lift close shots.

## Verification and remaining construction work

`qa/` contains six desktop/mobile model/life captures, zero console/page errors.
The asset contract reads actual exported entrance vertices and retains the
240k static-city budget. Final unit/build/browser results are recorded in
`verification.json`; production preview remains on 127.0.0.1:5589.

The material-origin complaint is still unresolved in the full movie. The new
ground-lift candidate in `../eiffel-integration-2026-09-07/` passes continuous
ground-cart/vertical-cargo clearance, but its rig needs removal before stage10
and actual sling geometry exposes an additional hook-sector limitation. The
isolated sampler is not integrated into production. Do not claim this Paris
checkpoint fixes construction continuity or completes the larger goal.
