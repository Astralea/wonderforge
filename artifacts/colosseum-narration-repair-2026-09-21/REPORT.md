# Colosseum narration correction — 2026-09-21

The owner rejected “After sunset, a nearly full Moon rises over Rome.” Narration must explain the monument's construction. The earlier assistant chapter rewrite introduced this sky-only beat, and its review checked factual consistency without enforcing relevance. `artifacts/chapters-history-2026-09-20/review/COLOSSEUM-PRIMARY-SOURCE-CHECK.md` explicitly calls itself a supplement to root's seven-chapter rewrite. There is no evidence for attributing that editorial choice to the voice provider or an individual human author.

## Revised construction story

There are now **six Colosseum chapters**: site, travertine, lifting, vaults, seating structure, and the construction/inauguration milestone. The first four lines and recordings are unchanged. The sky-only chapter and its runtime voice binding are removed; the Moon rendering and construction animation are preserved. [All final scripts and audio links](CHAPTER-SCRIPTS.md).

| Chapter | Spoken text | Window | Encoded duration |
| --- | --- | --- | --- |
| Supporting the seating | Vaulted passages support the tiers of seating. | 35.1–41.1 s | 3.250794 s |
| From Vespasian to Titus | Construction began under Vespasian. Titus opened the amphitheatre in AD 80. | 48.3–56.4 s | 6.176508 s |

The final milestone starts after modeled construction finishes at 48 seconds. It leaves 1.923492 seconds inside its chapter after the recorded line, then a quiet final hold from 56.4 seconds. A beginning under Vespasian and opening under Titus are distinguished from later building work; the sentence does not claim that all Domitianic additions existed at the inauguration.

[Official Rome history](https://www.turismoroma.it/en/node/1155) and the Park's epigraphy/account of the inaugural inscription support the closing chronology. The Ministry of Culture's [archaeological vocabulary, printed page 49](https://iccd.cultura.gov.it/getFile.php?id=9028) explains the masonry/vault structure and passages beneath an amphitheatre's seating. Sources, preserved PDFs/text and the review of all seven original lines are in [the historian/editor report](review/HISTORIAN-EDITOR-REVIEW.md). The shorter final seating sentence uses only the supported structural claim.

## Voice, preservation and rules

Both changed lines were generated through the existing approved ElevenLabs pipeline with **Andrea Williams**, voice ID `dcWyhLms5IOM9o93xsQu`, Multilingual v2, speed 0.92. Only these two text requests were newly synthesized; 16 other current historical recordings retain their exact hashes. The retired Moonrise recording and all prior takes remain archived. Current historical bindings total 18, with no Moonrise binding.

The seating take measures −16.19 LUFS / −2.35 dBTP; the closing take −16.06 LUFS / −2.38 dBTP. The existing measured mastering recipe preserves speed and pitch. Source snapshots, manifest and metadata are copied to `narration/`; `before/` preserves the old captions, binding file and mutable generation snapshots. Original and new raw takes remain under the established generator artifact directory, using distinct content-addressed names. The existing music-only 20-second montage does not require a new export for this narration change.

Specs 12, 49 and 50 now require construction relevance as well as historical accuracy. Siting, design, materials, methods, structural function and construction milestones qualify. A weather or celestial change alone does not; documented Stonehenge alignment remains relevant to its design. No chapter count is prescribed. Tests now check the final construction milestone after work completion, no retired Moonrise voice binding, the un-narrated final hold, and complete caption/audio correspondence without a fixed total-recording quota.

## Verification and release

**245 files / 1,313 tests pass**, two workers, 214.80 seconds. The preceding focused run passed 31 tests, including actual MP3 duration, hash and loudness measurements. Typecheck, production build and `git diff --check` pass. Build retains the existing large-chunk advisory.

Actual desktop and portrait browser review passes all 12 natural clip plays, six served Colosseum hashes, six chapter entries, captions, pause/resume, reverse/completed seeking, replay and quiet final-hold checks. The final caption is absent at .8, present at .81–.935, absent at .945/1; the Moon and monument remain clear. No retired Moonrise audio request/play or narration invocation after .94 occurs. Zero unexpected browser/network/media/rejected-play errors. Early harness attempts used the wrong accessible labels for Replay and an already-expanded Chapters panel; these artifact-only selector errors were corrected and their logs retained. [Browser report](browser/REPORT.md).

Production deployment **`76d1ae23-24fc-444a-88bb-56192c80df08`** serves `main-DI8gduTV.js` at https://wonderforge.pages.dev/; immutable URL https://76d1ae23.wonderforge.pages.dev/. Root verified byte-exact public bundle and all 18 current historical narration files. The retired Moonrise title/body are absent from the public bundle; both new construction bodies are present. NASA texture bytes/credit, social metadata/image and a sample model remain valid. `deployment/public-verification.json` records the exact HTTP evidence.

Post-deployment browser spotchecks also pass: both changed recordings play to natural ends on desktop and portrait (4/4 plays), exact public asset hashes match, six chapter entries remain, and the continuous closing/quiet-hold checks produce no stale Moonrise or late narration. `browser/public/results.json` records zero failures and media/browser errors.

Direct upload used the existing production branch from the dirty workspace. No Git commit, push, repository-visibility change or social post was made. This is host-browser functional/media verification; it does not claim physical-phone performance or a new subjective listening assessment. The music-only montage remains `artifacts/colosseum-moon-surface-2026-09-21/social/wonderforge-four-films-20s-moon-v2.mp4`.
