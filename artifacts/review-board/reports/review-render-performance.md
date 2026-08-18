# Three.js Performance Engineer — Review Board Findings

(Re-run 2026-08-16 after the original background task errored on usage limits.)

Scope reviewed: `src/render/three/**` (all 12 files), capture telemetry across all 9 artifact directories containing JSON (79 capture files parsed), `vite.config.ts` + `dist/` output. Read-only.

## Findings

### F1 — major — Spec 03's stricter ≤90-call target is exceeded in every pass since `giza-solid-pass`, and the call trend is upward

Evidence (capture JSON `result.diagnostics.renderer`):
- `artifacts/giza-solid-pass/accepted/desktop-012/desktop.json`: 97 calls
- `artifacts/giza-sky-pass/desktop-012/desktop.json`: 103 calls
- `artifacts/horizon-pass/desktop-012/desktop.json`: 104 calls
- `artifacts/river-meander-pass/desktop-012/desktop.json`: 104 calls
- `artifacts/living-river-pass/desktop-012/desktop.json`: 105 calls
- `artifacts/ramp-fix/desktop-05/desktop.json`: 110 calls / 292,148 tris
- `artifacts/review-board/desktop-08/desktop.json`: 112 calls / 301,912 tris (highest recorded)

All values remain inside the starting budgets (desktop ≤300 calls / ≤750k tris). Caveat: the 292k–302k peaks appear at t=0.5/0.8, sample times the accepted sweep never covered — part of the apparent growth is new sampling coverage; the ~+8-call drift at matched t=0.12 (97 → 105) is real growth.

Consolidation candidates (~15–20 calls): ramps are 3 InstancedMeshes per ramp × 5 ramps = 15 draw calls (`Environment.ts` `addRamps`); Memphis is 8 separate meshes; quarry is 5 individual meshes; sphinx is 4.

### F2 — major — InstancedMesh instance buffers are never disposed; GPU buffers leak on scene switch

No code path calls `InstancedMesh.dispose()`. Disposal only covers geometries and materials (`BlockSystem.ts` dispose, `Environment.ts` dispose, `WorkerSystem.ts` dispose). In three 0.185 the renderer frees `instanceMatrix`/`instanceColor` GL buffers only via the mesh's `'dispose'` event; geometry disposal does not free them. At risk per Giza mount: settled blocks 5,372 × 64 B, core fill 11,591 × 64 B (+ instanceColor), plus ~2,300 environment instances and worker batches — roughly 1.3–1.5 MB of GPU buffers per `WorldScene`. Reachable when `ThreeCanvas`'s effect re-runs on a `wonder`/`mode` prop change. Violates the layer contract "must dispose everything on unmount".

### F3 — major — Per-frame O(scene) rebuild: core fill and ramps rescan all 5,372 blocks and re-upload full instance buffers every frame

- `BlockSystem.updateCoreFill`: per frame, 3 batches × full `plan.blocks` scan (~16k iterations), then iterates all 11,591 core cells, recomposes matrices, sets `instanceMatrix.needsUpdate = true` unconditionally — re-uploading ~742 KB of matrix data (+ ~185 KB color) every frame even when the visible course window hasn't changed.
- `GizaEnvironment.update` ramps: per frame, 5 ramps × full `plan.blocks` scan (~27k iterations) plus full brickwork/retaining matrix rebuild, performed even when the ramp is then set invisible.
- The ambient homepage mode pays this cost forever at steady state `t = 1`.

Contrast: settled exterior masonry correctly uses a binary search and touches no buffers. Advisory fix: cache `activeCourse`/`workingHeight` per batch/ramp and skip recompose + upload when unchanged.

### F4 — minor — Per-instance temporary allocations inside per-frame loops (GC churn)

`updatePalms` (~2,200 allocations/frame), `updateBoats`, ramp rebuild (thousands/frame while F3 stands), `WorkerSystem.compose`, `BlockSystem.update`/`updateCoreFill`. Hoist reusable temporaries; matters most on mobile.

### F5 — minor — Nile ripple time uniform reaches only one of the water material's program variants

The shared `materials.water` compiles at least two program variants: non-instanced (river ribbon/braid) and instanced (irrigation channels). `onBeforeCompile` runs once per variant and each run overwrites `material.userData.wfDetailShader` (`proceduralDetail.ts`), so `updateMaterialDetailTime` advances `uWfTime` on only the last-compiled variant; the other's ripple stays frozen at phase 0. Fix by keeping an array of shader refs per material.

### F6 — note — Per-frame diagnostics serialization in the production render loop

`finishFrame` runs `JSON.stringify(diagnostics)` and writes a DOM `dataset` attribute every rendered frame (`WorldScene.ts`).

### F7 — note — Bundle: single ~918 kB main chunk, no splitting configured

Dynamic-importing the render layer (`WorldScene` and below) is the natural seam; matches HANDOFF priority 4. Advisory only.

### F8 — note — Shader compliance confirmed (positive finding)

Injected detail is ALU-only, zero texture fetches; per-role `customProgramCacheKey` present; SkyDome is one draw call, fetch-free, world-space. One adjacent observation: `WorkerSystem`'s dust material clone silently drops the injected `onBeforeCompile` (three's `Material.copy` doesn't carry it), so dust lacks compacted-earth detail — visually negligible.

## Verdict

The render layer is in good structural shape — instancing coverage essentially complete, shaders disciplined, all captures within starting budgets, zero console/page errors — but two real debts have accumulated: draw calls drifted 97 → 103–112 (above Spec 03's ≤90 target at every dawn and mid-build sample), and per-frame hygiene lags scene growth (F2 disposal, F3 O(scene) rebuilds — the ambient homepage loop pays F3 forever). Fix F2/F3 and consolidate calls under 90 before any post-processing pass adds cost.

| Pass | Desktop max calls / tris | Mobile max calls / tris | Within starting budget | ≤90-call target |
|---|---|---|---|---|
| canvas-inspection | 76 / 183,354 | 77 / 182,382 | yes | yes |
| giza-solid-pass (accepted) | 97 / 232,766 | 97 / 231,458 | yes | no |
| giza-sky-pass | 103 / 221,364 | 96 / 204,056 | yes | no |
| material-detail-pass | 103 / 221,364 | 81 / 204,056 | yes | no |
| horizon-pass | 104 / 204,990 | 82 / 204,834 | yes | no |
| river-meander-pass | 104 / 205,752 | 82 / 205,596 | yes | no |
| ramp-fix (t=0.5, new sample) | 110 / 292,148 | — | yes | no |
| living-river-pass | 105 / 229,196 | — | yes | no |
| review-board (t=0.8, new sample) | 112 / 301,912 | — | yes | no |
