# Spec 50 — Historical chapters follow the film

Owner request, 2026-09-20: review every chapter of Stonehenge, Giza and the
Colosseum; remove numerical chapter quotas; rewrite and generate real narration.

Chapter count follows distinct historical subjects, the visible shot schedule
and measured speech duration. No universal count, 3–7 cap, inherited five-beat
schedule, 0.15 start floor or 0.88 end ceiling applies. Keep disjoint windows,
readable short sentences, at least 0.4 seconds after each recorded line, and a
quiet final hold. Preserve 60-second films. Chapter navigation, caption display
and voice use film time, including Colosseum's compressed daylight work clock.
An early chapter replaces the opening title; the quote waits until the last
chapter ends. Every chapter remains reachable on desktop and mobile. Stonehenge’s portrait
axis caption must sit between the solar disc and the monument, preserving the
Sun as the ending’s focal point.

Owner correction, 2026-09-21: each narrated chapter must explain the monument's
siting, design, materials, construction method, structural function or a
construction milestone. A sky or lighting change alone is not a chapter.
Historical correctness does not excuse an irrelevant sentence. Stonehenge's
solstice axis qualifies because it is part of the monument's design; a Moonrise
over Rome does not explain how the Colosseum was built. Let atmospheric endings
play without narration once the construction story has concluded. Remove an
unnecessary chapter instead of replacing it merely to preserve a count.

## Selected stories

- **Giza, six**: Khufu's local limestone → reconstructed sledge haul → ramps
  and levers → Khafre on higher ground → white Tura casing → Menkaure and
  three separate reigns. Khafre starts near film .50; Menkaure near .845.
  The narrative does not present three reigns as one historical workday.
- **Stonehenge, six**: earlier earthwork → dressed and jointed sarsens →
  uprights → lintel lifts → Welsh bluestones → solstice axis. Bluestones
  move from .58, so their caption belongs late, not before the upright lifts.
  The exact construction order, ropes and timber lift platforms are a
  reconstruction; many bluestones came from Preseli, but the Altar Stone
  is from northeast Scotland. Do not imply that every bluestone came from Wales.
- **Colosseum, six**: Nero's former lake → Tivoli travertine → reconstructed
  treadwheel lifts → supported vaults → seating structure → construction under
  Vespasian and inauguration under Titus in AD 80. Work and scaffold removal finish by .8; the
  opening chapter explains the site's past rather than depicting an extant lake.
  The chosen Jun 21 AD 80 sky is an astronomical reconstruction, not a claim
  about the exact inauguration date, workers' documented hours, or a filmed event.
  The final construction milestone is narrated only after the modeled work
  ends, in film .805–.94. The nearly full waning Moon and eastern sky remain
  visual atmosphere, with no sky-only caption or voice. Preserve a quiet final hold.

The final text and windows live in `src/data/captions.ts`. History source audit
and construction timing evidence live in
`artifacts/chapters-history-2026-09-20/review/`.

## Narration pipeline

`generate-historical-narration.py` reads the actual typed captions and existing
voice identities via an esbuild export, so it cannot silently prepend a chapter
heading or reuse stale duplicated text. The current owner-selected mapping is
Charles for Giza, Oliver for Stonehenge, and Andrea Williams for the Colosseum. Generate body text verbatim with
ElevenLabs multilingual v2, normalize to -16 LUFS, measure with ffprobe, and
reject any line that exceeds its window minus 0.4 seconds. Prefer a shorter
sentence or a justified window adjustment to artificially squeezing the audio.

Check loudness on the encoded MP3, not just the normalization filter's target.
The historical-film master targets -16 LUFS within 0.3 LU and a true peak no
higher than -1.5 dBTP. Use constant gain with an oversampled peak limiter,
measuring the result and correcting gain as necessary. Preserve pace, pitch
and duration. Version the mastering recipe in the asset identity; reuse the
unchanged ElevenLabs raw take when only mastering changes.

Preserve earlier audio files. New content-addressed filenames include a hash of
the spoken text, provider, voice, model and generation settings. Raw takes,
source snapshots, measured duration, bytes and output SHA256 are archived;
typed generated metadata binds the player to those exact assets. Validate audio
files against the manifest and exercise narration, seek, pause, replay and the
chapter menus in a real desktop and mobile browser.

## Owner voice selection — 2026-09-21

The owner selected three ElevenLabs library voices: Charles
(`zNsotODqUhvbJ5wMG7Ei`), Oliver (`L1aJrPa7pLJEyYlh3Ilq`), and Andrea Williams
(`dcWyhLms5IOM9o93xsQu`). These replace the earlier George/Daniel/Bill choices
with Charles for Giza, Oliver for Stonehenge, and Andrea for the Colosseum. Keep Multilingual v2 and the original
measured delivery speed of0.92, then measure every new take. A voice change must
create a new asset identity; never label an old take with the new voice metadata.
Preserve the prior raw takes, normalized files and manifests.

The measured Oliver takes required shorter upright and solstice sentences.
Keep the upright line qualified with “Here” because the lifting method is a
reconstruction. The closing line names midsummer sunrise and midwinter sunset;
these mark opposite directions along the same axis. Preserve their existing
7.2-second windows and the final quiet hold, without accelerating the voice.
