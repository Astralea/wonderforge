# Continuous first-floor unrigging and crossing

The production film now continues the same ground-delivered
`summit-access-stair-m000-c000` through four cart fastenings, scaffold access,
upper clevis release, manual hatch closure and a complete 13 m cart crossing.
The long-load chapter lasts 280 seconds inside the 551-second film and begins
at 255.32973290069668 seconds. It retains the same actual kit member, carrier,
cart and lower sling throughout. Cart fastening does not count as tower seating.
Final installation remains explicitly omitted by the opaque exit cut.

Review: http://127.0.0.1:5589/?review=onward-crossing-v21#/wonder/eiffel-tower
The added work starts around 6:23 (70%); crossing begins around 7:47 (85%).

## Saved Blender work

The parent personally used the installed Blender Lab MCP with a read-only
connection probe, then authored and exported from the isolated port9877 instance.
No new plugin was needed and the original desktop Blender was left untouched.

- `blender/eiffel-onward-mechanism-review.blend`: posed 176-second review scene,
  actual first-floor cutaway and camera. Best editable overview of this work.
- `blender/eiffel-long-load-onward.blend`: four connected worker rigs,
  captive opening clevis, keeper, cart bolts, bored mating hardware, hatch handle,
  parking saddle and supported access scaffold;261 objects/176 meshes.
- `blender/eiffel-retained-sling.blend`: the13 original lower-sling meshes.
- `blender/eiffel-onward-bridge.blend`: bored cart/spreader and crossing context.
- `blender/eiffel-onward-mobile.blend`, `eiffel-closed-sling-mobile.blend` and
  `eiffel-bridge-mobile.blend`: mobile geometry profiles with the same roles.

`mcp/` retains actual tool responses and saved-file readbacks. Final bridge
readback verifies62 objects,5788 triangles and exact role multiplicities against
the full source. The first readback incorrectly required unique roles; four
cart wheels intentionally share one role. That failed check is preserved as
`attempt-1-*`; the corrected check compares the full role histogram.
`renders/` contains two actual Blender views inspected by the parent.
Earlier source/export candidates are preserved under `candidates/`.

## Physical and rendering scope

The upper rigger climbs fixed rungs before opening the keeper and withdrawing
the captive pin. The master link remains on the carrier saddle while only the
upper connector retracts. A worker closes the hatch with both hands before the
chock is removed. The pusher grips the handles before the cart moves; rolling
wheels follow the same13 m displacement. Connected fixed-length limbs use one
pelvis/torso solution rather than independently moved shoulders.

Actual exported geometry tests check lower-sling equality, pin/link/saddle
contacts, cart/spreader bores, scaffold soles, wheel tracks and worker floor
support. Mobile worker bevels and rope tessellation are reduced. The mobile
bridge unions198 contiguous planks without filling any gap and partitions the
unchanged2952 iron triangles into12 spatial culling chunks. All moving hardware
and roles remain matched. `asset-source-seals.json` records source/model/bundle
identities; the public `assets.json` now describes these current files.

These checks establish geometry, contact and continuity at their sampled cases.
They do not establish load capacity, steam power, structural strength or a
measured replica of nineteenth-century machinery.

## Final verification

Node24.4.0:803 tests in140 files pass with4 workers (`full-tests-final.log`,
64.30 seconds), plus `npm run typecheck` and `npm run build`.
The existing large-bundle warning remains.

Production bundle `main-CwBAhlf1.js`, SHA256
`e4bab0de2f6b86029b68089e8310c3f7de6f948cd9550516cefd2dda77252d3c`.
Both desktop1440×900 and mobile390×844 browser runs cover101 full-film frames,
7 preflight frames and43 phase frames. Actual applied role poses and fetched
asset/bundle hashes match. Space playback advances, reverse seeking gives zero
pixel difference in the checked crop, and the125-degree orbit is strictly
increasing. No page errors or horizontal overflow were recorded.
Desktop peak344,937 triangles/166 calls; mobile295,729/149. Both retain their
original450k/200 and300k/150 budgets. See `camera-qa/production-*/report.json`.
The two earlier mobile budget failures and earlier camera captures are preserved.

Parent inspected the final mobile crossing, desktop mechanism views and Blender
cutaway. Upper release and hatch are more readable, but some fastening views
still substantially hide the rigger behind the real receiver/carrier. This is
not visual proof that all four bolts can be seen being fastened.

## Remaining goal

The goal stays active. This delivery chapter is a connected improvement, not a
complete solution to every tower member's supply. In particular, ordinary
upper-stage pickups still lack ground-to-summit provenance and have overcompressed
placement times. Crowd readability and residual facade/water shimmer remain.
Paris/summit/sky assets from the prior revisions remain unchanged in this pass.
No next wonder has been selected.

The parent-owned temporary Blender process73646 was stopped after all MCP
build/save/readback jobs completed. The original desktop62427 was not stopped.
The local web preview remains running.
