# Second-floor stock to197m receiving — 2026-09-08

A182second continuous same-crate excerpt now starts on a wheeled stock cart
on the actual second-floor deck level, crosses a two-ended transfer bridge,
hoists80.72m, then traverses and lowers onto the197m receiver.
Main production remains v15/264s; this excerpt is not full-goal completion.

Current update: flush deck and visible cart pusher are documented in
`../eiffel-supply-crew-2026-09-08/README.md`. Its 657-test run and desktop/mobile
QA supersede the earlier 650-test evidence below. Old bridge design and GLB
are preserved with `before-flush-deck` names.

## Artifacts and implementation

Parent actual Blender Lab MCP, after fresh read-only probe, created a separate
scene and saved `blender/eiffel-second-floor-bridge.blend` and
`model/second-floor-bridge.glb`. Planner `scripts/plan-eiffel-second-floor-bridge.py`;
Blender builder `scripts/blender_eiffel_second_floor_bridge.py`; wrapper
`scripts/build-eiffel-second-floor-bridge-via-mcp.py`. Source `bridge-design.json`
has211prisms: bearings, side trusses, hanging joists, ledgers and90planks. Actual cart
has four wheels, axles, bearings and a bed. MCP result/probe in `mcp/`.
This bridge is an interpreted temporary structure, not a measured1889 detail.

Pure `src/engine/eiffelSecondFloorSupply.ts` uses the shared rig geometry in
`eiffelRelayReceiving.ts`. Cart20s, rigging6s, hoist140s, hold4s, traverse8s,
lower4s. Cargo center starts[-15,117.38,-1.8]; bed top116.48; wheel bottoms
116.14. Upper receipt ends[0,197.9,-3.6] with bottom197.0. Cart stays on bridge.
Peak ascent speed below0.87m/s. Sling endpoints blend during rigging; a visible cart pusher is now included.
Rigging/hoist operators, steam power, trolley drive and equipment erection remain missing, so this is
not a complete operational reconstruction. Ground/first-floor delivery and
upper stock-to-final-iron installation also remain unmodeled.

## Geometry and verification

The second-floor top is116.139999m, central hole±9m. A below-deck truss proposal
collided with existing iron, so the bridge uses side trusses. Preliminary
read-only study remains in ../eiffel-relay-platform-2026-09-08/second-floor-bridge-audit.json.
Final bearings x±9.7,z-2.45/-1.15 rest on actual east/west floor meshes; all16
corner rays match both source bearing bottoms and real deck. Wood planks span
between side chords, width1.2m; diagonal radius.05 avoids cutting into timber.
211source prisms clear all11386 completed kit envelopes throughstage45.
The full crate transfer and continuous upward sweep clear bridge, kit,197m
platform and winch frame. Actual GLB wheel/deck rays and bearing undersides
pass; entire actual cart AABB sweep clears bridge and completed kit.

Full650tests/99files, typecheck and build pass. Final focused bearing test also
passes after strengthening contact comparison. Logs `tests.log`,
`tests-bearing-final.log`, `typecheck.log`, `build.log`. Desktop1440x1000 and
mobile390x844:8seeks including reverse, live playback, overview/follow switch,
console/overflow checks pass (`web/qa.json`); parent inspected desktop source
and mid-hoist images. Tower context is merged by material for the study viewer.

Review: http://127.0.0.1:5590/artifacts/eiffel-second-floor-supply-2026-09-08/review.html

Next: connect the preceding floor delivery and powered operation, and integrate real cargo continuity into
main-film construction. The current excerpt must not be presented as the full
historical supply chain or a fix to the unchanged generic upper production.
