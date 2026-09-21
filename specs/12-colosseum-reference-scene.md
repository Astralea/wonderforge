# Spec 12 — Colosseum Replication Scene

The Colosseum is the third forward test of the Giza pipeline and of
[Spec 49's scene authoring pipeline](49-scene-authoring-pipeline.md). It preserves the stable
`colosseum` ID but replaces the legacy silhouette with typed, deterministic
**additive Roman construction**: a freestanding elliptical amphitheatre of
travertine piers, radial tuff walls, timber centering, and concrete vaults,
raised with wagons and Vitruvian treadwheel cranes.

Giza remains the quality bar. Stonehenge remains the first additive
replication. Petra remains the subtractive one. This scene transfers
**contracts** (determinism, final-size solids, shared support sampling,
contact residuals, target-owned sky, unique soundtrack lookup) and does
**not** transfer Giza ramps, Stonehenge pits/A-frames, or Petra unmasking.

## Evidence and authored interpretation

Authoritative anchors:

- UNESCO World Heritage, Historic Centre of Rome (1980): the Flavian
  Amphitheatre stands in the valley between the Palatine and Caelian, on the
  site of Nero's Domus Aurea lake.
- Encyclopaedia Britannica: construction began under Vespasian about 70–72 CE;
  dedicated by Titus in 80 CE; a fourth storey associated with Domitian.
  Freestanding stone-and-concrete ellipse about 189 × 156 m, using barrel and
  groin vaults rather than a hillside cut.
- Structural literature (Pau and Vestroni; Rea, Mocchegiani Carpano): outer
  axes about 188 × 156 m; facade about 48–50 m; travertine load-bearing
  skeleton with iron clamps; tuff and brick radial walls; opus caementicium
  vaults and a toroidal foundation about 12–14 m thick in alluvial ground,
  poured in formwork sectors.
- Travertine (`lapis tiburtinus`) from the Albulae quarries at Tibur (Tivoli),
  hauled about 20 km into Rome.
- Vitruvius, *De architectura* X, and the Haterii relief (Vatican): a
  treadwheel *polyspastos* with multiple sheaves is the period lifting machine
  for heavy stone. The Haterii tomb is later than the amphitheatre's start but
  is the best pictorial evidence for Flavian-era cranes in Rome.

Labour: thousands of enslaved people from the Jewish War worked under skilled
masons. The movie shows crews without turning that fact into spectacle.

The exact number of simultaneous cranes, the timber centering layout, and the
wagon versus sledge mix on the Tivoli road are not settled. This movie authors
one coherent kit: ox-drawn wagons on a purpose-built eastern road, Haterii-type
treadwheel cranes at the working face, and timber centering that is itself
built before each concrete vault is placed. That kit is a plausible
reconstruction, not proven site archaeology. No gladiatorial games during
construction, no modern iron scaffolding, no tourist infrastructure, and no
exposed hypogeum of the later Domitianic rebuild — Domitian’s underground
maze is later. The dedicated monument has a **timber arena floor over sand**,
a podium wall, and a full stone cavea. An outer arcade with empty air inside
is a failed shot: the amphitheatre is a bowl, not a hoop.

The movie compresses a decade (and Domitian's attic) into one minute. It
constructs the intended complete four-storey amphitheatre, not the ruined
modern silhouette.

**Progression (quality bar):** the exterior arcade silhouette must keep rising
through BUILD. Storeys overlap on the clock so the camera never holds a finished
ground arcade while only invisible inner vaults advance. Scaffold stacks track
the working storey and strike after it seats.

## Additive physical contract

One world unit is approximately one metre.

Every structural part (`ColosseumPart`) is authored at final size and keeps
scale `[1,1,1]`. The pure state graph is:

`quarry → hauled → staged → hoisted → seated`

- `quarry` occupies the eastern Tivoli-facing yard.
- `hauled` keeps the part and a timber wagon as one assembly. Transformed
  bottoms meet the shared valley sampler plus engine-owned wagon-bed height
  within 3 cm. Carrier height is applied once.
- `staged` always rests on the **outer working floor** (about 10 m outside
  the facade ellipse at that bay). Inner radial walls, vaults, and cavea
  wedges do not stage inside the oval.
- `hoisted` rises on a crane bound to the same operation id. The stone
  first climbs **vertically** at the staging xz (rope length changing beside
  the facade), then slews inward at hook height along a boom that stays
  over the stone, then lowers onto the seat. It does not chord through
  empty air or seated masonry. A visible rope joins boom tip to the stone
  for the whole hoist. Timber poles, decks, booms, and wagons are thick
  enough to read at the cinematic hold distance.
- Scaffolding and timber centering are themselves built and later struck:
  scaffolding is a **ground-rooted** timber stack. Final-size lifts are
  added from the valley floor up to the working deck, then removed from the
  top after that storey seats. Poles do not scale in Y and do not hang at
  storey height with a short scaled length. Crews **climb the poles** onto
  a deck that is already there; they do not stand on a rising platform
  and ride it up. Centering stands at final size
  under a vault before the pour and is withdrawn after seating. Auxiliary
  kit does not pop in at full size or vanish in one frame.
- `seated` is identical to the authored final transform forever.

Foundation segments use the same graph but seat into the annular trench
rather than onto a crane (short hoist from the mixing yard into the pour).
Vaults cannot begin `hoisted` until their bay's timber centering is present
and the supporting piers of that storey are seated. Cavea wedges cannot seat
before their vault. Attic bays cannot start before storey 2 of that bay is
seated.

No part first appears at its destination. Phase boundaries share endpoints.
Active hoist/haul concurrency stays within an authored cap (≤24). Dust exists
only at wagon contact and seating.

### Public film repair contract (2026-09-20)

The source road, ring entry, circumferential haul and staging approach form
one smooth route with shared endpoint tangents. Wagon yaw follows that route;
loading and unloading turn continuously into the quarry and staging poses.
The rendered wagon deck top meets the payload bottom, and each wheel meets
the sampled road at its own footprint.

Each operation owns a stationary crane station and fixed mast/jib lengths.
The jib slews and luffs to keep its tip over the hook; only hoist rope length
changes. An elevated station has a visible fixed timber bearing platform
and ground-rooted legs beneath both mast feet. Its footprint and actual
rendered member lengths are regression-tested.

The last scaffold strike removes the whole ground-rooted stack, one fixed
lift at a time, with station windows staggered from 90% to 100%. There is no
remaining 37 m base that disappears at 98%.

All Rome lots remain. Runtime background geometry uses the authored courtyard,
roof and pine silhouettes with simplified hidden faces and distant detail;
city/foliage batches do not cast costly remote shadows. Sky fog blending uses
world elevation, never a camera-relative elevation that exposes a straight
blue/beige seam above the fully fogged terrain.
Portrait reduces subpixel arch subdivisions and cavea treads while retaining
every bay, the bowl, final dimensions and construction transforms. Desktop
restores its full detail after resize.
Portrait framing derives its minimum radius from the projected ellipse and
actual horizontal FOV, retaining a visible margin around both outer arcades.
Scaffold shadows use one continuous proxy column per corner instead of
resubmitting every stacked timber lift; visible timber members stay unchanged.
Portrait retains crew body shadows while omitting subpixel head/limb, wagon-
wheel and mixing-tub shadows. Arm/leg shadows are omitted at both overview sizes; body shadows retain
worker contact. Timber-yard stock uses its material shading without an extra
shadow submission.
The interior ambulacra receive light/shadows but do not duplicate the exterior
arcade and vault shadows; every visible inner arch stays in the main pass. Distant aqueduct shadows follow the surrounding city's
remote-shadow policy. Count the invisible proxy's main-pass submission as
well as its shadow submission when enforcing 180k desktop/120k portrait.

## Experience and art direction

Subject: Flavian builders raising a freestanding oval of arches in the drained
valley of Rome. Audience: a viewer who should understand that the monument is
**stacked and vaulted**, not carved into a hillside.

Visual tokens:

| Role | Color | Use |
|---|---|---|
| Travertine cream | `#d8c4a0` | facade piers, arches, attic |
| Tuff ochre | `#a8895c` | radial walls |
| Pozzolana ash | `#8a7a68` | concrete foundation and vaults |
| Palatine brick | `#9a5a42` | distant insulae and hill fabric |
| Valley dust | `#c4a882` | drained lakebed and haul road |
| Tyrrhenian blue | `#6a9cc8` | high Roman sky |

The sky is a subject. Colosseum owns a typed Roman-valley sky: a clear
Mediterranean blue zenith, a warm dusty horizon, thin fair-weather cloud, and
a readable low sun. Dawn haze is a thin valley band; dusk warmth may not crush
travertine, timber, and sky into one family.

Avoid a generic “tan torus on a brown plane.” Ground identity comes from the
drained oval **silt scar** (no standing water), the eastern haul road **and
the outer ring track**, mixing yards, timber stocks, Palatine and Caelian
rises dressed as **a real neighbourhood**: street-lot insulae, terracotta hip
roofs, grove-scale **umbrella pines** (*Pinus pinea*, flat crowns on tall
trunks — not fir cones or lollipops) and a few cypress, and a Claudian
aqueduct arcade with **arched spans** along the Caelian to the south-east —
never in the east opening shot's foreground. The midground kit is authored
(Blender prototypes instanced on lots) with a procedural fallback of the same
forms. The Tiber lies beyond the fogged Palatine; do not put a water disc
in the mid-ground. Nero’s lake is already drained when the movie opens:
show the damp oval bed, never a pool in the working floor. The first
caption identifies the former lake site as historical context; it does not
claim that a lake remains visible during construction. Spoken narration is the on-screen body line, not a second
script. Insulae stay
on the hills, not in the working oval. The monument identity comes from
**eighty arched bays**, three stacked orders (Tuscan, Ionic, Corinthian as
engaged-column silhouettes, not ornate capitals), and a fourth attic with
velarium-mast corbels. Weight is visible before ornament: wagons sit on the
road, a block hangs from a treadwheel crane, centering stands under a vault.

Signature shot: late in BUILD, the camera looks across the oval while a
treadwheel crane seats a second-storey arch on the camera-facing south arc.
The reveal widens to the complete four-storey ellipse in low warm light.

Desktop composition:

```text
Tyrrhenian sky / Palatine–Caelian hills / brick insulae
     Tivoli road → mixing yard → active crane on south arcade
foreground wagons     OVAL AMPHITHEATRE      drained lake scar
```

Portrait composition:

```text
weather sky + low sun
south arcade + crane
working floor + wagon
valley foreground
```

## Typed construction inventory

### Neronian aqueduct model repair — owner request, 2026-09-20

The southeast background arcade represents the **Arcus Neroniani**, the
brick-faced Caelian branch of Aqua Claudia, already present before the
amphitheatre. Author reusable arch, pier and covered-conduit forms in Blender
and ship the original GLB plus editable source. Use about 7.75 m clear spans
and 2.30 × 2.10 m piers (Platner/Ashby); semicircular openings and restrained
fired-brick tones distinguish the branch from the rural stone Aqua Claudia.
Sources: [Rome archaeology](https://www.sovraintendenzaroma.it/content/acquedotto-neroniano)
and [survey synthesis](https://penelope.uchicago.edu/Thayer/E/Gazetteer/Places/Europe/Italy/Lazio/Roma/Rome/_Texts/PLATOP%2A/Arcus_Neroniani.html).

Keep 28 piers in the southeast sector, using the 10.05 m bay pitch
without stretching the arches to the old 15.23 m spacing. Local X follows the
route. Every arch bears on both adjacent piers; every pier reaches the shared
terrain. One gently graded covered water channel joins the entire run; the
top must not bob with terrain or alternate by bay. Route compression, conduit
section/cover and support heights in this diorama are authored interpretation,
not a surveyed reconstruction. Do not add later Severan infill or the later
Domitianic double-tier Palatine extension.

Keep the channel, arch openings and springing courses legible at desktop and
portrait film scale. Use Blender-authored desktop and portrait arch tessellation,
shared vertex-colored material and batching; no extra shadow pass for this
remote structure. Maintain the scene's 180k / 120k triangle submission budgets.
Readiness waits for the new kit; an equivalent lightweight fallback remains
available if its fetch fails. Disposal and navigation during loading must not
leak geometry/materials. Verify actual imported geometry, pier/arch alignment,
continuous gradient, terrain contact, both budgets and model renders. Browser
acceptance remains separate from asset renders and CPU geometry checks.

- Outer ellipse 188 × 156 m, height 48 m, arena 83 × 48 m, 80 bays.
- Foundation: sixteen annular opus caementicium segments.
- Facade: eighty pier-and-arch units per arcade storey (three storeys) plus
  eighty attic bays with mast corbels.
- Intermediate ambulacrum: eighty pier-and-arch units on the ground storey, a
  smaller ellipse inside the facade (the second of the three concentric
  load-bearing rings).
- Inner bowl, one part per bay unless noted, built bottom-up:
  eighty podium-wall bays around the arena; eighty radial tuff walls;
  eighty concrete vaults on timber centering; eighty **ima**, eighty
  **media**, and eighty **summa** cavea wedges as **stepped seating**
  (not pitched boxes). Sixteen timber arena-deck sectors seat over the
  sand late in BUILD. Do not expose the Domitianic hypogeum.
- Velarium masts at reveal; canvas is a light late-BUILD presence, not a
  modern tensile roof.

Every part has a stable ID, group, kind, dimensions, final transform, material,
route, bay, storey, start, duration, lane, and seeded color variation.

### Connected Caelian context — owner correction, 2026-09-20

The Neronian arcade is a city utility, not an isolated decorative ruin. Its
western end meets the eastern retaining wall of a compressed Temple of Claudius
precinct on the Caelian; its eastern end continues into built street fabric.
A street follows the arcade with roofed courtyard blocks on both sides, and a
northern approach joins the precinct to the valley edge. Buildings, trees and
streets share clearance data with the piers and precinct. No house or pine
intersects the watercourse; the central construction/haul area stays clear.

The 28-pier detailed kit continues upstream into a separate, coarse silhouette
tier of 230 further bays, with real arch-shaped openings, terrain support and
the same channel grade. Its terminal boundary must be off-frame or fully
fogged on both viewports. This distant straight continuation is a rendering
abstraction, not an asserted ancient route survey or water-source location.
No remote shadows or detailed masonry tessellation are spent on that tier.

The precinct is a restrained, original interpretation of the north-facing
terrace, portico and central temple mass, not a surveyed reconstruction or a claim about
its exact restoration state. The authored 118 × 88 m footprint compresses the
reported 180 × 200 m platform; water disappears into the eastern precinct wall.
The schematic cella/pronaos and six-column front are authored visual cues,
not an assertion of the lost temple's exact elevation or column count.
Do not invent a direct water connection to the Colosseum or show Nero's
nymphaeum actively operating during Vespasian's restoration.

Correct +Z-north hill relationships: Aventine southwest, Quirinal/Viminal north;
include nearer Velia and Oppian relief. Preserve the existing working-floor
sampler inside 140 m. Use the original Blender courtyard/roof and aqueduct kits;
terrain-conforming streets, retaining masonry and portico assembly are shared
context geometry. Evaluate endpoint continuity, street/lot clearances and both
full-film triangle budgets, then capture opening/middle/reveal on desktop and
portrait. No studio-only asset approval counts as an accepted environment.

Sources: [Rome, Temple of Claudius](https://www.turismoroma.it/en/node/1137),
[Frontinus, De aquis 20](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Frontinus/De_Aquis/Rodgers/1%2A%2A.html#20).
Frontinus describes the end beside the temple; his later service network must
not be backdated wholesale to AD 70–80. Exact plots, route and elevations in
`colosseumUrbanContext.ts` remain authored interpretation.

## World layers and camera

1. Playback-driven Roman sky, low sun, thin cloud, dusty aerial haze.
   Lighting is a small AAA stack on the shared rig: a raking Mediterranean
   key (sun tint from the typed sky), a cooler hemisphere fill so brick /
   travertine / timber stay separate families, warm ground bounce, and a
   shadow volume that covers the 188 m ellipse plus the near hills. Do not
   fake this with bloom.
2. Palatine and Caelian rises, **authored Roman fabric** on those slopes:
   brick insulae with storey string-courses, recessed windows, and terracotta
   **hip roofs** (not cones on boxes), clustered as street lots facing the
   valley. Palatine carries a few larger brick palace wings. Umbrella-pine
   groves follow the ridges as flat crowns on tall trunks. Cypress punctuation.
   A Claudian aqueduct with arched spans on the Caelian. Midground Palatine
   and Caelian neighbourhoods stay readable; cinematic fog starts *beyond*
   those rises so the hills are a city, not a tan slope in white haze. Far
   geography is a second ring — Quirinal, Viminal, Janiculum — as a fogged
   city silhouette and olive scrub, never a Monopoly grid of cubes and
   never an empty tan tablet meeting a hard sky band. The sky dome's horizon
   blends fully into scene fog so the valley plane does not silhouette.
   Insulae stay on the hills, not in the working oval. Courtyard blocks and
   street gaps are required: a filled grid of identical hip-roof boxes is a
   failed neighbourhood. No Tiber pool and no Nero lake mesh.
3. Drained alluvial valley, silt lake scar hugging the valley sampler,
   eastern haul road as compacted earth — not pre-laid stone slabs.
   At t = 0 no masonry is seated and the timber arena sand is absent; the
   movie opens on the empty drained floor. Arena sand appears with the
   timber deck late in BUILD.
   The valley mesh outruns every cinematic camera, including portrait
   compensation, so the ground continues to the fogged horizon. A square
   plane that ends near the hold distance is a failed shot: the amphitheatre
   then reads as a tiny block on a tablet.
4. Mixing yards, timber stocks, centering, wagons, Tivoli-facing quarry stack.
5. Settled/active amphitheatre, including the interior bowl: podium wall,
   radial structure, vaults, stepped cavea, and timber arena over sand.
   The outer arcade is the facade of that bowl, not a hollow hoop.
6. Cranes, ropes, treadwheels, crews, wagon dust.
7. Foreground dressed blocks, tools, ox-yokes, and road ruts.

Crews are labour, not spectators. Every visible person is bound to an
event: quarry dressers shuttle a dressed face onto the wagon; haul teams
walk *ahead* of the ox-wagon leaning into the traces, each at a different
offset and cadence; slingers work a staged block with mixed jobs (walk a
chord, dress a corner, stand off) — never a rotating ring; treadwheel
walkers do not mirror each other (one walks the cage, one spots);
tag-line crews walk the slew; climbers go up the poles onto a deck that
already exists (never riding a rising platform), staggered on a few
south-arc stations so the oval is not a chorus ring; most scaffold bays
stay empty. Mixing-yard and timber bearers run short authored shuttles during
BUILD, with unique rates; some mixers stir in place. Gait, lean, and
wheel spin are functions of phase progress — the
same `t` as the stone — not a bob on a planted pose. Wagon wheels roll
with haul travel; the treadwheel rotates with hook vertical travel and
holds still during a pure slew. Posed rings
watching the oval grow are a failed shot.

The camera path is target-specific and pure. It opens from the **southwest**,
looking into the empty drained oval, so the site reads as a floor about to
be built — not a quarry stockpile or a pre-laid ring of slabs. Palatine
(west) and Caelian (south) are the midground neighbourhood. The Tivoli
haul yard stays off the first frame. Those hills are real — the amphitheatre sits in Nero's
lakebed between them — but their peaks belong a few hundred metres off the
working floor, and those crests stay below the 48 m facade. The path then makes a **slow southwest-through-west-to-northwest arc** that
moves from the first frame — azimuth interpolates linearly, with no
frozen intro hold. Later beats ease on a foundation pour, a ground-storey
crane lift, and a second-storey arch; the camera never completes a full
orbit in sixty seconds. Mechanism holds
sit at about 300–390 m with a ~14–16° look-down during construction so the oval is the subject
in the dressed valley rather than a small toy under the hills; the reveal
widens past 370 m and gives the eastern sky room during dusk and moonrise. Palatine and Caelian stay historical backdrop a few
hundred metres off the working floor, and their crests stay **below** the
48 m facade. Construction pitch stays just under half the vertical FOV; the closing pitch settles at 4° while the camera gently pulls back. Crews must read at
that hold distance (diorama-scaled figures in contrasting tunics on the
working floor, wagons, and scaffold decks). Crews do not share one
phase: staggered gait, occupancy, and jobs. No chorus-line orbit around
a stone or a scaffold ring. The hoist wave begins on the
camera-facing south arc. Radius widens for portrait aspect.

## Target-owned soundtrack and narration

The Colosseum uses its own 60-second cinematic score and its own ambient loop.
It must never resolve to Giza, Stonehenge, or Petra cues. The score is
respectful speculative scoring, not reconstructed Roman music: tibia/aulos-like
double pipe, cithara/lyre, a restrained frame-drum labour pulse, timber and
stone contact, and open valley air. Avoid Gregorian chant, opera, tarantella,
Hollywood “gladiator” epic brass, synthesizers, and later Italian folk
shorthand. Instrumental only; no invented imperial choir.

Caption voice is target-owned. Colosseum uses locally bundled ElevenLabs clips
in Bill (Wise, Mature, Balanced), not George, Daniel, or Alice, and never
browser `speechSynthesis` or Gemini TTS. Missing or failed clips are silence.

Generate the score through the project's Google Gen AI SDK pipeline with Lyria
on Vertex AI. Retain prompt and model ID with the typed cue metadata.

## Technical art contract

Target budgets match the Stonehenge row in Spec 04. Diagnostics must name
`colosseum-reference`. A nonblank `LegacyWorld` fallback is a failed
migration. Travertine uses a target-owned material recipe; it is not Giza
casing limestone with a new name.


## Owner refinement — city depth and sunlight (2026-09-20)

Replace the repeated single residential silhouette with a small original Blender
kit of genuinely different building forms: low courtyard houses, stepped upper
storeys, joined street fronts and taller corner houses. Distribute them by
district and street, with restrained plaster/brick/tile variation, open courts
and grounded bases. This is an authored urban interpretation, not a survey of
AD 80 plots. Keep all existing date exclusions and connected Caelian waterworks.

The far view must have overlapping inhabited slopes and an irregular skyline,
not one flat ochre plane or identical houses scattered across empty ground.
Separate near streets, Palatine/Velia masses and the farther western ridge using
real shared terrain, different building heights and cooler distance colour.
Ground colours must be applied once; fog cannot substitute for missing form.

The Colosseum has an astronomical day-to-night sky, independent of Stonehenge's
solstitial axis. The owner explicitly rejected copying a centered-sun ending.
Use one documented representative day in AD 80 at the Colosseum's coordinates;
its date is an authoring choice, not a claimed dedication date. A continuous
compressed clock drives both bodies, phase and lighting; changing camera
orientation never moves a celestial body within world space.

Sun and Moon must use topocentric coordinates from reproducible ephemerides.
The Moon is not fixed opposite the Sun and its phase is not an independent
animation. Compute illumination and the tilted bright limb from the same
Sun–Moon–observer geometry; both bodies rise above and set below the horizon.
No above-horizon solar hold, mirrored moon arc, or monthly phase cycle inside
one evening. Record calendar, time standard, location, angular-size treatment,
approximation/interpolation errors and ancient Earth-rotation uncertainty.

The film may compress dawn through one evening/night into the construction
minute. Sky colour follows solar elevation, not arbitrary progress bands.
Protect construction readability with explicitly artistic exposure/fill, while
key-light directions and above-horizon gating remain consistent with the sky.
Do not add fabricated city floodlights. Keep the complete monument framed;
allow bodies to enter/leave the view naturally instead of pinning them to its
centre. Stars, if shown, must share a sidereal rotation, not move with the camera.

Acceptance: deterministic housing variety and support/clearance contracts;
independent solar/lunar ephemeris and phase checks, plus desktop/portrait
review of daylight work, dusk, visible moonrise and the completed evening scene; unchanged
rigid construction and reversible seeking; CPU/GPU budgets remain 180k/120k
submitted triangles. Review opening, construction, reveal and final frames on
real WebGL, then run the complete tests/typecheck/build workflow. Preserve
Blender sources, before/after captures, asset provenance and remaining limits.

Western street fabric follows two authored lanes between the Velia, Palatine
and Janiculum foot. They share complete-footprint exclusion and terrain samples
with the original Caelian roads; do not present these as excavated alignments.
Palatine/Velia relief is composed within the existing under-48-metre landform
contract, with an unnamed western continuation.

### Celestial coordinate and presentation contract (2026-09-20)

Authoring coordinates remain east/up/north (`+X/+Y/+Z`). The renderer applies
one Z reflection to the entire Colosseum content root and camera, giving the
right-handed east/up/south world required for an unmirrored sky. Celestial
directions use `(sin A cos e, sin e, -cos A cos e)` for compass azimuth A.
Instance culling must transform bounds through the content world matrix.
The Moon's terminator is a lit hemisphere whose normal faces the observer;
its light vector points from Moon to Sun. Never flip a crescent independently.

The representative Julian AD 80 June 21 sky runs from 04:00 to 20:09 UT1
through one monotone cinematic clock. Both discs use a disclosed common
2.4× angular enlargement for small-screen legibility; their centres, phase,
and physical horizon events use the ephemeris. Nighttime light is an authored
photographic adaptation, not a lux simulation. A single shadow-casting key
uses the actual Sun by day and the actual Moon after sunset, with solar
shafts disabled below the horizon. The film finishes construction before sunset,
then visibly frames the nearly full waning Moon rising in the east-southeast.
Its sunset and moonrise are roughly18:40 and19:02UT1; their precise values come
from the ephemeris. Sunset is expressed by the changing light; the camera does
not whip between opposite horizons. The final western/northwestern viewpoint
looks east-southeast and settles before moonrise.

Low celestial elevations also require ground-contact shadow casters. Simplified
crew shadows must include the planted feet/lower legs, not just elevated torsos.
The shadow depth volume covers the portrait foreground without a hard cutoff;
receiver bias is specified as a small world-space offset, not a large fixed
fraction of that longer volume. Atmospheric Sun glow crosses the astronomical
horizon smoothly, while the physical disc is horizon-clipped. The Moon adds
radiance behind the local atmosphere, so its unlit side cannot punch an ink-black
circle through the sky.

Portrait detail must stay below120,000 submitted triangles on both tall phones
and shorter375×667 frames, including the wider0.71 portrait boundary. Preserve
all three cavea seating bands and their exact bounding volumes; group subpixel
seat steps into four silhouette steps per band on phones (desktop retains12).
This trades invisible seat tessellation for grounded worker shadows without
removing city lots, roof variety, arch openings or construction parts.

### Owner refinement — daylight work, evening moonrise (2026-09-20)

This supersedes the preceding crescent-moonset ending. Keep one astronomical
day through early night, but distinguish the workday from the finished reveal.
Complete all structural work and scaffold removal by film80%, while the Sun
is still above the horizon; the completed monument remains fixed thereafter.
No hoisting, masonry, crew labour or dismantling continues into night. The
closing20% lets evening light settle and the actual Moon rise. This is an
authored credible work schedule, not a claim about universal Roman work hours.

Select Julian AD80-Jun21: a nearly full waning gibbous rises after sunset.
Update ephemeris provenance and phase tests for that date. The camera must
frame lunar emergence above the eastern terrain and an upward path in both
aspects, with no centre pinning or fabricated reversal. Playback still lasts
60seconds; construction, chapter highlighting and narration should stay
coherent under the shortened work interval. Rewrite chapters and regenerate their narration under Spec 50. The work
chapters conclude with the construction milestone after the modeled work ends;
Moonrise remains un-narrated visual atmosphere under Spec 50. Preserve earlier audio files
as evidence. Reversible seeks must restore daytime work.

### Owner refinement — visible lunar surface (2026-09-21)

The nearly full Moon must read as a textured lunar surface, with recognizable
dark maria and brighter cratered highlands. Replace the faint generic noise
with the NASA Scientific Visualization Studio CGI Moon Kit's native 2019
1024×512 color map (`lroc_color_poles_1k.jpg`, centered on longitude 0°).
Source: https://svs.gsfc.nasa.gov/4720/. Preserve the downloaded image bytes;
bundle one locally served, content-hashed texture. Record source, hash, size,
map convention and usage credit. Include a quiet linked NASA imagery credit
inside the Colosseum information panel, outside the film and captions.

Project the texture onto the existing analytically shaded lunar sphere. Keep
the ephemeris, common angular scale, body position, phase, light direction,
camera, work schedule and narration unchanged. This evening is almost full;
do not substitute a crescent to make the Moon distinctive. Surface presentation
is a mean near-side view unless an independently documented orientation model
is provided; do not claim a date-exact libration or surveyed crater view.
The surface's north direction uses the local celestial-pole projection and
the independently sampled evening lunar pole position angle of approximately
−3.85°. This rotates only the albedo coordinates, not the sphere normal or
Moon-to-Sun vector. Record the fixed-angle approximation against the Horizons
19:00–20:15 UT1 probe; the near-side longitude/latitude still omit libration.

Lunar radiance must retain surface contrast after the production tone mapping
and bloom. Keep the sphere visible behind local atmospheric scattering,
preserve the geometric terminator, and avoid a glowing white centre or a
black cutout on the unlit limb. Daytime and solar rendering remain unchanged.
Texture loading participates in film readiness. Load failure keeps a bounded
fallback and cannot prevent entering the film; disposal during a pending load
must release the arriving texture without restoring disposed GPU resources.

Acceptance: actual 1080p/desktop and portrait closing frames show the dark
maria and retain a clear circular limb at the authored scale. Inspect the full
scene and enlarged crops at moonrise and the final hold, compare against the
previous untextured disc, and retain continuous/reverse-seek checks. Pin the
asset's identity and test asynchronous success/failure/disposal. Preserve the
original montage; refresh its Colosseum shot from the accepted renderer before
the final social upload.
