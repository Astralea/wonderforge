# Summit cargo — saved Blender candidate, 2026-09-08

This isolated candidate has **not replaced the production Eiffel film**. The goal remains active. Resolve the actual cargo-drive obstruction of the ladder, complete the luff/control/winding and receiving/crew actions, then integrate both upper mast lifts together. Do not spend another turn recertifying unchanged water.

## Current source

The parent personally built through the installed Blender Lab MCP after a read-only desktop probe. No new plugin was needed. Desktop Blender was preserved; a separate temporary Blender served the build on9877.

- `blender/eiffel-summit-cargo-rig.blend`: neutral editable source,778objects/714meshes/64roles.
- `blender/eiffel-summit-cargo-rig-review.blend`: separate tower/stock context and camera.
- `model/summit-cargo-rig.glb`: V6 SHA256 `17db309645e75584789db5757e4ac0e75abb8135df93c32ef30164548c2e8d46`.
- Repository builder: `scripts/blender_eiffel_summit_cargo.py`; real MCP build/readback wrapper: `scripts/build-eiffel-summit-cargo-via-mcp.py`.
- `versions/v1` through `versions/v5` preserve previous candidates. Original V9 and public tower/city assets are unchanged.

## Construction sequence

Exact c001 carries m074/m075; c002 carries m076. Each starts flat on the terrace cart at parent[-6.4701368053,281.0400000036,0]. Tail collar localZ−2.0333333333 is held by two opposed stub axles, neither passing through the solid mast. Upper collar localZ+2.0333333333 takes the two-leg sling.

The112-second sequence fixes the tail during single-axis upending, holds the upright load on the tackle, retracts both pins, turns the assembly, raises it outside the roof, transfers through perpendicular high legs, and seats at the exact final pose. All member dimensions and child poses remain rigid. Centre-based SLERP upending is rejected.

An outboard heel offset0.30m and5.70m lattice jib retain6m maximum planar reach. This resolves the measured V4 crosspin/chord collision. The head has a positive cap, thrust bearing, clevis and reaction webs. Both cargo lifts use the already seated m073 drive; the future climbing drive sits on m075.

The rope solver has17 tangent/arc segments, annular side feed, two cargo falls and fixed bridle legs. Block height is collar+1.80m, lower eye collar+1.61m. Bounded V5 route metrics give at least1.0886m headroom and16.6788mm bridle rope-surface clearance. The renderer must display those actual paths and positioned block, not merely cable metadata.

## Evidence and remaining work

- `engine/source-sweeps.json`:449samples of actual crosspin triangles versus timber-chord boxes, clear;201samples of actual cart triangles versus all three c001 member boxes through upend/release/yaw, clear with50µm contact allowance. Assembly1 only; not every body pair or strength.
- Actual wheel/terrace contacts and collar stations are tested in `tests/eiffel-summit-cargo-asset.test.ts`; `terrace-support.json` preserves324route rays.
- `design/README.md` and `design/rope-metrics.json`: tangent continuity, phase continuity and bridle evidence. Full rope-versus-source clearance and real multilayer spooling remain unadmitted. The full-capacity winding is a reference and is hidden in the moving preview.
- `access/endpoint-preview/README.md`: actual palms and bounded desktop/mobile upper-crank endpoint evidence on V5. V6 changes only terrace stub axles; endpoint hardware is identical. This does not admit full ascent or64–80s handoff.
- The mirrored initial cargo upper fairlead[.19,303.32,−.34] obstructs the ladder near its right stile. Actual intersections are in `access/outboard-clearance.json`. This is a failed physical gate.
- Complete luff tackle/drive, visible guide operations, drum inventory/fleet angle, receiving attachment/detachment and ground-to-terrace provenance remain unfinished. The candidate begins with stock/rig installed and ends before complete sling removal.

Local candidate: http://127.0.0.1:5590/artifacts/eiffel-summit-cargo-2026-09-08/preview/index.html . Production remains on5589. See `final-verification.json` for final source/test/browser identities once frozen.
