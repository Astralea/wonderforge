# Spec 04 — Testing and Acceptance

## Required commands

`npm run test && npm run typecheck && npm run build`

Engine and data tests run without a DOM or WebGL context. Browser and visual QA
exercise the production bundle.

## Existing contract suites

- Catalog: ten unique stable IDs, authentic attributed content, valid palettes,
  deterministic recipe expansion.
- Timeline/easing/camera/daylight: clamped endpoints, overlapping weighted
  stages, 30° camera pitch, 1.25-turn default orbit, deterministic light state.
- Playback/UI: store transitions, deep links, transport controls, keyboard,
  quote reveal, reduced motion, catalog navigation, the caption beat
  index (titles always listed; click seeks to that beat's `from`), and the
  one-page home (Enter crossfades title to catalog over the same diorama).
- Legacy geometry: retained while six non-reference scenes use the temporary
  Three.js fallback. These tests do not define the Giza or Stonehenge quality
  bar.

## `tests/construction.test.ts`

- Giza plan is deterministic and contains 4,000–8,000 structural stones.
- Every structural stone has scale `[1,1,1]`, finite transforms, and dimensions
  within the human-scale limits in Spec 08.
- No block spans a full pyramid face/course/tier.
- Core fill is deterministic, human-scale, progressive, and forms a supported
  stacked volume; no course-wide surface or unsupported cell is allowed.
- Block IDs and final transforms are unique.
- State order is monotone: quarried, dressed, loaded, hauled, queued, raised,
  aligned, seated.
- Phase boundaries are position-continuous; a block never appears first at its
  destination and never moves after seating.
- At representative times, active count respects the 24-block cap and route
  lane assignments do not collide.
- Raised blocks follow ramp height; aligned blocks remain above their support;
  seated blocks match their final transform exactly.
- Contact contracts sample phase interiors and boundaries: transformed block
  bottoms meet sled/ramp/deck/crib/masonry tops within 3 cm, sled runners meet
  their ground surface, and carrier offsets are counted once. Tests compare
  contact geometry, never the block origin, to the support surface.
- Contact dust is false during free motion and true only for drag/seat windows.
- Workers, sleds, ropes, and stones reference the same construction event.

## `tests/giza-world.test.ts`

- Layer order includes foreground quarry, active site, greenbelt/Nile, city,
  dunes/cliffs, atmosphere, and sky.
- Quarry, dressing yard, road, queue, ramp, and final seat are connected by at
  least one continuous route.
- Ramp crest tracks active course height and never intersects settled masonry.
- Khufu, Khafre, and Menkaure retain correct visual hierarchy.
- Seeded environment placement is identical on repeated expansion.
- Far terrain is a continuous, fixed world-space mesh rather than an orbiting
  ring of giant polygonal props. It overlaps the local ground below grade and
  extends beyond the fogged view distance, so neither radial edge is visible.

## Renderer tests

Pure adapter tests assert generated matrices, material assignments, culling
groups, and disposal bookkeeping. WebGL output is accepted through browser QA,
not fragile pixel snapshots in jsdom.

## Browser/visual acceptance

At desktop 1440×900 and mobile 390×844, capture `t = 0.12, 0.35, 0.62, 0.9,
1.0` on the chrome-free Giza debug route.

Each frame must show:

- a full-bleed world with no floating island or empty flat backdrop;
- human-scale stones, at least one causally supported moving operation during
  BUILD, and no course-sized slabs;
- readable foreground, construction site, greenbelt/city, distant desert, sky;
- no see-through pyramid silhouette, floating working lid, backlight through
  the casing, or background prop that appears to rotate in lockstep with the
  camera;
- no camera/cloud intersection or screen-filling cloud edge at any mobile
  checkpoint;
- stable camera framing with no near/far clipping or mobile crop;
- limestone detail readable at reveal and no crushed blacks/blown highlights.

The browser console must have no uncaught errors or WebGL warnings. Renderer
diagnostics are recorded at each checkpoint. Desktop steady state must meet the
budgets in Spec 03; mobile may reduce shadows, worker count, and environment
detail but never merge stones into giant slabs.

### Stonehenge replication acceptance

At desktop 1440×900 and mobile 390×844, capture `t = 0.12, 0.32, 0.58, 0.78,
0.92, 1.0` on `#/debug/wonder/stonehenge/<t>`.

Each sweep must show a grounded Salisbury Plain world, the circular bank and
ditch, the stone-working/haul approach, human-scale crews, and at least one
supported operation during BUILD. Uprights rotate continuously about a prepared
ramped pit while ropes and an A-frame remain coupled to the same operation;
lintels rise on visible timber cribbing, traverse only above seated support
pairs, and lower onto their joints. No stone scales, teleports, emerges upward
from the ground, or first appears at its final transform. Portrait framing must
retain the central trilithon and one active mechanism without exposing the
terrain or sky boundary. Target budgets are ≤120 calls desktop / ≤95 mobile,
≤180k / ≤120k triangles, ≤80 / ≤60 geometries, and ≤16 textures.
Pure contact probes also sample several routes and phase interiors/boundaries:
transformed source/dressing bottoms meet the shared turf sampler within 3 cm;
sled/skid timber fills the carrier gap and its runners meet that turf; upright
heel arcs meet the pit contact; and lintel soffits meet crib, guide, or joint
tops. A fixed source-ground carrier offset is a regression.
The sky boundary staying hidden is not sufficient: all checkpoints must retain
a clearly blue upper sky and at least one readable humid/broken-cloud layer
above the open chalk grassland. Audio acceptance asserts that Stonehenge and
Giza resolve to unique IDs and files for both cue roles, that Stonehenge's
cinematic file decodes to exactly 60 seconds, and that missing legacy cues
return silence instead of another culture's score.

### Petra replication acceptance

At desktop 1440×900 and mobile 390×844, capture `t = 0.12, 0.32, 0.58, 0.78,
0.92, 1.0` on `#/debug/wonder/petra/<t>`.

Each sweep must show the Siq walls, a rose-red working face, human-scale
crews, and at least one spoil cell leaving the envelope during BUILD. The
working face descends; remaining-rock members do not translate or scale;
covering cells leave before those members read as dressed architecture. No
spoil cell first appears at the dump. Portrait framing must keep the facade
and one haul or bench without exposing a terrain or sky-dome edge. Target
budgets match the Stonehenge row in this spec. Pure contact probes: hauled
cell bottoms meet the shared Siq sampler plus engine-owned sled height
within 3 cm; dumped cells meet terrain with no extra carrier. Browser
diagnostics must name `petra-reference`. A nonblank legacy fallback is a
failed migration. Missing Petra audio is silence, never another wonder's
score. The sky strip above the massif must stay a dry blue, not a brown fog
wall.

### Colosseum replication acceptance

At desktop 1440×900 and mobile 390×844, capture `t = 0.12, 0.32, 0.58, 0.78,
0.92, 1.0` on `#/debug/wonder/colosseum/<t>`.

Each sweep must show the drained valley, Palatine/Caelian context, the
eastern haul road, and crews *working* their bound operations — haul teams
walking ahead of wagons, treadwheel walkers orbiting a spinning wheel,
deck masons pacing the current lift — not posed rings watching masonry
grow. At least one wagon or crane operation must read during BUILD. The camera eases an east-to-south
arc with holds; it does not complete a full orbit in one minute. Hoisted
stones climb a rope beside the facade; scaffolding and centering raise
before they work and strike after.
Eighty arched bays must read as an ellipse, not a circle of boxes. From the
hold, the interior is a stadium: podium wall, stepped ima/media/summa
cavea, and a timber deck over sand — not a see-through hoop onto the far
arcade. Parts keep `[1,1,1]` scale; none first appear at the seat; vaults
wait on centering and piers; cavea wedges wait on their vault. The camera holds close enough that the 188 m ellipse is
the subject, with valley still readable around it. Portrait framing must keep the south arcade and one
mechanism without exposing a terrain or sky-dome edge.
Target budgets match the Stonehenge row in this spec. Pure contact probes:
hauled bottoms meet the shared valley sampler plus engine-owned wagon-bed
height within 3 cm; seated parts match the authored transform. Browser
diagnostics must name `colosseum-reference`. Audio lookup is Colosseum-owned
or silent, never another wonder's score. The upper sky must stay a
Mediterranean blue, not a brown studio void. The working oval has **no
standing water**: no Nero-lake disc and no mid-ground Tiber plane. Hills
read as brick insulae with hip roofs, umbrella-pine ridges, and an arched
aqueduct, not cones or cubes on a brown slab. The far valley must fog into
the sky with no hard tablet horizon. Palatine/Caelian lots must read as a
neighbourhood at the cinematic hold, not a handful of Monopoly houses.

### Sydney Opera House replication acceptance

At desktop 1440×900 and mobile 390×844, capture `t = 0.12, 0.32, 0.58, 0.78,
0.92, 1.0` on `#/debug/wonder/sydney-opera-house/<t>`.

Each sweep must show Bennelong Point in the harbour, Farm Cove water to the
east with ripple and a sun-glitter path from the harbour sky (never a plastic
blue fill), Circular Quay sheds south, a compressed 1966 CBD and Kirribilli
terraces, Botanic Garden canopy south-east of the point, and the Harbour Bridge
as a connected western arch over water — pylons on Dawes Point and Milsons
Point, never a dirt pad under the span. The far water rim fogs into the sky;
no square earth tablet.
The podium seats before any sail skin. Early frames must read as **modern
civil plant**: yellow Favelle-style tower cranes, a yard crawler crane,
bulldozers and dump trucks on the point/yard — never ancient sleds or
grey stick-gantries. Ribs wait in the on-site yard, stage on the podium
working floor, then climb a tower-crane rope and slew onto steel falsework.
Tile skins hoist only after that sail's ribs are seated.
Crews work bound jobs in orange tunics — haulers with trolleys, slingers,
tag-line crews, climbers on poles that already exist — never a chorus ring
around a sail. Falsework is ground-rooted segments of authored length and
strikes after the tiles seat. The camera opens from the east and lerps
azimuth linearly from frame one on a slow east-to-south arc; it does not
complete a full orbit. Framing is a Giza-like harbour panorama (about
520–700 m desktop, 20–23° pitch) so water, quay, shores, and Bridge stay
in shot; the house does not fill the frame.

Parts keep `[1,1,1]` scale; none first appear at the seat. Pure contact
probes: hauled bottoms meet the shared peninsula sampler plus engine-owned
trolley height within 3 cm; seated parts match the authored transform.
Browser diagnostics must name `sydney-opera-house-reference`. Audio lookup
is Sydney-owned cinematic and ambient cues, never another wonder's score.
The cinematic identity is an Australian harbour concert house, never a
generic construction-site pulse and never a Palais Garnier pastiche.
Daylight is bright Sydney harbour blue; the movie ends at night with
a lit house on dark water. Sails must show chevron tile fields, not smooth
CAD blobs; the Harbour Bridge must read as a connected arch.

### Eiffel Tower replication acceptance

At desktop 1440×900 and mobile 390×844, capture `t = 0.12, 0.32, 0.58, 0.78,
0.92, 1.0` on `#/debug/wonder/eiffel-tower/<t>`.

Each sweep must show the Champ de Mars, Seine glitter to the north using the
shared Giza water recipe, four lattice legs (not solid tapers), creeper-crane
labour during BUILD, and a night lantern at t = 1. The Blender rebuild camera
makes a continuous 125° orbit, starts moving immediately, and retreats as the
working height rises. The corrected 125 m footprint supersedes the older
due-north camera workarounds. The currently built structure must fit at
1440×900, 390×844, and 320×844, including the entire 312 m tower at reveal,
without cropping the feet or summit; normalized projection tests cover those
frusta. Capture intermediate hoist/transfer frames as well as round-number
milestones, because a seated frame cannot prove transport or rigging.

Verify actual GLB vertices against the manifest (axis/unit/parent transform
round trip), fixed geometry through seating, preceding-stage completion,
phase continuity, reverse seeks, async readiness repaint, and disposal. New
Eiffel imports must fail visibly instead of silently showing an empty tower.

Parts keep `[1,1,1]` scale; none first appear at the seat. Pure contact
probes: hauled bottoms meet the shared Champ sampler plus engine-owned wagon
bed within 3 cm. Browser diagnostics must name `eiffel-tower-reference`.
Audio lookup is Eiffel-owned or silent, never another wonder's score. The
reviewed Lyria cue is 1889 salon strings and restrained brass. Caption voice
is Adam, distinct from George, Daniel, Bill, and Alice.

## Visual scorecard

Before release, score 0–5 for composition, silhouette, construction causality,
material readability, lighting, environment depth, motion clarity, and UI
restraint. No category may score below 4; construction causality must score 5.

Amendment (Tier 4 P4): the four-role review board scores 0–3 per category; map board marks onto this card as board × 5/3, so the floor of 4 corresponds to board ≥ 2.4 and the causality 5 to board 3.


Camera orbit QA must inspect the actual rendered camera, not only evaluate
the pure shot sampler. Runtime diagnostics expose camera position, forward
direction, field of view, aspect and near plane after rendering. Browser QA
compares those values with the expected shot at requested film times, then
captures desktop/portrait framing and exercises real playback.
