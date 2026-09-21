# Stonehenge repair and public release — 2026-09-21

The owner authorized the camera repair, Cloudflare deployment, and a 20-second
four-film montage with draft Twitter text. No Twitter post or GitHub push was
made. GitHub still reports `Astralea/wonderforge` as PRIVATE.

## Repair and local verification

Stonehenge's full Sun disc now clears the desktop letterbox. A 2.3° camera
pitch correction eases in during the existing approach; solar direction,
solstice axis, camera distance, construction, and portrait composition are
preserved. The camera specification and regression tests were updated first.

- Full suite: 242 files / 1,302 tests pass, two workers, 205.07 seconds.
- Typecheck, production build, and `git diff --check` pass.
- The new tests check the complete solar rim over 221 closing samples and nine
  aspect ratios, complete rendered stone envelopes, and camera continuity.
- Eighteen final production-browser captures cover five viewport sizes. The
  exact bundle is `main-BR6Phg3M.js`; no browser errors were observed.
- At 1920×1080, the Sun clears the top bar by 21.10 pixels at t=.78 and
  52.95 pixels at t=1. Minimum extra clearance is 1.95vh, above the 1.5vh
  requirement. Portrait's accepted composition is preserved.

See [framing report](framing/REPORT.md), [full test log](tests-full.log),
[build log](build.log), and [source hashes](verification-summary.json).

## Deployment

- Public site: https://wonderforge.pages.dev/
- Production deployment: `72a758be-1b8c-4c2a-a875-3373786bb6db`.
- Immutable deployment URL: https://72a758be.wonderforge.pages.dev/
- Existing production branch: `wonders/quality-colosseum-stonehenge-petra`.
- Direct upload of the checked `dist/`, with `--commit-dirty=true`.
  The listed Git source `84f1767` is the base commit, not a claim that all
  deployed workspace changes have been committed. Existing dirty work remains.
- Distribution scan: 145 files, 117,701,860 bytes; no configured credentials,
  sensitive pattern hits, source maps, private source directories, or symlinks.
  All assets are under Cloudflare's direct-upload size/count limits.
- Stable public URL serves bytes identical to the local production bundle.
- All 19 selected historical narration assets match their recorded SHA-256
  and byte lengths and have audio content types: Charles/Giza, Oliver/Stonehenge,
  Andrea Williams/Colosseum.
- Public OG/Twitter metadata, social-image bytes, sample model bytes, immutable
  hashed-JS caching, revalidation for audio/models/brand, and `nosniff` pass.

See [deployment log](deployment/deploy.log),
[production listing](deployment/after.json),
[public HTTP verification](deployment/public-verification.json),
[distribution inventory](deployment/dist-inventory.json), and
[repository visibility](deployment/repository-visibility.json).

## Scope and limits

This fixes the small framing blocker identified by the preceding release
review. Other documented art polish remains: the broad Colosseum worksite,
Giza haze/ramp material, dense Eiffel closeups, and the large Eiffel download.
The earlier full-film review remains in
`artifacts/review-board/release-2026-09-21/RELEASE-REVIEW.md`.
The formal full Spec04 art gate, physical-phone performance, X embedded-browser
behavior, and subjective listening are not certified by these checks.
Browser screenshots use desktop GPU rendering at emulated viewport sizes.

## Public browser checks

All eight film/viewport runs pass on the exact deployed bundle: four films on
1440×900 desktop and 390×844 portrait. Normal gallery launches, ready renders,
pause/play, pointer seeking, endpoint reverse seeking, chapters and return home
pass. All 19 selected historical narration URLs were requested at each size;
first-chapter media decoding and progression match the intended captions and
accepted durations. Zero browser, asset, or media errors were recorded.
The deployed Stonehenge final Sun is fully visible at both viewport sizes.
See the [public browser report](public-qa/REPORT.md). The earlier attempt's
desktop chapter-toggle selector mistake was corrected in the harness and is
preserved separately; no application change was needed.

## Montage and post text

The [20-second MP4](social/take-01/export/wonderforge-four-films-20s.mp4) was
captured after deployment from the verified public bundle, using the app's
existing deterministic scene route and original renderer. Six hundred original
PNG frames and their hashes are preserved. It presents 5 seconds each of Giza
(film 27–32 s), Eiffel (18–23 s), Colosseum (54–59 s) and Stonehenge (55–60 s), with small
labels and a final WonderForge/public-link label.

The soundtrack is the existing Stonehenge instrumental 40–60 s excerpt, with
0.6 s fade-in and 0.9 s fade-out. It contains no narration. Encoded audio measures
−16.77 LUFS / −4.95 dBTP; these are measurements, not a subjective listening review.

Verified export: exactly 20.000 s, 600 frames, 1920×1080, 30 fps, H264/yuv420p,
AAC stereo 48 kHz, 18,285,094 bytes, faststart. See [technical validation](social/take-01/export/validation.json)
and [thumbnail](social/take-01/export/wonderforge-thumbnail.jpg).

The first, middle and last frame of each shot were visually inspected in the
[contact sheet](social/contact-sheet.jpg). Subjects and labels are clear, with
the full Sun preserved and the final URL clear of the monument. Chromium played
the final MP4 to its natural end at 20 seconds: 600 decoded frames, zero dropped
or corrupted frames, AAC decoded, and zero media/browser errors. See the
[montage report](social/REPORT.md). The convenient
[download copy](social/wonderforge-four-films-20s.mp4) is byte-identical to the
validated export; final SHA-256 is
`403ee7f1df242a0b9d83104feb19ed34b9cd1bdebc7d2123056fd029c1339e47`.

The tweet is a draft in [TWITTER-POST.txt](TWITTER-POST.txt), 278 characters including
the literal URL; it has not been sent.
