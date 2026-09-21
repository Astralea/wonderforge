# Second-floor relay: bounded actual-source route audit

Final candidate **V4**, `model/second-floor-relay.glb`, SHA-256 `1ee73a0c07d7d1eb6efb05c8e993cee5069a50afaa141baaf04372ba3a08be10` (1,580,948 bytes; 301 exported meshes). Parent authored this isolated Blender asset. This audit did not edit Blender, source models, or production code.

## Retained load and route

The payload remains **`summit-access-stair-m000-c000`**, the same long carrier delivered by `sampleEiffelLongLoadFilm(280)`. It is not a summit mast substitute and does not become seated in the tower. The actual carrier, retained closed sling and carrier saddle comprise 26 source meshes. Their combined local envelope is X/Z ±0.219999999 m, Y 0…7.030500327 m; carrier alone is 6.317500305 m tall. The master is 6.882500305 m above the carrier shoe.

| State | Carrier shoe world position, metres |
|---|---|
| Existing cart endpoint | `[-8.5, 58.2800024414, -4]` |
| Vertical hoist clear of second floor | `[-8.5, 117.70, -4]` |
| Above receiving cart | `[-15, 117.70, -1.8]` |
| Resting on receiving cart bed | `[-15, 116.4799993896, -1.8]` |

The full swept load envelope clears the actual public tower triangles on all three legs. At the pickup shaft, actual members `platform-2-3-02-m001-c000` and `m002-c000` limit extra lateral clearance; checking only the carrier origin would miss that constraint. The fixed upper bridge is also clear apart from the intended receiving-bed contact.

Diagonal coordinates use origin `[-8.5,0,-4]`, longitudinal unit direction `[-0.9472159696,0,0.3205961743]`, lateral unit direction `[-0.3205961743,0,-0.9472159696]`, and travel length 6.862215386 m. The adopted frame has rear portal U=5.6, rail end U=7.512215386, split portal heads, fixed guide `[7.70,125.70,0]`, and drum `[8.55,116.9399993896,0]`. The frame geometry and 73-pose rope proposal are recorded in `design.json`.

## Final V4 checks

- All **165 upper exported meshes** have zero conservative local-mesh-box intersections against actual tower triangles. This includes the sheave, guide supports, frame, steam hardware, winch and receiving cart.
- The full carrier/sling sweep has no unintended intersections with the exported receiver/drive. The lower clevis is separately animated attachment hardware; the receiving bed is the intended terminal contact, not an obstruction.
- **48** actual support vertices on frame feet, winch bed, engine/boiler bases, operator boots and cart chocks have floor contacts within 30 µm.
- **328** actual trolley-wheel bottom contacts over 41 longitudinal positions have rail contacts within 30 µm. This gate samples the authored wheel orientation; Maxwell owns the rotating-wheel/axle regression after the sampler correction below.
- **8** actual receiving-cart wheel-bottom vertices contact the second-floor deck within 30 µm.
- **152** carrier-shoe underside vertices directly ray-hit the receiving bed with a 3.6 nm height residual. The remaining **44** are exact bore-rim boundary rays; closest-point distances to the actual bed triangles are at most **0.196 µm**. They are reported explicitly, not silently treated as successful rays.
- **73** actual route-sampler poses have no padded rope intersections with the actual tower or exported upper fixtures, flanges, shafts and steam hardware. Each segment is enclosed by an oriented box padded 8.55 mm (8 mm rope radius plus sampled-arc sagitta allowance). Only the drum core and sheave groove surfaces are excluded because they intentionally support the rope at the authored tangent radius.
- The final drum-gear vertices have no inside-bearing witnesses under two independent parity-ray directions. The actual source axle/mesh inspection found the drum and both sheaves spin around local Z. Trolley-wheel geometry spins around local Y beneath its saved X quarter-turn. The route sampler initially used incorrect X-axis increments; Maxwell corrected these in the owned sampler. No source geometry change was necessary for that fix.

Reports: `actual-source-1ee73a0c07d7.json`, `actual-rope-1ee73a0c07d7.json`. The latter records all referenced tower/carrier/sling hashes and the exact bundled sampler SHA `b4a223b88b8df03682810ba363cd28bc22fa5e581803962a5cbceac26e4491fa`.

## Rejected intermediate results, preserved

A simple 4.35 m raise of the old long receiver failed because its rear portal and rail ends intersected inward tower-shaft members. `audit-raised-proposal.json` preserves that rejected layout.

V1 `f2a44bba38d4…` had a confirmed drum-gear/bearing solid overlap (382 inside-vertex witnesses), a steam cylinder/pipe intrusion into the landing envelope, and an empty moving-sheave role. V2 moved the steam/gear plane to lateral +0.95 m, extended the shaft, and attached all three sheave meshes to the rotating role. The remaining fixed flange intersected `shaft-01-m027-c002`. Moving guide U from 7.75 to **7.70** clears the actual flange; 7.71 still intersects. The final moving/fixed flange gap remains **27.785 mm**. `guide-shift-54d61eb36d9e.json` records the bounded source-geometry sweep; prior design and actual-source reports retain their original identities.

## Scope boundary

This proves a clear geometric relay corridor and the listed support/tangent contacts for the named load and frozen candidate. It does **not** prove frame strength, rope inventory/winding capacity, powered trolley traction, installation/removal of the equipment, or worker handoff/fastening. Lower scaffold attachment and worker movement are separately audited by Aristotle; sampler/renderer continuity and browser captures are Maxwell's evidence. The route still declares `driveAdmitted:false` and `seated:false`. The current production film is not admitted by this candidate-only audit.

The previously inspected preview screenshots at 106/126 seconds cropped the raised load and receiver above the image. They are not accepted endpoint visual evidence; Maxwell was notified to recapture with material-follow framing and actual frustum checks.

## Reproduce this bounded audit

Use project Node 24. `actual-source.mjs` and `actual-rope.mjs` read the live candidate and write hash-named reports, leaving earlier model-identity reports intact. Rebuild `relay-module.mjs` from `src/engine/eiffelSecondFloorRelayRoute.ts` with esbuild before evaluating a changed sampler. `geometry.mjs` loads the actual public tower and retained transport assets, applies their renderer-equivalent transforms, and performs triangle/envelope tests and surface rays. No broad suite or production build was run by this subtask.
