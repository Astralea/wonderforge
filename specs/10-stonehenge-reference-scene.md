# Spec 10 — Stonehenge Replication Scene

Stonehenge is the first forward test of the Giza pipeline and of the project
skill at `.agents/skills/wonderforge-scene-builder/`. It preserves the stable
`stonehenge` ID but replaces the legacy ring-of-boxes fallback with typed,
deterministic physical construction.

## Evidence and authored interpretation

Authoritative anchors:

- English Heritage, “Building Stonehenge”: central stones about 2500 BC;
  hammerstone dressing; mortice-and-tenon plus tongue-and-groove joints;
  ramp-sided stone holes, back stakes, plant-fibre ropes, probable A-frames,
  rubble packing, and probable timber platforms for lintels.
- English Heritage, “Stonehenge Reconstructed”: the inner trilithon horseshoe
  was probably raised before the outer sarsen circle; crib platforms are a
  plausible lintel method; the surrounding landscape was open chalk grassland.
- Historic England list entry 1010140: a 30 m outer circle of 30 uprights and
  lintels, graded five-trilithon horseshoe, smaller bluestone settings, ramped
  stone holes, 110 m bank/ditch enclosure, NE–SW axis, and 4.9 m Heel Stone.

The exact lifting system is not archaeologically settled. This movie authors
one coherent interpretation: horizontal transport on timber sledges, upright
rotation into a prepared ramped pit with rope teams and an A-frame, chalk-rubble
packing, and lintels levered upward on alternating timber cribs. The mechanism
must be presented as plausible reconstruction, not proven fact.

The movie compresses several building episodes into one minute. It constructs
the intended complete setting rather than reproducing the modern ruin.

## Experience and art direction

Subject: late-Neolithic builders assembling the central stone settings on open
Salisbury Plain. Audience: a viewer who should understand the labour and the
joinery without reading an engineering explanation. The scene's single job is
to make the change from horizontal stone to supported upright or lintel causal.

Visual tokens:

| Role | Color | Use |
|---|---|---|
| Chalk milk | `#d8d1b5` | fresh pit spoil, bank cuts, dressing chips |
| Rain-dark sarsen | `#6f7169` | large uprights and lintels |
| Preseli blue | `#485c66` | smaller bluestones |
| Downland green | `#65794f` | grazed open grass |
| Trampled ochre | `#8a6d48` | haul scars and staging ground |
| Weather blue | `#7895ad` | high sky and cool haze |

The sky is a subject, not a background clear color. Stonehenge owns a typed
Salisbury Plain sky/light description with a blue upper dome, pale humid
horizon, a visible solstice sun disc, and broad broken cloud families. At every desktop
and portrait checkpoint, a materially visible portion of blue sky must survive
the fog and grade; the open grassland must never read as a sealed grey studio.
Dawn humidity is a thin horizon band: sarsen edges, haul crews, and the downs
silhouette stay readable at t = 0.12. Dusk warmth may not collapse sarsen,
timber, turf, and sky into one dark family. The sun is the alignment, not a
tint: it rises on the NE avenue (midsummer sunrise), culminates south, and
holds low on the SW horizon (midwinter sunset) through the axis caption and
reveal so the Heel Stone, horseshoe, disc, and stone shadows share one line.

