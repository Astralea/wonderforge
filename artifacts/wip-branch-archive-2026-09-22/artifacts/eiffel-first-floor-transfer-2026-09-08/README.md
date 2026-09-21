# Continuous ground supply and first-floor cart transfer

Actual Blender Lab MCP created two separate scenes, saved in:

- `blender/eiffel-first-floor-bridge.blend`
- `blender/eiffel-first-floor-winch.blend`

Exports are `model/first-floor-bridge.glb` and `model/first-floor-winch.glb`.
Original standalone receiving assets remain in the adjacent first-floor-winch
folder. The rejected crossbar variant is preserved with
`before-worker-clearance` filenames. Fresh read-only probes and build results
are in `mcp/` and `mcp-hinges/`. Parent performed all Blender work.

The449-prism bridge spans real first-floor bearings atx±20.7,z-4±1.05.
Its203 timber planks include five forming a hinged opening atx[-20.3,-19.3].
Deep side trusses carry suspended cross-joists and ledgers; the deck is flush
at57.94000244140625m. The first-floor ground-lift lane remains open until the
crate has moved off the opening. Two actual hinge assemblies have bored
knuckles, pins, bearing seats and moving leaves; the hinge axis is outside
the timber edge so the pin does not intersect solid wood.

The new receiving variant has21 frame prisms. Its unnecessary third front
crossbar conflicted with the pusher's right shin by0.105m, so this variant
omits that bar. The two rear crossbars still support the winch bed. This is
not a structural capacity or anchorage certification. Widening the bridge
side trusses also resolved their initial conflicts with the winch braces.

## Animation

`src/engine/eiffelFirstFloorTransfer.ts` drives one166s lifecycle:
ground lift to a waiting cart, hatch closure122–126s, sling release128–132s,
empty-hook recovery132–134s, then13m cart travel134–160s. The same crate
remains on the cart atx-8.5,z-4 at the end. The worker uses fixed-size parts,
planted footsteps and handle contact through the generic pusher sampler.
The original128s first-floor floor-landing study remains unchanged.

Review: http://127.0.0.1:5590/artifacts/eiffel-first-floor-transfer-2026-09-08/review.html

## Verification and remaining work

677tests across108files, typecheck and build passed. Logs are in this folder;
the existing build chunk-size warning remains.

Source tests include bridge/frame/tower clearance, the open-hatch ground
route, actual-floor or bridge wheel support, dense hatch closure against the
crate, and cart/worker clearance. Actual GLB tests replay all cart meshes and
worker solids against every receiving-rig mesh, check the open/closed hatch
with rays, and test real hinge bores and pins throughout rotation.

Desktop1440x1000 and mobile390x844 each pass12 time samples including reverse,
live playback, overview/follow controls, console and overflow checks. Final
captures are in `web/`; the follow camera was raised to clear the receiving
frame while showing worker and cart. Parent inspected desktop travel and
mobile receiving images. Fine deck seam speckling remains visible; no blanket
claim of flicker-free or photoreal rendering is made.

The second hoist, steam/brake/trolley drive, unloading crew, equipment
connections/anchorage and erection remain incomplete. This uses a test crate;
final structural iron installation is not yet connected. Main v15/264s is
unchanged. Next build the second receiver and connect this same load onward,
then integrate the admitted lifecycle into the main construction movie.
