# Spec 12 — Colosseum Replication Scene

The Colosseum is the third forward test of the Giza pipeline and of
`.agents/skills/wonderforge-scene-builder/`. It preserves the stable
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
caption names that empty valley; it does not talk about a lake the viewer
cannot see. Spoken narration is the on-screen body line, not a second
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

The camera path is target-specific and pure. It opens from the **north**,
looking into the empty drained oval, so the site reads as a floor about to
be built — not a quarry stockpile or a pre-laid ring of slabs. Palatine
(west) and Caelian (south) are the midground neighbourhood. The Tivoli
haul yard stays off the first frame. Those hills are real — the amphitheatre sits in Nero's
lakebed between them — but their peaks belong a few hundred metres off the
working floor, and those crests stay below the 48 m facade. The path then makes a **slow north-to-west arc** that
moves from the first frame — azimuth interpolates linearly, with no
frozen intro hold. Later beats ease on a foundation pour, a ground-storey
crane lift, and a second-storey arch; the camera never completes a full
orbit in sixty seconds. Mechanism holds
sit at about 300–390 m with a ~14–16° look-down so the oval is the subject
in the dressed valley rather than a small toy under the hills; the reveal
widens past 370 m. Palatine and Caelian stay historical backdrop a few
hundred metres off the working floor, and their crests stay **below** the
48 m facade. Pitch stays just under half the vertical FOV. Crews must read at
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
