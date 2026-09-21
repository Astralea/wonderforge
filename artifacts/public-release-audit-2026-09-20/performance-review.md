# WonderForge public film audit — render, loading, and GPU lifecycle

Date: 2026-09-20. Role: `.factory/droids/threejs-performance-engineer.md`. Read-only source/artifact/HTTP review of the four On site films. No application edits, deployment, upload, or browser automation in this delegate.

## Verdict

The site is already public at **https://wonderforge.pages.dev/**. Its HTML and sampled deployed assets match the existing local production `dist` byte for byte. Colosseum's fresh deployed render telemetry is the clearest launch performance risk: its portrait checkpoint submits essentially the same 1.17 million triangles as desktop, **9.72×** its mobile target. Eiffel has the largest cold-load cost and also exceeds the review role's loose mobile frame-submission limits. Giza still misses its draw-call target and its oldest instance owners omit disposal. Stonehenge is the lowest-cost of these four in the reviewed checkpoints, with a modest mobile triangle overrun.

The verdict uses the root review's **12 fresh measurements from the published site in real Chrome**, saved in `renderer-metrics.json`; every sampled canvas reports `assets=ready` and Three.js r185. Portrait measurements use a desktop browser viewport and do not establish physical-phone performance. These are current renderer submission counts, not FPS, frame-time, or retained-memory measurements. Historical captures no longer form the basis of this verdict.

## Prioritized findings

### P1 / critical budget violation: Colosseum retains almost its entire desktop geometry cost in portrait

- Fresh published-site t=.86 measurements in `renderer-metrics.json`: **103 calls / 1,166,258 triangles desktop**, **88 calls / 1,166,221 triangles portrait**. Spec 04's Colosseum budget inherits Stonehenge's **180k desktop / 120k mobile**, so these are **6.48× desktop** and **9.72× mobile** triangle targets. Portrait removes only **37 submitted triangles** despite the narrower viewport and lighter post stack; it does not meaningfully reduce geometry load.
- This is rendered submission telemetry, including shadow work and postprocessing, not unique mesh triangles. The current pipeline intentionally aggregates every internal draw (`src/render/three/RenderPipeline.ts:498–507`). It does not establish frame rate.
- Source indicates where to measure first: the same complete Rome prototypes are instanced over all deterministic insula/palace/pine/cypress lots (`src/render/three/ColosseumEnvironment.ts:122–159`). The GLB replaces the fallback meshes without a camera-distance tier (`:490–500`); flattened prototypes preserve all windows, roofs, and tree detail (`src/render/three/colosseumRome.ts:112–142`). Environment/terrain is therefore a high-value source-led investigation, but the fresh total-count evidence does not isolate contributors: a `?renderCosts=1` capture must identify the actual dominant batches before tuning them.
- Improve by preserving the new dense, historically grounded neighbourhood composition while giving distant lots simplified silhouettes, reduced small-detail geometry, and shadow tiers; spatially partition environment batches for culling. Do not simply remove the surrounding city that the owner just requested.
- Acceptance: production opening/mid-build/reveal render-cost captures at 1440×900 and 390×844; reconcile measured counts with the named spec budget, then verify sustained play on a physical mid-range phone. A nonblank screenshot is insufficient.

### P1 / major: Eiffel's cold start blocks on large city and construction assets

