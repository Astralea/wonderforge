# Eiffel film verification — 2026-09-12

Accepted local bundle: `main-CarPen2B.js`, served at
https://wonderforge.localhost/#/wonder/eiffel-tower. The accepted evidence is
`verified-desktop/` and `verified-mobile/`: **138 actual browser screenshots**,
69 per profile, including dense approach and withdrawal samples. All report
assets ready and the expected bundle. Every image was inspected through the
12 contact sheets, with full-size joint and receiver views inspected during
the same camera/UI revision. Earlier `before-*`, `after-*` and `final-*`
directories remain historical candidates; `final-*` is not the accepted set.

## Verification result

| Profile | Viewport | Peak calls | Peak triangles | Limits | Violations |
| --- | --- | ---: | ---: | --- | ---: |
| Desktop | 1280 × 720 | 170 | 363,918 | 200 calls / 450,000 triangles | 0 / 69 |
| Mobile | 390 × 844 | 140 | 293,652 | 150 calls / 300,000 triangles | 0 / 69 |

The previous mobile overrun at actual 120.06 s is now 122 calls / 267,337
triangles. Added mobile approach samples at 119.88, 120.24 and 120.42 s are
277,146, 281,025 and 237,770 triangles. Added withdrawal samples at 131.04,
131.94 and 133.02 s are 122,958, 178,996 and 223,064. The supported payload and
major rig remain visible in these images. These are sampled rendering counters,
not a claim of continuous frame rate or a bound over every possible frame.

The completed `tests-accepted-corrected.log` reports **202 files / 1,068 tests
passed**. `typecheck-accepted.log` passes; `build-accepted.log` builds the stated
bundle. The build retains its large-chunk warning. Earlier test runs and their
corrected obsolete time/distance expectations remain in the evidence history.

## Construction order and viewing experience

The short edit remains 180 seconds. The source clock is monotone, and the
construction geometry, attachment schedule and transported poses retain their
source ordering. The dense 1,801-sample audit finds no production/source reversal
or seated-ID removal after the exact insertion-endpoint correction. Both
accepted 69-frame source mappings also have no seated-height or part-count drop.
The former four-part disappearance at precisely 50 s is covered by the endpoint
regression; screenshots alone would be too sparse to prove that correction.

The tower's 50–280 m seated rise now occupies 25.3 viewer seconds instead of
4.8. Actual 82–112 s captures show the progression through the lower pylons,
platforms and upper shaft. The nearly full-height plateau falls from 60.3 to
38.1 seconds on the dense grid. Platform relay and internal work still take
place during that interval; their activity must not be mistaken for continuing
height growth. The film remains an authored montage, not an exhaustive account
of every preparation task or a historical reconstruction of every lift.

The 64–74 s joint lens enlarges the worker, splice and bearing deck by about
1.66× without changing the eye position or physical poses. The new caption
placement leaves the hands/contact readable on desktop and mobile. Some orange
iron at hand level is the actual joint being worked; an upper member still
passes near the hat and the crane silhouette remains dense behind it. This is
a demonstrated legibility improvement, not complete removal of occlusion.

The 122–130 s handoff shows the rig, suspended member, deck worker and receiver
bed together. Mobile captions sit above the load, and lowered controls expose
the support bed during the spoken cue. The added withdrawal frames retain the
supported operation as the view opens. Existing narration files are preserved;
caption/voice scheduling follows the same revised viewer clock.

Roof glazing and ridge details are visible, with warm walls and darker roofs.
Broad reflections remain restrained. Combined renders do not isolate the
contribution of roof geometry, retained material values and the reflection bake.
Workers still have simple blocky anatomy; close shots expose simple hands and
tools. City rows remain repetitive, and the joint background is still busy.

## Evidence and reproduction

- `verified-{desktop,mobile}/frames.json`: actual viewer time, viewport, assets,
  bundle URL, renderer counters, screenshot file and source-derived chapter,
  production time, seated count/height, transported IDs and camera shot.
- `verified-summary.json`, `verified-source-hashes.json`: numeric summary and
  hashes linking the mapping source and accepted bundle.
- `verified-{desktop,mobile}/contact-1.jpg` through `contact-6.jpg`: all images.
- Joint detail: `verified-desktop/frame-22-s68.00.png` and matching mobile image.
  Receiver detail: `verified-mobile/frame-49-s126.00.png` and matching desktop.
- `edit-chronology-before.json`, `edit-chronology-after.json` and
  `edit-chronology-report.md`: dense before/after ordering and height evidence.
- `joint-framing-report.md`: rejected camera angles and numerical clearance
  tests. Final pixels above supersede its earlier candidate-only status.

Metadata is deliberately labelled source-derived: the mapped camera/part data
is calculated by the pure engine, not read back from a live renderer camera.
Reproduce enrichment with `./node_modules/.bin/vite-node
artifacts/eiffel-modeling-2026-09-12/enrich-verified-frames.ts desktop verified
main-CarPen2B.js 69` (replace desktop with mobile). Generate sheets with the
bundled Python and `contact-sheets-verified.py desktop verified`.

Paused captures do not validate every intermediate pose, continuous FPS,
fine-lattice shimmer, or all historical details. Earlier anonymous `jw` and
extension-context console errors were recorded separately from app rendering;
this report does not assert an error-free continuous console run or visual
parity with the external reference scene. No source or spec files were changed
during this final metadata and image review.
