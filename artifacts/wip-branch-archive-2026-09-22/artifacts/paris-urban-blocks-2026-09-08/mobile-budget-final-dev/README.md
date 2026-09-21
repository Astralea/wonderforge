# Final city mobile budget check

Successful 2026-09-08 rerun on development server5590 after the final road-union/ground-subdivision asset was promoted. This supersedes the earlier candidate budget result while retaining all earlier evidence.

- 101 main-film samples over the264-second clock;390×844/DPR1.35 Chromium mobile/touch emulation.
- Actual UI Pause DOM click and native Seek events; actual renderer camera azimuth verified before each sample.
- Peak rendered triangles: **297,276** at t=.97 (256.08s).
- Peak draw calls: **149** at t=.48 (126.72s).
- Sampled300,000triangle/150call gates pass, leaving2,724triangles/1call.
- No console/page errors or horizontal overflow.
- Two actual routed city responses,14,670,628bytes each, were hashed and fulfilled unchanged to the browser. Both matched the public file before/after the sweep.
- CitySHA256: `7ea6aff098ac6a875ef48f2bb3aa904481891042eabb2175b80946f545794a12`.

`report.json` retains all samples and response identities; `comparison.json` compares the preceding merged-culling candidate. Peak screenshots are retained. This is a sampled resource gate, not proof over every film instant or anFPS benchmark on a physical phone. No source, production-build or Blender changes were made by this QA pass.
