# Spec 27 — Eiffel summit mast cargo candidate

## Scope

This isolated candidate replaces the unsupported near-pickup assumption for the two remaining summit mast assemblies. It is not wired into the production film. It preserves the exact identities `summit-crown-m072-c001` with children m074/m075 and `summit-crown-m072-c002` with child m076.

## Supported stock and upending

Each assembly starts flat at parent pose `[-6.4701368053,281.0400000036,0]` on a stationary terrace cart whose four wheel tracks bear on the actual Y=280.589995 terrace. A tail shoe holds parent-local Z=-2.0333333333 with two opposed retractable stub axles outside the solid mast; a through-pin intersecting the unbored mast is forbidden. The upper tackle attaches at parent-local Z=+2.0333333333.

Upending is a one-axis -90 degree world-X rotation about the fixed tail pivot. Direct identity-to-final quaternion SLERP is forbidden. Once upright, the upper tackle holds the load, both tail stub axles withdraw in opposite X directions, and only then does the mast turn about its longitudinal axis to the final yaw. The cart, shoe and collars remain visible.

## Cargo lift

The candidate uses a 5.7 metre boom on a 0.30 metre outboard heel on the existing six metre gin pole. The first drive reacts through an authored bearing on already seated m073; the second may use m075 only after c001 is seated. The route lifts in the exterior lane, transfers inboard, and lowers to the exact final pose. Child poses are derived rigidly from the parent and never receive independent crane jobs.

The two 6 mm-radius bridle legs join collar ears at local X +/-0.14 m to a lower-block eye 1.61 m above the collar; the block centre is 1.80 m above the collar and each fixed leg is 1.616076731 m.

The sampler must be deterministic and reversible. It exposes the parent and all child poses, tail engagement, collar points, jib yaw/pitch, provisional cable endpoints, and named phase. Provisional cable points are an input contract and do not admit reeving, strength, drive reaction, or worker operation.

## Admission boundary

This candidate establishes kinematic continuity and preserves identity. Production integration requires actual candidate-mesh collision checks, cart/cradle and tail-pin contacts, positive collar bores, cargo sling continuity, supported drive reactions, and visible operators. It does not establish capacity or the earlier ground-to-terrace freight chain.

## Cargo rope geometry

The cargo drive stays supported on m073 for both lifts. Its frame and four lower fairleads do not move when the head climbs; its keyed drum rotates and traverses axially as rope pays out or winds in. The operation revision feeds the first two guides on the positive-Z side, turns horizontally around the western side of the climb line, and then turns upward at `[-1.26,303.46,-.34]`. The head feed uses a horizontal annular sheave of pitch radius `sqrt(.36²+.34²−.06²)`, a fixed quarter-turn entry below its plane, and a yawing quarter-turn exit above it. Its continuous clockwise arc transfers the rope to a line `sqrt(.36²+.34²)` metres to the jib's positive side; the heel and tip sheaves stay in that side plane. The annular entry/exit brackets do not rotate with the wheel itself.

The four lower guide centres are `[.25,303.14,.58]` (R.06, axisX), `[.19,303.32,.64]` (R.06, axisZ), `[-1.18,303.38,.56]` (R.08, axisY), and `[-1.26,303.46,-.26]` (R.08, axisX). The horizontal return atX−1.26 passes the separate climbing downleg atX−1.10 with0.16 m centreline separation. It must be tested against actual ladder, guide and climbing-line geometry; these coordinates alone do not admit complete access or operation.

The pure rope solver returns joined straight tangents and circular arcs through the drum, lower guides, annular feed, heel, tip, travelling block, and positive tip becket. It includes unequal-radius and internal common tangents. Length is the analytic sum of straight lengths and radius times arc angle, not the chord approximation used to draw the rope. One continuous annular wrap branch must remain strictly between zero and one full turn; invalid geometry fails explicitly. The returned path does not prove source-mesh clearance, winding capacity, friction, or load capacity.

The lower block centre is `upperCollarWorld + [0,1.80,0]`; its eye is 0.19 m below that centre. Two retained bridle legs join the eye to the actual collar ears at parent-local X ±0.14 m. Their length remains `sqrt(.14²+1.61²)` during the one-axis upend and subsequent upright yaw. The previously proposed 0.35 m block offset is rejected because its eye and bridle intersect the mast; 1.10 m also fails after the 6 mm rope radius is included. The final 1.80 m offset is checked with the complete segment-to-mast distance throughout the hinge, including the 6 mm rope radius and a useful surface margin; a near-contact 1.20 m intermediate is not the final design. The two cargo falls and the separate luff restraint each conserve their own complete rope inventory, including arcs and the changing drum winding.

