# Historical film narration — 2026-09-21

All 19 selected-voice recordings are generated, measured and bound to the films.
The owner reported increasing the API key allowance to 2,000,000; the retry
succeeded. The earlier blocker was the individual key's 20,000-credit cap,
not the account balance. No alternate provider or credential was used.

| Film | Voice | Exact ElevenLabs ID | Chapters | Recorded speech |
| --- | --- | --- | --- | --- |
| Pyramids of Giza | Charles | zNsotODqUhvbJ5wMG7Ei | 6 | 25.124 s |
| Stonehenge | Oliver | L1aJrPa7pLJEyYlh3Ilq | 6 | 28.839 s |
| Colosseum | Andrea Williams | dcWyhLms5IOM9o93xsQu | 7 | 31.904 s |

The owner selected the three voices; the per-film assignment is the agent's
recommendation. All use ElevenLabs Multilingual v2 at speed 0.92. This preserves
the measured pace of the original Giza narration. Sydney's Alice and Eiffel's
Adam are unchanged.

Listen locally: http://127.0.0.1:5589/artifacts/chapters-history-2026-09-21/listen.html

## Text, history and timing

[CHAPTER-SCRIPTS.md](CHAPTER-SCRIPTS.md) lists every final line, chapter window
and playable file. Chapter count follows distinct historical subjects and
visible construction, with no fixed quota. Giza and Stonehenge have six
chapters each; the Colosseum has seven including the post-sunset moonrise.
[Spec 50](../../specs/50-historical-film-chapters.md) records the current contract.
The [history and construction audit](../chapters-history-2026-09-20/review/)
contains the primary and official sources; its proposed copy/voice choices are
superseded by the final transcript and owner-selected identities here.

Two Oliver recordings exceeded their windows, so only those sentences were
shortened and regenerated:

- Uprights: “Here, ropes raise the uprights; rubble secures their bases.”
- Solstice: “The axis marks midsummer sunrise and midwinter sunset.”

The construction-method qualifier remains, as do both historical solar
alignments. No chapter windows were moved and no voice was accelerated.
All 19 clips leave at least 0.4 seconds before their caption ends; the actual
minimum is 0.477 seconds. Total speech is 85.867 seconds across three 60-second
films. The compressed time represents different construction periods, not a
literal historical workday.

## Recorded identity and audio mastering

The [manifest](narration/manifest.json) records text, actual voice ID, provider,
model, delivery settings, encoded duration, bytes, SHA256 and mastering data.
The typed source snapshot and exact ElevenLabs requests accompany preserved
raw takes. Generated runtime bindings check the actual voice ID; old George
recordings cannot be presented as Charles.

Measured delivery revealed that the former one-pass normalization target did
not ensure a consistent encoded loudness: Charles's quietest clip measured
-20.41 LUFS. The historical-film generator now works from the original raw take,
uses constant gain with an oversampled peak limiter, then measures the encoded
MP3 and corrects gain to the target. No speech resynthesis or additional
ElevenLabs credits were needed for mastering. The recipe is versioned in each
asset identity; earlier audio files remain preserved. The limiter compensates
its delay, and all recorded durations remained unchanged.

Final encoded loudness: **-16.27 to -16.01 LUFS**. Maximum measured true peak:
**-2.08 dBTP**, below the -1.5 ceiling. Total delivered size: **1,394,303 bytes**.
See [audio measurements](narration/audio-measurements.json) and the preserved
before-mastering measurements. Measurement and limiter options follow the
[FFmpeg filter documentation](https://ffmpeg.org/ffmpeg-filters.html#loudnorm).

The original Giza recording was directly retrieved from ElevenLabs history:
George, Multilingual v2, speed 0.92. Google Lyria on Vertex AI supplied the
background score. Evidence and the original recording are retained in
[the voice review](../voice-review-2026-09-21/selected.html).

## Verification

Final production preview on port 5590 serves `main-D8RR7sSY.js`; development
preview remains on port 5589. Typecheck, build and diff-check pass. The build
retains the existing large-bundle warning.

Final full suite: **241 files / 1,299 tests passed** in 225.74 seconds with two
workers. This includes independent decoded-duration, SHA256, encoded loudness
and true-peak checks, exact voice/text identity, full chapter coverage, and
playback/seek contracts. See [test log](tests-full.log) and [build log](build.log).
Real Chromium playback: **38 of 38 chapter/viewport cases passed** at desktop
1440×900 and portrait 390×844, using the Apple M2 Ultra Metal backend. All 19
served MP3 hashes match the manifest; every recording plays the correct voice
asset and emits a natural `ended` event before its chapter boundary. Narration
on/off, pause/resume, in-chapter seek, forward seek and seeking outside chapters
pass for all six film/viewport combinations. Zero browser, narration-network
or media errors and zero rejected play calls. The shortest observed browser
margin was about 0.36 seconds (encoded margin 0.477 seconds, reduced slightly
by browser scheduling). No recording was cut off.

[Browser evidence](browser/results.json) records every media event and served
asset hash. The revised Stonehenge ending caption remains clear of the Sun and
monument at both sizes. The separate listening page exposes all 19 final files,
decodes all metadata and has no overflow or browser/network errors on either
viewport. Earlier standalone favicon-404 evidence is retained; the page now
uses the existing project favicon.
Browser media checks use muted output and establish decoding, timing and
transport behavior; they do not claim a subjective listening review. Mobile
checks use emulated viewports, not a physical phone.

## Reproduce

With Node 24 in PATH:

```sh
python3 scripts/generate-historical-narration.py
npm run test -- --maxWorkers=2
npm run typecheck
npm run build
node artifacts/chapters-history-2026-09-21/browser/review.mjs
```

The generator reuses verified raw takes and mastered files. A change to spoken
text, voice/model/settings or mastering recipe gets a new asset identity;
stale text or voice recordings are never silently reused. Two test workers
avoid unrelated Eiffel/Paris resource-contention timeouts.

No commit, push, deployment, publication or visibility change was performed.
