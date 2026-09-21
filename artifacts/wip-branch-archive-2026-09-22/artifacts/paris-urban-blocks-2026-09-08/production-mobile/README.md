# Final production mobile QA — 2026-09-08

Passed against the final production preview on `http://127.0.0.1:5589` after BUILDREADY. This result supersedes the prior candidate development sweeps; their evidence remains untouched.

- Chromium mobile/touch emulation, 390 × 844 viewport, DPR 1.35.
- 101 evenly spaced main-film seeks across 264 seconds.
- Actual UI Pause button DOM click and native Seek events. Actual renderer camera azimuth was checked before each sample, followed by three animation frames.
- Maximum **297,242 rendered triangles** at t=.97 (256.08 seconds).
- Maximum **149 draw calls** at t=.48 (126.72 seconds).
- Sampled 300,000-triangle / 150-call gates pass, leaving 2,758 triangles and one draw call.
- No console/page errors or horizontal overflow. Peak screenshots retained.

The actual entry bundle delivered to the browser was `/assets/main-Cqh2Lic5.js` (1,946,757 bytes), SHA-256:

`d2962b09e54eaac67754714db07df37345aceeba7a05f0d6b69dc3f10c31ca7b`

It matches the expected final entry path and the corresponding `dist` file.

The actual city response delivered to the browser was 14,663,452 bytes, SHA-256:

`0655c59d789822aead5703399199b9cc96afd22ca581d29ffb016d209da263ae`

It matches the public city file before and after the sweep. Network routes hashed each fetched response and then fulfilled the browser request with those exact unchanged bytes. Identity therefore does not rely on an HTML version label.

`report.json` records every sampled camera/renderer state and identity gate. `../qa-production-mobile.mjs` is the harness; `../production-mobile.log` records terminal output. This is a sampled renderer-resource gate, not a proof over every film instant, a physical-phone FPS benchmark or whole-scene artistic acceptance. The QA agent changed no source, model, Blender file or production build.