The operation rope solver couples the current winding radius to the first common tangent and solves the complete winding plus deployed length for a conserved 120 m rope. The drum core radius is 0.10 m, rope radius is 0.006 m and centre pitch is 0.0122 m. Eleven straight spindle turns followed by one smooth reversing turn lay each layer; the final tenth layer ends after its eleven straight turns, at 119 total spindle turns. Its geometric winding capacity is approximately 120.357253 m. The actual operating inventory remains below that bound. Capacity here means centreline storage length, not a rated load or strength.

Let `q` be wound spindle turns, `p=.0122`, `A=5.5p`, `k=floor(q/12)`, `t=q−12k`, and `d=(−1)^k`. For `t≤11`, the axial winding coordinate is `x=d(−A+pt)` and radius is `.106+kp`. During the reversing turn, `u=t−11`, `ψ=2u+(π−2)(3u²−2u³)`, `x=d(A+.5p sinψ)` and `r=.106+kp+.5p(1−cosψ)`. Position and first derivatives are continuous. The ±0.0732 m centre excursion plus the rope radius fits inside the 0.16 m drum width; the outermost rope surface stays inside the 0.24 m flange radius.

The drum centre is `[.25−x(q),303.01,.12]`, keeping the exiting rope in the first guide's X=.25 plane. The material winding angle is `2πq+φ(r)`, where `φ(r)=asin((r+.06)/hypot(.46,.13))−atan2(.13,.46)` is the current drum-to-guide takeoff angle. Rotating the complete inventory by `−2πq` therefore places its endpoint at exactly `φ(r)`. The last quarter turn uses a C1 peel-off curve whose axial and radial derivatives vanish at detachment, so the winding joins the free rope tangentially. Winding lengths use analytic straight layers and 16-point Gauss–Legendre integration of curved reversals and peel sections; deployed lengths retain exact line and circular-arc formulas.

The keyed spindle drives the barrel cam 1:1. Its closed diamond groove spans 24 spindle turns and has local centreline `[-x(q),.035cos(2πq),.035sin(2πq)]`. The retained follower contacts the rotating groove at fixed radial +Y and follows the same axial displacement as the drum; its active groove tangent is proportional to `[-dx/dq,0,2π*.035]`. The source builder must use `artifacts/eiffel-summit-operation-2026-09-08/rope/traverse-cam.json`. This is an authored mechanism, not a documented Eiffel construction detail. The solver returns `geometricWindingSolved:true` but keeps `visualWindingAdmitted:false` and `sourceClearanceVerified:false` until the actual keyed spindle, carriage, retained cam follower and complete rope/source interactions are admitted independently. The superseded full-capacity reference winding must remain hidden when this computed winding is displayed.

The final head correction places the pitch pivot 0.30 m outboard of the yaw root and uses a 5.70 m boom. The high transfer retains the north offset until X reaches zero, then moves Z to zero; diagonal motion through the small-radius head exclusion is forbidden.

The isolated renderer must show the actual seated terrace/c000 context, analytical rope and bridle, and the travelling block at its sampled pose. Tail-pin transforms retain their authored cart-local Y/Z anchor. Full-capacity reference winding is hidden while actual spooling remains unadmitted. Review seeks must wait for the rendered sample time, not an arbitrary short delay.

## Candidate operation sequence

The pure mechanism adapter composes the first 112-second c001 lift, the accepted 70-second supported pole climb, a visible 25-second empty-tackle return to the second terrace stock, and the second 112-second c002 lift into a reversible 319-second candidate. The cargo drive fixed to m073 and the old guide pair remain present throughout. The new guide pair appears only after c001 and its child m075 are seated; c001 remains seated while the pole climbs and while c002 moves. Worker arrival and control actions are outside this clock until their separate access sampler is admitted. The second assembly becomes visible only when the returned tackle reaches its stock; cart loading and tackle attachment remain explicitly omitted. This adapter is not connected to the production film. It explicitly leaves the earlier ground-to-terrace origin of both stock assemblies unresolved.

During the pole climb, the empty cargo travelling block is parked 1.0 m west, 0.8 m north and 1.5 m below the moving head. The cargo jib retains that constant relative pose while the fixed m073 drive pays out the added western-riser length. Freezing the old cargo rope or moving the fixed drive with the pole is forbidden.
