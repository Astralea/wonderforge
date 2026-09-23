# Spec 13 — Sydney Opera House Replication Scene

The Sydney Opera House is the fourth forward test of the Giza pipeline and of
[Spec 49’s scene authoring pipeline](49-scene-authoring-pipeline.md). It preserves the stable
`sydney-opera-house` ID but replaces the legacy silhouette with typed,
deterministic **additive modern construction**: a harbour podium first, then
Utzon spherical-section shells assembled from on-site precast ribs, lifted by
tower cranes, and clad in ceramic tile.

Giza remains the quality bar. Stonehenge, Petra, and Colosseum remain the
prior replications. This scene transfers **contracts** (determinism, final-size
solids, shared support sampling, contact residuals, target-owned sky, unique
soundtrack lookup or silence) and never transfers Giza ramps, Stonehenge pits,
Petra unmasking, or Colosseum treadwheels.

Art direction follows **Civilization VI wonder-movie presentation**, not a
coarse blockout: a dense, identifiable harbour (city, docks, work boats,
waterline foam), white tiled shells that read as Höganäs chevrons, a connected
Harbour Bridge, dawn-to-night light, and a target-owned cinematic score.
Readable from a high orbit, warm not grim. Never import Firaxis, Anno, or other
commercial meshes. Never copy Civilization VI audio.

The earlier Anno-1800 note still applies only as *readability from above*
(function visible outside). It is never permission to ship empty boxes.

## Overhaul contract — 2026-09-23 (supersedes earlier geometry and transport)

Rebuild the monument as seven paired spherical vaults (fourteen half-shells): the larger Concert Hall
WEST (negative X), Opera Theatre EAST, restaurant southwest. Each half has
75 m curvature, a common springing point, converging segmented concrete ribs,
and separate cream/white tile panels. Shared pure surface samples drive the
finished geometry, bounds, joints, construction parts and Blender inspection
export. Retire the old GLB roofs and straight-box ribs from production.

The podium is cast in place as discrete final-size concrete form bays, followed
by a broad SOUTHERN ceremonial stair and granite perimeter. Concrete pours may
first appear in their form bays; they are never hauled as enormous masonry.
Precast ribs and tile panels are transported at ground level and craned from
supported staging; no imaginary ramp raises trolleys through the podium.
Two supported, fixed-length crane rigs serve distinct lanes. Finish structural
work by .82, fit glazing and remove temporary works by .92, then hold the lit
completed house. Keep the sixty-second film and Sydney-owned audio. `#/debug/film/sydney-opera-house`
opens the complete player for review. Owner released Sydney to On site on 2026-09-24,
after the city context pass; `#/wonder/sydney-opera-house` is now public.

The film is an authored compression of 1959–1973; individual plots, fewer larger
assembly panels and static crane bases are interpretive. It is not a claim to
reproduce all 2,194 precast segments or all 4,228 chevron panels. Preserve full
size rigid pieces, monotone dependencies, deterministic reverse seeking,
shared contact geometry and crane availability for every hoist.

Sources for this correction: Opera House official Concert Hall venue page
(western hall), Conservation Management Plan §§3.3/4.7.5 (southwest restaurant,
86 m southern stair), official Spherical Solution and Peter Hall completion
histories (panels and rib erection), and Arup Journal 1973 issue 3 (75 m radius).
URLs and evidence belong in the dated overhaul report. Existing source audio
is retained; any future spoken rewrite requires source-matched regeneration.

## Evidence and authored interpretation

### Motion correction — owner review, 2026-09-23

