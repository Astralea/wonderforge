# Release delivery audit — 2026-09-21

Read-only review by the performance/frontend review roles. Inspected current source,
the production `dist` containing `main-D8RR7sSY.js`, and local production preview
`http://127.0.0.1:5590`. No application edits, publication, deployment, push or
visibility change. Live Cloudflare comparison and the four full-film visual reviews
belong to the other reviewers.

## Verdict

**No blocking repository-privacy, credential, distribution-integrity or reduced-motion
defect was found in this scope.** GitHub's authenticated read-only response confirms
`Astralea/wonderforge` is `PRIVATE`. The distributable is separate from that repository;
its JavaScript and runtime models are necessarily downloadable by visitors.

The concrete follow-ups below are nonblocking for the desktop-first release. Eiffel
still has a substantial initial download on mobile, and the information panel has
small-target/focus behavior worth repairing. Unused authoring assets and development
views should be excluded from a future curated production export if they are not
intended for public access.

## Findings

1. **Major, nonblocking — Eiffel mobile saves only 658,204 model bytes (2.8%).**
   A fresh final-frame load requests 20 model/manifest files: **23,608,997 bytes
   desktop / 22,950,793 portrait** when summing the actual distributed files.
   Browser Resource Timing records **22,003,101 / 21,344,897 encoded resource bytes**
   across the whole load, with **38,612,435 / 37,954,231 decoded bytes**. These are
   local-preview measurements, not Cloudflare bandwidth or physical-phone timings.
   Both sizes download the same 5,008,836-byte tower kit, 2,538,460-byte seated kit,
   5,559,468-byte runtime JSON and 5,019,070-byte compressed Paris city. Mobile swaps
   only selected bridge/sling/onward assets. Evidence:
   `src/render/three/EiffelKitSystem.ts:8–10,69–78`,
   `src/render/three/EiffelWorld.ts:105–113`,
   `src/render/three/EiffelLongLoadFilmSystem.ts:64–71`, and
   `browser-audit.json` (`modelFiles`, `resources`). A future mobile payload pass
   should target these shared dominant files, preserving the tested part identities.

2. **Minor, nonblocking — information-panel close target is 34×34 px, and opening
   does not move keyboard focus into the panel.** Confirmed at 1440×900 and 390×844.
   Focus stays on “About this wonder”; Escape navigates to `#/` and exits the film,
   instead of just dismissing the panel. It is an `aside` without modal semantics,
   so this is not a broken declared focus trap, but the visual overlay and keyboard
   behavior differ from the likely expectation. The close target is below the
   project's 44 px convention. Evidence: `src/ui/FactsPanel.tsx:14–24`,
   `src/ui/CinematicView.tsx:138–140,204–205`, and `browser-audit.json` (`facts`).
   Recommendation: enlarge the close target, focus it on open, restore focus on
   close, and have Escape dismiss the active panel before leaving the film.

3. **Minor, nonblocking — the deploy directory includes unused authoring/previous
   assets and a local authoring-path breadcrumb.** `dist` has **145 files totaling
   117,701,820 bytes**. Its largest file is the unused original
   `models/eiffel-construction-kit/tower-kit.manifest.json` (**24,613,451 bytes**);
   the runtime instead requests `tower-kit.runtime.json`. It also includes the
   uncompressed Paris source (**14,298,216 bytes**, retained as the compatibility
   fallback), prior narration takes, and other model authoring manifests. None
   of these caused extra requests in the measured modern-browser film load.
   `models/eiffel-guyenet-ne/crane.glb` contains an absolute authoring path in
   `nodes[36].extras.station_geometry_source`; this report intentionally does not
   reproduce the local path. No credential was associated with it.
   Evidence: `dist-inventory.json`, `src/render/three/EiffelKitSystem.ts:10`,
   `src/render/three/eiffelParis.ts:47–54`. Preserve originals in the workspace but
   curate production copies if these authoring details should stay private.

