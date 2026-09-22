# WonderForge

Fan-made browser recreations of Civilization VI's World Wonder construction
movies. A camera circles a living building site, daylight moves from dawn to
dusk, and the monument is assembled by visible human labour — quarried,
hauled, ramped, levered and seated, stone by stone.

**[wonderforge.pages.dev](https://wonderforge.pages.dev/)** — runs in any
modern browser, nothing to install.

## The films

Four are finished and playable:

| Wonder | Completed | What it shows |
| --- | --- | --- |
| Pyramids of Giza | 2560 BC | Quarry, causeway, sled haulage, the ramp system, casing stones |
| Stonehenge | 2400 BC | Earthwork ditch, bluestone transport, sarsen raising, lintel seating |
| Colosseum | AD 80 | Travertine supply, lifting crews, vaulted substructure, seating tiers, moonrise |
| Eiffel Tower | 1889 | Puddled-iron lattice, creeper cranes, the Champ de Mars and 1889 Paris |

Six more — Petra, Chichén Itzá, Machu Picchu, Angkor Wat, the Forbidden City
and the Sydney Opera House — are in the catalog as "In production" and are not
yet playable.

Each film has a scrubbable timeline, an optional narrated history, and a
wonder-specific score. Deep links are stable: `#/wonder/pyramids-of-giza`.

## How it works

Every structural solid is an individual object with a real position. Nothing
scales up from nothing, fades in, teleports, or rises out of the ground — if a
stone sits on the pyramid, a crew put it there, along a path that existed, using
a machine that was on site. That single constraint drives most of the
architecture:

- **A construction state graph** per wonder decides what exists at time `t`,
  what is in motion, and which crews are assigned to it. The film is a pure
  function of `t`, so scrubbing backwards is as valid as playing forwards.
- **Determinism.** No runtime `Math.random()` anywhere. All variation comes from
  a seeded generator in `src/engine/random.ts`, so a given frame is identical on
  every machine and every run — which is what makes visual regression testing
  possible at all.
- **A pure core.** `src/engine/` and `src/data/` contain no React, no DOM and no
  Three.js imports. Scene logic is testable without a GPU, and the renderer is
  replaceable.
- **Instanced rendering.** `src/render/three/` owns and disposes every GPU
  resource. Thousands of stones, workers and props are drawn through instanced
  systems under a draw-call budget.
- **One light rig** drives sun position, shadow direction, sky colour, fog and
  the post-processing grade from a single clock shared with the construction
  schedule.

## Running it

```bash
npm install
npm run dev        # http://127.0.0.1:5173
```

Verification gate — all three must pass before any change lands:

```bash
npm run test       # 247 files, ~1300 tests
npm run typecheck
npm run build
```

Some Eiffel and Paris tests load large glTF assets and can exceed the default
vitest timeout when the full suite runs in parallel on a loaded machine. They
pass in isolation:

```bash
npx vitest run tests/paris-assets.test.ts --pool=forks --poolOptions.forks.singleFork
```

### Debug routes

- `#/debug/wonder/<id>/<t>` — a deterministic, chrome-free frame at normalized
  time `t`, used for scene QA and capture comparison.
- `#/debug/<shape>` — primitive viewer for the remaining fallback scenes.

## Layout

```
specs/      54 numbered specifications — the source of truth
src/data/   typed wonder catalog, construction schedules, captions, narration
src/engine/ pure simulation: construction graphs, cameras, day/night, crews
src/render/ Three.js scene systems, materials, post-processing
src/ui/     React shell — catalog, transport bar, captions, info panels
tests/      247 test files, including physical-plausibility contracts
scripts/    asset preparation, Blender authoring, narration generation
artifacts/  dated evidence for each change: reports, captures, verification logs
```

Specs come first. When behaviour changes, the spec changes before the code, and
`tests/` grows to cover it. `AGENTS.md` and `HANDOFF.md` record the working
agreement and the current state of the rebuild.

Tests are unusually literal about physics: they check that rendered stones rest
on supporting solids, that crews stand on walkable ground, that haul routes are
traversable, and that nothing intersects anything it shouldn't. Scene bugs here
look like floating stones and clipping workers, and assertions catch those far
more reliably than eyes do.

## Stack

TypeScript, React 19, Three.js, Vite, Zustand, Tailwind CSS 4, Vitest.
Deployed as a static bundle on Cloudflare Pages.

## Credits

- Lunar surface imagery from NASA's
  [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/), Scientific Visualization
  Studio, used unmodified and credited in the Colosseum info panel.
- Narration voiced through ElevenLabs; scores generated with Google Lyria.
  Historical claims in the narration are sourced against primary and official
  material, recorded per film in `artifacts/`.
- All geometry is procedural or authored for this project. No assets from any
  Civilization game are used.

## Licensing

Source code is MIT — see [LICENSE](LICENSE). Generated assets are not covered by
that grant: the narration, the Lyria scores and the NASA lunar map each carry
their own terms, listed in [NOTICE.md](NOTICE.md).

## Disclaimer

WonderForge is an unofficial fan project with no affiliation to, endorsement by,
or sponsorship from Firaxis Games or 2K. "Civilization" is a trademark of its
respective owner. Nothing here is for sale.
