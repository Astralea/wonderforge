# Spec 08 — Giza Reference Scene

Giza is the single quality-bar scene for this rebuild. The checked-in concept
at `assets/concepts/giza-construction-art-direction.png` defines density and
layering, not exact geometry or archaeological certainty.

## Art target

A tactile, tilt-shift construction diorama: thousands of small limestone
blocks, a cut quarry in the foreground, sled traffic on wetted roads, dressing
and staging yards, a broad evolving earthen ramp, scaffold/lever crews, the
three-pyramid hierarchy, temples and Sphinx, then greenbelt, Nile, settlement,
distant city, dunes, cliffs, clouds, and a luminous desert sky.

The plateau fills the frame. It is not a floating island on an empty gradient.

## Stone scale and count

- Giza renders 4,000–8,000 visible exterior structural stones.
- Typical core stone bounds: width 0.85–1.8 world units, height 0.42–0.72,
  depth 0.75–1.65. A few authored foundation/temple stones may be up to 2.4
  wide, but they must remain visibly worker-scale.
- No block represents a whole course, tier, face, cap, pyramid, or causeway.
- The pyramid interior is a solid, course-supported rubble/limestone core. At
  every construction checkpoint, exposed working surfaces have visible
  substrate beneath them; the renderer never synthesizes a course-wide lid.
- Khufu has the greatest base and height; Khafre is slightly smaller and stands
  on higher ground; Menkaure is unambiguously smaller.
- Khafre's surviving upper casing is a separate lighter material layer.

## Site zones

1. Foreground limestone quarry with cut channels, benched working faces
   carrying wedge-slot notch lines, half-extracted blocks still attached at
   one edge, a chip apron at the bench toe, partially dressed blocks, tools,
   shade frames, and crews.
2. Dressing yard anchored on the haul route's dressing waypoint, with blocks
   clustered by state — rough queue, in-dressing (chip piles, measuring
   cords stretched between stake pairs), and a squared dressed stack.
3. Two-lane wetted haul road with outbound loaded sleds and returning crews;
   marker stones and water troughs at the typed queue waypoints show where
   the water and the waiting happen.
4. Staging yard at the pyramid foot with rollers, ropes, water carriers, and
   finite queues; idle sleds park near road ends and lever piles cache at
   ramp feet — equipment never vanishes when crews step off it.
5. Broad compacted-earth/mud-brick ramp whose crest follows the active course.
   The ramp rises toward the monument: its high end meets the working face,
   its foot stands out on the plateau — the gradient never runs away from the
   pyramid, and routes reflect this (rampFoot is lower and farther from the
   monument than rampCrest).
6. Alignment deck with cribbing, levers, rope teams, and seating dust.
7. Necropolis, temples, causeways, Sphinx, worker settlement, and supplies.
   The settlement is a lived-in camp, not a cone grid: tents vary in scale
   and yaw with a second ridge-tent archetype, and the ground story shows
   baskets, water jars, rope coils, cooking pots at the fire pits, and
   trampled paths to the haul road and quarry.

## Mechanical motion

- Quarry release is a short lever/pry operation, never a materialization.
- Dressed blocks are loaded onto sleds at ground level.
- Haul teams lean into tensioned ropes; sled and stone move as one unit.
- Ramp ascent follows the ramp surface. A raised block is visibly supported.
- At the crest, rollers/cribbing and lever teams translate the block into line.
- Seating is a short gravity-aligned descent onto an available support surface.
- Workers return without a block; lanes and operation offsets prevent obvious
  collisions. All motion is continuous through phase boundaries.

This is an authored plausible interpretation, not a claim that one disputed
historical ramp design is proven.

## Physical plausibility

The scene is a diorama, not a simulation, but it must never show the viewer
something that could not happen. The eye reads contradiction faster than it
reads detail: one canopy growing out of an earthwork discredits a whole field
of careful masonry. See the `scene-physical-plausibility` skill for the
verification recipes.

- **Support.** Nothing floats and nothing is buried. A block's declared
  support must agree with its geometry — an eased path over a linear terrace
  separates in the middle even when the endpoints match.
