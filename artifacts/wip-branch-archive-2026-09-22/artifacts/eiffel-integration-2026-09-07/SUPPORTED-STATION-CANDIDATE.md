> Updated actual-hook review: see HOOKED-CRANE-CLEARANCE.md. The prepared frame now has 219 pieces after two braced carriage openings; sector is pilot-specific 60–121.65 degrees. Earlier counts below describe the first frozen candidate.

# Frozen NE Guyenet pilot — 2026-09-07

The concrete pilot is **lower-ne-02-m013-c003**, using one temporary station.
The authoritative implementation input is `guyenet-ne-station.json`. Earlier
`station-search.json` routes are exploratory and superseded: dense checking
found a missed base-tie collision in their sparse vertical-hoist samples.

## Transform and source interpretation

Guide root `[44.7,16,-44.7]`, root yaw -45 degrees, local +Z inward. The actual
lower-panel centerline from `[44.7,16,-44.7]` to `[41.4,22,-41.4]` requires
rail tilt **37.876400241608 degrees** from vertical.
This is not the standalone prototype's 25-degree angle. Regenerate the
inclined guides and keep the hotte/deck level; do not tilt the whole asset.

The face offset remains -0.95 m and platform offset -1.8 m, producing heel
`[46.6445436483,16.3,-46.6445436483]`. The skate's local forward offset is
**0.116301537840 m**, derived from actual flange and skate
half-sections at this inclination. Mast height above the deck is 4.8 m;
head rest is 1.0 guide-metre; short guide span is s=-7.7..4.1.

The lower tower kit has no elevator guides. A temporary **authored** braced
falsework is therefore proposed as prepared equipment before the film opens.
It must not be described as the exact historical Eiffel crane foundation.
The historical account supports moving cranes on inclined elevator beams;
the temporary timber support layout here is an explicitly labelled visual
engineering interpretation.

## Ground-rooted support geometry

Six timber post feet lie on actual prepared ground y=0:

- `[44.5,0,-51]`, `[44.5,0,-44.5]`, `[51,0,-51]`, `[51,0,-44.5]`.
- `[42.8,0,-46.6]`, `[46.6,0,-42.8]` directly support the upper guide bearer.

Posts end at y15.6. Frames and X braces link three levels. Two transverse
guide bearers connect to the frame at y10.4 and y15.6; steel braces terminate
on the guides' rear flanges at y10.8 and y16, keeping the front sliding face
available. JSON gives all 205 proposed rail/falsework/bracket beam pieces
as endpoints and half-widths. Every rigid piece is at most 5.8 m long.

All these occupancy envelopes clear **all 1,840 completed manifest solids**
at the selected operation start, without a leg filter or ignored foundations.
Ground feet, diagonal bracing, bearing bolt geometry and section sizing
must be faithfully represented in the Blender asset. This geometric review
is not a structural load-capacity calculation. The old proposed 24 m
pylon-spanning bearers are no longer the initial support solution. Their
actual tower anchors remain in JSON as future transfer context only.

## Corrected continuous ground route

The load starts on a real horizontal support floor at
`[52.9230615191,1.2,-44.9622198551]`, identity quaternion. The floor's top is
exactly the cargo's transformed bottom, y1.14735. Its four supports reach
prepared ground; its clear deck is 1.8 by 5.1 m.

The visible ground carrier approaches along X=52.9230615191 from
Z=-54.9622198551 to Z=-44.9622198551 in 10 seconds (1.0 m/s mean,
1.5 m/s peak). The wider audited route from Z=-72 remains in
`wideHaulCorridor` as supporting clearance evidence. A 1.8 by 5.1 m ground carrier envelope clears the falsework
and all completed tower solids using an exact continuous swept prism,
with 101 additional corridor samples. It approaches through
the gap between foundation columns rather than through a masonry bearing.
The upstream stockyard loading and wheel/axle support animation still need
implementation; stock must not appear at an elevated receiver.

1. Hoist vertically at fixed **6.5 m reach / yaw 120 degrees** to y21.625.
2. Rotate at that fixed center to quaternion
   `[-0.0926192105,0.0207233988,0.7010148764,0.7068030238]`.
3. Polar slew/luff at center y21.625 to reach 10.742464739 / yaw72.170603320.
4. Lower to `[51.5499992371,18.625,-37.0875015259]` without changing scale.

The complete hoist is checked as an **exact swept rectangular prism** against
all completed solids and falsework. Thin base ties cannot be skipped between
samples. Rotation, slew and lowering use 801 samples per phase; the full jib
lattice envelope is also checked against tower and falsework. Minimum vertical
headroom after a 1.2 m sling allowance is 1.08541 m. The original operation
starts at normalized t=0.09025741777108326.

The rendered solid-box mass estimate is about 405 kg at 7,800 kg/m³. Both
final endpoint supports are present before this load:

- `lower-ne-02-m013-c002`, endpoint gap 0.000000918 m.
- `lower-ne-02-m016-c000`, endpoint contained on the completed member face.

The other two exploratory reachable members had only one already-supported
end and are not promoted as a three-load campaign.

## Mandatory limit: remove or transfer before arches

The station cannot persist unchanged to the film's end. A separate audit of
**all final tower geometry** finds 70 conservative contacts with the proposed
static structure or inward parked jib. The first conflicts are **stage10
arches**. At unchanged station height, inward 5.5 m park has two approximately
4 mm envelope contacts with stage11 arch members. After a 2.5 m guide climb,
it has 21 arch contacts, up to about 0.431 m.

Thus a real removal/transfer sequence must complete before stage10, or the
new mechanism must remain explicitly isolated as a pilot review until that
lifecycle is implemented. It is not acceptable to make the equipment pop out
or leave it hidden inside later arches. `future-occupancy.json` contains IDs,
stages and depths. These tests cover the declared static geometry and jib;
other crane bodies, tie/hoist hardware, rope routing, workers, concurrent
loads, and continuous rotation/slew proof remain separate gates.

## Evidence

- `tests/eiffel-guyenet-station.test.ts`: **3 tests pass**; all-completed
  occupancy, support-floor/corridor, exact vertical sweep and dense route.
- `npm run typecheck`: **pass**.
- `guyenet-ne-station.json`: frozen geometry, target, route, connections, mass.
- `continuous-hoist-search.json`: corrected pickup search result.
- `future-occupancy.json`: known future conflicts.
- `find-station.ts/.mjs`: original bounded 14-candidate exploratory search.
- `freeze-station.py` then `falsework-station.py`: regenerate frozen pilot
  from the saved candidate and corrected continuous-hoist search result.

No production, timing, renderer or Blender files were edited by this reviewer.
