# Spec 01 — Wonder Catalog

## The 10 wonders

Randomly selected for geographic and era diversity. All are buildable wonders in
Civilization VI.

| # | id | Name | Location | Region | Era | Completed |
|---|----|------|----------|--------|-----|-----------|
| 1 | `pyramids-of-giza` | Pyramids of Giza | Giza, Egypt | Africa | Ancient | c. 2560 BC |
| 2 | `stonehenge` | Stonehenge | Wiltshire, England | Europe | Ancient | c. 2500 BC |
| 3 | `petra` | Petra | Ma'an, Jordan | Middle East | Classical | c. 100 BC |
| 4 | `colosseum` | Colosseum | Rome, Italy | Europe | Classical | 80 AD |
| 5 | `chichen-itza` | Chichen Itza | Yucatán, Mexico | North America | Medieval | c. 900 AD |
| 6 | `machu-picchu` | Machu Picchu | Cusco, Peru | South America | Medieval | c. 1450 AD |
| 7 | `angkor-wat` | Angkor Wat | Siem Reap, Cambodia | Asia | Medieval | c. 1150 AD |
| 8 | `forbidden-city` | Forbidden City | Beijing, China | Asia | Renaissance | 1420 AD |
| 9 | `eiffel-tower` | Eiffel Tower | Paris, France | Europe | Industrial | 1889 AD |
| 10 | `sydney-opera-house` | Sydney Opera House | Sydney, Australia | Oceania | Modern | 1973 AD |

`endsAtNight` wonders (Civ VI rule: wonders that are lit end their movie at
night): `colosseum`, `eiffel-tower`, `sydney-opera-house`.

## Gallery publication

The typed catalog still holds all ten ids. The home gallery is two
chronological blocks (Spec 05):

**On site** (playable): Pyramids of Giza, Stonehenge, Colosseum, Eiffel Tower.

**In production** (listed, not a control): Petra, Chichen Itza, Angkor Wat,
Forbidden City, Machu Picchu, Sydney Opera House. Do not add a second
explanatory sentence under that heading.

Never rename an id. Authoring `#/debug/wonder/:id/:t` may still render any
typed scene. Gallery clicks, prev/next, and `#/wonder/:id` only open On site
ids.

## Data model (canonical schema)

Implemented in `src/data/types.ts`. Every wonder MUST conform:

```ts
type Era =
  | 'ancient' | 'classical' | 'medieval' | 'renaissance'
  | 'industrial' | 'modern';

interface Quote { text: string; author: string; }

interface WonderPalette {
  ground: string;   // hex — terrain/base color
  primary: string;  // hex — dominant material
  accent: string;   // hex — trim/detail material
  sky: string;      // hex — midday sky tint
}

interface Wonder {
  id: string;               // kebab-case, unique, used in deep links
  name: string;
  location: string;         // "Giza, Egypt"
  region: string;           // continent/cultural region
  era: Era;
  completedYear: number;    // negative = BC
  endsAtNight: boolean;     // movie ends in night lighting
  quote: Quote;             // the Civ VI narrator quote where known
  description: string;      // optional; empty omits the About paragraph
  facts: string[];          // 3 verifiable facts
  palette: WonderPalette;
  structure: StructureSpec; // procedural build recipe, see Spec 02
}
```

## Content rules

1. **Quotes must be authentic and attributed.** Prefer the exact Civ VI narrator
   quote; otherwise a documented historical quote. Never invent quotes.
2. **Facts must be verifiable** (dimensions, dates, materials, records).
3. **IDs are stable** — they appear in deep links (`#/wonder/:id`). Never rename
   an id once shipped.

## Structural recipes

Each wonder's `structure` is a list of **stages**; each stage is a list of
**parts** made from primitive shapes (`box`, `cylinder`, `cone`, `pyramid`,
`prism`, `sphere`, `torus`, `sail`) with position/rotation/scale and a palette
material key. (`sail` = a curved spherical-cap shell, tessellated by the
renderer — introduced for the Sydney Opera House, whose roofs are all sections
of a single sphere, exactly as Utzon designed them.) Recipes are hand-authored
per wonder by decomposing a reference image into components — capture the
silhouette first, then the interior detail. Detail budget: 20–500 parts per
wonder (the renderer painter-sorts all tessellated faces; Spec 06).

Determinism: expanding a recipe into concrete parts MUST be a pure function of
the recipe. If jitter is wanted (e.g. Stonehenge's fallen stones), use the
seeded PRNG from `src/engine/random.ts` with the wonder id as seed.