- **Occupancy.** Masonry, earthworks, and props never intersect. Ground the
  construction occupies is unavailable to scenery. Footprints are typed once
  (`plan.ramps`) and drive both the geometry and the keep-out set; props are
  cleared using their own half-extent, not their center point.
- **Right of way.** Haul corridors — the chords sleds actually travel — stay
  open, and drawn roads follow those same chords. Where clearances conflict,
  solid geometry wins over lane clearance. A prop trapped in the zero-width
  gap where a ramp meets its face is rejected, not shuffled.
- **Continuity.** Nothing large pops into existence. Screen time per course is
  proportional to the material it places, interior fill included, with an
  added bias toward the foundation. Scaffolding counts: an earthwork's bed
  extends from its high end outward as it rises, over a partial terrace at the
  frontier, and is struck gradually rather than vanishing. Quantities derived
  from "the maximum so far" step; interpolate through the course instead.
  Verify by sampling a presence scalar at frame rate and checking both its
  per-frame change and the change in that rate.
- **Path validity.** No queued leg crosses a monument footprint; no raised leg
  enters another monument; every route reaches an earthwork touching the
  monument it serves.
- **Ground contact and scale.** Objects rest on the terrain at a consistent
  human yardstick — one world unit is about one metre, a worker about 1.8.
- **Instance hygiene.** Placement loops that can reject a candidate set
  `mesh.count` to what they placed; unwritten instances otherwise render at
  the world origin, inside the main monument.

## Living environment

- Worker crews are assigned to actual operations; ambient village, mason,
  water, survey, and animal traffic uses deterministic loops outside masonry.
- The river is alive: barges drift north with the current, square-sail boats
  run south on the prevailing northerlies, and the moored skiff bobs at the
  bank. Everything is a pure function of playback `t`, and hulls always stay
  inside the channel. Craft move at a perceptible pace (a hull length in
  seconds, not per film) along the channel's true arc length — ground speed
  never surges through bends — with a slow gust breathing on top. Heading
  lags the tangent slightly and weaves gently; hulls heel into turns and
  ride the same ripple field the water shader draws (bob and pitch from the
  wave height at bow and stern). Quarter steering oars sweep slowly, biased
  into the turn. Moving hulls trail a fading foam wake ribbon and carry a
  small deck crew (helmsman aft, hand forward) and deck detail (water jar,
  rope coil); the moored skiff instead shows a mooring rope to a bank stake
  and emits no wake. A larger kite flock works the thermals over the
  cultivated strip, clear of all masonry.
- Palms are a stand of individuals, not a clone row: three typed archetypes
  assigned by pure function — tall fruiting date palms (full two-tier crowns,
  amber date clusters under the crown), young upright palms (fewer fronds,
  no skirt), and old leaning palms (pronounced lean, sparse drooping crown,
  heavy dead-frond skirt) — each with per-instance height, lean, and frond
  variation, swaying gently in the northerly breeze as a pure function of
  `t`. A second grove stand shades the Memphis riverfront across the river.
  Reeds, sparse scrub, tools, and debris frame the foreground and river edge.
- The cultivated strip is a worked floodplain, not a lattice: parcels jitter
  in size and yaw, adjacent same-crop cells merge into larger fields, and
  some cells lie bare — scrub gaps with tufts, or plowed fallow. Every
  parcel carries a typed peret-season crop state (growing emmer, ripening
  gold emmer, pale flax, freshly plowed fallow, straw stubble) assigned by
  pure function; planted furrows run within each parcel's own extents, and
  low mud boundary bunds wall the parcels for basin irrigation. Between the
  parcels run trodden field paths; stubble fields stand with stooks of
  bound sheaves; a threshing floor with a grain mound sits at the strip's
  west end; fallen fronds and dates litter the ground under the palms; and
  a few workers with oxen hoe and gather at parcel corners. City shapes
  combine homes, rooflines, corner bastions, a riverside quay, walls, and
  monumental accents (two pylon pairs, obelisks) instead of one box-only
  silhouette; necropolis mastabas vary with stepped upper tiers and chapel
  annexes.
