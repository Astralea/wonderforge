# K3 Sydney Pass 4 — Spherical Shell Geometry Fix

**Date**: 2026-09-04  
**Commit basis**: geometry rewrite in SydneyStoneSystem + SYDNEY_SAILS reauthored  

## What changed

1. **Spec 13 updated**: tile skins (`kind: 'sail'`) now mandated as spherical cap patches
   cut from the single Utzon sphere (r=75 m) with `scale [1,1,1]`. Non-uniform
   stretching of a unit sphere explicitly forbidden.

2. **`SYDNEY_SAILS` reauthored**: added `sphere: { centre, phiStart, phiLength, thetaHalf }`
   per sail. Two main groups (Concert NE, Opera NW) with correct nested nesting.
   Dimensions kept for clearance/hoist, not for GPU scale.

3. **`SydneyStoneSystem` redesigned**:
   - `createSailGeometry(def)` generates full-size `SphereGeometry(75)` cap in world space
   - `setSailTransform` applies position + rotation, scale `[1,1,1]` only
   - Per-sail settled and active `InstancedMesh(1)` (no shared unit-sphere mesh)
   - Blocks and ribs unchanged (BoxGeometry, scaled by dimensions as before)

4. **Tests**: new `createSailGeometry` contract test verifies each cap spans > 7.5 m
   and < 157.5 m, and that widest/narrowest ratio < 8. All 382 tests pass.

## Frame evidence

| t | label | result |
|---|-------|--------|
| 0.12 | dawn-podium | podium forms appearing, cranes erecting |
| 0.32 | ribs-rising | ribs visible, first sail (concert outer) hoisting |
| 0.58 | shells-mid | Concert shell seated, Opera ribs visible |
| 0.78 | tiles-on | Both main groups seated, night approaching |
| 1.0 | night-reveal | Two distinct curved shell groups on dark water |

## Status

**PASS on geometry contract.** Shells are true spherical sections, not stretched boxes.

Tuning still needed:
- Widen `thetaHalf` on outermost shells (0.32–0.40) for more prominent fan spread
- Adjust Concert shell rotation slightly eastward so the east-camera sees nested profile
- Restaurant shells are small; move z-position further south to clear Concert overlap
