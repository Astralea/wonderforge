# Two-floor continuous supply

Parent used actual Blender Lab MCP after a fresh read-only probe to save
`blender/eiffel-second-floor-receiver.blend` and export
`model/second-floor-receiver.glb`. The model includes the21-prism receiving
frame, winding drum, traveling sheave and a separate real second-floor cart.
Evidence is in `mcp/`. Earlier models and independent studies remain intact.

The rig uses the canonical frame under a rigid transform to the116.14m deck.
It hoists fromx-8.5,z-4 and traverses1.75m to the waiting cart atx-10.25,z-4.
The same cargo starts on the ground in the combined290s excerpt, lands on the
first cart, travels over the first-floor bridge, attaches to the second hook
163–166s, rises166–272s, traverses272–280s, and lowers280–284s. Both carts and
workers remain present. Peak second ascent speed is below.85m/s.

`src/engine/eiffelTwoFloorSupply.ts` composes the earlier admitted geometry.
The viewer retains one original cargo object for the entire journey; the
receiver export's source cargo is hidden before initialization. Its actual
world position is compared against the pure sampler at each QA sample.

Review: http://127.0.0.1:5590/artifacts/eiffel-second-floor-receiver-2026-09-08/review.html

## Verification

686tests across110files, typecheck and build passed. Source tests include all
completed stage45 iron and both transfer bridges. Asset tests check eight
skid corners and four cart wheels against actual floor triangles, actual cart
bed contact, waiting-worker clearance against all rig/cart meshes, and every
exported trolley mesh's whole travel. Only named wheel/rail contact uses20µm
Float32 tolerance; other collisions use1µm.

Desktop1440x1000 and mobile390x844 each passed16 time samples, including hook
ownership boundary166/166.001, reverse seek, live playback, overview/follow,
console and overflow checks. Every frame has exactly one visible cargo; the
first cart stays atx-8.5 after handoff. Parent inspected desktop ascent and
mobile receipt. Final evidence: `web/qa.json` and captures.

Ropes use instanced segments and fixed frame/drum meshes merge only within
rigid parents. An initial merge failed because cylinders carried UV attributes
and untextured boxes did not; the final untextured rigid batches consistently
omit unused UVs. Final QA reached114 draw calls and80,850 triangles on both
viewports. Those are mechanism-viewer figures, not full Paris production cost.
Fine deck seam speckling remains; no complete flicker/photorealism claim.

## Remaining work

The new receiver does not yet connect its second-floor cart to the existing
197m relay pickup. A supported lateral transfer is required; do not teleport
this crate to the older cart's start point. Steam/brake/trolley drive, active
riggers, anchorage, equipment erection and actual structural iron installation
remain incomplete. Main v15/264s remains unchanged. This advances a continuous
supply chain but is not full goal completion or a structural capacity rating.
