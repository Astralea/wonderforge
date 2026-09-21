# Ground slinger sampler evidence — 2026-09-07

`sampleEiffelGroundRiggers(seconds)` keeps two workers at fixed pickup stations for the full 55-second pilot. Their feet use the Eiffel terrain sampler; each foot bottom equals terrain height. Legs include knee joints, the rendered torso endpoints lean toward the cart only during rigging, and both arms use fixed 0.38 m upper-arm and 0.40 m forearm lengths.

The working hands follow the actual loose sling endpoints from 13 to just before 14 seconds, meet the two pickup lugs at 14 seconds, then withdraw continuously through 14.6 seconds while the bodies return to their waiting lean by 14.8 seconds. Dense 0.025-second tests sample torso, head, legs, and arm segments against the actual 1.8 × 5.1 m carrier slab with the renderer's radii. The two 0.28 × 0.12 × 0.14 m foot boxes do not overlap.

Verification: `npm test -- --run tests/eiffel-ground-riggers.test.ts` passes 6 tests; `npm run typecheck` passes. This sampler covers pickup rigging only. It makes no upper-station unrigging or workforce-capacity claim.

## Rendered external-clearance audit

The current `EiffelGroundLiftSystem` was instantiated and updated at 1,101 samples from 0–55 seconds (0.05-second spacing). The audit inspected 37,434 transforms from the original named/hidden worker meshes, including the renderer's pelvis and neck connectors. Exact OBB SAT found zero intersections with 1,840 tower boxes completed at the pilot freeze and zero intersections with all 219 installed falsework members. Conservative world-AABB separation lower bounds were 2.33053 m to `lower-ne-00-m034-c001` and 1.73563 m to falsework `post-3-0-piece-0`. Full machine-readable results and rerunnable audit source are in `external-clearance.json` and `external-clearance.audit.test.ts`.