- Live `curl --compressed` measurements, archived in `validation/performance-http.json`: Paris city GLB transfers **14,298,216 bytes**, with no content encoding. Tower manifest transfers **1,251,493 gzip bytes**, expanding to **24,613,451 bytes** before JSON objects are created. Both match local `dist`.
- The loader fetches both the **5,008,836-byte pieces GLB** and **2,538,460-byte seated GLB**, plus the manifest, before parsing both GLBs and constructing 13,852 part records (`src/render/three/EiffelKitSystem.ts:68–109`; size values are source files, not a whole-page waterfall measurement). Paris fetch and GLTF parse happen before spatial preparation (`src/render/three/eiffelParis.ts:64–74`).
- All nine asset systems plus production-plan initialization must complete before the film is ready (`src/render/three/EiffelWorld.ts:161–183`). The loader correctly reports actual subsystem progress and guards the animation clock; it improves waiting feedback, not elapsed loading cost. The known part count is also stated at `EiffelWorld.ts:80–81`.
- Improve by producing a smaller runtime manifest (retain required poses, IDs, support data; keep audit-only material in authoring artifacts), optimizing/compressing Paris geometry and embedded textures, and separating optional future-chapter preparation only where causal loading guarantees can remain true. Keep the current visible progress/error UI.
- Acceptance: fresh cache-empty deployed Eiffel measurements for bytes, first visible loader, first ready film frame, and longest main-thread stall; repeat on an actual phone and constrained connection. The local HTTP timings in the JSON are one desktop/network sample, not a latency promise.

### P1 / major lifecycle defect: Giza omits instance-buffer disposal

- `BlockSystem.dispose()` disposes shared geometries/materials but none of its settled/core/active `InstancedMesh` instances (`src/render/three/BlockSystem.ts:264–268`). `WorkerSystem.dispose()` similarly omits its seven instance owners (`src/render/three/WorkerSystem.ts:241–251`). `Environment.dispose()` disposes its geometry/material lists but not its many `InstancedMesh` objects (`src/render/three/Environment.ts:3142–3152`).
- This is a concrete ownership gap: the installed Three.js implementation only removes `instanceMatrix` and `instanceColor` WebGL attributes in `onInstancedMeshDispose` (`node_modules/three/src/renderers/webgl/WebGLObjects.js:70–80`); renderer-wide `objects.dispose()` merely resets an update map (`:64–68`). Browser/context reclamation may eventually recover resources, so no byte-per-navigation leak or retained GPU-memory growth was measured here.
- Stonehenge and Colosseum already use explicit instance disposal (`StonehengeStoneSystem.ts:239–245`, `StonehengeEnvironment.ts:655–658`, `ColosseumStoneSystem.ts:209–213`, `ColosseumEnvironment.ts:515–530`). Apply that ownership pattern to Giza, including async and early-failure cleanup.
- Acceptance: disposal-event ownership tests plus repeated home → film → next film → home navigation with GPU/context stability. Freshly resetting renderer diagnostics cannot by itself prove previous-context cleanup.

### P1 / major shared cost: reduced-motion cinematic mode can keep rendering an unchanged frame

- `ThreeCanvas.tsx:71` prevents `tick` when reduced motion is enabled, but `:97–101` schedules another frame whenever playback status is `playing`, regardless of reduced motion. A reduced-motion visitor who starts playback therefore leaves a continuous render loop on an unmoving clock. This contradicts Spec 03's still-without-continuous-RAF requirement.
- Gate the scheduling condition using the same motion policy while preserving resize, user seek, and readiness repaint. This also avoids charging the heaviest scene's full frame cost to an accessibility still.
- Acceptance: reduced-motion cinematic Play, pause, seek, resize, next film, and pending asset completion; verify the renderer is idle between changes.

### P2 / major optimization: Giza repeatedly recomputes static core fill, including on the homepage

- `BlockSystem.update()` always calls `updateCoreFill` (`src/render/three/BlockSystem.ts:237–240`). That routine scans the whole block plan once per monument, scans core cells, allocates vectors and recomposes matrices, and marks instance matrix/color attributes dirty on every call (`:165–208`).
- Giza is the designated homepage (`src/data/homeWonder.ts:1–8`), and ambient rendering updates the complete construction at `t=1` every moving frame (`src/render/three/WorldScene.ts:490–491`). Thus the homepage pays for identical construction-state work while only camera, light, and environmental life change.
- Cache core/course state; avoid rewrites when its visible cells have not changed; retain full recomputation on reverse seek. Use reusable scratch vectors for active motion. The ramp updater already uses precomputed course starts (`Environment.ts:3012–3020`), so the older handoff claim that it still scans every block is stale and should not be repeated.
- Fresh published-site Giza t=.62 is **165 calls / 262,100 triangles desktop** and **143 calls / 252,083 triangles portrait** (`renderer-metrics.json`). Desktop triangles are below 450k; desktop calls are **1.83×** the 90-call target. Portrait has only 3.8% fewer triangles than desktop at this checkpoint. Profile environment/shadow groups before consolidation; preserve human-scale stones and physical construction.

