# 197m relay receiving station — 2026-09-08

Actual parent Blender Lab MCP modeled a supported drum, braced head-frame,
traveling sheave trolley and banded test crate in a new isolated scene.
Saved `blender/eiffel-relay-winch.blend`; reusable articulated export
`model/relay-winch.glb`; source `scripts/blender_eiffel_relay_winch.py`, planner
`scripts/plan-eiffel-relay-winch.py`, MCP wrapper
`scripts/build-eiffel-relay-winch-via-mcp.py`. Fresh read-only probe and result
are in `mcp/`; logs retain initial/final/cargo runs. Design is interpreted,
not a measured historical machine or rated structure.

## What runs

`review.html` on Vite5590 uses pure `src/engine/eiffelRelayReceiving.ts`:
32seconds of the same crate lifting from centerY190.9 to198.1, holding,
traveling z-1.8 to-3.6, then lowering to centerY197.9 (bottom197.0).
The rope follows an external drum/sheave tangent and the upper sheave arc.
Winch rotation follows deployed rope length; sheave rotation follows vertical
cargo travel; trolley wheels obey no-slip translation. The actual Blender
crate and machine remain rigid. This is the final receiving portion only;
it does not imply that stock below the platform came from ground in this clip.
The lower supply chain, steam power, trolley drive, operators, hold-down
fastenings and erection sequence remain unmodeled. Main movie v15/264s remains.

## Verified and corrected

Read-only child search found lane x0,z-1.8 for a0.6x1.8x0.6 envelope; source
`../eiffel-relay-platform-2026-09-08/freight-lane-search.json`.
22 frame prisms clear144 platform prisms and11386 stage<=45 kit envelopes.
Initial front base-cross z-3.4 blocked transfer120mm/lowering180mm; retained
`design-before-crossbar-fix.json` and `model/relay-winch-before-crossbar-fix.glb`.
Moved it toz-4.1, shortened skid span to3.05m and seated mast bottoms on skids.
Corrected full crate sweeps pass against all frame/platform/kit obstacles.

Actual GLB four wheel bottoms are checked against rays hitting actual rails.
Parent expanded the child moving-mesh audit from7 selected parts to all13
meshes under the trolley, including sheave/hangers; all whole-translation AABB
sweeps clear the22 fixed frame prisms. Crate9meshes fit0.6x1.8x0.6 envelope
(actual width.58). Pure sampler tests continuity, deck contact, tangency and
rotation directions. These do not certify mechanical capacity or the missing
end-to-end supply chain.

Full suite641tests/96files passed before final rotation assertion was added.
Final affected tests9/9 pass; typecheck and build pass. Logs `tests.log`,
`tests-final-focused.log`, `typecheck.log`, `build.log`. Parent corrected two
TypeScript errors in the child's first test version before final verification.
Desktop1440x1000/mobile390x844:6seeks including reverse, live playback, console
and overflow checks pass (`web/qa.json`); parent inspected captures.

Next: connect the receiving mechanism to an actual lower-floor stock delivery
and persistent machinery lifecycle, then integrate supported cargo into main
construction. Do not substitute this station excerpt for full-goal completion.
