# Visible pusher and flush second-floor supply

Actual Blender Lab MCP was used after fresh read-only probes. The pusher is
saved in `blender/eiffel-supply-pusher.blend` and `model/supply-pusher.glb`.
The rebuilt bridge remains in the adjacent second-floor-supply folder.
No plugin installation was needed. MCP evidence is in `mcp/` and MCP logs.

The bridge surface now meets the real second floor at 116.14m without the
previous 0.38m step. Its 211 prisms include 90 planks, hanging cross-joists and
ledgers supported by side trusses. A cart starts on the west floor at x=-15
and rolls 15m to the pickup point. Cargo bottom rests on its bed at 116.48m.
A fixed-size 18-part worker walks behind it, holds the actual push bar,
releases it after arrival, and remains with the empty cart. Distance-driven
footsteps keep stance feet planted; arm/leg IK preserves segment lengths.

Source: `src/engine/eiffelSupplyPusher.ts`,
`scripts/plan-eiffel-supply-pusher.ts`,
`scripts/blender_eiffel_supply_pusher.py`, and
`scripts/build-eiffel-supply-pusher-via-mcp.py`.

## Verification

657 tests across 102 files passed; `npm run typecheck` and `npm run build`
passed using Node 24. Logs are in this folder. Build retains the existing
large-chunk warning. Checks include actual GLB wheel/floor and bearing
contacts, full cart/cargo sweeps, fixed worker part sizes, planted shoe-corner
rays against real floor/bridge meshes, hand/handle contact, and dense worker
clearance against cart, bridge, completed tower and cargo.

`qa.mjs` checks desktop 1440x1000 and mobile 390x844 at 11 time samples,
including backward seek, live playback, overview/follow controls, console
errors and horizontal overflow. Final evidence is `web/qa.json` and PNGs.
The follow camera was adjusted so the worker is visible behind the cart.

Review: http://127.0.0.1:5590/artifacts/eiffel-second-floor-supply-2026-09-08/review.html

This remains an interpreted 182s second-floor-to-197m supply study. It is not
an engineering capacity certification or a complete historical reconstruction.
Ground/first-floor supply, rigging operators, powered drives, erection and
final iron installation remain incomplete. The main v15 / 264s animation is
unchanged and does not yet incorporate this lifecycle.
