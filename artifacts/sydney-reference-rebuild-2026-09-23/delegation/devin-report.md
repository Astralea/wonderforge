# Devin delegation report — Sydney reference-view capture tooling

**Agent/model:** Devin CLI, powered by SWE-2 High (exact model id: `SWE-2 High`).
**Date:** 2026-09-23. **Scope:** bounded to the two owned files below; no app
source, spec, or other script was modified. No git operations, installs,
deployment or publishing.

## Deliverables

- `scripts/verify-sydney-reference-views.mjs` — reusable deterministic
  Playwright capture script for Sydney reference matching.
- `artifacts/sydney-reference-rebuild-2026-09-23/baseline-views/` — validation
  run output: 18 PNG captures, `report.json`, `index.html` contact sheet.
- This report.

## Commands

```sh
node scripts/verify-sydney-reference-views.mjs
# overrides:
SYDNEY_QA_URL=http://127.0.0.1:5590/ \
SYDNEY_QA_OUT=artifacts/sydney-reference-rebuild-2026-09-23/baseline-views \
node scripts/verify-sydney-reference-views.mjs
```

Defaults: `SYDNEY_QA_URL=http://127.0.0.1:5590/`,
`SYDNEY_QA_OUT=artifacts/sydney-reference-rebuild-2026-09-23/baseline-views`.
Existing dependencies only (`@playwright/test`, Node stdlib).

## Method

Follows `scripts/probe-sydney-background.mjs`: a Playwright page on the Vite
dev server dynamic-imports the real production modules
`/src/render/three/WorldScene.ts` and
`/src/data/wonders/sydney-opera-house.ts`, constructs an isolated
`new WorldScene(canvas, sydneyOperaHouse)` on a fixed overlay canvas, and
awaits `scene.ready` (environment + stones GLB readiness). No substitute
inspection geometry is involved — production `WorldScene`, `RenderPipeline`,
light rig, fog, clip planes (`near=20`, `far=12000`) and film grain are all
preserved.

Each frame calls the normal `probe.update(constructionT=1, cameraT=1,
lightT=0.58)` first — completed monument, fixed midday harbour daylight,
production fog range — then redirects only `pipeline.camera` (position +
lookAt, production `fov` kept) and calls `pipeline.render(0.58)`. Camera
positions use the production orbit convention with the harbour compass
(+X east, +Z south):

`position = target + [cos(az)·cos(pitch)·r, sin(pitch)·r, sin(az)·cos(pitch)·r]`

Angles: azimuth −90° north, +90° south, 0° east, 180° west, −135° north-west
aerial, plus a high roof-plan (pitch 76–80°, camera south so frame-up reads
north). Each angle ships a context frame (r ≈ 540–640 m, pitch ≈ 22–40°,
near the film's harbour-ensemble composition) and a tighter architectural
frame (r ≈ 240–320 m, pitch 7–30°). The south architectural frame
(pitch 7°, r 250 m) approximates the `user-side.png` water-level elevation.

Viewports: desktop 1200×900 (12 frames) and portrait 390×844 (6 context
frames, radius ×1.5). `report.json` records per-frame camera position,
target, azimuth/pitch/radius, fov/aspect/near/far, fog range, draw calls,
triangles, geometry/texture counts, all script/import URLs, and page,
console and request failures. `index.html` is a contact sheet with
filename captions and links `../references/user-aerial.png` and
`../references/user-side.png` when present (with a canonical-path fallback
for custom `SYDNEY_QA_OUT`).

## Validation run (2026-09-23, dev server 127.0.0.1:5590)

18/18 captures written; spot-inspected `desktop-south-architecture`,
`desktop-north-context`, `desktop-roof-plan-architecture`,
`desktop-northwest-aerial-context`, `portrait-northwest-aerial-portrait` —
all show the completed production scene in fixed daylight (Harbour Bridge
west, Botanic Garden southeast, north shore on the horizon, workboats,
stair podium, glazed north faces in the roof plan). Renderer counts sampled
from `renderer.info` per frame: desktop 57–59 calls / ≈227.8k–229.7k
submitted triangles; portrait 45 calls / ≈228.5k triangles.

Recorded errors: exactly two, both self-inflicted —
`requestfailed http://127.0.0.1:5590/@vite/client` and its console echo —
because the script aborts `/@vite/client` on purpose (see below). No page
errors, no WebGL warnings, no asset failures.

## Issues encountered and handled

- **Concurrent edit, transient module 500:** `sydneyShells.ts` was mid-edit
  by another agent and 500'd on import until
  `src/data/generated/sydneyBlenderModel.json` landed. The script retries the
  module import 4×/3 s before failing cleanly into `report.json`.
- **Vite HMR context destruction:** a file save triggered a full reload that
  destroyed the execution context mid-run. The script now aborts
  `/@vite/client` before navigation — captures need the module graph, not
  hot reload. This is the source of the two recorded errors above.

## Limitations

- **Requires a Vite dev server** serving `/src/*.ts` module URLs (5590 dev
  here). A static preview bundle will not resolve them; run against `npm run
  dev`.
- **Not an acceptance verdict.** These frames are comparison baselines only;
  they do not declare the current model or geography acceptable. Another
  agent is editing both concurrently — captures reflect the source tree at
  run time and must be re-run after the geometry/geography freeze.
- Fog range stays on the production `cameraT=1` schedule (shot radius drives
  `fog.near/far`), not per-frame radius; distant context hazes exactly as in
  the film.
- Portrait radius uses a flat ×1.5 widening heuristic, not the production
  `narrow` exponent.
- `update()` renders once with the scheduled camera, then `pipeline.render()`
  re-renders with the override — the override frame's `renderer.info` is what
  `report.json` records (auto-reset disabled by the pipeline itself).
- Captures are the WebGL canvas buffer via `toDataURL` (native 1200×900 /
  390×844 device pixels at deviceScaleFactor 1), so UI chrome never appears;
  compositor-level issues would not be visible.
- Host-browser viewport emulation only — no physical-device or audio claims.
- `page.route('**/@vite/client*')` abort is dev-server-specific; on a
  production preview it is simply unused.

## Files touched (ownership boundary)

Created only: `scripts/verify-sydney-reference-views.mjs`,
`artifacts/sydney-reference-rebuild-2026-09-23/baseline-views/*`, and this
report. Nothing else modified.
