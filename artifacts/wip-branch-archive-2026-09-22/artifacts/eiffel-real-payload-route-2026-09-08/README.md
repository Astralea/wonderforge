# Real long-member first-floor receiver

Review: http://127.0.0.1:5590/artifacts/eiffel-real-payload-route-2026-09-08/review.html

This revision replaces the small-proxy headroom assumption with actual long kit-member dimensions. It is an isolated static geometric review; neither the main Eiffel timeline nor the 488-second proxy animation changes.

## Blender source and geometry

Parent used actual installed Blender MCP, beginning with a read-only probe, to save `blender/eiffel-long-member-first-receiver.blend` and export `model/long-member-first-receiver.glb`. Generator: `scripts/blender_eiffel_long_member_first_receiver.py`; planner: `scripts/plan-eiffel-long-member-first-receiver.py`; invocation: `scripts/build-eiffel-long-member-first-receiver-via-mcp.py`. MCP responses and logs are retained here.

The 21-member frame keeps the original first-floor skids and drum location. Mast, backstay and head-brace endpoints are recomputed for a canonical205.4 m head, three metres above the previous candidate. Rails and trolley are raised accordingly; world sheave centre is approximately66 m. The model is not globally translated off its bearings or uniformly scaled. Existing previously exported assets remain unchanged. The front base crossbar remains omitted as in the cart-ready predecessor.

## Real payload route results

`audit.ts` evaluates four actual box members at all six canonical-axis assignments. Each of four route legs uses an exact convex translation sweep. Obstacles include11386 completed stage45 tower member envelopes and449 bridge prisms, plus old/proposed frame prisms reported separately. All five hatch planks are physically rotated90 degrees about the authored pivot during the three lift/landing legs; they are closed for cart transit. The initial report that omitted them is preserved as `audit-before-open-hatch.json` and superseded.

With local Z vertical (assignment[0,2,1], also its transverse symmetric assignment), all payload route legs clear for:

| Member | Actual length | Old63m sheave shortfall | Proposed66m headroom |
| --- | ---: | ---: | ---: |
| shaft-13-m005-c000 | 5.95147m | 1.98147m | 1.01853m |
| platform-3-0-00-m023-c000 | 5.40000m | 1.43000m | 1.57000m |
| summit-access-stair-m000-c000 | 5.99250m | 2.02250m | 0.97750m |

Hook screening uses payload top plus0.55m. Payload bottom traverses at firstFloor+.54m, lowers to cart bed at firstFloor+.34m, then moves from cartX=-21.5 to-8.5. Headroom is distinct from cargo collision; the old frame's solids can clear the payload while the hook cannot fit above it.

The gallery panel `summit-gallery-0-0-m006-c000` has no clear axis permutation. In the best upright assignment its2.20m width intersects ten tower/bridge solids during ascent, including plank-005. This does not prove every possible continuously angled route impossible; it rules out directly reusing the current axis-aligned route and calls for dedicated panel handling. Horizontal long-member variants also hit tower/bridge solids.

## Verification and limits

- `frame-audit.json`:21 frame prisms clear11386 tower envelopes and449 bridge prisms.
- Two new tests independently repeat frame clearance, verify unchanged skid geometry, match exported mesh vertices to every authored frame corner within20micrometres and ray-check all eight skid-bottom corners against actual exported deck triangles.
- Full project:722 tests in120 files, typecheck and build passed. Existing large-bundle warning remains.
- Desktop1440x1000 and mobile390x844 pointer-orbit review passed with no browser errors or horizontal overflow;73476 triangles. Parent inspected both default screenshots. Web geometry displays the actual5.9925m member on the cart bed to expose the scale/headroom relationship.

The three clear results cover payload envelopes, not full rigging or operational delivery. Carrier restraint for upright members, slings and hooks, drive, brakes, lateral retention, load capacity, bracing/anchorage, equipment erection, crew and actual member installation remain required. Source-frame clearance does not establish every non-frame hardware clearance. No strength or stability certification is claimed. Broad-panel routes, later receiving levels, main integration, Paris rendering and the full goal remain open.
