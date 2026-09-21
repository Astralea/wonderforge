# Eiffel Tower pass 149 — narration and score

Typed Champ-de-Mars world (`eiffel-tower-reference`), bundle
`index-Bv6Pg452.js`. This pass is **audio only**. Geometry, camera, labour,
and Palais GLB are unchanged from pass 148.

Preview: `http://127.0.0.1:5589/#/wonder/eiffel-tower`
Debug: `#/debug/wonder/eiffel-tower/<t>` (chrome-free; no soundtrack UI)

Soundtrack provenance: [`../soundtrack/eiffel-tower/README.md`](../soundtrack/eiffel-tower/README.md)

## What landed

- **Narration.** Regenerated Adam clips (`pNInz6obpgDQGcFmaJgB`,
  `eleven_multilingual_v2`) from the authored 1887–1889 caption lines.
  Durations pinned in `src/data/narration.ts`.
- **Score.** Reviewed Lyria 3 cinematic (60 s) and ambient loop (27 s).
  Identity is 1889 Exposition Universelle: salon strings and restrained
  brass. Registered on `ScoredWonderId`. The movie is no longer silent.

## How to listen

1. Open `http://127.0.0.1:5589/#/wonder/eiffel-tower`.
2. Confirm the preview HTML hash is `index-Bv6Pg452.js` (or the current
   production hash after a later visual pass).
3. Unmute the soundtrack control.
4. Turn **Narration on**. Captions fire only at 1×.

Home-hero ambient remains Giza. Eiffel ambient does not play there.

## Narration clips

Caption text is historically specific to 1887–1889 construction. It is
not café-Paris tourism copy.

| Kicker | `t` window | Clip | Duration (s) |
|---|---|---|---|
| The Champ | 0.155–0.28 | `/audio/narration/eiffel-adam-champ.mp3` | 6.920 |
| The Iron | 0.31–0.44 | `/audio/narration/eiffel-adam-iron.mp3` | 6.548 |
| The Legs | 0.47–0.59 | `/audio/narration/eiffel-adam-legs.mp3` | 6.084 |
| The Join | 0.62–0.74 | `/audio/narration/eiffel-adam-join.mp3` | 5.666 |
| The Beacon | 0.77–0.88 | `/audio/narration/eiffel-adam-beacon.mp3` | 6.037 |

Each clip must finish inside its window with a ≥0.4 s pad (Spec 05).
Beacon is the tightest (6.037 + 0.4 = 6.437 ≤ 6.6).

Regenerate:

```
python3 scripts/generate-narration.py eiffel
```

Then pin the printed durations in `src/data/narration.ts`. Never use
`speechSynthesis`, Vertex Gemini TTS, or a runtime ElevenLabs call.

## Soundtrack

| Role | File | Duration | Volume | Model |
|---|---|---|---|---|
| cinematic | `/audio/eiffel-tower-cinematic.mp3` | 60 s | 0.68 | `lyria-3-pro-preview` |
| ambient | `/audio/eiffel-tower-ambient-loop.mp3` | 27 s loop | 0.38 | `lyria-3-clip-preview` |

Brief (short form): salon strings and restrained brass, Champ de Mars dawn
to 1889 opening-night lanterns. Never accordion, musette, can-can, jazz,
Piaf-era chanson, or a construction-site pulse. Never Giza / Stonehenge /
Colosseum / Sydney files.

Regenerate (new piece — Lyria has no seed):

```
uv run --with google-genai python scripts/generate-soundtrack.py \
  --wonder eiffel-tower
```

Re-encode from cached raw takes:

```
uv run --with google-genai python scripts/generate-soundtrack.py \
  --wonder eiffel-tower --assemble
```

## Gate

`npm run test && npm run typecheck && npm run build` — 400 tests, green.

This is **not** a Giza-density accept. K3 has not signed off. Iron density
and the due-north four-leg nest are unchanged from pass 148.
