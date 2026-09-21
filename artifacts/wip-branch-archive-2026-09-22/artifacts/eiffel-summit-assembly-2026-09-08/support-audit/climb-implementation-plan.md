# c001 to c002 supported gin-pole climb — implementation plan

This plan turns the geometry in `climb-plan.md` into one reversible sampler and
renderer chapter. It is preparation only. The candidate asset contains a static
six-metre pole and three-metre jib; it does not yet contain the four opening
guide frames, tackle, drive, or worker access needed for admission.

## State and asset contract

Add a pure `eiffelSummitGinPoleClimb.ts` sampler whose input is local chapter
seconds and whose output contains `poleBottomY`, `polePose`, `jibPose`, four
`guideAngle`/`guideLatched` states, a continuous tackle polyline, drum angle,
and worker contact poses. Keep these source roles separate:

- Fixed to seated `summit-crown-m072-c000`: `old-lower-collar` at
  `[0,301.10,0]` and `old-upper-collar` at `[0,302.30,0]`, including their mast
  blocks, hinges, and fork roots.
- Fixed to seated `summit-crown-m072-c001`: `new-lower-collar` at
  `[0,305.766667,0]`, `new-upper-collar` at `[0,306.966667,0]`, and the fixed
  tackle lug `[-.13,306.966667,.20]`.
- Moving as one rigid root: the `.13m` pole at `x=-.90,z=0`, its bottom lug at
  `[-.90,poleBottomY+.08,.20]`, and `gin-pole-jib` at pole-local `[0,6,0]`.
- Hinged independently: the complete fork/strap leaves for all four guides.
  Each hinges about world line `[-.13,Y,0]`; an open leaf is the tested 90-degree
  swing, moving its guide centre from `[-.90,Y,0]` toward
  `[-.13,Y,+/-.77]`. The renderer must rotate the entire fork and strap, not
  hide a band or animate only a label.

Static steel stays in the tower/rig asset. Only pole, jib, guide leaves, pins,
tackle blocks/rope, drum, and workers receive per-frame transforms. Load c001
and its two attached crossbars as already seated before this chapter; c002 cargo
does not enter until the climb has locked and the empty hook has been re-rigged.

## 56-second chapter

| Seconds | Mechanism and required contacts |
|---:|---|
| 0–5 | Empty cargo sling is parked. Two workers remain visible. They close the new-lower guide, leave new-upper fully open, reeve the tackle, and tension it; pole stays at `b=300.90`. |
| 5–9 | A worker removes the old-lower keeper/pin, then swings the complete old-lower frame to 90 degrees. Old-upper and new-lower remain closed and latched. |
| 9–14 | Drive raises the pole smoothly `.40m` to `b=301.30`; old-upper and new-lower remain engaged. Stop and visibly hold the drive. |
| 14–20 | New-upper frame closes from 90 to 0 degrees and its pin/keeper seats. The jib heel has `.223333m` clearance above that guide before closure. No lift occurs during closure. |
| 20–27 | Raise `.70m` to `b=302.00`, then hold. Both new guides and old-upper remain engaged. |
| 27–32 | Remove old-upper keeper/pin and swing its complete frame to 90 degrees. Both new guides remain latched. |
| 32–46 | Raise the remaining `3.5666667m` to `b=305.566667`. The pole and jib translate together; guide frames do not translate. |
| 46–52 | Tighten both new guide shoes, unload the tackle gradually, and prove zero pole motion as tension falls. Keep old hardware open and attached to c000. |
| 52–56 | Park the empty tackle and workers in supported poses. Only then may the c002 delivery chapter begin. |

Use cubic ease-in/out inside each lift interval and zero velocity at every hold.
At every sampled time require at least two fully engaged, latched guides using
the intervals already recorded in `climb-intervals.json`. Opening begins only
after its keeper and pin clear; closing finishes before its keeper/pin engage.

## Rope and drive continuity

The moving tackle endpoint is exactly the pole-bottom lug; the fixed endpoint is
the new-upper-clamp lug. Store the authored intermediate block/sheave centres and
derive every rope segment from those centres plus `poleBottomY`. At each frame,
compute deployed rope length as the sum of straight segments and wrapped arcs.
Drive rotation is `(length(t)-length(0))/drumRadius`; reverse sampling must return
the same pose and angle. Rope endpoints may touch only their named lug or groove,
and the rope must remain present during holds and after unloading.

Do not use the current speculative straight lead to a winch at `y=295`: the
support audit says that lead may cross the cupola. The smallest implementable
remedy is an authored ratcheting chain/tackle mounted on the fixed new-upper
collar, with a separately routed hauling chain to a worker station on a proven
deck. That still needs a guide-sheave route and a supported standing/guarded
work surface. Until those two solids and their contacts exist, expose the drive
as `unadmitted` and keep this chapter out of the production film.

## Required gates before integration

1. Sweep each actual hinged guide mesh through its full angle against the seated
   tower, pole, jib heel, bottom lug, tackle hardware, and the other guides.
   Closure/opening is blocked when any penetration exceeds export tolerance.
2. Replay the full pole/jib/tackle trajectory against the current manifest and
   require the recorded guide-engagement invariant continuously, including all
   phase boundaries and reverse seeks.
3. Ray-test every fixed collar contact against its named seated mast face and
   every worker sole against an authored deck/rung. Test hands against real pins,
   keepers, shoes, chain, and handles with fixed human limb lengths.
4. Verify the fixed upper tackle lug transfers into the seated c001 collar/mast
   assembly. The present candidate has no demonstrated lug-to-collar member or
   drive reaction support; this missing load path is the primary blocker.
5. Renderer tests must resolve roles by `wf_role`/`wf_part`, retain all hardware
   throughout the chapter, and compare actual GLB transforms with the pure
   sampler. Browser QA must show both guide transfers and the continuous cable.

Likely code split after the asset is accepted: pure sampler and tests under
`src/engine/eiffelSummitGinPoleClimb.ts` / `tests/eiffel-summit-gin-pole-climb.test.ts`;
GLB loading, role transforms, rope tubes and disposal under
`src/render/three/EiffelSummitGinPoleSystem.ts`; then a bounded insertion in
`eiffelFilm.ts`. Do not modify the ordinary production operation path until
these gates pass.
