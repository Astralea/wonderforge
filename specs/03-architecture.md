# Spec 03 — Architecture

## Stack

| Role | Choice | Why |
|---|---|---|
| Framework | React 19 + TypeScript | Existing application and accessible UI |
| Build | Vite | Static production build |
| Styling | Tailwind CSS v4 | Existing UI system |
| Rendering | Three.js `WebGLRenderer` | Instancing, depth, shadows, materials, atmospheric 3D |
| State | Zustand | Playback and selection |
| Tests | Vitest + RTL/jsdom | Pure engine/data tests and UI contract tests |

React Three Fiber is intentionally not required: one imperative Three.js world
is mounted inside the existing React component, owns its GPU resources, and is
driven by the deterministic Zustand clock.

## Module boundaries

```text
src/
  data/
    types.ts
    constructionTypes.ts       # serializable blocks, core fill, routes, layers
    gizaConstruction.ts        # Giza source-of-truth scene plan
    scenes/                    # legacy JSON scenes for catalog fallbacks
  engine/                      # PURE: no React, DOM, or Three.js
    timeline.ts
    construction.ts            # block state graph + kinematic path sampling
    camera.ts
    daynight.ts
    geometry.ts
    random.ts
  render/
    WonderCanvas.tsx           # stable public UI contract
    three/
      ThreeCanvas.tsx          # only renderer component that owns a DOM canvas
      WorldScene.ts            # lifecycle, resize, render, disposal
      RenderPipeline.ts        # renderer, camera, shadows, fog, tone mapping
      MaterialLibrary.ts       # shared physically based materials
      GizaWorld.ts             # reference-scene composition
      BlockSystem.ts           # settled instancing + active moving blocks
      WorkerSystem.ts          # workers, sleds, ropes, levers from event state
      Environment.ts           # terrain, quarry, fields, Nile, city, ridges, sky
      LegacyWorld.ts           # temporary Three.js fallback for other wonders
      diagnostics.ts           # draw calls, triangles, texture/GPU counts
  store/
  ui/
```

## Purity and ownership

- `src/engine/` and `src/data/` contain serializable math/data only and may not
  import Three.js, React, or browser globals.
- `src/render/three/` owns Three.js objects. `ThreeCanvas.tsx` is the only new
  module that attaches a canvas or listeners to the DOM.
- `WorldScene.dispose()` disposes geometry, materials, textures, render targets,
  controls/listeners, and the renderer. React unmount must leave no animation
  frame or global listener behind.
- UI imports only the stable `WonderCanvas` contract.

## Frame flow

```text
playback t + selected wonder
  → pure construction/camera/daylight state
  → Three world update (instance matrices, active mechanisms, lights, sky)
  → WebGLRenderer frame
```

The renderer does not advance time. Playback owns time, scrubbing is exact, and
rendering the same `(wonder, t, viewport)` reproduces the same composition.

## Performance budget

Giza targets a 2020 laptop and mid-range mobile device:

- 4,000–8,000 individually generated visible structural stones.
- Up to 14,000 coarse human-scale interior core cells, instanced separately;
  core fill is support geometry, not an exterior-detail count.
- Settled stones in `InstancedMesh` batches by material; no mesh per block.
- At most 24 actively animated stones and 48 visible workers at once.
- ≤ 90 steady-state draw calls, ≤ 450k visible triangles at desktop quality.
- One shadow-casting directional key; contact details use cheap decals/planes.
- Device-pixel ratio capped at 1.75 desktop / 1.35 mobile.
- Resize is observer-driven; no layout reads in the animation loop.
- Reduced-motion mode renders an exact still and does not run a continuous RAF.

## State model

The existing playback store contract is unchanged: normalized `t`, status,
60-second duration, select/play/pause/seek/tick/replay plus a 1×/2×/4× speed
multiplier, with clamped seeks and
stable wonder IDs.

## Rendering policy

- WebGL is the production renderer. WebGPU may be evaluated later but is not a
  milestone dependency.
- No network asset is required at runtime. Procedural geometry and locally
  checked-in, licensed assets only.
- ACES filmic tone mapping, sRGB output, fog matching the horizon, and one
  physically coherent sun/sky direction are required.
