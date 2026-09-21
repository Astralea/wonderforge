# Operation cargo rope and traversing winding

> Later operation update: the adapter now includes a 25-second empty-tackle return and runs319 seconds. The previously measured182-second hook jump is superseded by that path; second-stock arrival and attachment remain unadmitted. The metrics below retain their original source hashes and sampled scope.

The new pure candidate routes the fixed m073 cargo drive around the unchanged ladder and the separate climbing line. It couples a changing-radius drum winding to the first guide, preserving a 120 m rope inventory. This is an isolated mechanism candidate, not a production-film or complete-operation admission. Archived V6 cargo evidence was preserved.

## Implemented contract

- `src/engine/eiffelSummitCargoRope.ts` returns 19 joined tangent/arc segments, both fixed-length bridles, exact deployed length, and the complete computed winding in drum-local coordinates.
- Four lower guides use centres `[.25,303.14,.58]`, `[.19,303.32,.64]`, `[-1.18,303.38,.56]`, and `[-1.26,303.46,-.26]`. The western riser is X−1.26/Z−.34. The drive frame stays fixed for both lifts and the intervening head climb.
- The annular pitch radius is 0.4915282291 m; the boom-side rope plane is 0.4951767361 m from its centre plane. `head-feed.json` records exact source centres, axes and tangent directions. The 0.30 m heel offset and 5.70 m boom remain unchanged.
- Eleven straight turns and one rounded reversing turn lay each layer at 12.2 mm centre pitch. A C1 quarter-turn peel-off joins the last helical turn to the free rope without an axial kink. The last tenth layer ends at 119 spindle turns. The geometric centreline capacity is **120.357253 m**, superseding the earlier rough 130.69 m estimate for 13 turns/layer.
- At phase `q`, the complete winding rotates by `−2πq` and its drum centre is `[.25−x(q),303.01,.12]`. The winding's material angle includes the current takeoff angle `φ(r)`, so applying the whole-drum rotation places the live endpoint exactly on the current-radius tangent. The invariant tail is drum-local `[-.0671,.1056674696374,.00838962814595]`.
- `traverse-cam.json` defines the exact 1:1 cam recipe: 2,305 centreline points over a closed 24-turn groove at radius .035 m. It is an authored mechanical design, not a documented Eiffel construction detail.

The renderer contract is `winding.localPoints`, `drumCenter`, `drumRotation`, `camRotation`, `followerX`, and `followerTangent`. Translate the drum and carriage together; rotate only the drum, output shaft and cam. Attach the computed inventory beneath the rotating drum. Hide the previous full-capacity reference rings. The follower's long local Z axis follows `atan2(followerTangent.x,followerTangent.z)` about Y. Source-defined gear and chain behaviour requires its own verification.

## Measured verification

`npx vitest run tests/eiffel-summit-cargo-rope.test.ts tests/eiffel-summit-cargo-winding.test.ts`: **12 tests passed**. `npm run typecheck`: **passed**. These were focused CPU checks; no full suite, production build or browser/GPU pass was performed for this winding task.

`metrics.json` records exact current source/test hashes and 5,882 samples across both lifts and the parked head climb:

| Quantity | Measured value |
|---|---:|
| Deployed rope | 18.140917–80.692674 m |
| Wound rope | 39.307326–101.859083 m |
| Wound spindle turns | 49.692482–105.234734 |
| Live winding radius | .1548–.2036 m |
| Drum centre X | .176819–.323200 m |
| Tip/block headroom | at least 1.131407 m |
| Maximum 120 m balance residual | 8.65×10⁻¹² m |
| Maximum transformed winding/free-rope endpoint gap | 5.82×10⁻¹⁴ m |
| Maximum unit-tangent dot deficit | 4.45×10⁻¹⁶ |
| Independent refined-chord integration discrepancy | 2.94×10⁻⁹ m |

The coil envelope fits inside the authored .16 m winding width and .24 m flange radius. Its maximum axial rope-surface coordinate is .0792 m, leaving .8 mm to the inner flange face. `winding-distance.json` uses independent spatial hashing and exact segment/segment distance on 96- and 192-sample/turn drawings, excluding contiguous rope within 40 mm of arclength. Minimum tested centre spacing was **12.084286 mm** at the drawing resolution and **12.178569 mm** at the finer resolution for a 12 mm rope. This is sampled geometry evidence, not a proof for elastic rope or every possible deformation.

