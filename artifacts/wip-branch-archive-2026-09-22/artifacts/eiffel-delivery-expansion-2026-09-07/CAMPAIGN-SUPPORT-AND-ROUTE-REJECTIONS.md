# NE face campaign: support and route gate

**No new campaign is admitted.** The 14 endpoint candidates in REPORT.md do not form a supported 14-load sequence at the existing pilot freeze. No runtime, renderer or Blender files were changed. Per parent direction, no unused campaign sampler was added.

## Exact initial completed set

`support-order.ts` regenerates the unchanged production schedule and uses **all 1,840 kit parts whose end <= .09025741777108326**, the existing pilot freeze. It checks each candidate's transformed connection anchors against actual box solids, accepting a maximum 25 mm point-to-solid gap. This is an endpoint support dependency gate, not a strength calculation or proof that the whole existing structure has valid joints.

Five of the 14 endpoint candidates are already seated at this freeze:

- `lower-ne-02-m011-c000`
- `lower-ne-02-m011-c001`
- `lower-ne-02-m013-c002`
- `lower-ne-02-m018-c000`
- `lower-ne-02-m021-c000`

With those existing solids retained, the only one of the remaining nine that can be added with both generated end anchors supported is the existing pilot, `lower-ne-02-m013-c003`. Withdrawing the five already-seated pieces to replay them would invalidate the initial state and other joint dependencies.

The eight unresolved loads have concrete missing joints:

| Load suffix within `lower-ne-02` | Missing joint dependencies |
|---|---|
| m009-c001 | m009-c000 and m009-c002, both not yet seated |
| m010-c002 | c001 of same member is present; far end needs m010-c003 |
| m010-c003 | near end needs m010-c002; far corner needs future m016-c001 or other future corner members |
| m012-c001 | m012-c000 plus m012-c002 |
| m012-c002 | m012-c001; far end already has m016-c000 |
| m014-c002 | m014-c001 plus m014-c003 |
| m014-c003 | m014-c002 plus the future upper corner |
| m015-c000 | Generated end anchors touch no box within 25 mm; this is a gusset plate, so the end-anchor bar model is inappropriate |

A cycle of cut-end supports cannot be fixed by sorting load IDs. It requires temporary joint support, a justified moment connection, simultaneous supported handling, or a different prefabricated assembly. Useful external operations currently occur at:

- m016-c001 completes at .09115343381640656.
- m012-c000 completes at .09193744785606445.
- m014-c001 completes at .09372947994671105.
- m009-c000 completes at .09574551604868847; m009-c002 at .09585751805435389.

The gusset center [51.3142853,19,-43.0499992] is 2.879 mm from completed `m011-c001`. That identifies where a real gusset-face attachment should be authored; it does **not** certify a bolted connection, sufficient contact area, or sling stability. The current two generic pickup lugs become vertically separated in the final plate attitude, so the pilot's fixed equal-sling geometry must not be copied blindly to this plate.

## Tested adjacent-piece prefab alternative

At original freeze **.09193744785606445**, `m012-c001` and `m012-c002` have not started; c000 and m016-c000 can support the pair's two external endpoints. Combining the two collinear pieces gives an **11.01905 m** rigid assembly, approximately **1,158.52 kg** under the rendered-solid 7,800 kg/m³ assumption. Child identities and original transforms are preserved in `paired-member-screen.json`.

The bounded search tried **594** cargo routes:

- Horizontal pickup headings: 0, 30, 60, 90, 120, 150 degrees.
- Station pickup angles: 100, 110, 120 degrees.
- Pickup radii: 6.5 through 11.5 m in .5 m steps.
- Transfer heights: final center Y + 1, 2 or 3 m.
- Loaded ground approach: 10 m from the negative-Z side.
- Each path leg: 81 cargo OBB samples against every completed box and all 219 frozen falsework/guide members; fixed cargo attitude on each ground/hoist leg, rigid quaternion rotation, then polar transfer and lowering.

**All 594 were rejected: 375 on ground arrival, 219 on vertical hoist.** The earlier 165 trials at a +Z pickup attitude also all failed hoisting. This does not prove that no conceivable route exists; it proves that this proposed straightforward prefab adaptation is not implementable using these tested paths. No failed cargo path was passed to the more expensive actual articulated rig audit or admitted as valid.

Rejections record exact pickup heading/radius/angle, phase progress, payload pose, obstacle ID and SAT penetration. The first +Z attitude route at radius 6.5 m / angle 120 degrees collides with `lower-ne-00-m034-c001` during hoist. Do not lengthen slings, relax the 5.5–12 m annulus, widen clearance tolerance, or hide the assembly to make this pass.

## Concrete next geometry change

Prefer keeping the approximately 5.51 m pieces and adding **real temporary joint falsework at their shared joint**, instead of turning them into the rejected 11.02 m load.

The m012-c001/c002 common joint is approximately **[51.3142853,19,-40.2952366]**. A bearing below the member would contact near **Y = 18.94195 m**, with its actual width/attitude taken from the member's transformed lower face. Author a short braced temporary tower or a braced extension of the existing ground falsework to this bearing; make the load path run to ground or actual completed structural faces. Its joint's vertical ground projection is about 7.32 m from the nearest completed bearing footprint, so masonry is not an immediate footprint obstacle, but full posts/braces and traffic still require an OBB/sweep audit. Do not treat that distance as a proven falsework layout.

With c000 present and this real temporary bearing installed, c001 could have two supports; c002 could then join it to the existing m016-c000. This is an implementable **next modeling target**, not a certified new delivery. It requires visible assembly/removal or an explicitly disclosed preparation omission, member-specific sling/hoist routes, and later removal before conflicting construction.

For broader face coverage, author a gusset-face connection model for m015 and a second physically supported station for the members excluded by the present NE station. In particular, m012-c000 lies around 5.05 m from the current heel and outside its reviewed sector; m014-c001 lies around 4.47 m away. Their crane-support/guide placement must be solved physically. Another elevated receiving deck would not supply the missing ground provenance.

## Regenerate

```sh
node_modules/.bin/esbuild artifacts/eiffel-delivery-expansion-2026-09-07/support-order.ts --bundle --platform=node --format=esm --outfile=artifacts/eiffel-delivery-expansion-2026-09-07/support-order.mjs
node artifacts/eiffel-delivery-expansion-2026-09-07/support-order.mjs
node_modules/.bin/esbuild artifacts/eiffel-delivery-expansion-2026-09-07/screen-paired-member.ts --bundle --platform=node --format=esm --outfile=artifacts/eiffel-delivery-expansion-2026-09-07/screen-paired-member.mjs
node artifacts/eiffel-delivery-expansion-2026-09-07/screen-paired-member.mjs
```

These audits execute against the current repository geometry. The original delivery census records source hashes. This checkpoint does not add newly ground-delivered loads: **12,917 high-origin operations remain unresolved beyond the single existing pilot.**
