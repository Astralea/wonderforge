# Climbing gin pole: worker and drive design

Candidate geometry coordinates, not lifting-capacity certification. Actual source tower GLB was ray-tested; no production source or Blender file changed by this audit.

## Supported ladder

Use south-side rails at X=±0.173205080757, Z=−0.30, from Y300.710013 to307.40. Under each rail, a footplate 0.12m along the corresponding radial floor spoke and0.08m across it has all four corners supported by actual exported crown floor: west `summit-crown-m065-c000`, east `summit-crown-m069-c000`. Measured top is300.6700098, within4µm of manifest300.6700134. A0.04m plate connects rails to the floor; visible mast ties are still required against ladder overturning. The floor is narrow radial beams, so a generic wide bottom platform is unjustified.

Rung centres Y300.87 + n×0.28, section diameter0.036. Working rung n16 gives sole contact305.368. Feet X±0.12,Z−0.30 both lie within its rail span. Existing central mast occupies X/Z±0.09; rung centreline Z−0.30 leaves0.192m section clearance. Source staff crossbars at Z±0.0325 likewise do not intersect these rungs.

## Positive drive reaction

Parent's adopted drum axis is X: drum centre[0.25,306.91,−0.12], radius0.07; input axle[0.25,306.70,−0.12], crank radius0.18, 2:1 gears. Route upward in its YZ plane to east guide[0.25,307.20,0.28], then west to sheave centre[−0.82,307.20,0.28], radius0.08. Its left tangent is[−0.90,307.20,0.28]; descending line ends on pole lug[−0.90,b+0.08,0.28]. The northward detour avoids a direct diagonal cable crossing the central mast. Actual tangent/wrap geometry and changing drum payout remain integration checks.

Two bearing shoes centred X±0.20,Z0, footprint0.10×0.045, undersideY306.032501, bear positively on the ALREADY SEATED `summit-crown-m075-c000` crossbar. All eight corners hit that exact source mesh at306.032500±0.00000004. Their narrow-direction edge margin is0.010m. Visible columns from these shoes carry the upper collar/winch/fairlead frame; the load path is shoe compression→crossbar→existing mast joint, not sliding-collar friction. The65mm square source crossbar has no certified capacity in this audit.

Use fork reaction members above the guide opening sweep, from collar-cap lugs around[−0.13,307.10,±0.13] to the west sheave frame. A cap extension must actually connect to the upper collar whose top is307.0467. Do not represent the chain of load-bearing connections as disconnected origins.

The pole's withdrawable pin is at localY1.4, seated against old upper guide302.30 or new upper306.9667. A mast-side mechanical linkage/lanyard is necessary: the worker cannot directly reach the pole at X−0.90. Closed half-guides must swing separately toward±Z; a whole closed band cannot pass through the pole.

## Connected crank pose and demonstrated limitation

A proposed upper working pose faces +Z: pelvis[0.22,306.278,−0.42], feet[±0.12,305.368,−0.30], shoulders[0.06/0.38,306.688,−0.30], hips[0.12/0.32,306.218,−0.42]. Hand grips lie at X0.42/0.54 on the full YZ crank circle centredY306.70,Z−0.12. Over7201 angles, maximum shoulder-to-hand lengths are0.509400/0.394319m; hip-to-ankle lengths0.777753/0.766355m. These fit the existing0.62m arms and0.87m legs without stretching.

However, the existing `eiffelLongLoadWorkerRig` only permits sagittal pelvis offset in its +X-facing local frame. It cannot express this lateral offset and facing direction independently. The preserved alternative diagonal-facing test failed562/721 crank poses. A general connected-body helper must implement the proposed full pose with exact fixed-length IK; reusing the old helper unchanged is not approved by these measurements.

The +0.22m body offset is chosen for the south half-guide sweep, but these endpoint calculations do not prove mesh clearance. The torso/head and forearm meshes must be checked against actual exported opening leaves at every angle. Likewise, rung-to-rung transitions require continuous alternating foot/hand contact. No completed worker climb, guide-control reach, or full asset sweep is claimed here.

## Evidence

`worker-drive-evidence.ts`/`.mjs` ray-test the actual exported source and preserve the failed existing-helper attempt. `worker-drive-evidence.json` additionally records the revised connected-pose calculation above. `search-reach.ts` records the unsuccessful bounded search within the old helper's limitations. Parent owns actual geometry generation and final swept-contact verification.
