# Cargo reeving design and bounded pure implementation

The implemented candidate path has **17 joined tangent/arc segments**, from the fixed m073 drive through the annular head feed to the two-fall travelling block and positive tip becket. It is an authored mechanical reconstruction, not a claim that this exact summit rig was used in 1889. The production film has not been admitted by this work.

## Actual source inspected

`source-inventory.json` records transformed vertices/bounds from the V9 gin-pole GLB and the public kit, including their SHA256 identities. V9 is `f304c1dc…`; kit is `8c597d70…`; manifest is `e054bfb8…`. The inventory reads the exported geometry, not only the builder text.

The V9 pole is 6 m long and 0.13 m square; its original heel is Y306.899994. The original 3 m jib cannot reach the actual terrace stock. The c001 and c002 mast meshes are 0.18 m square, each 4.6666665 m long, with actual upper faces Y307.3333333 and Y311.9999897 respectively. Attached crossbars extend ±0.3000001 m along world X. Their closed rendering prisms do not establish real iron section or mass.

The old head frame's lower stays were disconnected from the timber/bearing: its inner Z faces were ±0.124 m while the heel pin ended at ±0.120 m. The ring also conflicted with the timber. These findings informed the parent's new cap, positive head fittings, and wider fixed stays; the inventory is a record of the inspected V9, not a pass for its replacement.

The actual kit pickup coordinates are semantic points on one mast face, not authored lifting eyes. Parent-authored collars and ears provide the new attachment interface. A cart tail pin now constrains the one-axis upend; the rejected centre-preserving SLERP was only an envelope experiment.

## Current head feed

`head-feed-proposal.json` contains exact centres, tangent vectors, and axes. The final V5 design uses a 5.70 m reinforced jib on a pitch pivot0.30 m outboard of the yaw root. That root is Y307.05, rising to Y311.716667. Tip coordinates in its yaw frame are `[.30+5.70cos(pitch),5.70sin(pitch),sideOffset]`; the becket is `[.30+5.60cos(pitch)+.13sin(pitch),5.60sin(pitch)−.13cos(pitch),sideOffset]`. The offset clears the source head crosspin. The preserved `before-v5-head/` evidence belongs to the superseded geometry. The cargo drive and all three lower guides remain on m073 for both lifts. The separate pole-climbing drive is on m075.

The clockwise annular sheave has pitch radius `sqrt(.2²+.34²−.06²) = .389871773792 m`. A fixed quarter guide below the ring receives the western vertical riser; a yawing quarter guide above it leads upward at jib-side offset `sqrt(.2²+.34²) = .394461658466 m`. The heel and tip sheaves and the cargo falls share that side plane, which avoids the original proposal's rope through the steep jib. The annular wheel can rotate about world Y; its entry and exit brackets have their own fixed/yaw roles.

The V5 jib/pivot arrangement reaches the upper collar at flat-stock radius5.929660 m. The extreme mast end radius6.039112 m would exceed it. The actual collar offset, fixed tail pivot, and side-feed equations matter; a generic centre hook or unchanged passive two-leg sling cannot produce the upend.

## Pure solver and measurements

`src/engine/eiffelSummitCargoRope.ts` owns the tangent path. It uses internal common tangents where the rope passes opposite sides of adjacent wheels and external tangents for the heel, tip, and travelling block. Unequal radii are retained. Every arc joins its neighbouring line with the same tangent. Analytic lengths include the variable annular wrap; rendering uses a bounded chord approximation. There is no Three.js or DOM import.

The final lower block is 1.80 m above the collar. Its eye is 0.19 m below the block; the retained ears are ±0.14 m from the mast axis. Both bridle legs are therefore `hypot(.14,1.61) = 1.616075493 m` long. The earlier0.35 m offset put the eye inside the mast; 1.10 m still failed once rope thickness was included. The final geometry has a minimum centreline-to-mast distance22.678837 mm at hinge73.300756°, giving16.678837 mm clearance for the6 mm rope radius. The test computes the minimum over complete segments and source-size mast boxes, not just rope sample vertices.

`rope-metrics.json` seals the sampler/module/test source hashes and records2241 samples per112-second route:

| Measurement | c001 assembly | c002 assembly |
|---|---:|---:|
| Minimum tip/block centre separation |1.088595 m|1.088606 m|
| Deployed reference rope |16.503488–64.962893 m|21.170176–78.962893 m|
| Clockwise annular wrap |2.758167–5.862648 rad|2.758167–5.862648 rad|
| Reference wound amount with120 m total |55.037107–103.496512 m|41.037107–98.829824 m|

Validation: **6 focused Vitest tests pass**, including all tangent joins, dense phase/angle boundaries, fixed lower-drive support coordinates, two-fall travel, fixed bridle lengths and tube-radius clearance, invalid-input rejection, and explicit admission flags. `npm run typecheck` passes. No production build, Blender/MCP operation, source-asset edit, or GPU claim was performed by this subtask.

## Explicit remaining boundary

The module returns `sourceClearanceVerified:false` and `inventory.visualWindingAdmitted:false`. Its first tangent currently uses the0.10 m reference core. A true multilayer winding changes the radius and axial exit position, hence the first tangent and fleet angle. `120 − deployedLength` is an accounting identity only; it is not a solved winding or a physically admitted hoist. No helix was added that would place the outgoing rope through stored coils. The parent's current drive/ladder interference also remains unadmitted.

The separate luff restraint needs its own positive head/tip attachments, supported control, continuous path and conserved inventory. For a head anchor above the yaw axis, the V5 pivot offset gives anchor-to-tip distance `sqrt((.30+L cos(pitch))²+(L sin(pitch)−h)²)`; a two-fall tackle changes twice that straight span plus its actual arcs. It does not share the cargo or pole-climbing rope. Luff source clearance, operators, equipment installation/removal and the incoming ground-to-terrace supply remain outside this bounded implementation. No capacity, gear-load sufficiency, section mass, or historical exactness is certified.

## Primary references and attribution

The monument operator documents tower-mounted steam cranes and later freight elevators; this supports the general construction context, not the dimensions or hand-driven summit mechanism authored here: [Eiffel Tower steam engines](https://www.toureiffel.paris/en/news/history-and-culture/eiffel-tower-and-its-steam-engines), [official construction history](https://www.toureiffel.paris/en/the-monument/history).

The two-fall force/travel relationship is the ideal simple-machine result, with friction and capacity deliberately excluded here: [OpenStax, Simple Machines](https://openstax.org/books/college-physics-2e/pages/9-5-simple-machines). At the original0.07 m drum radius,0.18 m crank and2:1 gear, a two-fall block moves0.109956 m per crank revolution in the ideal model. That discarded small drum would not store the terrace lift's required rope; the parent's larger cargo drum still needs the winding/exit gate above.
