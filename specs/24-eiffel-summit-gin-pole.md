# Eiffel summit gin-pole climb candidate

The summit mast gin pole may move from its c001 working position to its c002
working position only through a visible, supported clamp transfer. This is a
candidate mechanism chapter and is not part of the production film until its
actual hardware, collision, support, drive, and worker gates pass.

The six-metre pole stays at world X `-0.90`, Z `0` and moves from bottom Y
`300.90` to `305.566667`. Its three-metre jib remains rigidly attached. Two old
guides are fixed to seated c000 at Y `301.85` and `302.30`; two new guides are
fixed to seated c001 at Y `305.766667` and `306.966667`. Their shared leaf
hinges sit at world X `-.40`, Z `0` on fixed outriggers back to each collar, so
opening leaves remain outboard of the central mast. Fixed frames never
translate with the pole. Each opening operation rotates the complete fork and
strap leaf around its authored vertical hinge, with independently withdrawn
and reinserted keeper pins.

The 70-second sequence installs and tensions the new support before motion,
opens the old lower guide, lifts 0.40m, closes and latches the new upper guide,
lifts another 0.70m, opens the old upper guide, then lifts the remaining
3.566667m over 28 seconds. At least two closed and latched guides geometrically engage the pole
during every lift. Closed guide bores provide lateral guidance only: the drive
continues to carry axial load until both final guide shoes are visibly tightened
and the drive is unloaded.

Each guide is two hinged half-guides opening toward opposite world-Z sides; a
closed band may not swing through the pole. Their hinge latch pins are distinct
from the axial lock. The wooden pole has one `.022m` Z-axis through-hole at
local Y `1.40`. The old-upper axial pin occupies it at bottom Y `300.90`, then
withdraws `+.24m` in Z after the winch is taut. It remains withdrawn throughout
the climb and the new-upper axial pin enters the same hole only after the final
hold. The sliding `.138m` guide bore is never described as axial support.
Before any leaf rotates, its Y-axis keeper pin withdraws `.30m` so its shaft
clears both fixed stops. The raised old-lower guide withdraws downward, clear of both the guide
above and the crown railing; the other moving guide pins withdraw upward. A pin
re-enters both bored stop ears only after its leaf is fully closed.

The pure sampler exposes the pole and jib poses, both half-guide rotations,
hinge latch pins and keepers, the independent axial pin, guide engagement, and
the complete candidate manual-winch reeving. The `.006m` rope leaves the drum at
`[.25,306.98,-.12]`, runs to the low east sheave, around a `.06m` quarter arc,
vertically to the high east sheave, around a second `.06m` quarter arc, west to
the high west sheave, and around its `.08m` quarter arc. Its final vertical
tangent is `[-1.10,307.20,.34]` and its moving lug is
`[-1.10,poleBottomY+.08,.34]`, outside the whole guide-opening sweep. The
sampler returns the straight and sampled arc points, fixed reeving length,
variable deployed length, and their sum. A `.07m` drum with 2:1 gearing and
`.18m` crank gives `.2199m` rope take-up per crank revolution. Cubic lift
profiles are capped below one crank revolution per second. This remains a
kinematic reconstruction without a strength, mass, or worker-reach claim.

Production admission requires actual GLB guide sweeps against the seated tower,
continuous rope geometry through the actual saved hardware, fixed-collar contact
on the named mast faces, an authored reaction path into seated structure, and
workers whose planted feet and fixed-length limbs contact real controls. Reverse
seeking must reproduce identical state. The existing unresolved upstream summit
freight chain remains unresolved after this mechanism is added.

Current V9 implementation starts with the hardware and cranking operator already
in place. Installation/access and worker-operated guide controls are still
required; the sampler's preparation/tightening fields do not themselves animate
those actions. The independent preview is a mechanism demonstration only.
