# Paris frontage variation and north-bank visitors — 2026-09-08

This checkpoint updates the actual main film. The broader Eiffel goal remains
active: distant street layout is still too regular, and the full ground-to-seat
construction process has not been promoted from its separate studies.

Review: http://127.0.0.1:5589/?review=paris-frontages-v15#/wonder/eiffel-tower
Production bundle: `main-Dcd_FVbt.js`. Film length remains 264 seconds.

## Actual Blender work and source

Parent used the installed Blender Lab MCP SDK, with a successful read-only
probe before the build. Blender reported 5.2.1 LTS. The new isolated Paris scene
is saved as `blender/paris-1889.blend`; earlier scenes and evidence are preserved.
It contains the packed facade atlas and the historical reference boards. See
`blender/mcp-readonly-probe.json` and `blender/mcp-build-result.json`.

- One embedded four-frontage atlas now covers near and distant residential
  walls. Styles vary opening shape, stone tone and shopfront treatment. Each
  quarter covers three bays; UV edges align with complete frontages.
- The actual generated image has ground plus three residential storeys,
  1774 × 887 pixels. Eave heights were adjusted to this result. Roof volumes,
  cornices, chimneys, selected awnings and near dormers remain actual geometry.
- Removed redundant floating window/balcony grids over the new mapped walls.
  Most residential roof colors are now slate/zinc rather than red.
- Added 24 attached riverfront houses following the rotated Seine, outside the
  dry-bank threshold, Palais reserve and existing street footprints.
- Added 128 moving north-bank visitors on eight existing paved sidewalk
  sections. Total city pedestrians: 648. Existing 24 horse carts/carriages
  and five river craft remain. The new visitors use existing distant geometry;
  population placement and movement are Web scene data, not Blender keyframes.

City mesh: **158,642 triangles**, down from 239,742; GLB **11,705,680 bytes**.
The source and production copies of the GLB, life GLB, manifest and atlas have
matching hashes in `asset-hashes.json`. Source snapshots are under `source/`.
The old texture and `before/` assets remain available.

## Image evidence and interpretation

Inspected the [1889 Liébert balloon photograph](https://www.loc.gov/item/92514593/)
and its existing local copy. It informs attached frontages, roof/court rhythm
and river-bank occupation; our coordinates, heights and hidden elevations are
authored and compressed. It is not a surveyed reconstruction.

Also located the [1889 café-restaurant facade catalog entry, PH76699](https://www.parismuseescollections.paris.fr/fr/musee-carnavalet/oeuvres/exposition-universelle-de-1889-facade-d-un-cafe-restaurant).
Its catalog was read, but the actual image was not inspected in this pass and
is not claimed as a visual modeling source.

`public/models/paris-1889/textures/paris-frontages-v2.png` is **original generated
art**, not a historical photograph. The built-in image tool made the atlas;
Blender modeling and UV mapping produced the 3D asset. No automatic single-image
mesh service or photogrammetry was used. No new plugin or skill was installed.

## Verification

- 600 tests / 83 files pass with `npm run test -- --maxWorkers=2`; typecheck and
  build pass. The first concurrent full run had one unchanged foundation-crew
  timeout; the complete final rerun passed. Both logs are retained.
- Tests decode the GLB's embedded PNG and compare actual pixels with the source,
  check whole-frontage UV boundaries, preserve every mapped corner through Web
  batching, and verify texture disposal. They also test all 24 new house wall
  corners against the actual GLB and dry-bank/Palais/street clearances.
- At six times spanning the full 264 s movie, all 128 new visitors' four sole
  footprint corners hit actual exported paving within 0.10 m. Building and
  pairwise body clearances pass. This is sampled actor verification.
- Actual production desktop/mobile QA covers six seeks, two live playback
  intervals, exact reverse-seek canvas pixels and browser errors. See
  `after/qa/report.json`; videos and screenshots are retained.
- 101-point mobile sweep: peak **288,517 triangles**, peak **149 calls**,
  within 300k / 150. No browser errors. This is sampled GPU coverage.
- Twenty-frame close facade camera test compares the same new texture with
  filtering enabled/disabled. Mean tracked luma changes: desktop 17.914 → 7.146
  (60.1% lower), mobile 18.942 → 8.308 (56.1% lower). This is an aliasing proxy
  for these facades, not proof that water, glazing or every subpixel edge never
  flickers. Existing water filtering, film-grain removal and near-plane settings
  remain unchanged.
- Actual Blender MCP rendered three views under `renders/`; source detail and
  production desktop/mobile screenshots were inspected. The 15-file previous
  mechanical evidence seal still matches; construction geometry is unchanged.

## Remaining work

The far north-bank grid and wide bare bands still look authored and repetitive;
the scene is not photorealistic. New visitors are distant at the normal tower
camera, so their numerical count is not a claim of Anno-like visible density.
Street layout, richer occupied quays and camera-scale readability still need work.

Mechanical priority remains the evidence in
`artifacts/eiffel-face-installation-2026-09-08/README.md`: four individual pad
extraction sweeps collide with the still-packed 37.91 kg plate. Resolve joined
prefabrication or a supported plate-first removal before installation and kit
promotion. Most upper operations still originate aloft. Do not mark the goal
complete or move to another wonder on the basis of this Paris checkpoint.
