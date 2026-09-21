# Historical chapter and narration revision

2026-09-20. Local implementation; no commit, push, publication or deployment.

## Result and outstanding work

All chapter text and timing is rewritten: **Giza six, Stonehenge six, Colosseum seven**.
These counts follow distinct subjects and visible construction, not a new quota.
The inherited 3–7 documentation cap and universal opening/ending/gap assumptions
were removed. Read [the complete scripts](CHAPTER-SCRIPTS.md) and their linked
primary/official source audits. Giza now names the three successive royal projects;
Stonehenge's bluestone chapter follows the actual later transport, and the catalog
no longer implies every bluestone came from Preseli. Colosseum runs from the
former lake site to its Roman seating hierarchy, inauguration and evening Moon.

**Narration is incomplete: 2 of 19 new clips generated.** ElevenLabs rejected
further requests because the existing key had only 37 credits remaining under
its 20,000-credit limit. The owner was asked to increase its allowance by about
2,000 credits. No alternate provider or account was used. New Giza haul and ramp
clips are bound; the other 17 chapters stay silent. Previous audio is preserved
on disk, but changed sentences never play an obsolete spoken line.

## Pipeline and verification

- `scripts/generate-historical-narration.py` exports actual typed chapter data,
  speaks only the body, preserves George/Daniel/Bill, caches content-addressed
  raw takes, normalizes the MP3 and measures its real duration. It writes only
  matching, fitted takes to `historicalNarration.generated.ts`. Errors preserve
  successful takes and report missing clips; the main legacy generator delegates
  these three films to this path instead of retaining duplicated obsolete copy.
- Every clip must finish with at least 0.4 seconds to spare. New Giza haul is
  4.598 seconds and ramp narration is 3.483 seconds, each in a 7.2-second window.
  Decoded ffprobe duration, byte count and SHA256 match metadata.
- Actual Chromium/Apple M2 Ultra browser tests verified both clips decode, play,
  pause, resume at elapsed film time and reach `ended` in desktop and mobile
  viewports. Output was muted; this is not an auditory quality signoff.
  Evidence: `browser/audio/report.json`.
- Chapter menus support any count with bounded scrolling, including mobile
  disclosure and navigation to every chapter. Opening title yields at the first
  chapter; final quotation waits until the last chapter ends. Full mobile quote
  remains in About, with name-only film ending under the existing design.
- Browser review captured all 19 chapters on desktop and mobile (38 chapters
  and 38 real menu selections). The portrait Stonehenge axis caption initially
  covered the Sun; its target-specific portrait placement now sits below it.
  Follow-up captures cover .80/.855/.91 on 390×844, 320×844 and 375×667.
  Evidence and detailed scope: [visual QA report](browser/visual/VISUAL-QA.md).
- Final application bundle: `main-CmV5abji.js`, local production preview5590.
  `npm run typecheck`, `npm run build` and `git diff --check` pass.
- Full suite with `npm run test -- --maxWorkers=2`: **1,291 pass, 6 fail**
  across241 files. Every failure is an existing full-narration contract exposing
  missing audio: four in `narration.test.ts`, the Colosseum opening voice binding
  in `colosseum-world.test.ts`, and Stonehenge Daniel playback in `ui.test.tsx`.
  These were retained rather than weakened. The default highly parallel run
  additionally hit unrelated heavy Eiffel/Paris timeouts; all those pass with
  two workers. Logs are retained alongside this report.

## Colosseum daylight and moonrise

The shared astronomical clock now uses Julian AD80-Jun21,04:00–20:09UT1.
All masonry, equipment removal and crew work completes by film .8 while the Sun
is still above the horizon. The final12seconds show the finished structure.
Sun centre sunset is about18:39:40UT1; Moon centre rise is19:02:06,22m26s later.
This is a chosen astronomical reconstruction, not an inauguration-night claim.
The final Moon is waning gibbous,99.09% illuminated,10.23° high and still rising.

The camera makes a gentle southwest→west→northwest arc, settling to view bearing
121.61° and4° downward pitch. Its geographic bearing stays fixed during the rise;
the Moon moves according to the ephemeris. Full Moon-disc/header clearance was
checked in the actual UI. Both Sun/Moon retain the same2.4× angular presentation
scale from the prior pass. No day/night workers continue during the evening hold.

26 focused astronomy/workday/light tests pass; camera/culling tests pass. The
3,601-frame×7-aspect mapped-work sweep peaks at149,429desktop/107,242portrait
triangles, within180k/120k budgets. Production continuous .76→1 playback collected
58samples per viewport, with zero errors; reverse seek, replay, stable canvas
and returning to the loader-free home all passed. This is browser GPU evidence,
not a physical-phone or frame-time benchmark. Details and sources:
`../colosseum-moonrise-2026-09-20/review/FINAL-CAMERA-REVIEW.md`,
`../colosseum-moonrise-2026-09-20/ephemeris/README.md`, and
`../colosseum-moonrise-2026-09-20/production/live-review.json`.

## Continue when the allowance is available

Use Node24 in PATH, then run:

```sh
python3 scripts/generate-historical-narration.py
npm run test -- --maxWorkers=2
npm run typecheck
npm run build
```

The generator resumes existing verified takes. If a newly measured line exceeds
its window, shorten that sentence or adjust a historically/visually justified
window, regenerate only affected clips and keep the quiet ending. Complete all
19 clip bindings, then extend browser audio playback checks to every new take.
Update the script/status report after synthesis and final verification; do not
claim the narration or release is complete while those contracts still fail.