Avoid the generic “green plane plus grey blocks” look. Ground identity comes
from rolling chalk downland, pale ditch cuts, trampled haul lanes, dressing
chips, timber stocks, prepared pits, sparse shrubs, and distant tree mosaics.
Grazed turf is a short carpet of low patches (well under ankle height, under 0.12 m), never a field of
tall cones. Distant downs stay green and recede as a rolling heightfield with a
tree-line horizon — a pale fog wall or a raised circular ridge must not read as
a nearby hillside.
Camera-near ground is a subject at late BUILD and reveal: the inner ditch lip
and the working floor in front of the lens carry grazed herb tufts, trampled
chalk chips, and value breaks — not a single flat green plane.
The stone identity comes from tapered/faceted silhouettes, narrow seeded value
variation, roughness contrast, and actual gaps/joints rather than a smooth ring.
Weight is visible before ornament: ropes sag with tension, a lintel sits on its
crib, packing fills the pit around a heel, and chalk dust lives only at the
contact that is moving. Uprights rotate on a continuous heel arc into the pit —
they never chord-cut or slide through the turf. Lintel cribs stand beside the
support pair; alignment is a short guided settle onto the tenons, not a
multi-metre airborne slide. At the 85–95 m high-angle mechanism hold, A-frames read as two
poles meeting at an apex and crews read as people (head, torso, stride, lean).
The working floor, turf mesh, haul tracks, stone paths, sled runners, and
mechanisms share one pure Salisbury Plain height sampler. A horizontal stone's
transformed bottom meets bare turf or its visible timber support within 3 cm;
the 0.34 m sled/skid bed is present only where timber fills that gap and is
applied exactly once. Lintel guide rails remain beneath the soffit during the
final settle until joint contact.

Signature shot: late in BUILD, the camera looks down the NE–SW axis while the
tall central trilithon lintel rises above a dense timber crib. The solstice
caption and reveal hold that same axis: a low visible sun sits on the SW
horizon, and the uprights throw long raking shadows toward the Heel Stone.

Desktop composition:

```text
rolling downs / sparse tree horizon / weather sky
      dressing yard → haul scars → active A-frame or crib
 foreground ditch cut     STONE SETTINGS      bank arc
```

Portrait composition:

```text
weather sky + low sun
central trilithon
active mechanism + crews
bank/ditch foreground arc
```

## Typed construction inventory

One world unit is approximately one metre.

- Five graded sarsen trilithons: ten uprights plus five lintels, built first.
- Outer sarsen circle: thirty uprights plus thirty individual lintels.
- Bluestones: an outer circle and inner horseshoe made from individual smaller
  uprights; no merged ring or course primitive.
- Heel Stone and the earlier circular bank/ditch remain visible place anchors.

Every stone has a stable ID, final dimensions, final transform, material,
route, support dependencies, lane, start, duration, and seeded color variation.
Uprights and lintels keep scale `[1,1,1]` for the entire movie.

## Upright operation

The pure state graph is:

`rough → dressed → hauled → positioned → tilted → raised → packed → seated`

- `rough` and `dressed` occupy source and working yards.
- `hauled` keeps the horizontal stone and timber sledge as one assembly.
- `positioned` rests the stone on skids at the sloped pit mouth.
- `tilted` and `raised` rotate on the authored heel arc while the bottom
  descends into the pit. Ropes remain taut to a visible A-frame and crew.
  Linear interpolation between raise keyframes is forbidden — that chords
  through the turf and reads as sliding.
- `packed` holds the upright immobile while chalk rubble fills the pit.
- `seated` is identical to the authored final transform forever.

No sample may show the centre of a rising stone below its continuous heel arc,
or show a rope/A-frame that is not bound to the same operation ID.

## Lintel operation

The pure state graph is:

`rough → dressed → hauled → queued → cribbed → hoisted → aligned → seated`

- A lintel cannot begin its lift before both declared uprights are seated.
- Alternating timber crib layers remain visibly beneath the lintel throughout
  `cribbed` and `hoisted`; the lintel rises continuously as layers accumulate.
  The crib stands beside the support pair, not four metres out in open air.
- `aligned` is a short guided traverse onto the seated pair (about a metre),
  then `seated` lowers onto mortice-and-tenon seats and stops.
- Outer-circle lintels are individual chord segments with visible joints;
  neither the lintel ring nor any horseshoe is one torus/arc solid.

## World layers and camera

1. Playback-driven sky gradient, a readable solstice sun disc, sparse cloud
   bands, and cool aerial haze. Humid horizon fog must not erase the disc.
2. Fixed rolling chalk downs with a sparse hazel/maple/ash/elm tree mosaic
   on offset NW/SE/SW lobes — never a circular ridge around the henge. Fog
   starts after the tree-line so the horizon is landscape, not a pale wall.
