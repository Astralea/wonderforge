# Final narration browser verification

**Pass for playback mechanics and the two revised-caption captures.** All 19 remastered narration files were verified against their manifest hashes and played to their natural end in the actual film UI at both requested viewport sizes. This run used muted browser output and does **not** assess vocal performance, pronunciation, mix quality by ear, or physical-phone playback.

Run: 2026-09-21, 01:10–01:14 JST. Production preview: `http://127.0.0.1:5590`; bundle: `main-D8RR7sSY.js`. Full Chromium `channel:'chromium'` reported `ANGLE Metal Renderer: Apple M2 Ultra` in every scene/viewport run. Desktop: 1440×900; portrait: 390×844, DPR 1. Portrait verification ran in a desktop browser at mobile dimensions.

## Playback results

| Film / selected narrator | Desktop clips | Portrait clips | Shortest observed time remaining after natural audio end |
|---|---:|---:|---:|
| Giza / Charles | 6/6 | 6/6 | About 0.36 s, Menkaure chapter, both sizes |
| Stonehenge / Oliver | 6/6 | 6/6 | About 1.74 s, shaping chapter, both sizes |
| Colosseum / Andrea Williams | 7/7 | 7/7 | About 0.48 s, moonrise chapter, both sizes |

Each of the **38** cases was started through its actual chapter-menu button after an explicit Narration on gesture. The instrumentation observed the page's real `HTMLMediaElement` play calls, playing/ended events, decoded duration, current media time and film position. Silent autoplay-priming calls were distinguished from positive-volume narration. Every case:

- Used the exact final MP3 expected by the dynamically read source snapshot and manifest, with the matching caption body and selected voice metadata.
- Reached the browser's `playing` and natural `ended` events before its chapter endpoint. No caption boundary cut off a clip.
- Had a browser-decoded duration within 0.08 s of the manifest's measured duration.
- Had no positive-volume play call for an unrelated or stale narration file during that chapter.

The manifest's encoded-duration-plus-0.4-second contract passed for all 19 clips. The smaller observed 0.36-second runtime tail on Giza's last chapter includes startup/scheduling overhead and uses the film input's 0.001 resolution, equivalent to 0.06 seconds. It is a narrow margin worth preserving in later edits, but the clip ended naturally in both runs.

For every film at both sizes, separate UI checks verified:

- Starting inside a chapter seeks the matching voice to elapsed film time.
- Pause freezes film time and stops active narration.
- Resume continues at elapsed time rather than restarting the sentence.
- Narration off stops the voice while the film keeps moving.
- Turning narration back on resumes the active chapter at its elapsed time.
- Seeking forward inside another chapter replaces the old clip with the correct new clip at the corresponding offset.
- Seeking outside chapter windows leaves narration silent.

All six scene/viewport combinations recorded **zero page errors, console errors, narration network failures, media errors, or rejected play promises**. All 19 production MP3 HTTP responses matched both expected byte count and SHA-256. This validates the served files, not only files on disk.

## Revised Stonehenge ending

The production caption is now: “The axis marks midsummer sunrise and midwinter sunset.” Both [desktop](desktop-stonehenge-axis.png) and [portrait](mobile-stonehenge-axis.png) screenshots were captured through the film-position control at t=.855 and visually inspected.

Desktop caption bounds: x952, y578, width448, height92. Portrait bounds: x20, y211, width350, height104.7. The shortened portrait body fits in two lines below the Sun and above the stone circle. Neither viewport's caption covers the solar disc or the monument. This preserves the Sep20 target-specific portrait placement fix.

## Local listening page

The separate [19-player listening page](http://127.0.0.1:5589/artifacts/chapters-history-2026-09-21/listen.html) loaded all 19 final MP3 URLs and their matching decoded durations at both sizes. Every player had an accessible label, fit horizontally inside the viewport, and the page had no horizontal overflow.

The initial desktop pass found a missing `/favicon.ico` request. Root added the existing SVG favicon; the final repeat then recorded **zero console/page/network errors on both sizes**. Initial and retry evidence remain preserved. No narration asset failed in any listening-page pass. Listening-page players were checked for metadata/layout; full playback was verified in the actual film runs above.

- Final listening-page data: [listen-page-results-final.json](listen-page-results-final.json)
- Captures: [desktop](desktop-listen-page-final.png), [portrait](mobile-listen-page-final.png)

## Evidence and reproduction

- Main script: [review.mjs](review.mjs)
- Complete asset, event, transport and viewport evidence: [results.json](results.json)
- Listening-page script: [listen-page.mjs](listen-page.mjs)
- Source snapshot SHA-256: `7266c80487c7f9f6273f02eca2fc2052e1e3b386524f5733e542a63024c330df`
- Final manifest SHA-256: `abb680ad8097e85f0b9bd77b4e0c17f701d6caaff95e389323be4df63728136e`

Run from the project root after the matching preview is available:

```sh
node artifacts/chapters-history-2026-09-21/browser/review.mjs
node artifacts/chapters-history-2026-09-21/browser/listen-page.mjs final
```

No application source, generated audio, tests, or other agents' reports were changed by this reviewer. The run made no voice-generation API calls and did not read secret environment files. Loudness mastering and the full repository test suite are root-owned evidence; this report makes no independent auditory-quality claim.