- Three to five cloud groups cross slowly with depth parallax. They remain
  outside the widest camera orbit, including the mobile reveal, so the camera
  can never pass through a cloud bank or expose a screen-filling cloud edge.
  Continuous
  world-space ridges with a readable, non-flat silhouette, dunes/cliffs, and
  haze close the horizon. Background
  geometry remains fixed while the camera orbits; only explicitly living
  elements such as clouds, boats, and workers may animate.
- Contact dust is localized and brief. Wind haze may move independently but
  never conceals block transport. Wind-blown dust rides the northerly breeze
  in shallow typed lanes along the roads and quarry surround: low, sparse,
  translucent puffs whose drift and end-fades are pure functions of `t`,
  contract-verified clear of every monument and earthwork footprint.
- A small egret flock works the Nile bend on closed circling paths — position,
  heading, wing flap, and glide gates are pure functions of `t`; birds stay
  over the river and floodplain and never cross masonry.
- Cloth is alive: square sails belly between yard and boom, tent canvas
  breathes at the apex, and shade awnings flutter — vertex displacement
  phased from playback `t`, so scrubbing stays deterministic.

## Era and place grounding

The Giza background is data-driven from typed, serializable descriptions, never
from renderer-side magic numbers:

- `src/data/gizaSky.ts` — era-aware sun path, time-of-day sky keyframes, sun
  disc/halo, haze, and cloud layers (`GIZA_SKY`, sampled by `sampleGizaSky`).
- `src/data/gizaEnvironment.ts` — era context, compass orientation, geography
  zones, horizon sectors, hydrology/river craft, ecology, and the distant
  settlement, each with `description`/`historicalNote` documentation.

World compass (fixed): east = `-z` (the Nile), west = `+z` (the Libyan
desert), north = `+x`, south = `-x`. The sun rises over the Nile in the east,
culminates in the south at roughly 78° (near-summer at 30°N), and sets over
the western desert, the Egyptian realm of the dead. A smoothstep dusk tail
(`sunPath.duskTailStart`/`duskTailDepth`) lowers the arc to ~9° by the reveal
hold so the held dusk frame reads sunset-low; dawn and noon are untouched.

Historical rules for c. 2560 BCE (Fourth Dynasty, reign of Khufu):

- The distant city is Memphis (Ineb-Hedj, "White Walls"): mud-brick homes,
  flat reed roofs, domed granaries, whitewashed walls, temple pylons, and
  obelisks. Anachronisms such as minarets, mosque domes, or a modern skyline
  are forbidden and listed in the data's `exclusions`.
- The Nile's Khufu branch ran closer to the plateau than the modern river;
  the greenbelt, fields, and irrigation sit between plateau and river.
- The river is not a straight strip: the channel swings in a broad S-meander
  across the floodplain (clearly visible from the orbit camera, tangent slope
  kept gentle for banks and craft) with one braided side channel and island,
  described as typed data (centerline/width/braid in
  `src/data/gizaEnvironment.ts`). The cultivated strip follows the river: the
  greenbelt ribbon, field parcels, palm rows, and irrigation feeders all
  sample the near bank instead of sitting in a fixed rectangle, and the
  necropolis exclusion follows the greenbelt edge. Banks, reed clusters, and
  river craft follow the sampled centerline, and the channel stays inside the
  floodplain band between plateau monuments and Memphis.
- Monument spacing is compressed from true geography so the ensemble fits one
  camera orbit, but footprints keep a clear gap: pyramid bases never touch or
  interlock.
- River craft are era-correct: square sails only (no lateen sails), cargo
  barges carry white Tura casing stones downstream (north) with the current,
  and sailing boats run upstream (south) on the prevailing northerly winds.
- Clouds are desert-appropriate — high cirrus streaks and small fair-weather
  cumulus — and drift southward with the prevailing northerlies.

## Reveal acceptance

At `t=1`, quarry and logistics remain legible but visually quiet; the full
three-pyramid composition, Sphinx/causeways, worker settlement, greenbelt/Nile,
city, and desert horizon are readable in golden light. Individual stone joints
remain visible in the hero pyramid without moiré or noisy color variation.

## Replication gate

Do not rebuild the other nine wonders until Giza passes the scorecard and
desktop/mobile checkpoints in Spec 04. Their existing deep links and fallback
scenes must continue to work during this focused milestone.
