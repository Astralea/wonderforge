# Replacing both remaining summit rigs

**The current climb candidate cannot perform the first mast lift.** Its winch-bearing shoes sit on `summit-crown-m075-c000` atY306.0325005 (`scripts/blender_eiffel_gin_pole_climb.py:112–116,197`), but m075 travels attached to c001 (`src/engine/eiffelRigidAssembly.ts:6–7`). Loading that winch before seating c001 would require its own cargo to support the lifting machine.

## Actual current operations

Fresh `createEiffelProductionPlan` derivation from the current manifest gives:

| Parent / attached children | Production interval / wave | Current horizontal pickup origin | Final parent Y extent | Generic station |
|---|---|---|---|---|
|m072-c001 / m074,m075|.8991668574643567→.8995834287321787 /3595|[-6.4701368053,285.2081079125,0]|302.6666564941→307.3333435059|base[-3.2350684027,284.2181079090,0],16.694680355m mast,8.4m jib|
|m072-c002 / m076|.8995834287321787→.9 /3596|[-6.4701368053,301.6600097656,0]|307.3333129883→312|base[-3.2350684027,300.6700097620,0],8m mast,8.4m jib|

Both parents are4.6667m long with0.18m square section. Child crossbars make the handling envelope0.18×0.60×4.6667m. The first generic bracket currently names `summit-access-stair-m077-c000`; the second names `summit-crown-m049-c000`. These are existing plan metadata, not independently proven receiving stations. `EiffelProductionWorks.ts:134` renders every active sample's generic crane; filtering must exclude both parents throughout their replacement ownership interval, not merely hide a rig after drawing the cargo twice.

## What the compact rig can reach

Initial pole base[-.9,300.9,0],6m pole and3m jib give headY306.9; after4.666667m climb the head is311.566667. The proposed upright near pickup[-2.2,303.1,−1.2] for c001 and its corresponding c002 pose are NOT the actual current pickup origins above. Archived `support-audit/proposal.json` tested those near final-placement paths: maximum horizontal jib reach1.677379m, minimum hoist span.637247m,4004 poses per parent. That proves a bounded old-candidate route only; V5 hardware/cargo clearance must be rerun.

The actual current pickup is5.570137m horizontally west of the initial pole, exceeding the3m jib even before allowing sling geometry. Thus replacing the generic crane object while preserving its current pickup trajectory is impossible. The climb renderer also fixes the jib at78° and currently reeves only the **pole-climbing line**, not a cargo hook/tackle or controlled luffing line. A70-second empty-rig climb is not yet either cargo lift.

## Minimal causal sequence and code scope

1. After c000 is seated, establish the initial pole on old guidesY301.10/302.30. Add a separate cargo-hoisting drive supported by **already seated** structure: m073's topY302.0325 can provide a geometrically positive shoe/stool candidate, analogous to m075, subject to actual bearing/strength/clearance checks. It needs its own controlled line up to the initial jib, cargo hook/slings and luff restraint. The m075-supported climb drive must remain absent until c001 is seated.
2. Deliver c001+m074+m075 to a reachable pickup while preserving all three IDs. Either build the missing continuous terrace-to-near-pickup relay, or insert an explicit opaque time omission and begin the shown lift from a real, supported receiving cradle. Never expose a stationary upright mast suspended at[-2.2,303.1,−1.2] without a carrier/supporting line. Current `eiffelSummitStock.ts` expressly returns `productionReady:false` and `envelopeOnly:true`; its rack packing is not that delivery proof.
3. Lift and seat c001. Only then visibly install/load the m075-supported climbing drive, new guides and access equipment. Execute the supported70-second climb with actual operator/control contacts. Keep the same pole identity; do not swap low/high rig positions behind an unacknowledged cut.
4. Lift c002+m076 using an independently reeved cargo tackle at the raised station; the pole-climbing line stays responsible only for the rig's axial support. Provide the same honest incoming-stock treatment. Seat IDs once and dismantle the equipment visibly or within an explicit final omission.

Implement one dedicated summit insertion spanning both parent operations in `eiffelFilm.ts`, with both parent IDs withheld through `transportedPartIds`, preserving child ownership from `eiffelRigidAssembly.ts`. `EiffelWorld.ts:44,124` already supplies the kit/generic-work suppression pattern. The dedicated renderer must own these exact cargo meshes and temporary equipment, while seated membership changes only at actual final contact. This is the smallest coherent replacement scope; admitting the current m075-supported climb alone would leave the first lift causally impossible.
