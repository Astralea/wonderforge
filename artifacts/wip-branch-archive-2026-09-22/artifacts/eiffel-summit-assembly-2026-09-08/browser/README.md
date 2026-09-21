# Final production browser QA — 2026-09-08

Both desktop and mobile gates pass against the frozen production website5589.
Normal player controls were used for all production captures. Each mode checks
101 whole-film seeks,7 long-load preflight poses,10 final-wave frames and9 c000
requests (127 sampled seeks), plus real Space playback and reverse capture.

| Gate | Desktop1440×900 | Mobile390×844,DPR1.35 |
|---|---:|---:|
| Maximum triangles |346029|295923|
| Maximum calls |166|149|
| Limits |450000/200|300000/150|
| Console/page errors |0|0|
| Horizontal overflow |none|none|
| Reverse crop difference |0|0|
| Real Space playback |advanced|advanced|
| Actual carrier/master roots at7 preflights |pass|pass|
|648 pedestrian identities/48 detailed/600 silhouettes |pass|pass|
| Monotone125degree camera orbit |pass|pass|
| Served bundle and model response hashes |pass|pass|

Bundle /assets/main-BT_fuIWM.js,2066857bytes,
SHA2565044a836d6d9579333b09284b909f0d916688de6fd9f908f5783c6664edf513c.
Manifest SHA256e054bfb8cbded7e636075ba1371e624430f600da0b2e8f0cc765e205d1e54080.
Actual response bytes were hashed and fulfilled unchanged to each browser.
All local assets were rehashed after the run to detect mutation.
Film651.4267707038563s; long-load starts255.32973290069668s.

## Review times and visual findings

- First-floor landing starts~6:23; cart crossing~7:47.
- First mast receiving/lifting~9:38–9:42.
- Final mast wave9:59.66–10:45.43; midpoint10:22.54.
- Completed film10:51.43.

Reviewed desktop/mobile final-wave screenshots: mast/crossbar assemblies are
visible together; the existing large generic crane remains in production.
The new compact gin-pole candidate is intentionally NOT admitted.

Normal production camera stays wide during c000; stock/pad are too small for
image-only contact proof. Also the real slider step .001 quantizes this film to
~.651s intervals, so some requested staged/lower c000 snapshots land in adjacent
phases. Reports record actual input values and actual sampled phase; filename
labels describe requests, not a claim that the requested phase was reached.

For that reason diagnostic-close/ separately captures the same frozen-source
WorldScene and actual loaded models at exact times with an explicit close camera.
This is not the production bundle or normal user camera. Six captures compile
and render without errors; all loaded asset response hashes match local files.
The horizontal stock visibly sits above the terrace on its carrier. The compact
north pad appears at terrace level during lift, but railing partly occludes its
underside. The earlier441-rays-per-footprint actual GLB support proof remains
stronger evidence for full corner contact than these images.

## Evidence and limits

production-desktop/report.json and production-mobile/report.json contain actual
slider/camera/GPU/crowd/asset evidence; desktop.log/mobile.log record progress.
The artifact-only c000 schedule was generated from the actual production plan
and inverted frozen film clock. Its expected poses accompany screenshots; they
are NOT claimed as actual renderer-matrix checks. Only the7 long-load root pairs
are compared with applied renderer diagnostics in this run.

A startup-only missing-export failure is retained under startup-failure/. A
concurrent stale sampler copy caused it before any browser opened; sampler.ts
was rebuilt and both final runs passed. No production edits or old evidence
rewrites were made by QA.
