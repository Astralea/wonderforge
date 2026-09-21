# Eiffel production clearance audit — 2026-09-07

Read-only production audit. No Blender/MCP, servers, build or source changes were performed. Only this evidence directory was written. Spec 14 explicitly requires routes clear of completed iron; current tests check mast distance and contact anchors but do not cover completed-neighbor occupancy.

## Reproducible findings

1. **P1: Rotating hoist drives a first-floor assembly through a completed neighboring beam.** In `src/engine/eiffelProductionConstruction.ts:430`, the load rotates while interpolating from its low receiver to the clear pose. `platform-1-0-01-m000-c004`, stage 23, at normalized film time **0.3054678805970198**, local operation fraction **0.20**, phase **hoist**, has center **(-27.15016223, 58.50520539, -27.70000076)**. It intersects already-seated `platform-1-0-00-m000-c010`, center **(-26.90999985, 57.72000122, -27.70000076)**, completed at **0.3053805970149302**. Exact box SAT requires **1.87481053 m** translation along world Y to separate. Their final installed poses do not intersect; this is not an authored joint or a final-seat boundary contact. Raise the load with its current attitude until the complete rotational envelope clears nearby iron, then rotate/transfer through a validated corridor.

2. **P1: Straight foundation hauling goes through an already constructed masonry bearing.** `src/engine/eiffelProductionConstruction.ts:407` directly interpolates pickup to radial staging. `foundation-se-0-m000-c012`, stage .288, at **t=0.045741071428571395**, operation fraction **.20**, phase **haul**, center **(61.18645439, .92000000, 59.80382636)** intersects `foundation-se-2-m000-c031`, stage .144, completed at **t=.042232142857142815**, center **(61.625, .95999998, 60.3125)**. The minimum separating translation is **.60000004 m** along Y. These are actual masonry boxes, disjoint in final poses. The visible supporting carrier cannot fix an occupied route. Route carts around the completed bearing footprints with their actual load/carrier clearance, preserving ground contact.

3. **P1: A receiving deck is embedded in a completed arch.** Receiver generation at `src/engine/eiffelProductionConstruction.ts:348` only offsets the pickup from its station; it does not reject occupied geometry. For `platform-1-0-01-m000-c002`, inspect **t=.3054569701492586**, fraction **.05** (staged). The rendered deck is an identity-rotation solid box centered **(-15.10606499, 51.48577266, -31.23350622)**, size **(2.83999996, .30, 5.43333340)**. It intersects completed `arch-0-14-m011-c000` (completed **t=.2620708631892749**); exact box SAT requires **1.31737005 m** separation, approximately along Z. The two receiver saddles are **(-22.18961450,51.33577266,-32.62539959)** and **(-22.28955968,51.03361276,-32.11676381)**, about 7.2 m away, so the deck intersection is not an intentional saddle contact. The renderer faithfully draws this box and two grillage members to the saddles in `src/render/three/EiffelProductionWorks.ts:225`. Choose a clear receiver location and verify the entire deck and grillage, not just endpoint contact.

## Method and evidence limits

`audit-clearance.ts` creates the actual production schedule and samples each box-shaped cargo at local fractions .02, .20, .40, .55, .68, .76, .85, .92. An 8 m spatial grid provides a conservative broadphase. A 15-axis oriented-box separating-axis test provides exact convex-box intersection in the narrow phase. Only neighbors already seated at the sample time are compared. Same-source subdivisions are excluded. Intersections below .04 m are ignored. Pairs that also intersect in final geometry are excluded from the reported cargo-route set to avoid treating authored overlapping joints as transport collisions.

There were **4,434,046** candidate checks, **22,251** sample intersections over .04 m before the final-pose filter, and **5,489** after that filter. These are sample-pair counts, not distinct defective parts. This finite sampling proves the counterexamples; it does not certify the remaining paths. Simultaneously moving loads, crew, sling, jib, terrain, and city collisions are outside this audit. Cupola-gore parts are excluded because their boxes would be conservative envelopes.

For the selected cargo examples, the actual `tower-kit.glb` has 24 vertices / 36 indices per mesh, 8 distinct convex-box corners, and canonical corner residual below **0.000001 m**. Receiver-collision arch meshes likewise match the box corners within **0.000000114 m**. Thus these three findings use actual solids, not loose AABBs around open lattice assemblies. "Depth" means minimum translation to separate the convex solids on a SAT candidate axis; it is not merely the length of the overlapping interval when one shape contains another.

Support review: station-map saddle coordinates are derived from actual transformed box faces. That resolves the prior union-AABB false support point. It does not validate deck occupancy or strength. The renderer's lower bracket nodes are generated .55 m below the saddles, and 22,520 sampled nodes are outside completed tower solids within a .07 m tolerance. They remain connected to the upper saddle by explicit bars, so this alone is **not** reported as an unsupported/floating-geometry failure; a moment-resisting connection might support such a bracket, and capacity was not assessed.

Artifacts:
- `audit-clearance.ts`: independent reproducible source audit.
- `audit-clearance.mjs`: bundled executable, retaining the audited production code even after subsequent edits.
- `audit-clearance.log`, `clearance-audit.json`: counts, strongest examples, GLB checks, and top 100 filtered cargo hits.
- `support-audit.json`, `receiver-geometry-check.json`: receiver and lower bracket checks.
- `clearance-inputs/`: inspected source snapshot and SHA256 provenance, including hashes of actual public kit GLB/manifest.

Re-run captured version from repository root: `node artifacts/eiffel-resume-2026-09-07/audit-clearance.mjs`.
To audit changed production code, bundle the TS source again with local esbuild first. Do not treat the captured run as validation of later fixes.