3. Grazed open grassland, shrubs, cattle silhouettes, and distant earthworks.
4. Circular bank/ditch, Aubrey-hole marks, source/dressing yards, haul scars,
   timber stocks, prepared pits, chalk spoil, and working clearances.
   The 56 Aubrey holes are recessed pit mouths in the inner bank circuit —
   damp chalk cuts with a low spoil lip — never a ring of pale discs or
   white dots sitting on the turf.
5. Settled/active stone settings.
6. Sledges, skids, A-frames, cribs, ropes, levers, crews, and chalk dust.
7. Foreground ditch cut, grass clumps, hammerstones, antler picks, and chips.

## Target-owned soundtrack and narration

Stonehenge uses its own 60-second cinematic score and its own ambient loop. It
must never resolve to either Giza cue. The score is an archaeologically cautious
speculation, not a claimed reconstruction: restrained breath tones from a raw
wood/bone-flute-like source, stretched-hide pulse, struck wood, low stone
resonance, wind, and open acoustic space support the labour arc. Avoid Egyptian
reeds/harp, modern orchestra, synthesizers, and later British or Celtic
shorthand (bagpipes, fiddle, tin whistle, bodhran, Druidic chant, medieval
harmony). Instrumental only; no invented ritual vocal.

Caption voice is also target-owned. Stonehenge uses locally bundled ElevenLabs
clips in Daniel (Steady Broadcaster), not Giza's George voice, and never
browser `speechSynthesis` or Gemini TTS. Missing or failed clips are silence.
Spec 05 owns the window, provenance, and autoplay-preparation contracts.

Generate the score through the project's Google Gen AI SDK pipeline with Lyria 3 on
Vertex AI. Retain the exact prompt and model ID with the typed cue metadata;
preserve the generated file as the reviewable artifact and level-match the
delivery encode locally. Google SynthID/C2PA provenance is retained where the
model supplies it.

The camera path is target-specific and pure. It orbits about one turn with
authored holds on an upright raise, an outer-circle crib lift, and the central
trilithon. The path is a high-angle construction shot, not an eye-level walk:
mechanism holds sit at an 85–95 m radius with a ~16° look-down so the open
plain stays in frame. The solstice caption and reveal widen past 110 m and
drop pitch to ~9–11° so the sun disc sits on the SW horizon above the downs
while the axis shadows still read. Pitch stays under half the vertical FOV so
the sky remains visible. The outer-lintel
wave begins on the camera-facing south-west arc so its crib, rope, and crew
are not hidden behind seated uprights. Radius widens for portrait aspect;
framing derives from site plus monument bounds. Fog begins behind the working
floor; the ground and a green horizon ridge extend past fog in every
checkpoint.

## Technical art contract

- Hero surfaces: central trilithons, active stone, A-frame/ropes, crib stack,
  fresh chalk pit, human crews.
- Support surfaces: repeated grass, shrubs, Aubrey holes, chips, timber piles,
  distant trees and cattle; these are shared or instanced.
- Materials: shared rough sarsen, darker bluestone, chalk, grass, trampled
  earth, fresh timber, rope, hide/linen, skin, and haze roles. Movie-distance
  stone read comes from broad rain-dark ALU mottle on those shared materials,
  not unique 2K maps per stone.
- Contact and weight: rope sag is a pure function of tension and span (raise
  lines stay nearly taut; crib lashings hang more). Crib-stack tops meet the
  lintel soffit. Pit packing fill grows around the heel during `packed`. Dust
  is contact-timed at runners, heel, or crib — never a cloud at a floating
  stone centroid.
- Hero silhouette: uprights taper toward a weathered shoulder; A-frames are two
  poles that meet at an apex with a crossbar; crews have a readable head/torso
  and lean into the line at the 90 m hold. Geometry stays procedural/local.
- Asset strategy: procedural/local only, preserving the established WonderForge
  visual policy. Credential probe on 2026-08-26 reported Tripo, Gemini, and
  ElevenLabs keys missing; this scene needs no new runtime asset.
- One directional shadow light. Existing ACES/sRGB pipeline and DPR caps stay.
  Dawn/dusk raise hemisphere fill without washing out the axis-aligned shadow
  shafts; no new post pass. The shadow volume covers the ring, the Heel Stone,
  and the long solstice throw on the turf. The sky dome draws a stylized sun
  disc and halo on the typed path so the alignment is a light in the sky, not
  only a caption.
