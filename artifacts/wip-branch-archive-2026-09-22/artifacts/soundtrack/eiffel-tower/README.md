# Eiffel Tower soundtrack — 1887–1889 Champ de Mars

Reviewed Lyria 3 cues for `eiffel-tower`. Speculative scoring of Third-Republic
civic construction for the Exposition Universelle, not reconstructed street
music and not a copy of Civilization VI audio.

Delivery lives in `public/audio/`. This folder keeps the raw model takes,
prompts, and Lyria captions so a later agent can re-assemble without paying
for a new generation.

## Identity

Documented moment: 28 January 1887 – 31 March 1889, Champ de Mars, Paris.
Puddled-iron lattice raised with creeper cranes; electric lanterns on opening
night.

The cue is **1889 exposition**: salon strings, harp, spare piano, restrained
republican / orphéon brass. Workshop iron may tint the midsection. It must
not become the beat.

Reject as later-Paris shorthand (same rule as Stonehenge bagpipes):

- accordion / musette
- can-can / cabaret / Offenbach as tourist theme
- jazz
- Edith Piaf-era chanson
- synthesizer, electric guitar, trailer percussion
- generic hammer-and-anvil ostinato
- another wonder's file, even as a placeholder

## Files

| File | Role |
|---|---|
| `cinematic-generated.mp3` | Raw Lyria 3 Pro take (~60 s) |
| `cinematic-generation.json` | Prompt, model `lyria-3-pro-preview`, Lyria caption |
| `cinematic-delivery.wav` | Locally faded / padded to exactly 60 s |
| `ambient-generated.mp3` | Raw Lyria 3 Clip take (~30 s) |
| `ambient-generation.json` | Prompt, model `lyria-3-clip-preview`, Lyria caption |
| `ambient-delivery.wav` | Crossfaded loop source |

Public copies after ffmpeg loudness match:

- `public/audio/eiffel-tower-cinematic.mp3` — 60.000 s, −18 LUFS, 1.06 MB
- `public/audio/eiffel-tower-ambient-loop.mp3` — 27.000 s, −21 LUFS, 0.51 MB

Typed metadata: `src/data/soundtrack.ts` (`eiffel-tower` on `ScoredWonderId`).
Lookup is `(eiffel-tower, role)` only. Missing/unreviewed wonders stay silent.

## Lyria caption (audition notes)

Cinematic sections as the model described them:

- **0–14 s.** Cool Champ-de-Mars morning. Solo harp arpeggios, high salon
  strings, spare piano. Rubato; no industrial pulse. Distant metallic tint,
  not a beat. No vocals or percussion.
- **14–42 s.** Pylons join. Modest republican brass (cornet / horn), oboe
  and flute against swelling strings. Slow 4/4 from the string swell, not
  from drums. No cinematic percussion stabs.
- **42–60 s.** Opening night. Restrained brass cadence, harp and piano
  return, long major chord decaying into silence. Salon ending, not a trailer.

Ambient: legato salon strings, solo violin ornament, far French horn, faint
brass across the Seine, no percussion, no climax.

Local ear-check (2026-09-06): dawn harp/strings, mid-cue brass without a
labour ostinato, lantern cadence without fanfare; ambient bed has no beat.
Do not treat this folder as K3 art-direction sign-off — that board scores
pixels, not audio.

## Regenerate

Requires Application Default Credentials with Vertex AI on
`project-8b7cf02e-3e1c-451c-9be`, location `global`.

```
uv run --with google-genai python scripts/generate-soundtrack.py \
  --wonder eiffel-tower
```

`--assemble` reuses the MP3s in this folder and only re-runs ffmpeg. Prefer
that when the brief is unchanged: Lyria has no seed, so a full run is a
different piece.

After a new take: ffprobe durations, pin `duration` in
`src/data/soundtrack.ts` if ambient length changes, audition for vocals and
anachronistic timbres, then `npm run test && npm run typecheck && npm run build`.
