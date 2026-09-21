# Homepage loading correction — 2026-09-20

Homepage ambient does not render a loading animation or percentage, and has no
minimum presentation timer. The title/catalog remains available during scene
preparation. Cinematic opening still uses measured progress capped by a 600 ms
fill, followed by a 100 ms completed silhouette; slower loads follow actual
readiness. Error recovery remains in both modes.

Changed `ThreeCanvas.tsx`, its readiness regression tests, Specs 05/48 and
HANDOFF. Ambient reduced-motion readiness repaints without an unnecessary
loading RAF loop. The film playback gate remains specific to cinematic mode.

Verification on frozen source:

- Focused tests: 4 files, 53 tests passed.
- Full suite: 226 files, 1,210 tests passed, 216.12 s. [Log](validation/test.log).
- Typecheck passed. [Log](validation/typecheck.log).
- Production build passed, `main-DgHQ6sM_.js`. [Log](validation/build.log).
- Local production preview responds at http://127.0.0.1:5590/.
- Browser QA unavailable: CUA returns empty apps/browsers and
  `Native apps: Error: Sky Computer Use native pipe startup failed`.
  No new desktop/mobile capture or real-device claim.

No deployment, push or public visibility changes. Prior work and artifacts
preserved. [Rome background research and Sydney status](rome-history-review.md)
addresses the owner's question raised while this correction was underway.
