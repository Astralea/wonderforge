# Spec 02 — Animation and Construction Engine

The pure engine turns `(scene data, t)` into the complete authored state for a
frame. `src/engine/` imports no React, DOM, or Three.js APIs. Rendering consumes
engine results but never invents construction state.

## Normalized time

- `t ∈ [0, 1]`; default duration is 60 seconds at 1× speed. Playback speed
  multipliers (1×/2×/4×) scale wall-clock advance only — every frame stays a
  pure function of `t`, so scrubbing and debug routes are unaffected.
- `INTRO [0, .08)`: site established and first traffic begins.
- `BUILD [.08, .92)`: overlapping construction beats.
- `REVEAL [.92, 1]`: final seating, dust clearance, and golden-hour hold.
- Weighted stage windows remain deterministic and may overlap to keep the site
  active. Repetitive masonry is compressed; signature lifts receive more time.

## Physical construction contract (hard rule)

Every structural stone is represented at its final dimensions from source to
seat. A stone follows an authored, continuous and causally ordered state graph:

`quarried → dressed → loaded → hauled → queued → raised → aligned → seated`

The Giza eight-phase graph is Giza's. Other wonders author their own
graphs: Stonehenge splits uprights and lintels, Petra splits remaining rock
from spoil, and the Colosseum uses a crane-and-wagon graph
(`quarry → hauled → staged → hoisted → seated`). Caption beat count is
also per-wonder: choose the number from historical stages and visible action,
never from a fixed quota.

For a block with event window `[start, end]`, `constructionStateAt(block, t)`
returns its phase, world transform, carrier/sled relationship, contact state,
and visibility. The same inputs always return the same result.

Required invariants:

1. Structural block scale is always `[1, 1, 1]`; dimensions never animate.
2. A block cannot be visible at its destination before travelling from its
   authored source through the logistics route.
3. Adjacent samples within a phase form a continuous path; phase boundaries
   share the same endpoint.
4. A seated block never moves again and rests at its authored final transform.
5. Dust is emitted only at sled-ground drag contacts and the seating contact.
6. A raised block is supported by a ramp, sled, rope/lever rig, or scaffold.
7. Active ramp height tracks the current working course; traffic never climbs
   through finished masonry.
8. Construction throughput is limited by authored lanes and crews. Multiple
   stones may move concurrently, but no unlimited cascade or mass teleport is
   permitted.
9. Giza structural stones are human-scale units. Exterior stones must fit the
   bounds in Spec 08; a whole course, face, tier, or pyramid may not be a part.
10. Giza courses finish their delivery tail before the next course begins.
    Its compacted haul surface changes course height only while no sled is
    ascending it; the shared typed profile has level foot/crest landings.
    Loads and sleds use the same rigid pitch, and each worker foot samples
    its own X/Z on that visible surface.
11. A support name is not evidence of contact. At representative phase
    interiors and boundaries, the transformed stone contact point must match
    the declared terrain, sled deck, ramp/deck, crib, guide, or joint surface
    within 0.03 world units unless a scene documents a tighter exception.
    Carrier height is applied exactly once, and terrain/support samplers used
    by construction state are the same pure samplers used to build the visible
    support geometry.

Subtractive reference scenes (Spec 11 Petra) keep the same size, continuity,
and contact rules, but split the population: remaining-rock members are
authored at their final transform and never travel; spoil cells are the
parts that must leave a source and follow a route before they may sit at a
dump. A member becoming visible in place after its covering cells leave is
unmasking, not an additive teleport.

The Colosseum (Spec 12) is additive again, with a crane-and-wagon graph
(`quarry → hauled → staged → hoisted → seated`) rather than Giza ramps or
Stonehenge pits. Vaults wait on timber centering and seated piers; the
attic waits on storey 2 of its bay.

Non-structural atmosphere may fade. Wood rigs may be assembled or dismantled,
but their members also retain their physical dimensions while visible.
Scaffolding grows by adding final-size lifts from the ground, then loses
those lifts from the top when struck. It does not scale a pole in Y, and it
does not hang a short pole in empty air at storey height.

