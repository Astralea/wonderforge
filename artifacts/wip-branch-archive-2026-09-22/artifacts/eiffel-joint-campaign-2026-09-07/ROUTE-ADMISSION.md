# Two-load NE joint campaign: scoped admission

The main-integrable sampler is `src/engine/eiffelJointCampaign.ts`. It delivers the original `lower-ne-02-m012-c001` and `lower-ne-02-m012-c002` separately from visible ground carts using the installed NE Guyenet crane. No cargo is synthesized at height. The scope is two loads; the rest of the Eiffel film is not thereby repaired.

**A material limitation remains in the original kit:** seven authored final connection overlaps are preserved. This is zero *additional* sampled penetration, not zero raw overlap and not a structural certification. `final-contacts.json` enumerates every allowance. In particular the solid gusset `lower-ne-02-m015-c000` is centered on the first beam midpoint and the final beam passes through its thickness; the conservative SAT separation depth is 0.43605m. A future literal-solid connection model needs face plates/cutouts, not an assertion that this existing mesh is physically nonpenetrating. Allowances apply only to the corresponding original final box during lower/slide; they are not global tolerances.

## Frozen runtime contract

- Original production freeze: **0.09193744785606445**, exactly both selected operation starts. 1,900 manifest box solids are completed; both selected parts are still queued.
- Duration: **135 seconds**. First ground arrival0–10, rig10–14, hoist14–26, yaw26–32, slew32–40, lower beside joint40–44, supported slide44–46, detach46–49, recovery49–55. Empty hook moves high55–60 and descends60–65. Second cart arrives65–78, rig78–82, hoist82–94, yaw94–100, slew100–108, lower108–112, slide112–114. Plates move115–118 and119–122, fastening completes126, detach126–129, recovery129–135.
- Both identities exist from chapter0, on separate stock carts10m/18m from the common pickup. Cart heading is world+Z, and payloads rest at −6° yaw on the bed. Loaded peak cart speed≤1.5m/s. The first empty cart reverses and turns into a separate bay before the second departs.
- Seats: **46 /114**. Joint support remains until **126**, when both captive cheek plates have bridged the joint and are fastened.
- Pickup centers: `[52.150320858110696,1.2,-45.16927509117864]`; high pose sameXZ atY22. Final centers: c001 `[51.31428527832031,19,-43.04999923706055]`, c002 `[51.31428527832031,19,-37.54047393798828]`. Both lower withX+0.3m before sliding to their original final pose.
- Both cargo quaternions start with the exact final roll and only −6° world yaw. No unsupported roll animation is hidden in the square cross-section.
- Actual hook reach: **5.700000–10.372195m**, yaw≤**120°**, minimum hoist rope1.471802m. The original NE root/guide/falsework geometry is unchanged.

## Actual rigging and material provenance

Four positive basket loops (two per load) remain attached to the iron from ground stock through seating. `basketLoops[{loadIndex,partId,points,length}]` exposes all four closed polylines; `rigging.lugs` exposes the active basket eyes. Two upper sling legs retain length1.705630376860152m throughout rigging, suspension, detachment and recovery. Basket rope radius is0.015m; upper/hoist rope audit radius matches renderer0.022m; hook envelope is0.14×0.20×0.14m.

The first beam carries both captive plates and their retainers from ground stock. `sampleEiffelJointFastening` supplies their actual poses throughout delivery and subsequent sliding. Actual V3 splice mesh volumes at7800kg/m³ add17.860603499kg to the579.259428245kg iron, for597.120031744kg. The resulting COM lies0.070956445644m toward its+Z end; both basket stations shift by that amount. The second beam is579.259428245kg. Suspended hook horizontal residual against this steel assembly COM is<1µm. Rope mass and detailed stress/dynamic simulation are excluded; this is a quasistatic kinematic model with cinematic time compression.

Actual Blender cart V3 has50mm-deep full-width channels atZ[-1.28,-1.06] and[1.13,1.35], allowing the lower basket runs to pass below the supported iron. The remaining deck supports the beam. The installed crane and joint falsework, stock loading and initial basket fitting are prepared chapter setup; their construction/removal is not reconstructed.

## Verification and precise limits

- `campaign-audit.json`: **6,751 frames at0.02s**,623 captured articulated crane primitives, all1,900 completed box solids and245 temporary structural boxes/beams, both cargoes, four baskets, renderer-sized upper ropes/hook, actual sampled captive plates and conservative retainer envelopes. Extras are checked against the articulated crane and other cargo. **Zero new findings** beyond the named original final-joint allowances.
- `campaign-swept-audit.json`: **104 conservative complete translation enclosures**, covering cargo, baskets and captive hardware on both ground approaches, vertical hoists, vertical lowerings and final slides, against completed/static structures. **Zero findings** under the same final-contact convention. Enclosures use the tighter applicable box basis; earlier broad enclosing boxes generated false positives and were not treated as real intersections.
- Curved slew, empty-hook trajectories, changing slings and moving rig bodies remain densely sampled; this is not a formal continuous collision proof for every curved path. The straight-leg checks close the largest unsampled shaft intervals.
- Parent `cart-geometry-audit.json`: actual V3 GLB50 closed box primitives,135,100 transformed component states at0.1s, all completed/support geometry, both cargoes, other cart and all basket segments; zero findings. This closes the deck-channel, underframe, handle and axle omissions of the coarse bed proxy.
- Parent/sibling asset contracts verify actual deck channel raycasts and support surfaces; riggers tests verify basket-eye hand contacts and crew clearances. These are separate evidence, not claimed by the route sampler tests.
- `tests/eiffel-joint-campaign.test.ts`: **6 tests passed**, including fixed material lengths, COM alignment, finite actual crane geometry, every phase-boundary position/rope continuity, both initial ground identities, exact seating/support timing, cart speed/rolling, determinism, actual bearing-bottom contact and SHA256 binding of audited inputs. Typecheck passed after the engine/test changes.
- Prepared equipment lifecycle, the original gusset solid interpretation, all other high-origin production deliveries, broader crane campaign lifecycle and structural capacity remain unfinished.

## Reproduce

From repository root:

```sh
node_modules/.bin/esbuild artifacts/eiffel-joint-campaign-2026-09-07/audit-campaign.ts --bundle --platform=node --format=esm --outfile=artifacts/eiffel-joint-campaign-2026-09-07/audit-campaign.mjs
AUDIT_STEP=.02 node artifacts/eiffel-joint-campaign-2026-09-07/audit-campaign.mjs
SWEEP_ONLY=1 node artifacts/eiffel-joint-campaign-2026-09-07/audit-campaign.mjs
python3 artifacts/eiffel-joint-campaign-2026-09-07/splice-mass.py
node_modules/.bin/vitest run tests/eiffel-joint-campaign.test.ts
```

The dense audit predates the admission flag/comment and metadata-only freeze update; no poses or geometry changed afterward. `evidence-seal.json` binds the reviewed input/assets/output bytes. `seal-evidence.py` only records already reviewed files after audit assertions pass; it does not rerun validation and should never be used to bless unreviewed geometry changes. V3 splice SHA256: `0f69178a26a575e57ff0777566f73b1591e39ce0e82dc9a2825b621329913a64`.
