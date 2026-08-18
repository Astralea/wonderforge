# WonderForge — Product Overview

## What this is

WonderForge is a fan-made web experience inspired by Civilization VI's World
Wonder construction movies. It presents authored, procedural miniature worlds
in real-time 3D: a camera circles a living construction site while daylight
moves from dawn to dusk and the monument is assembled by visible human labor.

The first production-quality scene is the **Pyramids of Giza**. The remaining
catalog stays navigable, but Giza is the reference scene and the only scene that
must meet the full physical-construction quality bar in this milestone.

## Experience flow

1. Hero / landing — one cinematic brand signal and one gallery CTA.
2. Wonder gallery — the existing ten-wonder catalog and stable deep links.
3. Cinematic view — quarrying, dressing, hauling, raising, aligning, and
   seating happen across one deterministic 60-second construction movie.
4. Info overlay — name, location, era, authentic attributed quote, facts,
   replay, scrub, and next/previous navigation.

## Milestones

| Milestone | Contents | Status |
|---|---|---|
| M1 Foundation | Catalog, deterministic engine, playback store, UI | Done |
| M2 Vector prototype | Canvas 2D renderer and ten procedural silhouettes | Superseded |
| M3 Physical 3D foundation | Three.js/WebGL renderer, material and lighting pipeline, diagnostics | Active |
| M4 Giza reference scene | Layered environment plus individual-stone construction logistics | Active |
| M5 Replication | Apply the proven physical scene pipeline to the other nine wonders | Future |

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
