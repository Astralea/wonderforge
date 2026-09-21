# Colosseum narration repair — browser acceptance

Status: **accepted candidate**, 2026-09-21. Read-only frontend review under `.factory/droids/frontend-experience-engineer.md`. Application, specs and audio were not edited by this reviewer. Public post-deployment spotchecks also pass; see `public/REPORT.md`.

## Findings

No application findings in the scoped narration, chapter, closing composition and transport checks.

The first attempt had two harness selector mistakes: exact `Replay` instead of the app's `Replay film` (`src/ui/TransportBar.tsx:92`), and exact `Chapters` after the portrait menu changed to `Close chapters` (`src/ui/CaptionBeatIndex.tsx:84`). Original logs/results/captures are preserved under `first-attempt/`. The corrected harness completed both viewports with zero failures. No source fix was needed.

## Verified candidate and method

- Production preview: `http://127.0.0.1:5590/#/wonder/colosseum`.
- Bundle: `main-DI8gduTV.js`, 2,369,355 bytes, SHA-256 `1767da5deecd45147c6419f147e3c6e1b4bbd11cba0fe1203b17cdc5bf42c605`.
- Playwright Chromium, actual Metal GPU: `ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Ultra, Unspecified Version)`.
- Desktop 1440×900 and portrait 390×844, device scale 1. These are host-browser viewports, not physical-phone tests.
- Every chapter was launched through its actual chapter button and allowed to play to the HTMLMediaElement `ended` event. A separate continuous `.78–1` closing run checked the construction milestone and final quiet hold. This was not a new continuous 60-second film recording.
- Browser process output was muted. The checks cover decode, runtime selection, media transport and visible layout, not subjective sound quality or acoustic speaker identification.
- `results.json` includes source-snapshot and manifest hashes, all served audio hashes, UI text, media events, caption bounds and errors. `play-events.json`, `errors.json`, `bundle.json` and the exact served bundle are separate supporting files.

## Six construction chapters and narration

Both menus contain exactly six entries, each with its current title/body, and all six buttons successfully start their corresponding chapter. The new titles are **Supporting the seating** and **From Vespasian to Titus**. No Moonrise chapter is present.

Current captions are in `src/data/captions.ts:183` through the final body at `src/data/captions.ts:228`. The actual seating body reads “Vaulted passages support the tiers of seating.” The closing body reads “Construction began under Vespasian. Titus opened the amphitheatre in AD 80.” All six live captions matched the source snapshot verbatim.

All six served MP3 hashes and byte counts match `../narration/manifest.json`. All six manifest bindings agree with Andrea Williams, voice ID `dcWyhLms5IOM9o93xsQu`, ElevenLabs Multilingual v2, speed 0.92. These are provenance/asset checks, not an auditory voice-identification claim.

All 12 desktop/portrait clip plays produced `playing` and natural `ended` events before the chapter's end; decoded durations agree with metadata. No clip was replaced by another narration during its tested window.

| Chapter | Encoded duration, s | Desktop tail, s | Portrait tail, s |
| --- | ---: | ---: | ---: |
| `colosseum-valley` | 4.504671 | 1.98 | 1.98 |
| `colosseum-stone` | 4.458231 | 1.38 | 1.44 |
| `colosseum-cranes` | 5.247710 | 1.26 | 1.26 |
| `colosseum-vaults` | 4.040272 | 1.86 | 1.86 |
| `colosseum-seating` | 3.250794 | 2.58 | 2.64 |
| `colosseum-titus` | 6.176508 | 1.80 | 1.74 |

The observed tail is film time remaining at the browser's natural `ended` event, with slider quantization and runtime scheduling. The separate encoded margin requirement is pinned by the manifest/source windows.

## Closing composition and quiet hold

The closing chapter is absent at `.8`, present at `.81`, `.9`, `.935`, and absent at `.945` and `1`, matching its authored `.805–.94` window after work ends at `.8` (Specs 12/50). Only the current closing MP3 starts in the continuous closing run, ends near `.909–.91`, and no narration `play()` invocation occurs during `.94–1`. All narration is inactive at completion. Each viewport requests only the six selected narration assets; there are no stale Moonrise asset requests or plays.

Visual inspection passes on both sizes. At `.9`, the desktop closing caption uses 18 px text with 29.25 px line height, in a 448×92 px box at (952,578), below the main monument silhouette and far from the Moon. Portrait uses 16 px text with 26 px line height, in a 350×130.69 px box at (20,62.625), above the Moon and monument. The full line wraps cleanly and stays inside the viewport. Fade-in/out near the window edges is expected; the middle of the window is fully readable. The textured, circular Moon is visible at `.9`, `.935`, `.945` and completion, with no caption overlap. The completed amphitheatre stays visible.

Representative evidence:

- `desktop-chapters.png`, `mobile-chapters.png`: all six entries.
- `desktop-closing-0_9.png`, `mobile-closing-0_9.png`: full-opacity closing line with Moon and monument.
- `desktop-closing-0_81.png`, `mobile-closing-0_81.png`: caption after work ends.
- `desktop-closing-0_935.png`, `mobile-closing-0_935.png`: late caption fade and rising Moon remain separate.
- `desktop-closing-0_945.png`, `mobile-closing-0_945.png`: caption-free quiet hold.
- `desktop-completed.png`, `mobile-completed.png`: completed view and unobscured Moon.

## Transport and errors

Pause freezes film time and narration. Resume restores elapsed narration position. Turning narration off silences the voice while the film continues; turning it on resumes the matching chapter. Forward seeking replaces the old clip with the appropriate asset at elapsed time; seeking outside chapters is silent. Natural completion exposes **Replay film**. Reverse seeking from completion stays paused, and pressing Play resumes the closing clip at its correct elapsed offset. Both viewport runs pass these checks.

Zero page/console errors, narration network errors, media errors or rejected `play()` calls occurred. `run.log` ends with `assetCount: 6`, `clipViewportRuns: 12`, `failures: []`.

Verdict: the candidate repairs the construction narration without adding a replacement sky-only chapter. All six chapters are reachable, the new lines are bound to the delivered selected-voice assets, and the ending retains an unobstructed, unnarrated atmospheric hold.

## Public verification

Stable `https://wonderforge.pages.dev/` serves the identical accepted bundle. Both changed clips naturally end in desktop and portrait (4/4 plays), with exact audio hashes, correct captions, six chapter entries, no stale Moonrise binding/request, and no narration start in the `.94–1` hold. Public screenshot inspection passes. See `public/REPORT.md` for the scoped post-deployment evidence and limits.