The lower-route test uses the actual retained V6 ladder GLB (SHA-256 `17db309645e75584789db5757e4ac0e75abb8135df93c32ef30164548c2e8d46`), transformed mesh bounds, and the separately sampled climbing rope. It includes rope radius and arc-chord error allowance. It does not substitute those bounds for a clearance audit of all new guide supports.

## Admission limits

`geometricWindingSolved:true` means the inventory, current-radius tangent and winding transforms have been solved. Both `visualWindingAdmitted` and `sourceClearanceVerified` remain **false**. Actual keyed-spindle and carriage contacts, tail clamp, retained follower, complete guide-support clearances, friction, loads and strength require separate checks.

There is a specific source cam concern: the current groove cutter radius is .005 m and the follower shoe is .003×.005×.009 m. The 1:1 straight groove lead is ±3.175°; opposite branches cross at approximately 6.35°. A 10 mm-wide channel creates approximately 90 mm of ambiguous crossover, longer than the 9 mm shoe. A sampled follower point remaining in the groove does **not** demonstrate positive branch selection. The source must establish branch retention before calling this a mechanically driven level-wind.

The 112-second transition into parked head travel is continuous at the tested boundary. The current 182-second second-pickup transition still jumps the empty block **27.899746 m** and changes deployed rope **46.249839 m**. It needs a visible return and reattachment sequence. This report does not admit the complete 294-second operation or the earlier ground-to-terrace stock delivery.

The source mechanical design is informed by manufacturer explanations of fleet angle and its effect on spooling: [Ingersoll Rand fleet-angle guidance](https://liftingsolutions.ingersollrand.com/en-de/winch-selection-support/fleet-angle-calculations) and [LeBus winding guidance](https://lebus-intl.com/faq.php). These are current engineering references, not evidence for the historical Eiffel apparatus.

## Bounded next option: reduced single-circuit cam

This option is **design only**. The frozen engine, tests, current 1:1 JSON and current source evidence remain unchanged. A 24:1 reduction can replace the repeated diamond crossings with one closed cam circuit over the same 24 drum-turn traverse period.

Use three external spur stages with module .004 m and tooth counts 20/40, 20/60 and 20/80. Their pitch-radius sums are .12, .16 and .20 m. In the Y/Z plane, the prescribed input and output are `C0=(303.01,.12)` and `C3=(302.64,.42)`. Place C1 along C0→C3 at distance .12 m. The two possible C2 intersections satisfy distance(C1,C2)=.16 and distance(C2,C3)=.20:

| Shaft | Y | Z |
|---|---:|---:|
| C0 input drum shaft | 303.010000000000 | .120000000000 |
| C1 compound shaft | 302.916789310154 | .195576235011 |
| C2 preferred higher-Z intersection | 302.810110998448 | .314822777148 |
| C3 cam shaft | 302.640000000000 | .420000000000 |

The alternative C2 is `(302.778067647864,.275302644761)`. The higher-Z candidate is farther from the existing input crank at Z=.12; this is a placement preference, not a mesh-clearance result. The three gear pairs need distinct axial planes and positive compound-shaft connections. Their shafts, bearings, gear tips and supports require actual-source checks before choosing their X planes.

With drum rotation `θd`, the successive shaft rotations are `−θd/2`, `θd/6`, and `θcam=−θd/24`. Since the current drum is `θd=−2πq`, the reduced cam turns `+2πq/24`. Its **new** cam-local centreline must therefore reverse azimuth:

`[-x(q), Rcam cos(−2πq/24), Rcam sin(−2πq/24)]`, for `0≤q≤24`.

Applying the actual cam rotation places the active groove point at `[-x(q),Rcam,0]`, preserving fixed +Y follower contact. Its active tangent is proportional to `[-dx/dq,0,−2πRcam/24]`; the follower orientation must use this new tangent. The old 1:1 JSON cannot be reused unchanged.

The reduction resolves repeated branch crossings but exposes a second concrete geometry constraint. With `Rcam=.035` and the frozen winding reversal, each reversing turn occupies only 15° of cam travel. At q=11.5 and 23.5, `|d²x/dq²|=.08406917484 m/turn²` and the cam-centreline curvature radius is **.000998297 m**. The current 5 mm-radius cutter and 9 mm shoe cannot be carried over as a verified fit. A larger cam or a newly matched reversal/cutter/follower design is required, followed by source-contact and clearance checks. This option is not permission to bypass the existing admission flags or a claim that the reducer alone solves the mechanism.
