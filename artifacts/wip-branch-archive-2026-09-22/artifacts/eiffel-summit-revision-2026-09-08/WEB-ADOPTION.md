# Web adoption gates for the revised summit kit

Final parent gate: V3 passes all 770 tests across 134 files, app typecheck,
production build, and composed desktop/mobile Chromium QA. Bundle
`main-3-ssOnL1.js`; mobile peak 295,502 triangles / 149 calls. See the folder's
README and `qa-composed-status.md` for the final evidence and remaining limits.

The files under `before-kit/` and `kit-compatibility-baseline.json` are the
immutable pre-revision baseline. Do not update the historical joint-campaign
`evidence-seal.json`: its whole-manifest hash should continue to identify the
asset against which that campaign was admitted.

## Compatibility domain

The summit revision intentionally changes stages 54–63. Adoption must
preserve every manifest record and actual transformed kit mesh at stage `<54`,
plus the carried identity `summit-access-stair-m000-c000`. The focused test
`tests/eiffel-summit-revision.test.ts` compares the public candidate with the
preserved old GLB and manifest across all 11,939 such parts.

## Required order after the candidate passes visual/source review

1. Put the candidate `tower-kit.glb`, `tower-kit-seated.glb`, and
   `tower-kit.manifest.json` in `public/models/eiffel-construction-kit/` as one
   atomic set. Do not mix generations.
2. Generate the explicit compatibility result:
   `npx esbuild scripts/verify-eiffel-summit-kit-compatibility.ts --bundle --platform=node --format=esm --outfile=/tmp/verify-eiffel-summit-kit.mjs && node /tmp/verify-eiffel-summit-kit.mjs`.
3. Regenerate `src/data/eiffelUpperRoutes.json` with
   `npx esbuild scripts/generate-eiffel-upper-routes.ts --bundle --platform=node --format=esm --outfile=/tmp/generate-eiffel-upper-routes.mjs && node /tmp/generate-eiffel-upper-routes.mjs`.
   The baked routes cover stage 23, but their guard currently fingerprints the
   whole manifest. The compatibility test must prove their actual input domain
   unchanged; regeneration should alter the top-level manifest hash only. Any
   changed route input/correction is a failed adoption gate, not an automatic
   acceptance.
4. Regenerate the long-load insertion timestamp and manifest SHA with
   `npx esbuild scripts/generate-eiffel-operation-start.ts --bundle --platform=node --format=esm --outfile=/tmp/generate-eiffel-operation-start.mjs && node /tmp/generate-eiffel-operation-start.mjs`.
   Its transported identity stays exact, but its stage-59.55 start can move when
   the stage 55–63 part counts change.
5. Run the summit revision/upper-clearance/film focused tests, then the required
   full test, app typecheck, build, and desktop/mobile browser QA.

## Artifacts that become historical evidence

The 247-piece stage-61–63 stock plan, rack occupancy, central-shaft handoff
audit, and their tests encode the old beacon/crown identities and bounds. They
cannot validate the revised summit. Preserve them as evidence and either
regenerate a new explicitly envelope-only study or narrow old tests to their
historical saved manifest. They are not a prerequisite for rendering the new
summit unless that stock process is promoted into the production film.

The whole-manifest hashes in ground-feed and other dated audits likewise remain
historical. No hash should be rewritten to imply that an old geometric audit
ran against the new summit.

## Adopted V2 record — 2026-09-08

The visually reviewed V2 set is now the public web kit:

- manifest: `1f29ea63366b4e96f5c7c7a0cc416c761a36a138e3d40fe6d2eeba9eefb27813`
- moving kit: `c89851e356f659ae0a759be40eb68b2207239c8050d447415c30daba11b887fd`
- seated kit: `a0acfa7693cb84ac73647196d826a75cbb0c211a5e53919d9e196496cfe0a157`
- 14,298 parts; 171,672 moving-kit triangles; 90,180 seated triangles

The compatibility script reports all 11,939 protected manifest records
unchanged. `tests/eiffel-summit-revision.test.ts` additionally compares their
actual transformed GLB vertices and topology with the archived kit. The upper
route cache still contains 1,085 byte-identical route payloads; only its
whole-manifest fingerprint changed.

The derived long-load coordinate is production `t = 0.8079353844716726`, which
maps to film second `255.47612306830035` in the 399-second editorial film.
`operation-start.json` and `sampler.mjs` were regenerated after V2 adoption.

Historical rack, stock, handoff, face-joint, and joint-campaign tests now name
and load the preserved pre-revision kit where their dated evidence requires
it. They do not certify handling of the revised summit. The live kit envelope
test is limited to source groups below stage 54; the exact carried stair is
instead covered by the actual-mesh compatibility test because its source group
also contains the intentionally revised upper newel.

The seated renderer budget moved from `<90,000` to `<91,000` triangles to
contain the measured V2 total of 90,180. The readable-clock expected record is
14,298 operations, 3,710 active waves, and 259.41736861728145 seconds. Three
dense geometry/plan tests received explicit 15–30 second timeouts after only
failing under four-worker full-suite contention; sample coverage and numeric
assertions were unchanged.

Focused adoption verification passed 51/51 tests, followed by the V2 summit,
clock, production, upper-clearance, and film set at 38/38. The three corrected
full-suite regressions then passed 16/16 in isolation. The repository-wide
suite, app typecheck, build, and composed browser QA remain the final parent
gate.

## Adopted V3 budget correction

V3 coalesces only the straight rectangular bands of the two clipped summit
floors. The diagonal corner bands retain their 0.18 m stepping. The parent
geometry report records the same five occupied floor envelopes within 0.2 mm.
The public V3 hashes are manifest
`af72b1356e65d70de1b5496f974d1a003feb27b7f37821f1ede2aac0e8df1892`,
moving kit `f37700a180df8ec05a5b407cc97eecc51e99a207505a572dc5d24a532953da52`,
and seated kit
`277cf560c4156244b7355d5b66f10ad3c8babf41cf70909e141d66bedf13d41d`.
V2 is preserved under `v2-kit/`.

V3 contains 13,852 parts, 166,320 moving triangles, and 86,436 seated
triangles, restoring the original `<90,000` seated-renderer bound. Its clock
has 3,597 active waves and lasts 252.15799853257852 seconds. The regenerated
long-load coordinate is production `t = 0.8054955483449447`, film second
`255.32973290069668`; the 1,085 upper route payloads remain unchanged.