- Target worst-frame budgets: ≤120 calls desktop / ≤95 mobile, ≤180k / ≤120k
  triangles, ≤80 / ≤60 geometries, ≤16 textures, and no new post pass.
- Mobile first reductions: fewer distant grass/shrub instances and no cloud
  shadow detail; never remove the active mechanism, structural stones, crews,
  pit support, or construction route.

## Contract tests

- Plan expansion is deterministic; IDs/final transforms are finite and unique.
- Inventory counts and monument hierarchy match this spec.
- Structural scale stays `[1,1,1]`; dimensions never animate.
- Phase order is monotone and boundaries are transform-continuous.
- Upright bottoms follow their pit/heel arc (centre-to-heel length stays the
  stone's half-height), never rise from below ground, chord-cut the turf, or
  uncouple from support/rope/crew state.
- Lintels start after their support pair, stay above visible cribbing, align
  over the correct pair with a short guided settle, and stop after seating.
  Crib-stack top equals `cribHeight`; the lintel soffit sits on it within 3 cm.
  Staging for crib/hoist stays within about 1.5 m of the support pair.
- At source, dressing, queue, and pit-approach samples, transformed stone
  bottoms are within 3 cm of the shared turf or declared timber top; sled
  runners are within 3 cm of local turf. Tests cover multiple routes, phase
  interiors, and boundaries, and restoring a blanket source-ground `+0.36`
  clearance must fail.
- Rope sag decreases as tension rises; a raise line sags less than a crib
  lashing of the same span; the sag midpoint lies below the chord.
- Packed-phase `packingFill` grows with phase progress; seated uprights are
  fully packed. `contactDust` is false for idle stones and true only at the
  moving contact (runners while hauled, heel while packing/raising, crib while
  the lintel is crib-borne).
- Active operations remain below the typed cap and routes clear seated stones.
- World layers are complete, deterministic, fixed in world space where static,
  and the bank/ditch/haul geometry is grounded.
- Stonehenge soundtrack IDs and files are distinct from Giza for both cue
  roles; role-only lookup and cross-wonder fallback are forbidden.
- Authored caption beats bind to bundled ElevenLabs Daniel clips, not George
  and not browser `speechSynthesis`.
- Typed Stonehenge sky samples are deterministic and keep a distinctly blue
  zenith above a pale horizon at dawn, build, and reveal checkpoints. Dawn
  haze stays a horizon band (readable silhouettes at t = 0.12); dusk samples
  keep sarsen/timber/turf/sky as separate value families.
- The sun path is the monument axis: dawn azimuth matches `axisRadians` (NE
  midsummer sunrise), noon is south, and from the solstice caption through the
  reveal the sun holds low on the opposite axis (SW midwinter sunset). Ground
  shadow direction of a vertical stone lies along that axis at those holds.
  The camera looks down the same axis during the caption so the disc, Heel
  Stone, and shadow line can be read together.
- Near-field herb tufts and trampled chalk chips occupy the camera-facing
  ditch lip and working floor; they are instanced, deterministic, and do not
  sit on stone sockets. Grazed tufts stay shorter than 0.12 m.
- Distant downs are a green rolling horizon beyond the working floor, not a
  fog-white hillside or a raised ring inside the 200 m radius.
- Mechanism-hold camera radius is 85–95 m on desktop (wider in portrait);
  the reveal is ≥ 110 m. Mechanism holds are high-angle (~16°). The solstice
  hold is ~9–11° so the sun disc clears the downs ridge.
- Production dispatch selects `StonehengeWorld`; all other fallback IDs remain
  functional.
- Browser evidence and budgets meet Spec 04.

Giza quality transfers here as scene discipline rather than construction
mechanics: workers provide the one-metre yardstick, typed keep-outs and site
clearance protect occupied ground, procedural material recipes provide bounded
variation, living-site density stays inside budget, and course/support-style
occupancy tests cover the complete monument. Stonehenge keeps pits, A-frames,
and cribs; it does not inherit pyramid ramps.
