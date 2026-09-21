# Paris 1889 — Blender background and period life

The parent built original geometry through the installed Blender Lab MCP
`execute_blender_code`, after a read-only connection probe. No new plugin was
needed. Existing Blender scenes were preserved. This is an authored compressed
Paris setting, not a surveyed reconstruction of every 1889 Exposition building.

## Editable source and exports

- `blender/paris-1889.blend`: editable city plus an articulated actor tray.
- `blender/mcp-build-result.json`: actual MCP response and export log.
- `../../scripts/blender_paris_1889.py`: reproducible original modeling script.
- `../../scripts/build-paris-via-mcp.py`: MCP SDK entry point.
- `../../public/models/paris-1889/paris-city.glb`: 126,912 triangles, 12 material batches.
- `../../public/models/paris-1889/paris-life.glb`: seven articulated actor prototypes.
- `asset-provenance.json`: saved-source/export hashes.
- `renders/`: Blender courtyard, façade and actor reviews.
- `qa-close/`: actual Three.js city, pedestrian, cart and boat close-ups on desktop/mobile.
- `qa-production/`: initial full-film captures and live playback evidence.

Forty enclosed courtyard blocks flank the Champ de Mars, with additional
opposite-bank masses. Stone façades have shops, awnings, balcony rails, zinc
mansards, dormers and chimney stacks. Connected roads and interrupted sidewalk
bands use the same terrain sampler as traffic. The original Palais and École
remain separate assets; the latter is still an older coarse background model.

## Living scene

18 pedestrians, four carts, two carriages, six horses, two steam passenger boats,
and three stationary cargo barges. Distance drives wheels and gait. Articulated
geometry is batched for the web; moving soles/hooves are corrected from transformed
vertices. Barges have mooring lines. Horse rigs and pedestrian gait are economical
diorama approximations, not biomechanical simulations. Routes are authored for
this compressed city and avoid the construction yard. Steam boats follow the
open bridge arches; distant bridge soffits were raised to accommodate them.

No ordinary motor-car fleet: [Peugeot](https://www.peugeot.es/marca/universo-peugeot/historia-y-cultura.html)
records an uncommercialized steam tricycle at the 1889 Exposition. River passenger
craft are period appropriate: [BnF on the 1867 Exposition](https://gallica.bnf.fr/accueil/fr/html/lexposition-universelle-de-1867-la-bibliotheque-imperiale?mode=desktop)
documents their earlier introduction. [Carnavalet's 1889 Seine photograph](https://www.parismuseescollections.paris.fr/en/node/179673)
is additional period context. These are research references; no meshes or textures
were downloaded from them.

## Corrections made during verification

The initial export accidentally included preserved scenes; `use_active_scene`
now limits each GLB to its requested collection. Exported scene contents and
bounds are tested. Road, cylinder and mansard winding were corrected. Mansard normals have an explicit outward/upward regression check. Facade panes use a small modeled stand-off to survive cinematic depth precision. Sidewalk strips
stop at intersections. Inherited random courtyard trees were replaced with
placements inside the new modeled courts. The initial ±12 m boat lanes hit the
bridge piers; ±20 m lanes align with the openings and have transformed-vertex
clearance tests. Barges no longer move without a modeled propulsion system. Their ropes attach at the gunwales and end on visible bollards; a test verifies each bollard bottom against the actual quay solids. Berths beyond the finite quay were moved inward. Wheel rotation cancels forward rim contact velocity in both route directions.

The production build initially scanned retained evidence through Tailwind,
using tens of GB of memory. `src/index.css` now scopes class detection to `src/`;
the rebuilt production bundle completed in 1.93 seconds. No evidence was deleted.

## Runtime visibility and controls

The city is partitioned into 104 m cells, with dense inner cells subdivided once. The runtime preserves all exported triangles and vertex colors while culling off-screen blocks; a single matte material is an intentional distant-scene approximation. Source GLBs remain unchanged by this optimization. This replaced a mobile workload around 386k triangles.

Touch/pen presses now reveal hidden cinematic controls, matching pointer movement and keyboard input. The previous touch-only preview could not reliably expose Pause.

## Remaining full-goal work

The main Eiffel film still uses the old whole-tier transport/crane choreography.
The user's screenshot correctly exposes an unrealistic long horizontal jib.
This Paris update does not resolve that. The bounded Blender kit and first
16 small-member lifts are separate reviewed work in
`../eiffel-mechanics-2026-09-06/README.md`; upper supports, joints, freight-lift
handoffs and swept cargo clearance remain unfinished. The next wonder has not
been selected because Eiffel has not yet earned full acceptance.

## Final local verification

462 tests in 50 files, TypeScript and production build pass. `qa-reviewed/`
contains 18 desktop/mobile timeline frames plus playback, exact-pixel reverse
seeking, replay and reduced-motion evidence. `qa-mobile-sweep/` tests 101 real
portrait timeline positions including a touch press to reveal controls. Its
peaks are 298,463 triangles at t=.87 and 150 calls at t=.36; no browser errors.
`verification.json` records the bundle and full measured results.

The local production URL is http://127.0.0.1:5589/#/wonder/eiffel-tower.
This is a Paris-pass review checkpoint, not acceptance of the complete Eiffel
construction choreography or parity with Giza. No next wonder was selected.
