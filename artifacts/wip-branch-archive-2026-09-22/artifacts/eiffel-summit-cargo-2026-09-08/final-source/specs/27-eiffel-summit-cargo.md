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

The cargo drive stays supported on m073 for both lifts. Its drum and three lower fairleads do not move when the head climbs. The head feed uses a horizontal annular sheave of pitch radius `sqrt(.2²+.34²−.06²)`, a fixed quarter-turn entry below its plane, and a yawing quarter-turn exit above it. Its continuous clockwise arc transfers the rope to a line `sqrt(.2²+.34²)` metres to the jib's positive side; the heel and tip sheaves stay in that side plane. The annular entry/exit brackets do not rotate with the wheel itself.

The pure rope solver returns joined straight tangents and circular arcs through the drum, lower guides, annular feed, heel, tip, travelling block, and positive tip becket. It includes unequal-radius and internal common tangents. Length is the analytic sum of straight lengths and radius times arc angle, not the chord approximation used to draw the rope. One continuous annular wrap branch must remain strictly between zero and one full turn; invalid geometry fails explicitly. The returned path does not prove source-mesh clearance, winding capacity, friction, or load capacity.

The lower block centre is `upperCollarWorld + [0,1.80,0]`; its eye is 0.19 m below that centre. Two retained bridle legs join the eye to the actual collar ears at parent-local X ±0.14 m. Their length remains `sqrt(.14²+1.61²)` during the one-axis upend and subsequent upright yaw. The previously proposed 0.35 m block offset is rejected because its eye and bridle intersect the mast; 1.10 m also fails after the 6 mm rope radius is included. The final 1.80 m offset is checked with the complete segment-to-mast distance throughout the hinge, including the 6 mm rope radius and a useful surface margin; a near-contact 1.20 m intermediate is not the final design. The two cargo falls and the separate luff restraint each conserve their own complete rope inventory, including arcs and the changing drum winding.

The current bounded rope solver uses the cargo drum's 0.10 m reference core for its initial tangent. `120 − deployedLength` is a reference inventory balance only. It explicitly returns `visualWindingAdmitted:false`: a multilayer drum must change its exit radius and axial position, which also changes the first tangent and its fleet angle. The reference path must not be presented as a solved physical winding or driven cargo lift until those source-dependent transitions are implemented and checked.

The final head correction places the pitch pivot 0.30 m outboard of the yaw root and uses a 5.70 m boom. The high transfer retains the north offset until X reaches zero, then moves Z to zero; diagonal motion through the small-radius head exclusion is forbidden.

The isolated renderer must show the actual seated terrace/c000 context, analytical rope and bridle, and the travelling block at its sampled pose. Tail-pin transforms retain their authored cart-local Y/Z anchor. Full-capacity reference winding is hidden while actual spooling remains unadmitted. Review seeks must wait for the rendered sample time, not an arbitrary short delay.