4. **Note — the four-film catalog gate is a navigation gate, not an access boundary.**
   `READY_IDS` includes exactly Giza, Stonehenge, Colosseum and Eiffel. The catalog,
   normal deep links and previous/next navigation use that list correctly:
   `src/data/index.ts:27–47`, `src/store/ui.ts:34–55,65–74`,
   `src/ui/CinematicView.tsx:47–52`. However, production still bundles unguarded
   `#/debug/wonder/<id>/<t>` routes for every catalog entry (`src/App.tsx:34–43`),
   and `vite.config.ts:8` explicitly builds `eiffel-crane.html`. This exposes
   development views to visitors who know their URLs. It does not expose the
   private Git repository or credentials, but should not be mistaken for hiding
   all six in-production scenes. Remove or production-gate those entry points
   if the public release is intended to expose only the four finished films.

## Passing delivery checks

- Authenticated `gh repo view` returned `isPrivate: true`, `visibility: PRIVATE`;
  exact response saved in `repository-visibility.json`.
- Cloudflare configuration targets **only `./dist`** (`wrangler.toml:3`);
  `package.json` deploy command also names `dist`. No repo-root or artifact upload
  command appears in that path.
- File inventory found **no `.map` files or `sourceMappingURL` markers**, `.env`
  files, `.git`, `artifacts`, `research`, `specs`, `scripts`, `tests`, `node_modules`,
  TypeScript source, Blender project files, credential files or symlinks in `dist`.
  Common credential-pattern scanning and exact matching against configured local
  secret values returned **zero hits**. This is a bounded scan, not a proof against
  every possible unknown secret format. No secret values were emitted or saved.
- `_headers` gives content-hashed `/assets/*` one-year immutable caching and forces
  `/models/*`, `/audio/*`, `/brand/*` to revalidate (`public/_headers:5–15`). This
  matches Spec 48's requirement for unchanged filenames across releases. Local
  Vite preview is not evidence that Cloudflare applies those headers; the root
  review owns that verification.
- The compressed Paris reader handles both gzip bytes and already decompressed
  fetch responses (`src/render/three/eiffelParis.ts:40–50`). Actual preview response
  was **5,019,070 encoded / 14,298,216 decoded bytes**. The typed runtime manifest
  is **5,559,468 raw / 649,197 locally gzipped bytes**, compared with the original
  **24,613,451 / 1,240,027**. Exact field/pose recovery tests pass.
- Main JavaScript is **2,366,662 bytes / 503,948 locally gzipped bytes**; the shared
  `EiffelGuyenetRig` chunk is **677,514 / 174,711**. No claim of route-level lazy
  loading is made. See `dist-inventory.json`.
- Reduced motion stops the canvas loop after readiness. Actual desktop and
  portrait production pages each recorded **zero RAF callbacks during a settled
  one-second interval**, with zero page errors and only successful responses.
  The final frame remains scrubbable: focused-slider ArrowLeft changed `t` from
  1 to .999 and showed Play without changing the Eiffel URL. Source contracts:
  `src/render/three/ThreeCanvas.tsx:45–47,79–80,113–130,154–160` and
  `src/store/ui.ts:46–51`. This checks the preference at page startup; it does not
  claim live operating-system preference changes are observed after mounting.
- Disposal remains explicit for scene systems and the renderer:
  `src/render/three/WorldScene.ts:518–528`. This source audit is not a full GPU
  memory-leak soak test.

## Budget and verification evidence

The following snapshots are the **completed Eiffel still only**. They are not a
new whole-film peak estimate, FPS benchmark, or comparison against physical phones.

| Current local production snapshot | Calls | Triangles | Geometries | Textures |
| --- | ---: | ---: | ---: | ---: |
| Desktop 1440×900 | 90 | 268,500 | 90 | 123 |
| Portrait 390×844 | 80 | 224,005 | 90 | 112 |

Both sampled stills meet the review role's desktop/mobile limits and the 90-call
target. Prior full-film budget history is intentionally left to the film reviewers;
mixing prior peak frames with these final stills would not be a valid trend.

Focused command (no full-suite rerun):

```text
npm run test -- tests/eiffel-runtime-assets.test.ts tests/three-canvas-readiness.test.tsx tests/playback.test.ts --maxWorkers=2
3 files / 31 tests passed
```

This covers optimized-asset byte/pose equivalence, both gzip response forms,
readiness and 600 ms arrival behavior, homepage without arrival animation,
event-driven reduced motion, endpoint/reverse seek and playback speed/state edges.
The root's current handoff records the separate full suite of 1,299 passing tests.

Reproduction files are `audit-dist.py`, `browser-audit.mjs`, `dist-inventory.json`,
`browser-audit.json`, and `repository-visibility.json` in this directory.
