# Foundation hauling and crew coordination — 2026-09-07

Implemented within foundation branches only. No Blender work, app build or server changes by this subagent.

- `eiffelFoundationRoute.ts` constructs cached visibility graphs around the complete envelopes of all sixteen masonry bearings, independently of construction time. Obstacles are inflated by the turning carrier's corner radius, .2m clearance and .4m rounding allowance. Quadratic corner rounds remain inside that allowance. The original four pickup lanes and radial staging endpoints are preserved.
- Cargo remains at a fixed rigid attitude during hauling and its actual bottom follows the shared terrain + .6m. A square carrier deck contains the complete horizontal cargo diagonal at every carrier yaw. The deck does not scale during motion.
- Pure route tangent and travelled distance steer the carrier and rear pushing pair. `eiffelFoundationCrew.ts` provides shared hand, limb and foot positions; stride advances by travelled distance. Stance feet meet the sampled terrain; swing feet lift at most .16m. Upper receivers/carriers and upper rig routing were not changed by this pass.
- `EiffelProductionWorks.ts` renders rotating carrier decks, rolling wheels, ground-following axle supports, steering crew and articulated legs. The fixed cargo remains supported throughout carrier turns. Added wheel resources follow existing disposal lifecycle.

Verification:
- Reported collision `foundation-se-0-m000-c012` at t=.0457410714 no longer intersects completed `foundation-se-2-m000-c031`.
- All896 cargo/carrier routes tested at ≤.5m intervals against all16 complete bearing footprints; endpoint poses, rounded tangent direction and terrain contact tested.
- All896 routes sampled at ≤.1m travel intervals for oriented crew torsos, heads and feet, plus conservative 2D envelopes around handles, crossbars, arms and legs. No overlap with any complete bearing footprint.
- Actual renderer instance transforms tested for wheel bottoms, stance/swing foot heights and turning-deck containment of fixed cargo. Wheel polygon bottom residual is <.007m, within the scene's contact tolerance.
- Focused tests: three route tests and two crew/renderer tests. Typecheck passed.

`foundation-corridors.json` was refreshed after changing the turning deck: maximum cargo/carrier paving width3.513m; centerline x[-67.464,86], z[-67.887,81]; longest route213.949m. Include shoulders at turns for trailing crew. This JSON describes the production route geometry, not a separate visual approximation.

Limits: the cargo/carrier corridor is geometrically conservative around the complete bearing envelopes. Crew occupancy is finite sampling, not a continuous swept collision certificate. It excludes other simultaneous moving loads, rigs, new workyard props and crowd actors. Ground contact is verified; full biomechanical no-slip gait through turns and ergonomic pushing forces are not certified. Normal-speed scene timing and integrated desktop/mobile visibility must be checked by the parent after its next build; this pass does not solve the broader extremely compressed construction schedule.
