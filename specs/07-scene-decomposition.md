# Spec 07 — Layered Scene Decomposition

Scene authoring proceeds from the world inward and from logistics to monument.
The renderer must never receive a flat pile of disconnected decorative parts.

## Layer contract

Every production scene declares these layers, far to near:

1. **Sky and atmosphere** — day gradient, sun, clouds, aerial haze.
2. **Far geography** — desert, cliffs, dunes, skyline silhouettes.
3. **Settlement/ecology** — city, worker village, palms, greenbelt, river.
4. **Site terrain** — plateau, cut faces, quarry, roads, yards, ramps.
5. **Main construction** — finished and active monument masonry.
6. **Work systems** — workers, sleds, rollers, ropes, levers, scaffold, dust.
7. **Foreground framing** — tools, debris, tents, stones, vegetation.

Layers have bounds, material intent, seed, quality tier, and cull distance.
Camera framing is validated against the union of site and monument bounds, not
against the finished monument alone.

## Physical construction data

The Giza reference uses typed construction data in
`src/data/gizaConstruction.ts`:

```ts
interface ConstructionBlock {
  id: string;
  monument: 'khufu' | 'khafre' | 'menkaure' | 'temple';
  course: number;
  dimensions: Vec3;
  finalPosition: Vec3;
  finalYaw: number;
  material: 'core-limestone' | 'casing-limestone' | 'granite';
  routeId: string;
  lane: number;
  start: number;
  duration: number;
}

interface CoreFillCell {
  id: string;
  monument: 'khufu' | 'khafre' | 'menkaure';
  course: number;
  dimensions: Vec3;
  finalPosition: Vec3;
  readyAt: number;
}

interface ConstructionRoute {
  id: string;
  waypoints: {
    quarry: Vec3;
    dressing: Vec3;
    roadQueue: Vec3;
    rampFoot: Vec3;
    rampCrest: Vec3;
    alignment: Vec3;
  };
}
```

The full dataset is generated deterministically from compact monument/site
parameters, then validated. A scene document may configure parameters, but a
generic `masonryPyramid` that emits one box per course is forbidden for Giza.

## Masonry generation

- Generate courses bottom-up.
- Generate separate stones around each visible perimeter ring and generate a
  stacked interior core from human-scale fill cells. Interior fill may only be
  omitted where it is permanently occluded and cannot create a see-through
  silhouette at any scrubbed construction time.
- Core-fill cells are course-local and reveal progressively. A cell in course
  `n > 0` must horizontally overlap at least one settled cell in course `n-1`;
  no active working deck may appear as an unsupported floating lid.
- Alternate joint offsets between adjacent courses; allow restrained seeded
  dimension/position variation without opening visible gaps.
- Keep corners bonded and pyramid slope continuous.
- Future stones and core cells are absent, settled masonry is instanced, and
  only the active operation set uses individual scene objects.

## Construction-event binding

Every active block references one route and one operation. The operation owns
the block, sled/rig, crew, rope/lever state, contact dust, and sound cue metadata.
The renderer queries that unit once per frame so dependents cannot drift apart.

## Legacy scene documents

Existing JSON documents remain the catalog source for content and temporary
fallback silhouettes. Their generic component generators are not evidence that
a reference scene meets this specification. Each upgrade replaces a legacy
monument with typed physical construction data while preserving its ID.
Stonehenge is the first such replication and uses target-specific upright/pit
and lintel/crib state graphs rather than forcing its mechanics into Giza's
masonry phases. Petra is the second and uses remaining-rock members plus
spoil-cell haul rather than Giza ramps or Stonehenge pits. The Colosseum is
the third and uses wagon haul plus treadwheel cranes for a freestanding
elliptical amphitheatre. Sydney Opera House is the fourth and uses on-site
precast ribs, tower cranes, and ceramic tile skins on a harbour podium.
The Eiffel Tower is the fifth and uses wagon haul plus creeper cranes for
four inward-leaning puddled-iron lattice pylons on the Champ de Mars.

## Validation

- Schema and semantic validation run before rendering.
- Unknown materials, invalid dimensions, disconnected routes, duplicate IDs,
  unseated end states, and over-budget active sets fail tests.
- Expansion is pure and deterministic across runs and machines.