Validate the background under continuous camera rotation, including a fixed
lighting comparison that separates sky/depth artifacts from day-to-night changes.
Acceptance requires consecutive-frame evidence; isolated stills are insufficient.
Sydney uses restrained bloom (strength 0.06): bright white roofs must retain
surface detail through the sun-facing orbit instead of becoming large glowing
patches. The analytic sun, physical lighting and day-to-night grade remain active.
The sky must remain finite across the entire sphere, including the lower
hemisphere visible through water. Cloud projection uses a positive bounded
height denominator below the horizon; a zero cloud mask does not sanitize NaN.
Verify known failing views at t=14/3600 and 17/3600 in the linear HDR buffer and
in consecutive full-film frames, with bloom enabled. Do not hide this regression
by disabling bloom or filtering dark frames out of the evidence.
Crane load attachment and release must preserve jib/hook continuity. Show the
unloaded return to the next pickup instead of switching to a fixed idle pose.
Hero operations reserve readable handling and return time; remaining operations
are explicitly time-lapse, not claims of real crane speeds.

Existing workboats follow deterministic navigable-water routes with visible
translation and heading, keeping whole hulls clear of shoreline, bridge supports
and each other. All hull, cabin and mast pieces share the same pose; reduced
motion stays a still. Persistent work crews must visibly walk/work in the yard,
face the actual transport direction, and stand on supported surfaces. Verify
their screen-space visibility in desktop and portrait and preserve human scale.
Use one smooth closer yard view during the Opera rib hero's haul/staging,
returning to the harbour view before its high transfer. This is the deliberate
exception to the panorama radii below; opening, later construction and reveal
retain the established wide composition. Worker figures remain about 1.9 m tall.
Historical review must distinguish the real precast/post-tensioned rib and
prefabricated tile-lid process from the film's authored assembly compression.

Authoritative anchors:

- UNESCO World Heritage (2007): the Opera House stands on Bennelong Point,
  Sydney Harbour; designed by Jørn Utzon; opened 1973.
- Utzon's 1961 spherical solution: every sail is a section of a sphere of
  radius about 75 m, so ribs could be prefabricated as repeating chevrons.
- On-site precast yard on the point; ribs lifted onto temporary steel
  falsework. Favelle Favco tower cranes were developed for this job
  (documented industrial history of the site).