### P2 / major update correctness: unhashed models and audio remain fresh for 24 hours across deployments

- `/models/*`, `/audio/*`, and `/brand/*` get `max-age=86400` (`public/_headers:8–15`); live probes confirm those headers. Runtime paths such as `tower-kit.glb`, `tower-kit-seated.glb`, and `tower-kit.manifest.json` are fixed (`EiffelKitSystem.ts:7–9`). JavaScript is correctly hashed and immutable.
- A returning viewer after an asset update can therefore execute new JS against cached older models, manifest, audio, or wordmark; ETags do not force revalidation while a cached response is fresh. No mixed-version incident was reproduced in this audit.
- Version related model/manifest/audio URLs together, preferably with content hashes or a release prefix; alternatively revalidate unversioned files. Verify a previous-release browser cache through the next release before making a broad promotion post.

### P2 / minor: all visitors download the complete shared film code and a 1.99 MB title image

- Live JS transfers are **438,376 + 174,760 gzip bytes** (613,136 total), expanding to **2,885,696 bytes**. `WorldScene.ts:23–35` statically imports every world, including in-production Petra/Sydney. The generated `dist/index.html` preloads the 677,514-byte decoded shared `EiffelGuyenetRig` chunk. Its name is misleading: it also holds shared Three.js exports and cannot simply be removed.
- The homepage wordmark transfers **1,985,827 bytes**; `BrandMark.tsx:3–13` always requests the PNG. This single visual outweighs the compressed script transfers.
- Scene-boundary code splitting is advisory until cold-start profiling identifies a real benefit. Preserve one shared Three.js runtime. Provide an appropriately sized modern-format title image with a compatible fallback and recognition verification; preserve the approved artwork.

### P2 / minor shared lifecycle: the post stack's grade/output passes are not explicitly disposed

- RenderPipeline adds god rays, bloom, OutputPass, and grade (`RenderPipeline.ts:339–345`), but cleanup disposes only the god-ray material and bloom before `composer.dispose()` (`:510–519`). The installed composer's destructor disposes its targets and copy pass, not the added pass array (`node_modules/three/examples/jsm/postprocessing/EffectComposer.js:354–359`).
- Dispose owned passes explicitly and retain references or traverse the owned pass list. This is a source ownership defect; no growing retained-GPU graph has been measured. It is less urgent than Colosseum throughput and Eiffel startup.

## Fresh published-site budget evidence and next improvement

All rows come from **`renderer-metrics.json` captured on 2026-09-20 in real Chrome from https://wonderforge.pages.dev/**. All assets were ready. Desktop and portrait are viewport labels, not separate hardware tiers. Counts include shadow and postprocessing submissions. These checkpoints establish current cost at those instants; they do not certify every moment of each film.

