# Guyenet prototype mechanical review — 2026-09-07

Scope: independent review of the pure sampler, JSON dimensions, tests and the
geometry declared in `scripts/blender_eiffel_guyenet.py`. No Blender operation,
renderer edit, server, or build was performed by this reviewer. Parent owns
the actual Blender asset and rendering verification.

## Corrected head/screw geometry

The former head-rest position of 3.50 guide-metres intersects the working jib:
at inward yaw zero and reach 10.0925904541 m its axis meets G at
`[0, 3.1720772546, 1.4791639161]`. Offsetting screw I alone cannot fix G.

An initial proposed head-rest position of 1.20 m also fails the actual beam
extents: at reach 12 m, the lower jib chord axis is only 0.1473617943 m from
the G beam axis. Their radii are 0.033 and 0.130 m, giving 15.638 mm overlap.

With parent authorization the data now use **headRest 1.10 m** and
**screwLength 4.20 m**. These are authored clearance dimensions, explicitly
not historical measurements. The inward lower-chord clearance becomes
46.53 mm. The full conservative jib envelope, sampled at 66 reaches and
180 yaw angles, has minimum G/I separation **36.477 mm**. G's end shoes also
remain outside those envelopes. Tests include the lattice radius and
crossbar extents, tip pulley/axle, heel hoist, and a 0.103 m screw envelope
that contains its transverse thread markers. The 35 mm regression threshold
is a positive design clearance, not a collision tolerance.

At 1,001 samples of the unloaded inward climb parked at 5.5 m reach, the same
G/I and shoe checks pass with more than 40 mm clearance. The carriage nut at
guide-coordinate zero remains within the screw span with at least 0.60 m
engagement below it (the test requires at least 0.50 m). No engine changes
were needed. Engaged-anchor coordinates are now checked for zero motion
inside their phases, in addition to the existing boolean load-path tests.

These are sampled conservative-volume checks, not a continuous-time proof,
full crane collision certification, or rendered-asset inspection.

## Remaining reproducible interference — must constrain production

In the original layout before the parent's subsequent -0.95 m guide-face
offset, at **reach 12 m and yaw 32.5901284959 degrees**, the jib chord with local
coordinates `x=+0.26, z=+0.18` intersects the actual front flange of the
positive-X guide. The intersection is:

- Jib longitudinal coordinate: 2.3612927383 m.
- Guide coordinate: 1.3185424844 m.
- World point: `[1.4, 1.1950053211, -0.0927598672]`.
- Guide geometry: X=1.4 m, Z offset=-0.65 m from the inclined guide axis.
- Actual beam radii: jib 0.033 m and guide 0.090 m; centerlines coincide.

The regression suite contains this explicit original-layout known-failure witness so that
G/I clearance cannot be represented as unrestricted slew clearance. Keeping
the standalone prototype in a perpendicular operating orientation is a
review restriction. Production needs a clear working sector and physical
repositioning or a revised supported layout; merely hiding the offending
angle does not establish campaign coverage.

## Historical support interpretation and remaining checks

CNAM text in `cnam-crane-text.txt`, lines 12127–12131, describes the sliding
luff collar, main screw I, head G, and a nut connected by two ties to chassis B.
Lines 12178–12182 describe inward unloaded parking, the 2.5 m main climb,
and alternating 0.5 m safety-jack resets. Parent has now added a visible
main nut/ties and made thread-marker count depend on screw length.

The sampler additionally re-bolts carriage B during each safety reset.
The quoted reset sequence bolts the safety shoes and moves base H; it does
not explicitly describe re-bolting B every 0.5 m. Treat the extra B anchors
as an authored interpretation requiring actual bolt holes/support faces,
or revise the sampler to follow the sourced transfer after assessing its
load path. This review did not change that behavior.

Actual contact of all carriage/head/safety shoes with the guide girders,
tie and mast interference, loads, steam supply, detailed screw engagement,
bolt insertion, and installed tower supports remain unverified. A boolean
anchor flag and an anchor point on a guide axis do not prove contact with
the actual two-flange lattice girder. The current tests intentionally make
no such claim.

## Evidence and reproduction

- Frozen original inputs: `review-inputs/`.
- Analytic original counterexamples: `guyenet-geometry-review.mjs` and JSON.
- Current regression: `npx vitest run tests/eiffel-guyenet.test.ts` — 8 pass.
- Type validation: `npm run typecheck` — pass.
- Output: `guyenet-clearance-tests.txt`, `guyenet-clearance-typecheck.txt`.

Reviewer changes are restricted to JSON dimensions/interpretation, this
report and evidence, and the Guyenet test file. Production remains unfinished.

Parent is separately adding a -0.95 m guide-face offset and oriented skates.
The G/I tests use relative mechanism coordinates and remain applicable.
The original guide witness above is explicitly pre-offset evidence; the
new offset still needs a full guide-sector assessment.
