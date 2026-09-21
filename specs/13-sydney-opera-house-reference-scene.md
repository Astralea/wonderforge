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

## Evidence and authored interpretation

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
- Harbour Bridge west of the point; Circular Quay to the south; Farm Cove east.

Authored kit (plausible compression, never claimed as a complete archaeology):
two Favelle-style **luffing tower cranes** on the podium (yellow modern plant,
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

Podium: `cast → hauled → seated`

Rib / sail: `cast → hauled → staged → hoisted → seated`

- `cast` occupies the south on-site yard (or podium form bays for granite).
- `hauled` keeps the part on a short yard trolley. Transformed bottoms meet
  the shared peninsula sampler plus engine-owned bed height within 3 cm.
- `staged` rests on the **podium working floor**, never inside a sail volume.
- `hoisted` climbs a tower-crane rope **vertically at staging xz**, then slews
  to the seat, then lowers. Never a chord through seated masonry. A visible
  cable joins jib tip to the part.
- Falsework is **ground-rooted** steel of authored segment length. Never fake
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
  distinguishable. The Harbour Bridge is a connected western skyline character,
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

Circular Quay, a compressed 1966 CBD, and Kirribilli terraces are authored
lots from one engine list (`sydneyHarbourLots`). Quay sheds are long gabled
warehouses. Offices are sandstone/concrete slabs of the construction years,
never a 2020s glass skyline. Terraces are hip-roof rows. Moreton Bay figs are
trunk plus a spreading multi-lobe canopy, never lollipop spheres. Workboats
are hull, cabin, and mast — not boxes.

Sail skins are Utzon spherical vaults authored in Blender as polar lunes of
the 75 m sphere, tipped at the foot and seated on the granite podium. Concert,
opera, and restaurant fans stay nested and readable from the 520–700 m hold.
Höganäs chevron fields stay on the skins. Do not import Firaxis, Anno, or
third-party Opera House meshes; the kit lives at `public/models/sydney/`
(`sail-0.glb`…`sail-8.glb`, `harbour-kit.glb`) and is regenerated by
`scripts/generate-sydney-harbour-kit.py`. The later camera hold stays over
Farm Cove water — east-to-south but not so far south that the CBD fills the
frame.

## World layers and camera

1. Playback-driven Sydney harbour sky; dawn to night.
2. Harbour water, Farm Cove, distant north shore, Harbour Bridge west.
   Harbour water uses the shared Giza water recipe (ripple, chop, analytic
   sky glitter fed from the harbour sky) and peninsula waterline foam.
   Farm Cove must show a sun-glitter path, never a flat blue card.
3. Bennelong Point peninsula, Circular Quay sheds, fig trees.
4. Casting yard, tile palettes, trolley road on the point.
5. Podium, falsework, seated/active shells.
6. Yellow tower cranes, crawler crane, bulldozers, dump trucks, cables, crews, dust.
7. Foreground rib beds, tile crates, bollards.

The camera opens from the **east** (Farm Cove) so water and the sail edge read
first; the Bridge stays western backdrop. Azimuth interpolates **linearly**
from the first frame — never a frozen intro hold, never easeInOutQuad on
azimuth. A slow east-to-south arc (~50–70°) with later ease on radius/pitch.

Hold like Giza's plateau ensemble, not a mid-shot of the shells: desktop
radius about **520–700 m**, pitch about **20–23°**, look-at near harbour
height so water, quay, both shores, and the Bridge stay in frame. The Opera
House is a jewel on Bennelong Point, never a close crop. Giza's 22.5° cinematic
base is the model; half-FOV is not a cap on this harbour (the monument is small
relative to the water). Portrait still widens radius. Crews and plant must
read at that distance (diorama scale).

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

## Verification

`npm run test && npm run typecheck && npm run build`. Browser diagnostics
name `sydney-opera-house-reference`. Capture desktop 1440×900 and mobile
390×844 at `t = 0.12, 0.32, 0.58, 0.78, 0.92, 1.0` on
`#/debug/wonder/sydney-opera-house/<t>`. Confirm the preview HTML hash
matches the new bundle.
