# Production pace/crowd browser review — 2026-09-08

The final camera now retains close framing through mast lowering and seating,
then pulls back during the following hold. Actual desktop/mobile browser,
asset identity, crowd and render-budget gates pass. **Summit construction
geometry is not cleared:** the separate exact-box clearance audit has a real
crossbar/finished-tower collision; this camera change does not fix it.

## Current production

Actual5589 bundle `main-CwZfT5Ei.js`, SHA256
`3236d15e4c06ac34140f2129c27ca109901bcd38225d0acaccb33d1520a0e066`.
Film669.8802080213959s; final mast wave592.4283191417239–663.8802080213959s.

Each focused profile run records101 full-film samples,7 budget preflight seeks,
10 final-wave/exit captures and118 crowd snapshots. HTML range-input readback
determines actual time; no duplicate app store or synthetic camera is substituted.
For example, requested wave end663.880208s samples663.851286s on the UI grid,
0.028922s before the exact endpoint. Exact endpoint continuity is covered by the
parent's camera unit tests, not falsely claimed as an exact UI seek here.

| Actual production profile | Peak triangles | Peak calls | Gate |
|---|---:|---:|---|
|1440×900 DPR1 desktop|346,029|166|450,000 /200 pass|
|390×844 DPR1.35 mobile|295,898|149|300,000 /150 pass|

Bundle/model response bytes are hashed then fulfilled unchanged to the browser;
local asset hashes match before and after. Both profiles retain a strictly
increasing125° orbit, real Space-key playback, exact reverse central-crop RGB
equality, no overflow and no browser errors.

Each crowd snapshot reports camera-based selection with648 source pedestrian
identities,48 distinct selected IDs,600 silhouettes and fixed18-man/30-woman
capacities. All selected IDs belong to the actual source list; readability
threshold is12CSS pixels. These are source identity/diagnostic invariants, not
an assertion that all648 actors or all48 detailed actors are visible at once.
Nor does this independently inspect every GPU slot/contact.

The unchanged43-frame first-floor role/phase matrix is **not rerun** in this
camera-only followup: current report `actualPosePass` is null and links the
preserved passing baseline. Its bytes, screenshots, logs and self-contained
sampler remain under `kkteWCio-baseline/`, sealed in `preservation-sha256.json`.

## Visual review

The initial `main-kkteWCio.js` camera began pulling back during the final3.6s
lowering phase. The current captures at end−3.6, end−1 and closest UI wave end
retain a large summit view. End+2 and end+4 show the subsequent pullback. Desktop
and mobile final-lowering/end images were inspected; the early pullback defect
is resolved. The mast/crane silhouettes remain crowded, so clear framing is not
a claim that every attachment and physical contact is visually unoccluded.

The underlying summit mechanism still has substantial unresolved issues:

- `../clearance-audit/audit.json` reports `geometryClear:false`. Moving box part
  `summit-crown-m075-c000` intersects existing balcony boxes during hoist, with
  maximum penetration0.1410719m; it also intersects `summit-crown-m072-c001`
  later. This is the parent's sampled exact OBB-SAT finding, beyond the earlier
  visual suspicion of oversized jibs/unsupported-looking outboard decks.
- The same audit's ~0.00001017m mast endpoint overlap is separately a numerical
  scale issue; it must not be conflated with the material0.141m crossbar clash.
- Elevated receiving carriers still omit ground-to-summit freight provenance.
  Crane anchorage/erection/rigging removal are not certified by slowing the clock.
- The proposed factory attachment of the small crossbars to the mast, reducing
  the need for three independent large cranes, is **not implemented here**.

Earlier partial first-floor bolt occlusion remains a limit. These are bounded
clock, renderer, identity and visual checks; the full Eiffel goal is unfinished.

## Evidence and repeatability

- `production-desktop/report.json`, `production-mobile/report.json`: current
  samples, camera/crowd snapshots, actual response hashes and pass flags.
- `final-wave-end-minus-3.6.png`, `...end-minus-1.png`, `...end.png`,
  `...end-plus-2.png`, `...end-plus-4.png`: final lowering/exit sequence.
- `kkteWCio-baseline/`: the unchanged initial full157-sample profile reports,
  including43 first-floor role checks, and evidence of the corrected defect.
- `qa-post-seating.mjs`: current focused harness. Refresh `sampler.mjs` with
  esbuild after source freeze; require `EXPECTED_BUNDLE=/assets/main-CwZfT5Ei.js`.

No production/model source edits or builds were performed by this QA subagent.
