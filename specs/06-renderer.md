# Spec 06 — Three.js Rendering System

## Decision

WonderForge uses Three.js and `WebGLRenderer`. The Canvas 2D vector prototype is
superseded because it cannot provide the spatial depth, material variation,
large-instance masonry, shadowing, or mechanical construction clarity required
by the Giza reference scene.

## Scene graph

```text
WorldScene
├─ sky / sun disc / haze
├─ fixed distant desert ridges, cliffs, city, fields, greenbelt, Nile
├─ site terrain, quarry, roads, dressing and staging yards
├─ settled masonry instance batches
├─ active construction operations
│  ├─ stone + sled/rollers
│  ├─ ropes, levers, ramp/scaffold
│  └─ assigned worker crew
├─ foreground tools, debris, palms, dust
└─ camera + directional/hemisphere lights
```

Objects are grouped by semantic ownership, not just draw order. Depth testing
handles overlap; transparency is limited to dust, water, clouds, and sky.

## Geometry

- Structural blocks use one subtly bevelled unit-stone geometry and per-instance
  transform/color data. Course seams come from actual block boundaries.
- Each pyramid course also contains deterministic, human-scale core-fill cells.
  The core is a real stacked volume, never a single floating top slab, and a
  visible cell above the foundation must overlap support in the course below.
- Settled stones are `InstancedMesh` batches by material and monument.
- Active stones use a small reusable mesh pool so transforms and contact effects
  update without reallocating GPU resources.
- Terrain is low-poly authored geometry with vertex color variation. Roads and
  Nile ribbons are geometry slightly above terrain, avoiding z-fighting. Far
  ridges are continuous world-space meshes with enough angular subdivisions to
  remain stationary and silhouette-stable throughout the orbit. Their radial
  surface begins below the local plateau inside the camera orbit and extends
  beyond the fogged view distance, leaving no visible inner or outer edge;
  giant cones or camera-facing horizon polygons are forbidden.
- Sleds, rollers, ramps, scaffolds, ropes, levers, workers, palms, tents, and
  city silhouettes use reusable procedural primitives.
- Legacy wonders may translate their existing primitive parts into Three.js
  geometries until rebuilt; Giza never uses a course-sized legacy primitive.

## Materials and color

- `MeshStandardMaterial` is the baseline for limestone, casing stone, sand,
  earth, mud brick, wood, cloth, water, skin, and vegetation.
- Color variation is seeded per instance and narrow enough to preserve a single
  material identity. No runtime random color flicker.
- Limestone uses high roughness and restrained normal variation; casing is
  slightly lighter/smoother, never chrome-like.
- Renderer output is sRGB with ACES filmic tone mapping and calibrated exposure.
- Texture generation, if used, is local, seamless, mipmapped, and documented.
- Procedural surface detail (stone grain, limestone bedding, compaction
  mottling, timber grain, Nile ripple) is pure GLSL value noise injected into
  the shared materials via `onBeforeCompile`, composed from typed recipes in
  `src/data/materialDetail.ts`. Each recipe carries an era/material rationale
  and sets a unique `customProgramCacheKey`. Detail is sampled in object space
  for carried materials (stone, timber, cloth, foliage) so it travels with the
  part, and in world space for placed surfaces (terrain, roads, ramps, city,
  water) so frequencies stay physically consistent. No texture fetches; the
  only animated terms are the Nile ripple and cloth sway, both phased from
  playback `t` so scrubbing stays deterministic.
- Stone roles (core/casing limestone, granite, quarry cut) additionally turn
  that same height field into normal-space relief using screen-space
  derivatives (the `perturbNormalArb` math three.js uses for bump maps, but
  computed from the procedural field — still no texture fetches). The relief
  is faded by pixel footprint so distant masonry never shimmers; raking
  dawn/dusk light is where the relief is meant to read.
- Cloth (square sails, tent canvas, shade awnings) sways via a vertex
  displacement injected into dedicated clones of the linen material, phased
  from playback `t`; the shared linen of worker clothing stays still.

## Lighting and atmosphere

- One shadow-casting `DirectionalLight` is the sun; a `HemisphereLight` supplies
  sky/ground fill. Both read the pure day/night state.
- Shadow camera encloses the active monument/site, uses stable texel snapping
  where practical, and disables distant-background shadow casting.
- Fog color matches the horizon. The sky is an analytical skydome shader
  scaled far beyond every camera orbit so the camera always remains inside it
  on desktop and mobile. Its zenith/horizon gradient, sun disc and halo, and
  horizon haze are sampled from the scene's typed sky description
  (`src/data/gizaSky.ts` for Giza) and driven by the same world-space sun
  direction as the key light; it is not a flat CSS backdrop and does not
  counter-rotate with the camera.
- Dust is shallow, contact-timed, pooled, and depth-aware. It never disguises a
  physically impossible placement. Wind-blown dust drifts in typed lanes that
  are verified clear of masonry and earthworks, low and translucent so it
  never conceals block transport.
- A cinematic post stack runs over the linear HDR frame: thresholded radial
  god rays plus a horizontal anamorphic-style streak, both keyed to the sun's
  projected screen position and driven by sun elevation and the typed dust
  haze so they belong to dawn and dusk; then selective bloom, ACES output,
  and a display grade (sun-tint temperature, vignette, grain seeded from
  playback `t`).

## Camera and responsiveness

A perspective camera with a long 35° lens preserves the isometric miniature
feel while retaining real parallax. Camera target and radius come from the pure
engine. Resize updates aspect/projection exactly once per observed size change.
Mobile quality reduces pixel ratio, shadow resolution, dust, distant props, and
worker visual complexity while preserving construction geometry and causality.

## Render loop and lifecycle

- Playback/store time is authoritative. Rendering does not integrate its own
  simulation clock.
- Scrubbing performs a complete deterministic state update before rendering.
- Geometry/materials are created once, matrices are marked dirty only when
  changed, and pooled effects are reused.
- Unmount cancels RAF, disconnects observers/listeners, and disposes all owned
  GPU resources.
- `renderer.info` metrics are exposed through `diagnostics.ts` for QA.

## Accessibility

Reduced motion disables autoplay and continuous orbit. The reference still is
an intentionally composed completed scene, not a blank first frame. The canvas
has a concise accessible label; all controls remain DOM UI.
