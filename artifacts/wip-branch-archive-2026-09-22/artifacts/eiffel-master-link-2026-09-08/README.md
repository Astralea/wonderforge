# Long-load master link

Review: http://127.0.0.1:5590/artifacts/eiffel-master-link-2026-09-08/review.html
Use **查看吊索接頭** for the moving assembly closeup.

The preceding real-load viewer joined five ropes at a point. This revision adds a visible closed master link and five separate rope eyes around its material. The carrier's trajectory, real member, receiving frame and final cart contact are preserved. Previous viewers and the main Eiffel film are unchanged.

## Authored asset

Parent used the installed Blender MCP after a read-only probe. Saved `blender/eiffel-master-link.blend`, exported `model/master-link.glb`. The assembly has ten mesh roles: master link, upper rope eye, four lower rope eyes and four sling legs. Reproduce with `scripts/plan-eiffel-master-link.py` and `scripts/build-eiffel-master-link-via-mcp.py`; Blender source is `scripts/blender_eiffel_master_link.py`.

The ring has130mm centreline radius and18mm bar radius. Cable radius is8mm. Tangent eye legs join far arcs around the solid bar; four lower eyes occupy distinct places on its lower half. Their splice apexes connect to the carrier-eye contact points. This is an interpreted detail; the period-specific form has not been established and it is not a claim of an exact1889 fitting.

Initial circular-polyline chords intruded into the ideal bar clearance envelope by18–19micrometres. Those design/model/blend versions are preserved as `before-eye-chord-correction`. The corrected planner circumscribes each arc's bar-contact circle, making segment interiors tangent instead of checking only its vertices. It does not loosen a clearance tolerance to accept the original result.

## Animation and checks

`src/engine/eiffelMasterLinkHoist.ts` retains the existing128-second carrier trajectory and places the master assembly at its former hook origin. The hoist now ends at the real upper rope-eye apex250mm above that origin; deployed rope length is shortened accordingly. It no longer passes through the centre of the ring. Remaining vertical clearance beneath the sheave is0.387499693m.

Independent `audit.ts/json` and four actual-asset tests check all32 non-splice path pairs; only the four intended same-index eye-to-leg splice junctions are excluded. Distinct sling legs have at least0.132322371m of surface separation; apparent crossing in the closeup is projection. Corrected analytic eye centreline distance from the ideal bar centreline is26mm, equal to18+8mm. Actual exported-ring triangle rays report0.064–0.148mm positive surface gaps from tessellation. These are geometric checks, not proof of loaded stress or knot/splice strength.

The composed-engine regression preserves carrier poses, retained attachment, exact new hoist termination and positive headroom. `environment-audit.json` sweeps the actual complete assembly bounding box over all three moving route legs against11386 tower envelopes,449 bridge prisms including the open hatch, and21 receiving-frame prisms without intersections. Moving trolley hardware and lower carrier fittings are separate gates; this audit does not imply their complete lifecycle is verified.

Desktop1440x1000 and mobile390x844 each passed11 seeks, reverse seek, live play, overview/follow and pointer orbit. Actual rendered carrier/member dimensions and master origin are checked against the pure sampler. Both closeups were inspected by parent. No page errors or horizontal overflow were reported. Evidence is in `web/`, with MCP and verification logs alongside.

## Still required

The lower carrier-eye terminations still use the preceding contact approximation and need proper closure. Rope-eye splices are geometric junctions, not individually woven strands. Load rating/stability, powered winch and brake, cart fastening/release, rigging workers, equipment erection, later long-member relays, broad-panel handling and final tower placement remain open. Main integration and Paris/camera/sky work remain part of the active full goal. No next wonder has been started.

Final project verification:734 tests in124 files passed; typecheck/build passed, with the existing bundle-size warning. Browser peak86606 triangles in both tested viewports. All MCP, browser QA and verification processes for this checkpoint finished successfully.