- Podium/platform first (Utzon's "platform and shells"): reconstituted granite
  cladding over a massive concrete podium.
- Shells clad in more than one million Höganäs ceramic tiles (Sweden), cream
  and white, in chevron fields that read as roof from above.
- Harbour Bridge northwest of the point; Circular Quay southwest; Farm Cove east and southeast.

Authored kit (plausible compression, never claimed as a complete archaeology):
two Favelle-style **luffing tower cranes** beside the podium (yellow modern plant,
never grey stick-poles), one yard crawler crane, bulldozers and dump trucks
during podium earthworks, a south casting yard, steel falsework under each
sail group, tile palettes on the working floor. This is 1959–1973 civil
construction, never ancient ramps, sleds, or treadwheels. The movie compresses
those years into sixty seconds and builds the intended complete house, not a
postcard ruin. No Sydney Harbour fireworks, no tourist ferries as the hero,
no glass curtain-wall of later interiors as the first silhouette.

## Additive physical contract

One world unit is approximately one metre.

Every structural part (`SydneyPart`) is authored at final size and keeps
scale `[1,1,1]`. Two graphs:

Podium: `form bay → cast in place → seated`

Rib / sail: `cast → hauled → staged → hoisted → seated`

- `cast` occupies the south on-site yard for precast parts; podium concrete appears in final-size form bays.
- `hauled` keeps the part on a short yard trolley. Transformed bottoms meet
  the shared peninsula sampler plus engine-owned bed height within 3 cm.
- `staged` rests on the **ground-supported south yard**, never inside a sail volume.
- `hoisted` climbs a tower-crane rope **vertically at staging xz**, then slews
  to the seat, then lowers. Never a chord through seated masonry. A visible
  cable joins jib tip to the part.
- Falsework is **podium-rooted** steel of authored segment length. Never fake
  raise/strike by scaling Y. Workers climb onto a deck that already exists.
- Tile skins (`kind: 'sail'`) are spherical cap patches cut from the single
  Utzon sphere (radius ≈ 75 m). The geometry is derived once in world space
  from the sphere centre; the renderer places it at the authored position with
  **scale `[1,1,1]`** — no non-uniform XYZ stretching. Stretching a unit sphere
  to fit a bounding box destroys the spherical surface and produces the CAD-blob
  read that fails the materials gate. They hoist only after that sail's ribs are
  seated. Never grow a sail from a point.
- Seated parts are immutable. Future parts are absent.

Active operations stay within `SYDNEY_MAX_ACTIVE` (18).

## Harbour readability (this scene)

These are readability rules, never a license for a coarse blockout. The visual
bar is the Civilization VI wonder movie: dense harbour geography, tiled shells,
interior glow at night, construction still legible.

- Roofs and large weathering read from the cinematic pitch. Tile chevrons are
  the signature, never a smooth CAD blob.
- Function is outside: casting beds, yellow tower/crawler cranes, bulldozers,
  dump trucks, tile stacks, and falsework must be readable at the hold. Never
  hide the work inside the shells. Never stage this site with Giza/Stonehenge
  labour kit.
- Unique silhouettes: concert, opera, and restaurant sail groups stay
  distinguishable. The Harbour Bridge is a connected northwestern skyline character,
  never a dashed first-frame blocker.
- Warm harbour light, southern-hemisphere blue zenith, maritime haze on the
  lowest band. `endsAtNight` is true: the reveal is a lit house on dark water.
- Crews are labour with mixed jobs and per-id salts. Never a chorus ring
  around a sail.

### Harbour fabric — owner correction, 2026-09-18

The cinematic hold must read as Sydney Harbour, never a toy on a square dirt
tablet. Land exists only where the shared peninsula sampler says so; water
covers every other sample, including the span under the Bridge arch. Do not
raise a rectangular pad under the whole Bridge. Dawes Point and Milsons Point
are local abutments for the pylons; the deck and arch fly over water.

Harbour water uses the shared Giza recipe with no extra tint. The disc is
larger than the land mesh and the cinematic fog eats the far rim, so the
horizon is haze, not a hard earth corner. Farm Cove stays open water in the
east opening; the Botanic Garden is a green mass south-east of the point, never
a fill that closes the cove.

Circular Quay, an interpreted 1966 CBD, and Kirribilli terraces are authored
lots from one engine list (`sydneyHarbourLots`). Quay sheds are long gabled
warehouses. Offices are sandstone/concrete slabs of the construction years,
never a 2020s glass skyline. Terraces are hip-roof rows. Moreton Bay figs are
trunk plus a spreading multi-lobe canopy, never lollipop spheres. Workboats
are hull, cabin, and mast — not boxes.

Production sail skins sample the Blender-authored world-space grids in
`src/data/generated/sydneyBlenderModel.json` through the pure sampler in
`src/data/sydneyShells.ts`. `scripts/build-sydney-reference-model.py` authors the
spherical fan charts, podium and facades, then writes the same rounded geometry
to the runtime export and Blender meshes. Save the `.blend`, GLB and round-trip
verification with the reference rebuild evidence. The earlier export scripts
remain prior-overhaul evidence, not the current authoring pipeline.
The old nine `sail-*.glb` files remain compatibility artifacts, never production
roof replacements. The original `harbour-kit.glb` remains the contextual kit.
The closing northwestern hold shows the northern foyers, with the garden and
southern connection subordinate to the monument.

The daytime low sky stays maritime blue. The Sydney camera clip distance must
exceed the portrait fog end; the extended terrain disappears in full haze
before clipping. Macro chevron contrast is an authored approximation for the
ensemble camera, not literal 120 mm tile geometry. Thin tile skins cast shadows
but do not receive their own shadow map; this prevents double-surface moiré.
The deliberate cream/white chevron albedo field may use up to .25 contrast;
fine grain and other surface-noise amplitudes retain the shared .1 ceiling.

### City context pass — owner request, 2026-09-24

The owner judged the background too simplified for Sydney. Sparse identical
slabs in heavy haze, flat land and an empty reveal do not read as a great
harbour city. This pass rebuilds the context before any further construction work.

- **Geography.** Near-site coast and the NSW-traced polygons stay authoritative.
  The coarse south-eastern continuation is replaced from the OpenStreetMap
  Sydney Harbour water relation 1252425 (ODbL), simplified to about 10 m:
  Woolloomooloo Bay reaches its real head about 1.35 km south of the house,
  and Garden Island/Potts Point form its eastern side. Fort Denison stands on
  its own sandstone footing in the harbour.
- **Relief.** Sydney is hilly sandstone. Terrain adds authored, smooth rises:
  Observatory Hill and The Rocks, the CBD ridge, the Domain, the Potts Point
  ridge and the north-shore slopes. The worksite, point, quay and yard keep
  their existing heights; lots still reject footprints with more than 2.4 m of
  fall. Shoreline ground reads as a sandstone band, not uniform earth.
- **Street fabric.** CBD streets are OSM centreline traces (George, Pitt,
  Castlereagh, Elizabeth, Phillip, Macquarie, York, Kent and the east–west
  cross streets), simplified to a few points. They are rendered as terrain-conforming roads and
  also used for lot clearance. Offices fill the blocks at 1960s heights, mostly
  6–12 storeys, with rare towers. Each lot yaw follows its street. The Rocks
  mixes low sandstone warehouses and terraces. Woolloomooloo is dense terrace
  rows. Potts Point is mostly flats blocks. The Domain is open parkland
  with scattered figs.
- **Landmarks** (typed data with source and construction year, all standing by
  1973): Government House, the Conservatorium, Customs House, the Circular Quay
  station and Cahill Expressway viaduct, the AMP Building (1962), Australia
  Square (1967), the State Office Block (1965), the Overseas Passenger Terminal
  with a berthed liner, Quay ferries, the Woolloomooloo Finger Wharf,
  the Garden Island dock and hammerhead crane with berthed warships, Fort Denison,
  Admiralty/Kirribilli House, Luna Park and the Walsh Bay wharves. Positions come from OSM
  footprints where they exist. Demolished buildings use approximate historical
  sites, recorded as interpretation. Massing is stylised, not survey geometry.
  The 1976 AMP Centre, Sydney Tower and later skyline stay excluded.
- **Depth and night.** A low far-city layer continues the built-up land into
  the haze so the fog does not hide an empty tablet. Fog opens moderately
  (near 1.3r, far 4.0r); the portrait fog end must still sit inside the 12 km clip.
  At night, office, terrace and landmark windows glow from a deterministic
  per-window mask. The bridge deck and main streets gain lamp rows, so the
  closing reveal sits in a lit city.
- **Parkland.** The Royal Botanic Garden east of the accepted canopy groups,
  Mrs Macquaries Point, the Domain and the north-shore streets gain clustered
  low-detail groves (trunk plus two lobes), with open lawns between them.
  The accepted garden groups and Farm Cove lawn are unchanged.
- **Budgets.** One landmark batch, one outer-block mesh, one grove mesh and one
  point-lamp layer (hidden by day). The complete desktop film keeps the
  90-draw-call ceiling; the pass measured a 89-call peak. The static
  environment budget rises from 115k to 150k shadow-weighted triangles
  (measured 143k). The added context casts no shadows.

## World layers and camera

### Harbour frontage continuation — 2026-09-23

The reference reset supersedes the earlier no-increase garden pass. Use three
irregular canopy groups on mapped Botanic Garden land, preserving a clear lawn
opening toward Farm Cove. The final data permits 90 garden instances and places
82 (24 western, 36 landward, 22 eastern); there are 161 figs across the complete
context. Reuse the existing fig kit. Adjacent garden crowns may touch/overlap by
up to 3 m along the separating axis of their conservative footprints, while
trunk centres remain at least 6 m apart. Full crown clearance remains required
from the worksite, access roads, buildings, water and protected lawn.
Preserve the working yard, open Farm Cove, bridge bearings and shared dry-ground
support. The roof, construction clock and camera follow the owner reference
reset below, rather than the rejected earlier acceptance. This context pass
adds no claimed historical landmark. Keep the static environment under 115k
shadow-weighted triangles; the completed geography/road correction measured
84,611. The complete desktop film retains the separate 90-draw-call ceiling.

1. Playback-driven Sydney harbour sky; dawn to night.
2. Harbour water, Farm Cove, distant north shore, Harbour Bridge northwest.
   Harbour water uses the shared Giza water recipe (ripple, chop, analytic
   sky glitter fed from the harbour sky) and peninsula waterline foam.
   Farm Cove must show a sun-glitter path, never a flat blue card.
3. Bennelong Point peninsula, Circular Quay sheds, fig trees.
4. Casting yard, tile palettes, trolley road on the point.
5. Podium, falsework, seated/active shells.
6. Yellow tower cranes, crawler crane, bulldozers, dump trucks, cables, crews, dust.
7. Foreground rib beds, tile crates, bollards.

The camera opens from the **east** (Farm Cove) so water and the sail edge read
first. The reference reset carries the wide orbit across the northern harbour
to a **northwestern** closing view, matching the supplied aerial's view of the
glazed foyers. Wide-shot azimuth advances from the first frame; no frozen intro.
The worker insert looks from the open eastern side of the southern yard so the
podium cannot hide the crews, then rejoins the harbour orbit smoothly.

The opening holds the site in its harbour context at desktop radius about
**540 m**, pitch **21°**; the closing view approaches **410 m**, pitch **23°**
(was 27° before the 2026-09-24 city pass) so the lit eastern city — Garden
Island, Potts Point and Woolloomooloo — shows behind the complete house. Preserve the complete building,
including northern shell tips and southern stair. Portrait widens the radius.
The closer yard insert retains normal-size human figures and visible activity.
During the representative lift, the target anticipates the load with a smooth
three-second sampling window; portrait briefly widens its field of view so the
crane transfer stays visible without reproducing accelerated timelapse jerks.

## Soundtrack and captions

Sydney owns a 60-second cinematic score and an ambient loop, generated through
the project's Google Gen AI SDK / Lyria pipeline. Lookup is
`(sydney-opera-house, role)` and must never fall back to Giza, Stonehenge,
Petra, or Colosseum. This is respectful speculative scoring for a modern
Australian harbour concert house, not a copy of Civilization VI's cue, not a
19th-century Paris opera overture, and not a claimed reconstruction of site
sound.

The identity is **Sydney**: southern coastal light, civic pride in a
20th-century performing-arts monument, concert-hall orchestra (strings,
woodwinds, harp, restrained brass). Construction may tint the midsection;
it is never the hero pulse (no 88-BPM steel-clank labour bed). Instrumental
only: no voice, opera singing, didgeridoo-as-tourism-shorthand, surf-rock,
fireworks fanfare, baroque French overture, or synthesizer trailer music.

Caption beats are authored for this wonder (The Point, The Ribs, The Cranes,
The Tiles) — never a copied five-step template.

Caption voice is target-owned. Sydney uses locally bundled ElevenLabs clips
in Alice (Clear Engaging Educator, British), not George, Daniel, or Bill, and
never browser `speechSynthesis` or Gemini TTS. Missing or failed clips are
silence. Spec 05 owns the window, provenance, and autoplay-preparation
contracts. Generate clips with `python3 scripts/generate-narration.py sydney`.

## Owner reference reset — 23 September 2026

The supplied aerial and harbour-side photographs reopen the previously accepted
roof, podium, geography and framing. The earlier paired vault approximation is
not an adequate likeness merely because its surfaces use a 75 m radius.

Author the replacement in Blender and preserve a versioned `.blend`, export,
reference ledger and inspection views. The production construction film must use
the authored geometry: do not show a better export only in an inspection scene.
Retain rigid segmented erection, visible crews and moving harbour vessels.
For overlapping roof groups, complete the lower/northern group before erecting
the group above its insertion path, including its tile lids. Every lid still
depends on its own seated ribs. The previous global all-ribs-then-all-tiles
schedule is superseded where it would lower a piece through an existing roof.
The eight full-height authored flank infills are structural work: partition
their exact exported triangles into rigid loads of approximately ten metres,
transport them from the supported yard and install them within their shell
group's erection sequence. Their union must equal the authored infill, with
no final reveal substitute. Glazing, mullions and small finish details may
retain their separate finish-stage reveals.
Keep the four representative crane operations legible within the sixty-second
film; this order is an explicit construction-film interpretation, not an exact
day-by-day record of the historical work.

Check official conservation plans, mapped aerial imagery and photographs before
choosing geometry. Distinguish documented dimensions from traced approximations.
The building has two splayed hall axes, staggered and opposing shell groups,
projecting glazed northern foyers, an articulated pink granite podium and a broad
southern stair. Acceptance needs the user's harbour aerial and low side views,
plus north, south and roof-plan checks; a single flattering angle is insufficient.

Use metres consistently for the harbour. The shared scene datum is WGS84
longitude 151.2150309475, latitude −33.8569744291, with east +X, south +Z and up +Y.
The Blender hero building frame rotates −12° and then translates by (+14.0,
+8.2) m in world X/Z, as recorded in the generated model. The engine yard helper
uses its separate rotation-only field frame; do not apply the hero translation
a second time to exported world-space geometry. Harbour geometry remains
aligned to true compass directions. Bennelong Point connects to land
at its south; the west, north and east waterfronts remain visibly open.
Circular Quay southwest, Farm Cove east/southeast, the northwestern Harbour
Bridge and the opposite north shore follow the reference map rather than a
compressed ring around the hero. The camera may frame this corrected geography
and recognisable roof.

The coastline is manually digitized from NSW SIX modern aerial imagery;
estimated near-site digitizing tolerance is 2–5 m and district controls
5–20 m; these are tracing estimates, not surveyed accuracy guarantees. Imagery acquisition date was not established: it supports
site geometry, not a claim of exact 1973 shoreline, buildings or planting.
Ground elevations, period buildings, local streets and far-terrain continuation
are interpreted. See the saved official CMP, imagery extents and source ledger
in `artifacts/sydney-reference-rebuild-2026-09-23/references/geography-audit.md`.

The bridge's approximate centre is (−414, −524) m, about 668 m northwest of the
scene origin (bearing 322°). Its own axis points about 30° east of north; these
are different bearings. Preserve the 503 m nominal steel span, approximately
49 m deck elevation, 134 m arch top and 89 m pylons, with compact shore bearings
and connected approaches. These are contextual dimensions, not an as-built
survey: comparison with OpenStreetMap pylon geometry puts the southern pylon
group centre about 24 m from its mapped bounding-box centre and the northern
group about 3 m away. Do not claim survey-level placement accuracy.

The point edge uses a continuous vertical quay face from a submerged toe to
ground-height coping; the promenade remains dry. Do not replace it with spaced
water-level blocks or a sloping land skirt. Ground roads conform to the actual
rendered terrain triangles with a 6 cm surface offset, rather than flat boxes
that intersect sloping ground. Keep the independent rendered-terrain raycast
regression and full hull, lot, crown, worksite and route clearance checks.

Preserve the verified depth precision repair. Recheck rotating-camera terrain,
buildings and trees, including portrait framing, after geography changes.

## Verification

`npm run test && npm run typecheck && npm run build`. Browser diagnostics
name `sydney-opera-house-reference`. Capture desktop 1440×900 and mobile
390×844 at `t = 0.12, 0.32, 0.58, 0.78, 0.92, 1.0` on
`#/debug/wonder/sydney-opera-house/<t>`. Confirm the preview HTML hash
matches the new bundle.
