# WonderForge — Product Overview

## What this is

WonderForge is a fan-made web experience inspired by Civilization VI's World
Wonder construction movies. It presents authored, procedural miniature worlds
in real-time 3D: a camera circles a living construction site while daylight
moves from dawn to dusk and the monument is assembled by visible human labor.

The first production-quality scene is the **Pyramids of Giza**. It remains the
quality bar. **Stonehenge** is the first additive replication. **Petra** is
the first subtractive replication: Al-Khazneh is carved from living sandstone
rather than stacked. **Colosseum** is the second additive replication: a
freestanding Flavian amphitheatre of travertine, tuff, and concrete vaults.
**Sydney Opera House** is the third additive replication: a harbour podium,
precast spherical-section ribs, tower cranes, and ceramic tile skins.
**Eiffel Tower** is the fourth additive replication: puddled-iron lattice
pylons raised with creeper cranes on the Champ de Mars.
The remaining three catalog entries stay navigable through their fallbacks.

## Experience flow

1. Home — one full-bleed Giza diorama. A title plate (brand, headline,
   sentence, "Enter the gallery") crossfades into the ten-wonder catalog
   over the same picture; there is no page scroll between them.
2. Wonder catalog — the existing ten-wonder index and stable deep links.
3. Cinematic view — quarrying, dressing, hauling, raising, aligning, and
   seating happen across a deterministic construction movie. Eiffel includes
   longer working chapters with playback speed controls; other scenes retain
   their existing timelines.
   A wonder-owned score plays when a reviewed Lyria cue exists (Giza,
   Stonehenge, Colosseum, Sydney, Eiffel); otherwise the movie is silent.
   Optional ElevenLabs narration reads authored captions.
4. Info overlay — name, location, era, authentic attributed quote, facts,
   replay, scrub, and next/previous navigation.

## Milestones

| Milestone | Contents | Status |
|---|---|---|
| M1 Foundation | Catalog, deterministic engine, playback store, UI | Done |
| M2 Vector prototype | Canvas 2D renderer and ten procedural silhouettes | Superseded |
| M3 Physical 3D foundation | Three.js/WebGL renderer, material and lighting pipeline, diagnostics | Active |
| M4 Giza reference scene | Layered environment plus individual-stone construction logistics | Active |
| M5 Replication | Apply the proven physical scene pipeline; Stonehenge, Petra, Colosseum | Active |

## Non-goals

- No Firaxis/2K assets. Geometry and materials are original and procedural.
- No photorealistic digital twin. The target is a tactile, low-poly,
  tilt-shift miniature with physically legible construction.
- No backend or accounts. The experience remains a static site.
- No attempt to simulate all historically disputed construction methods. The
  scene uses a coherent, plausible authored interpretation and labels it as
  such in production notes.

## Design principles

- **The construction is the hero.** Workers, tools, roads, ramps, and stone
  supply are part of the monument, not decorative particles around it.
- **Human-scale pieces.** No course-sized slabs, growing solids, teleporting
  stones, or blocks that rise from the ground.
- **Layered worlds.** Every shot contains foreground activity, a readable
  construction site, environmental context, and an atmospheric horizon.
- **Determinism.** Every frame is a pure function of scene data and normalized
  time. Seeded generation is allowed; runtime `Math.random()` is not.
- **One composition per viewport.** The world remains the dominant visual; UI
  chrome is restrained and accessible.
