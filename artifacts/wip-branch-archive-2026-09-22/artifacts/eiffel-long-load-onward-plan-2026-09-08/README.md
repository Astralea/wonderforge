# Next actual long-load segment: fasten, open, retain sling, start cart

Read-only preparation; no implementation or Blender/MCP changes. The smallest useful continuation is **84 seconds after the existing 128-second lift**, ending with the same fastened load moving 0.6 m and stopping before the open hatch. This demonstrates a real transition onto the cart without also rebuilding the second-floor relay. The 488-second crate sequence is not reused as a named-member route.

## Current identity and missing actions

`src/engine/eiffelLongLoadFilm.ts:8` owns `summit-access-stair-m000-c000`; `sampleEiffelLongLoadFilm` retains that ID and `ownsPayload:true`. Its 0.15 × 5.9925003 × 0.15 m member is inside the existing **0.44 × 6.3175006 × 0.44 m** exported carrier. Preserve all nine carrier meshes and their transformed vertices.

At local 128 s (main 383.9747806 s), with F = 57.9400024414 m:

| Object/contact | Actual world position or height |
| --- | --- |
| Cart wheel plane / carrier origin | [-21.5, F, -4] / [-21.5, F+0.34, -4] |
| Carrier top / lifting-eye centers | F+6.6575006 / F+6.6075004 |
| Master ring center | [-21.5, F+7.2225003, -4] |
| Current rope endpoint | [-21.5, F+7.4725003, -4] |

`eiffelLongLoadHoist.ts:27` ends `landed-attached`. The renderer fixes the hatch open (`EiffelLongLoadFilmSystem.ts:94`) and reports `hookReleased:false` (`:164`). It does not load the stationary fastening hardware or a rigger. `eiffelFilm.ts:45` explicitly omits the following work. A deck-level worker cannot reach the 6.6–7.5 m attachment levels.

The old proxy's `eiffelFirstFloorTransfer.ts:13` shrinks/moves sling endpoints during 128–132 s and starts its cart at 134 s. That does not open the actual closed loops and must not drive these meshes. Its +X cart direction, wheel radius 0.12 m, pusher kinematics and bridge support checks are reusable inputs only.

## Smallest Blender additions

1. **Prepared cart and four visible bolts.** Reuse the bored bed, 0.60 m spreader, shafts, washers and nuts from `../eiffel-cart-fastening-recovered-2026-09-08/model/cart-fastening.glb`; replace the current cart bed rather than layering the two beds. Keep the original cart parent and wheel contacts. Preserve corrected carrier geometry from `model/long-load-carrier-corrected.glb`. Four bolt centers relative to the cart are (-.16,0), (.16,0), (0,-.16), (0,.16). Bolt/upper-washer heads finish at F+.43…+.446; nuts are F+.19…+.21. Add small captive-nut cages fixed to the underside spreader so top tightening is possible and nuts are supported before bolts arrive. Store each bolt/washer in a visible worker-held tray or pouch, then insert and turn it individually; never switch the assembled hardware on in one frame. New roles: `cart-nut-cage-N`, `cart-bolt-N`, `cart-top-washer-N`, `fastening-wrench`.

