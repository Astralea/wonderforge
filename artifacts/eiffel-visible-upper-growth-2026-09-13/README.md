# Eiffel58–68%: visible exterior growth

Owner correction: the film again feels stopped from58% to68% (104.4–122.4s).
The prior continuous-clock fix was insufficient as a visual acceptance test.

## Cause and change

The clock and ordinary parts were moving. The exterior only rose31.422m over
this passage, with some3s windows adding one3m ring; the wide camera also
withdraws as it follows the growing structure. Small ring completion did not
read as sufficient progress. This was not an entire-site clock hold.

`eiffelFilmEdit.ts` now reaches production.56 at124s instead of.50, then.645
at146s before the unchanged158s.79 key. This gives the overview substantial
shaft growth without finishing the upper tower prematurely. Source mechanical
clock, camera implementation, Blender assets, support/delivery paths and all
previous early-camera/scaffold/audio fixes are preserved. Spec46 and the older
118.8s height assertion now reflect the revised exterior-growth requirement.

## Evidence

`tests.log`: final210files /1112tests pass. Typecheck and production build pass.

`growth-audit.ts/json/log` compare the actual current plan using both old and
new production keys in an isolated process. No workspace source is mutated.

| Actual exterior metric | Before | After |
|---|---:|---:|
| Height gained104.4–122.4s |31.422m|73.428m|
| Minimum height gained in sliding3s window |3.000m|6.000m|
| Minimum primary corner segments installed in3s |4|8|

The after exterior rises119.61→193.04m, reaching202.04m at124s. Exterior
faces and their primary posts are counted; internal stairs/railings cannot
satisfy the tests. The old schedule fails both the new70m total-growth and
5.8m short-window assertions.

`tests/eiffel-visible-upper-growth.test.ts`:3 contracts pass:

- Repeated significant exterior height and new primary-post installation.
- Real transformed post vertices projected through desktop/mobile film cameras.
  New front-facing extension remains in frame and exceeds4desktop/2mobile
  pixels per3s window, measured with a common end camera so orbit/zoom cannot
  fabricate growth. This is a sampled geometric framing check, with browser
  images used separately for visual acceptance.
- Second-floor transported cargo is clear of both seated and moving shaft
  boxes every.2s across104–124s. This does not certify all rig/rope/crew volumes.

`focused.log`:18 existing chronology, camera, early-clearance and ownership
regressions pass. `build.log`: production build passed after successful
`npm run typecheck`; the existing large-chunk warning remains.

`before/` and `after/` each have12desktop1280×720 and5mobile390×844 captures
from the actual playback page after asset readiness. Both served hashes were
verified. Final browser console/page error list is empty. Initial captures
preceded adding the error collector; no claim is made about that initial log.

Final main-DtlDSwB6.js / main-BqeLL_Kj.css is served at
https://wonderforge.localhost/#/wonder/eiffel-tower via existing loopback5589.

## Live playback

`before-live/` and `after-live/` contain18.5s real-GPU traces and CPU profiles,
starting at58%, on Apple M2 Ultra Chromium. This is scoped playback evidence,
not an isolated performance optimization or locked60fps claim.

| Metric | Before | After |
|---|---:|---:|
| Frame intervals |1045|1109|
| Mean frame time |17.73ms|16.69ms|
| p95 |26.2ms|17.7ms|
| Maximum |269.6ms|41.7ms|
| Intervals over50ms |12|0|
| Completed source-member counts |4857→5022|4857→5237|

No completed-source count backsteps in either trace. Height-based shadow LOD
changes during the later after passage; do not attribute the measured frame
cost difference to an explicit render optimization. Broad still-frame peaks:
desktop202calls/368279triangles, mobile176/279249. Mobile remains above its
150starting call target (baseline186); no mobile performance-budget claim.

## Reference ledger and scope

Debug-profile checklists:yes. Scene-debugging:yes. Performance-profile:yes.
Sources are `.agents/skills/threejs-debug-profiler/references/` and its
`checklists/` subdirectory. Used served-build, real-loop, camera/geometry,
console, frame-cost and actual playback-path checks. Physical-plausibility
skill used for exterior framing, deterministic full trajectories and contact.

No public deployment, push or Blender edit. Existing omitted upper freight
and later plant removal remain unchanged. Evidence from previous passes stays.
