# WonderForge reference-scene pipeline

Use this map to migrate a legacy silhouette into a typed physical scene. Names are examples; create target-specific types when the construction semantics differ from Giza.

## 1. Evidence and scene thesis

Record authoritative sources for date, geography, materials, dimensions, orientation, and known construction evidence. Separate three kinds of statement:

- **Documented:** supported by the cited source.
- **Inferred:** a conservative implication of documented evidence.
- **Authored interpretation:** one coherent cinematic mechanism chosen where scholarship is uncertain.

The scene thesis must be visible in the animation. Examples: sled haul plus ramp ascent for Giza; prepared pit, rope/A-frame raising, packing, and cribbed lintel lift for Stonehenge; outer-ellipse haul, crane hoist and slew, ground-rooted scaffolds for Colosseum; spoil cells leaving a descending face for Petra. Never present a disputed mechanism as settled fact.

Before code, define:

- final monument inventory and human yardstick (about 1 world unit = 1 metre);
- source/staging zones and connected routes;
- operations, supports, crews (unique jobs, never a chorus ring), carriers/rigs, and phase windows;
- world layers and keep-out footprints;
- four or more deterministic camera checkpoints;
- material families and seeded variation bounds;
- a target-owned sky/weather/light arc with explicit desktop and portrait
  coverage goals, plus a soundtrack brief keyed to the stable wonder ID;
- active-operation, instance, triangle, draw-call, DPR, shadow, and mobile budgets.

## 2. Data: the authored construction plan

Giza's current source is `src/data/gizaConstruction.ts` with serializable contracts in `src/data/constructionTypes.ts`. A target plan normally contains:

```text
ScenePlan
├─ seed
├─ structuralParts[]
│  ├─ id, kind/group, dimensions, finalPosition, finalRotation
│  ├─ material, routeId, operationKind
│  └─ start, duration, lane, seeded variation
├─ routes[] (source → working/staging points → support → final alignment)
├─ mechanisms[] (pit, ramp, scaffold, crib, A-frame, lever station, etc.)
├─ layers[] (sky → horizon → ecology → site → monument → work → foreground)
├─ keepOuts/haulCorridors
└─ environment/camera/sky descriptions
```

Prefer a new shared generic type only when at least two real scenes share the same semantics. Never rename Giza-specific concepts to vague abstractions merely to fit a second scene. It is acceptable for a target to have `StonehengeConstructionPlan`, `ColosseumConstructionPlan`, or a target sampler when the state graph differs.

Generation must be pure and seeded. IDs and final transforms are stable. Structural parts are authored at final size. Schedule bottom-up or dependency-first so support exists before loading it. Keep a finite active set and make repetitive work overlap without a mass cascade.

## 3. Engine: pure frame state

Giza's exemplar is `src/engine/construction.ts`:

```text
(plan, normalized t)
  → active operation states
  → part position/rotation/visibility/support/contact
  → mechanism + crew state keyed by the same operation id
      (unique jobs/gait from seeded salts; never a shared orbit)
```

A target may reuse the Giza phases only if they truthfully describe its work. Otherwise define a typed target graph, for example:

```text
prepared → hauled → positioned → tilted → raised → packed → aligned → seated
```

Lintels may need a second graph such as:

```text
prepared → hauled → cribbed → hoisted → traversed → lowered → locked
```

Each phase boundary shares an endpoint with the next. Interpolate along the support geometry, not just between its endpoints: a stone eased over a linear ramp or pit wall can visibly intersect even when endpoints are valid. A seated component is immutable. Future components are absent.

Scaffolding, centering, and cranes are mechanisms with their own raise/hold/strike windows. Poles and decks are ground-rooted segments of authored length. Never fake growth by scaling Y. Workers climb onto a deck that already exists; they never ride a rising platform.

Camera, sun, sky, ecology motion, cloth, dust, labour gait, and any water/wind phase remain pure functions of playback `t`. Ambient-home motion is the only documented wall-clock exception and must loop continuously without replaying a one-shot path modulo 1. If the cinematic shot must turn from frame one, azimuth lerps linearly from the first key. Never freeze the intro with duplicate azimuth keys or easeInOutQuad on azimuth (zero derivative at t=0).

The sky contract is target data, not an incidental renderer color. Sample a
small set of authored checkpoints for zenith/horizon colors, haze, cloud
families, and sun relationship. Outdoor scenes must prove that the intended sky
survives fog, tone mapping, camera pitch, and portrait crop.

Soundtrack selection is `(wonderId, role) -> reviewed local cue | silence`.
Never implement `(role) -> global cue` or cross-wonder fallback. Before
generation, write a culture/era brief that labels evidence, inference, and
speculative scoring; ban anachronistic shorthand explicitly. Use the approved
Google Gen AI SDK/Lyria generator, retain its original output and provenance,
then make only deterministic local assembly/level edits for delivery.

Co-author camera and schedule. A physically correct active operation can still
be invisible when it happens on the far side of seated work. Choose a plausible
operation wave and camera-facing hold together, then verify the actual crew,
support, rope, and moving part all read in the same captured frame. Opening
geography is historical: Colosseum from the east on the Tivoli road, Petra
down the Siq, Giza from the Nile side. Distant hills are backdrop, never a
first-frame blocker. Read [labour-camera.md](labour-camera.md) before authoring
crews or shots.

## 4. Renderer: apply state, own resources

The production chain is:

