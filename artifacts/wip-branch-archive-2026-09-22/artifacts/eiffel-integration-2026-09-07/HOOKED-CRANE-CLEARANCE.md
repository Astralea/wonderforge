# Actual-hook station clearance — 2026-09-07

The pilot's actual hook reaches **121.603296 degrees** after cargo rotation.
Its station-specific reviewed sector is now **60–121.65 degrees**. This
extends only the isolated NE pilot; it is not permission for unrestricted
slew, other stations, or all reach/angle combinations inside that sector.

The updated builder geometry passes **2,751 states at 0.02-second intervals**
through the 55-second pilot against **all 1,840 completed tower solids** and
**219 prepared support/guide beams**, with zero reported external contacts.
The audit includes 623 crane primitives, actual articulated jib and ties,
carriage, G/I, safety mechanisms, and sampler-generated sling/hoist ropes.
Beam and box primitives use their exact oriented boxes; cylinders use
conservative bounding boxes, and ropes use small conservative beam envelopes.
The payload retains its independently checked exact ground/vertical sweeps
and dense rotation/slew/lower checks.

## What the fuller audit corrected

The initial 205-beam falsework plus original carriage had 34 unique static
primitive/structure intersections. These were not caused by the extra 1.6
degrees of slew:

- The two top-frame beams crossing the carriage rail lines penetrated its
  inclined members by up to **0.27041 m**. Actual triangles in the original
  NE GLB also intersected a frame box contracted inward by 1 mm: 11 triangle
  hits, recorded in `confirmed-glb-contact.json`.
- Lower hotte ties, lower cross-member and guide crossbars intersected the
  inclined guide flanges/webs. Their true square cross-sections matter:
  treating the beam half-width as a circular radius missed some contacts.

The reviewer replaced only the two crossing frame portions with outer
openings, short seats, and knee braces connected to the two added post tops.
The revised falsework contains 219 bounded pieces. Reproduce this JSON
change with `relieve-top-frame.py` after the original freeze/falsework
generation scripts. The parent revised the Blender carriage: narrow lower
bearing span, a two-segment lower tie turning inward before descending, and
recessed guide crossbars with thin outer links. Static collision counts fell
34 → 30 → 8 → **0** as these changes were evaluated.

The frozen route, cargo scale, pickup, and seat were preserved. The sector
extension follows the **actual fixed-length sling apex**, rather than
pretending the hook remains directly above the payload center.

## Evidence chain and verification boundary

- `capture-crane-primitives.py` evaluates builder statements with read-only
  primitive recorders; it does not import bpy or operate Blender.
- `crane-primitives.json` records the current NE configuration, builder hash,
  hierarchy and 623 primitives.
- `audit-hooked-crane.ts/.mjs`, `hooked-crane-audit.json` record the 0.02 s
  external-obstacle audit, including all reported contacts (currently none).
- `verify-primitive-equivalence.mjs` compares each beam/box corner with actual
  GLB vertices in its articulated role frame. The rebuilt GLB matches all **774** beam/box primitives (555 crane plus
  219 support members) within **0.000000870 m**, with zero mismatches.
  The latest result is `primitive-glb-equivalence.json`.
- `tests/eiffel-ground-lift-rig-clearance.test.ts` binds the primitive capture
  to the current builder hash and checks 15 phase/maximum-yaw states against
  all completed tower/support solids, including actual ropes and payload.
- The 2 new rig tests and 6 sampler tests pass; typecheck passes. The existing
  3 station tests also pass with the revised frame.

This is not crane self-collision certification, structural-strength analysis,
loaded dynamics, rope friction/contact simulation, crew safety, or concurrent
lift coordination. The dense angular samples are not a continuous-time
rotation/slew proof. The station remains an isolated review with equipment
prepared before its opening. **Physical removal or transfer before stage 10
arches remains mandatory**, as documented by `future-occupancy.json`.

The rebuilt GLB was checked after the final carriage/frame changes:
SHA256 `99d9a5f0495cdec26a6699ac79b22c04fddb16da60cbad49aac52b2a0bfff806`.
An actual `EiffelGuyenetRig` loaded from this file was articulated at 551
sampler states; its world-space jib tip differs from the sampler by at most
**0.0000000492 m** (`actual-tip-check.json`). The support audit preserves the
actual roll of square-section vertical posts after station rotation.

## Ground arrival speed correction

The visible arrival now covers only the final **10 m** of the already cleared
corridor, starting at `[52.9230615191,1.2,-54.9622198551]`. The 10-second
smooth arrival has mean speed **1.0 m/s** and peak **1.5 m/s**. Crane motion,
rigging, payload rotation, seat and the total 55-second sequence are unchanged.
`wideHaulCorridor` preserves the original approximately 27 m clearance domain;
`haulCorridor` is its final 10 m subset. Run `shorten-ground-approach.py` after
frame relief when regenerating the JSON. No Blender support rebuild is needed
for this timing/framing correction. The focused station, sampler and actual
primitive tests pass (11 total), including a numerical peak-speed regression.