2. **One opening upper clevis**, between hoist rope and the existing master ring. Keep the four lower closed loops permanently attached; opening four carrier eyes would multiply actions and access requirements. Proposed interpreted fitting, in coordinates relative to the master-ring center: cheeks centered at Z ±.030 with .016 thickness (inner faces ±.022, clearing the ring's ±.018 bar depth); pin axis Z, center [0,.104,0], radius .008, shaft spanning Z ±.042, cheek bores radius .0088. Pin top Y .112 meets the ring's nominal inner top. Withdraw the pin +.084 m after releasing its keeper; retain it in a guide/tether attached to the clevis. A narrow top crossbar near Y .205 joins the cheeks. Rebuild the upper rope eye around that crossbar, with a proposed rope apex Y .325 instead of .25; recompute the entire hoist rope and drum reference using this geometry from the start of the chapter. Roles: `opening-clevis`, `clevis-pin`, `clevis-keeper`, `upper-rope-eye`. These dimensions are modeling proposals, not checked final meshes or historical measurements.

3. **A sling parking rest on the carrier head**, fitted beneath the master ring. Without it, disconnecting the upper rope leaves the rigid ring and four sling legs floating above the load. Candidate narrow central post from carrier-local head-plate top 6.2325003 to a saddle under the ring's local bottom 6.7345003; about .502 m rise. Use a fitted saddle around the lower ring bar and keep clear of the four existing rope eyes. It carries the sling assembly when unloaded, not the tower member. It must travel with the carrier and already exist during the lift; its actual contact and rope clearance remain new gates. Retaining the existing ring/leg pose on this rest avoids fake sling shrinkage or an unmodeled slack-rope collapse.

4. **Small access scaffold and two riggers.** The bounded probe found a clear candidate landing X[-22.6,-21.8], Z[-4.72,-3.28], top F+5.82. Four proposed .09 m posts at X{-22.48,-21.88}, Z{-4.6,-3.4} clear the current tower/bridge/receiver/steam drive. All 16 post foot corners meet actual platform triangles (`platform-1-3-03-m000-c008001` south, `...c007001` north). Add real cross-braces, ladder, seated deck beams and guardrails; those additions and their moving worker are not yet checked. Preparation-cut text may explicitly omit erection of this access scaffold; it must not appear during the lift.

## Human contacts and support locations

- Upper rigger: candidate feet [-22.05,F+5.82,-4±.12], shoulder [-21.93,F+7.20,-4]. Proposed pin grip [-21.5,F+7.3525,-4] is 0.456 m from that shoulder, within the existing two .31 m arm segments. The actual pin pull increases Z reach by .084 m; it remains below .62 m analytically. The scaffold does not exist yet, so these are reachable supported-design coordinates, not a current reachable job.
- Fastening stations: existing deck rays pass at X -21.66/-21.34, Z -4.54/-3.46, including surrounding foot rectangles. Kneel/lean from the south for the X pair and south bolt, and north for the north bolt. With shoulder aligned to bolt X, Y F+.78, Z -4.40 or -3.60, top-fastening reach is about .414–.523 m for the assigned near-side bolts. Do not reach the far north bolt from the south. Actual knee/boot/tool meshes must clear the mast, wheels, handle and carrier; floor rays alone do not establish that.
- Existing pusher can start behind the cart. Actual sampler hand centers are [-22.35,F+.95,-4±.26], touching handle surfaces at X -22.315; planted initial foot centers are [-22.555,F+.06,-4.12] and [-22.88,F+.06,-3.88]. Add a stationary regrip phase before movement; do not instantiate him already gripping at the first rolling frame. Rigging crew must remain visible and clear of this lane.

## Proposed continuous local clock

The existing chapter remains unchanged in carrier trajectory over 0–128 s. Times below are proposals, measured from that chapter's start, not claims about work already implemented.

| Local seconds | Required state and visible action |
| --- | --- |
| 128–154 | Cart braked/chocked and stationary; carrier shoe remains at F+.34, upper connector closed. Two riggers visibly insert/turn four bolts from stored positions; all four must be fastened before release. |
| 154–168 | Upper rigger climbs the authored ladder using alternating rung/hand contacts, then stands on the landing. Other rigger remains visible and clears the cart lane. |
| 168–172 | Parking saddle supports the master ring. Pay out approximately 2 mm at the upper connector to unload the pin; retain the carrier, ring and lower sling poses. This requires separate sampled hoist-head and master-ring transforms. |
| 172–180 | Hand contacts keeper, opens it, then pulls pin along Z. Set `released=true` only after pin clears both cheeks/ring. Keep the pin retained by its guide/tether; no disappearing component. |
| 180–184 | Retract only the free upper clevis/rope by approximately .15 m. Ring and lower sling remain on their carrier rest. Recheck the taller connector against the actual travelling sheave; no .8 m proxy retraction. |
| 184–198 | Rigger climbs down and leaves the movement envelope; hands and shoes retain ladder/rung contacts until stepping onto the actual deck. |
| 198–202 | Crew visibly removes and stows the cart chock; pusher reaches the existing handles while the cart stays stopped. Hold the cart until the grip exists. |
| 202–208 | Same cart and carrier travel +.6 m X using smoothstep; wheel angle = -.6/.12 times the same eased progress. Carrier origin stays `cart + [0,.34,0]`, scale stays 1, sling-rest/ring follow the carrier. |
| 208–212 | Cart stopped at X -20.9; worker remains in contact then relaxes or places the chock. Do not mark the tower member installed. |

This extends the chapter to 212 s and the current 399 s film to 483 s, with the same earlier chapters. The main entry remains 255.9747806 s, and this continuation ends 467.9747806 s. The exit cut still honestly omits the remainder of the first-floor crossing, second/197 m relays, extraction and final installation. Maintain the `transportedPartIds` hold through that opaque exit; do not mark seating at cart fastening or release.

## Existing evidence versus new gates

`probe.json` records the live asset bounds, manifest digest, proposed post/worker support rays, and exact convex translation sweeps. The actual carrier and current retained sling combined enclosing box clear both +.6 m and +13 m along X against the stage-45 tower, fixed bridge, raised receiver and final steam-drive bounds. This is a useful new route result for the long member, not a crate-sized inference. The hatch is excluded from those obstacles because crossing requires its closure; wheel support over the existing 13 m lane was previously tested in `tests/eiffel-first-floor-transfer.test.ts:42`.

At the recommended first stop X -20.9, the existing cart's front X offset +.4 leaves approximately .2 m before the hatch starts at X -20.3. Thus this 0.6 m start/stop does not need an invented automatic hatch closure. The later full 13 m crossing still needs a human-operated hatch mechanism, complete wheel/worker sweeps including new scaffold/chocks, and tall-load restraint behavior.

New bounded checks are opening pin/keeper trajectories and hand contact; actual parking-saddle contact and sling clearance; individual bolt travel/tool access; ladder/worker support; cart brake/chock lifecycle; revised rope/sheave clearance; full cart/pusher/new-equipment motion; and deterministic reverse joins at the table boundaries. Test exact endpoints immediately before/after each transition. Keep one `carryingPartId = summit-access-stair-m000-c000` across all those states and one existing renderer carrier object. No new placeholder crate, scale change, hidden duplicate payload, or instant final seating.

No structural certification, thread-level screw simulation, boiler power simulation or broad repeat of the preceding static steam-drive audit is required for this next animation segment. This proposal adds credible visible operations and narrowly tests their new contacts.