```text
WonderCanvas.tsx
  → ThreeCanvas.tsx          canvas, ResizeObserver, RAF subscription
  → WorldScene.ts            scene selection, camera/light, diagnostics
  → TargetWorld.ts           target compositor
     ├─ Environment
     ├─ StructuralSystem     settled instances + active pool
     └─ WorkSystem           rigs, crews, ropes, contact effects
  → RenderPipeline.ts        WebGL, shadows, fog, tone mapping, post
```

Register worlds in `src/render/three/sceneRegistry.ts`. Never grow a chain of ID-specific branches in `WorldScene`. The registry must leave the legacy fallback intact. Never rename a catalog `id`; deep links depend on it.

Renderer rules:

- forms before materials, materials before lighting/post;
- actual part boundaries carry seams; never fake a complete structure with a giant slab;
- use instancing for settled/repeated pieces and bounded pools for active operations;
- keep depth testing authoritative; transparency is limited and ordered carefully;
- make world-space horizon geometry large enough that orbiting cameras cannot expose an edge;
- derive camera bounds from monument plus site, not the finished monument alone;
- update matrices/counts/uniforms without per-frame GPU allocation;
- dispose geometries, cloned materials, textures, render targets, and listeners exactly once. Never dispose the shared library water from a scene environment.
- Outdoor water uses the shared `materials.water` recipe. `WorldScene` feeds `updateWaterSky` from the active typed sky (Giza, Colosseum valley, Sydney harbour). A clone that never receives those uniforms is a flat blue card — the Colosseum lake failure. Tint the shared dielectric; add waterline foam as authored geometry with a `t`-phased pulse. Transfer Giza water quality, never Nile geometry.

## 5. Environment and cinematography

Every shot needs three readable depth bands: a near frame or working zone, the active construction, and geographic/atmospheric context. Environment objects are not filler; each should establish place, labour, supply, ecology, or scale.

Create a compact visual token plan before rendering:

- 4–6 named colors tied to actual local materials/light;
- primary, secondary, and weathered material responses;
- silhouette vocabulary for the monument, tools, vegetation, and horizon;
- composition wireframes for desktop and portrait mobile;
- one signature visual event that belongs uniquely to the target.

Self-critique the plan for generic low-poly defaults. Replace decorative noise with subject-specific geometry or motion. Keep the UI quiet and unchanged unless the scene genuinely needs a new control. A Civilization VI wonder movie is dense enough to read as a *place*; empty boxes, dashed landmarks, and silence are disqualifying even when the monument silhouette is correct.

## 6. Tests and evidence loop

Work in vertical slices:

1. final monument and typed inventory;
2. one complete operation from source to seat;
3. full schedule and mechanisms;
4. environment layers and camera/light;
5. performance consolidation;
6. browser sweep and fresh-eyes review.

Audition target music as its own vertical slice: verify decode/duration and
loop seam mechanically, then listen for unwanted vocals, duplicated source
material, inappropriate geography/era markers, and clashes with narration.

Caption beat count is per-wonder. Never copy Giza's five windows onto Stonehenge, Petra, Colosseum, or Sydney. Caption voice is ElevenLabs only; a scene that ships authored captions without generated clips is incomplete.

At every slice, test the pure contract before polishing the renderer. Use debug routes to scrub exact times. A beautiful reveal cannot compensate for invisible transport, floating support, clipping, chorus-line crews, a frozen opening camera, or early materialization.

## Known Giza pitfalls to carry forward

- Empty-at-first-render `InstancedMesh` bounds can later cull the whole batch while its shadow remains. Disable culling or recompute bounds for mutable global batches.
- Binary search requires batches sorted by the key being searched (Giza needed seat-time order, not start-time order).
- A route's endpoint can be correct while its interpolated middle crosses solid geometry.
- Support labels that disagree with drawn geometry (e.g. `source-ground` with a permanent sled-bed offset and no sled) read as floating stones. Engine owns lift; renderer consumes it. Measure `bottomY - terrainY - carrierHeight`.
- Scenery placement must test object extents, not only centers, and must set `mesh.count` after rejection.
- Background rings, finite ground planes, and large near clouds reveal their edges on portrait orbits.
- A build can fail before Vite emits assets; never trust a preview serving a stale `dist/` hash.
- Confirm browser diagnostics report the target reference-world name before
  accepting a frame; a nonblank legacy fallback is still a failed migration.
- The canvas inspector's generic limits are not the scene contract. Compare its
  raw renderer figures to the target spec, including shadow/post passes; remove
  silhouette-invisible subdivision and repeated micro-shadow cost first.
- Fog/color-space matching happens at the final rendered stage, never by copying an apparent hex value into two materials.
- Duplicate consecutive camera azimuth keys, or easeInOutQuad on azimuth, freeze the opening even when later keys turn. Linear azimuth from frame one if the spec forbids a hold.
- Occupying every bay around an oval, or `sin(t * k + i * phase)` on a ring, reads as a chorus line. Sparse camera-facing jobs with per-id salts.
- Gluing workers to `deckY` while a scaffold grows is a magician elevator. Climb poles; cap Y by the visible stack.
- Treadwheel spin follows hook *vertical* travel. A pure slew must freeze the wheel.
- Confirm the preview HTML hash matches the new bundle after `npm run build`. A type error leaves stale `dist/`.
- Transfer quality, never mechanics: never copy Giza ramps onto Stonehenge or Colosseum, pits onto Giza, or Petra spoil cells onto an additive arcade. Never copy a flat tinted water plane onto a harbour or lake; outdoor water uses Giza's shared recipe.