There is no rigid-body collision detector and no gravity solver. Support is
an authored numeric contact residual against a shared terrain/masonry
sampler; occupancy is a keep-out footprint. Both must exist for Colosseum
scaffolds and props the same way they exist for Giza camps.

## Kinematic path model

The reference implementation uses deterministic authored kinematics, not a
general rigid-body simulation. This gives the film exact repeatability and
prevents unstable piles while retaining visible mechanical cause and effect.

- A `ConstructionRoute` contains quarry, dressing yard, road queue, ramp foot,
  ramp crest, alignment, and final-seat waypoints.
- Phase progress uses monotone easing. Haul progress is distance-parametrized
  so sled speed does not jump at polyline corners.
- Moving stones remain aligned to the sled or rig. A short seating descent is
  allowed only above the final support surface.
- Surface-following legs sample the support at the current horizontal
  position. Easing may change progress along a route, but may not ease height
  away from a linear/terraced support or compare an object origin to the
  support in place of the transformed lower contact.
- Workers, sled, ropes, rollers, levers, dust, and stone read the same event
  state; they are not independent decorative loops. Colosseum labour
  (`colosseumLabourAt`) is a pure function of active operations and `t`:
  gait, shuttle, and treadwheel spin advance with phase progress.
- Future stones are not rendered. Settled stones are batched separately from
  the small set of active stones.

## Camera

`cameraStateAt(t, wonder, bounds?, aspect?)` remains pure and returns position,
target, and FOV for a Three.js `PerspectiveCamera`.

- Generic pitch is 30° above the horizon; FOV defaults to 35°.
- The Giza reference scene's cinematic path breathes pitch with the orbit
  instead of holding 30°: a slow wave swings between ~16° (horizon line and
  sky band enter the frame) and ~29° (construction detail reads best), with
  minima timed near dawn and the reveal.
- Azimuth makes 1.25 turns by default in the cinematic path, with per-scene
  start and turn overrides.
- INTRO eases from `1.25 × baseRadius` to base; REVEAL eases out by 8%.
- Target is near 40% of the monument height with a restrained vertical drift.
- Narrow-view radius compensation is `clamp(1.78 / aspect, 1, 2.2)^0.62`.
- Near/far planes are derived from scene bounds and include the horizon.
- Ambient (homepage hero) mode never reuses the one-shot cinematic path: it
  runs a continuous closed orbit — constant azimuth rate, fixed ensemble
  target, constant radius, the same breathing pitch — so the loop has no
  periodic snap.
- Giza gives the south haul approach an eased operation view during
  `t=.08–.30`, strongest at `.14–.24`: focus moves toward the ramp and
  the orbit closes without changing stone or worker scale. The later
  monument handoffs and ensemble reveal retain their established framing.
- No camera roll; Y-up world.

## Day and night

`lightStateAt(t, wonder)` remains the source of sun direction, color,
intensity, sky, fog, ambient fill, stars, and emissive level. Three.js lights,
the sky shader, fog, and tone mapping consume this state.

- Dawn `#ffb27d` → noon `#fff4e0` → dusk `#ff7e47`.
- Non-night wonders hold the daylight sample at `t=0.9` during the final 10%
  so the reveal remains a readable golden dusk rather than a zero-elevation
  silhouette.
- Night wonders cross-fade during the last 20% to moonlight and emissive light.
- Ambient fill never crushes the limestone midtones.
- The engine stays wonder-agnostic. A reference scene may refine the generic
  state with a typed sky description (for Giza, `GIZA_SKY` in
  `src/data/gizaSky.ts`) that re-derives sun azimuth/elevation, sky, fog, and
  ambient tints from the scene's era and geography before rendering.

## Randomness

`src/engine/random.ts` is the only randomness source. Scene expansion may use
its stable seeded generator. Per-frame functions never call `Math.random()`.