| Film | Fresh checkpoint | Calls | Triangles | Interpretation / next action |
|---|---|---:|---:|---|
| Giza | Desktop t=.62 | 165 | 262,100 | Triangle target passes; calls are 1.83× the 90-call desktop target. Cache static core and profile environment/shadow groups. |
| Giza | Portrait t=.62 | 143 | 252,083 | Portrait reduces triangle submission by only 3.8%; retain structural stones while reducing background/shadow work where warranted. |
| Stonehenge | Desktop t=.82 | 76 | 142,258 | This checkpoint meets 120 calls / 180k desktop targets. Preserve its ring, sky, and solstice shadows. |
| Stonehenge | Portrait t=.82 | 58 | 133,830 | Calls meet 95; triangles are 11.5% above 120k. Identify ecology/shadow cost before a modest mobile detail reduction. |
| Colosseum | Desktop t=.86 | 103 | 1,166,258 | Triangle submission is 6.48× its 180k target. Prioritize distance detail and spatial culling after batch-cost attribution. |
| Colosseum | Portrait t=.86 | 88 | 1,166,221 | 9.72× the 120k target; essentially no geometry reduction from desktop. Highest-priority mobile render issue. |
| Eiffel | Desktop t=.12 | 132 | 132,820 | Early checkpoint; 95 geometries / 137 textures. |
| Eiffel | Desktop t=.22 | 165 | 131,078 | More calls despite similar triangle load; 115 geometries / 151 textures. |
| Eiffel | Desktop t=.58 | 198 | 337,267 | Highest sampled desktop call count; 162 geometries / 241 textures. |
| Eiffel | Desktop t=.86 | 186 | 358,587 | Highest sampled desktop triangle count; 162 geometries / 241 textures. |
| Eiffel | Portrait t=.86 | 176 | 309,759 | Exceeds review-role starting mobile limits of 150 calls / 300k triangles by 17.3% / 3.3%; 162 geometries / 230 textures. |
| Eiffel | Desktop t=1 | 90 | 268,500 | Finished-frame cost falls markedly; this frame alone would conceal construction-phase cost. |

Budgets: `specs/03-architecture.md` Giza performance budget; `specs/04-testing.md` Stonehenge/Colosseum acceptance. Eiffel comparisons above use the **review role's advisory starting limits**, not an invented Eiffel-specific spec. Its 230–241 reported textures warrant attribution and optimization, but a texture count alone does not prove a leak or quantify VRAM.

For Eiffel runtime optimization, first attribute the t=.58 and t=.86 calls to visible equipment, shadow passes, and Paris batches; preserve causal construction and the existing camera-dependent shadow tiers (`EiffelWorld.ts:134–142`, `EiffelKitSystem.ts:52–60`). Compare equivalent desktop/portrait shots after changes and record continuous frame times on a physical phone. Reducing startup bytes and reducing per-frame submissions are separate work items.

## Confirmed strengths to preserve

- GPU ownership is centralized and React cancels RAF, disconnects ResizeObserver, unsubscribes playback and disposes the world on normal unmount (`ThreeCanvas.tsx:136–162`).
- Device pixel ratio is capped at 1.75 desktop / 1.35 mobile (`WorldScene.ts:96–100`); mobile turns off bloom and lowers shadow maps to 1024 (`RenderPipeline.ts:385–395`). Resize layout reads occur in the observer, not the frame loop (`ThreeCanvas.tsx:106–112`).
- Rendering counts include all postprocessing, not only the last quad (`RenderPipeline.ts:498–507`). Instancing is used throughout repeated structures and environment; the fix for expensive Rome should reduce geometry/shadow submission, not create per-building meshes.
- Eiffel readiness errors are visible with a reload action (`ThreeCanvas.tsx:118–133,177–188`), and playback tick does not advance before assets are ready (`src/store/playback.ts:106–108`).

## Verification boundary

- Public HTML and seven deployed asset bodies matched local `dist`; raw response sizes, hashes/equality, compression, and cache headers are in `validation/performance-http.json`. Initial Python urllib received 403, but curl succeeded; this was a client-path issue, not evidence that the site is private or unavailable.
- `npm run typecheck` passed on Node v24.4.0; log: `validation/performance-typecheck.log`.
- Full `npm run test -- --maxWorkers=2` passed: **219 files / 1,174 tests**, 226.44 seconds. Log: `validation/performance-vitest.log`. The tests validate source and local artifacts, not complete browser performance.
- Root supplied 12 current published-site renderer measurements in `renderer-metrics.json`; this final revision incorporates those as the sole numeric frame-cost basis. This delegate did not independently operate the browser.
- No new build was run, preserving existing `dist` and the deployed-asset comparison. No new tests or implementation edits were authored. No current browser FPS, physical-phone performance, Twitter in-app-browser playback, social crawler result, or retained-GPU-memory measurement was performed by this delegate.
