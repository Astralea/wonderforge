# Colosseum astronomical day and evening — 2026-09-20

The owner corrected the earlier Stonehenge-inspired centered-Sun ending. The
Colosseum now has its own sunrise → construction daylight → sunset → descending
waxing crescent → night sequence. This supersedes the previous 4.8° solar hold.
The city/housing/aqueduct assets from the previous passes are preserved.

## Astronomical model and honest presentation limits

- Observer: amphitheatre, 41.8902° N, 12.4922° E, elevation25m.
- Representative Julian AD80-Jun10,03:00–22:15 UT1. This is an authored clear day,
  not a claim about the dedication date, weather or ancient civil time.
- Public JPL Horizons DE441 apparent AIRLESS topocentric positions and ranges,
  sampled every5minutes and normalized during interpolation. Offline only at
  runtime. Raw responses, hashes and reproduction command are in `ephemeris/`.
- Sun and Moon share one monotone C1 clock. The Moon-to-Sun range vector gives
  its illuminated area and bright-limb orientation. No opposing-Moon shortcut,
  fake monthly phase cycle, screen-space crescent flip or above-horizon hold.
- 191 separately requested off-grid samples give maximum direction discrepancies
  of0.001235° Sun/0.000754° Moon against that same JPL model. This is interpolation
  validation, not equivalent absolute historical accuracy: ancient Earth
  rotation is estimated. Refraction/weather and exact local terrain are outside
  the model. The stylized scene terrain can occult a body before a flat-horizon set.
- Both discs use the same disclosed2.4× angular presentation scale. Positions,
  phase and physical horizon visibility remain ephemeris-derived. Night fill,
  apparent brightness, clouds and simplified lunar albedo are authored; this is
  neither a lux simulation nor a lunar surface/libration reconstruction.
- Moonrise is correctly calculated during daylight but outside this camera arc.
  Sunrise, sunset and late lunar descent are framed on desktop and portrait.

Primary references: [Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html),
[Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html).

## Renderer and physical integration

The geographic authoring frame remains east/up/north. A single content-root Z
reflection and matching camera/light transformation produce a right-handed
east/up/south renderer frame, preventing the entire sky from being mirrored.
City instance culling now applies each mesh's world matrix. Pure construction
coordinates and structural transforms remain unchanged.

The existing528-triangle sky dome draws both bodies with no new textures or
geometry. The Moon is a lit sphere, and its radiance is added behind the local
atmosphere rather than punching out a dark circle. Solar halo crosses the
horizon smoothly; the physical disc is clipped. The Colosseum disables the
sampled lens streak that duplicated its small Sun disc; other scenes retain
their prior default.

One existing directional shadow caster is reused: real Sun by day, real Moon
after sunset. Solar shafts/grade always follow the real Sun and turn off when
it is below the horizon. Twilight/night colors and fog follow solar altitude.
Night fill is deliberately adapted for architectural readability. The long
portrait foreground stays inside the shadow-depth volume, with small
world-space receiver offsets under grazing light.

The lower camera exposed two earlier construction defects that are repaired
as part of visual acceptance: torso-only worker shadows detached from their
feet under a low Sun, and late climbers used the global scaffold envelope
instead of their own station's retained timber. Focused regressions cover both.

## Verification

Final production bundle: `main-4VdPjiiz.js`, served by the existing local preview
at http://127.0.0.1:5590/#/wonder/colosseum (development5589 remains running).

- `npm run test -- --maxWorkers=2`:238files/1,278tests pass in215.94s
  (`test-final.log`). Final affected render/support tests also pass35/35
  (`final-focused.log`).
- `npm run typecheck`, `npm run build`, `git diff --check`:pass. Build retains
  the existing large-chunk and browser externalization warnings; see
  `build-final.log`.
- CPU geometry sweep:3,601times ×7aspects, including16:9,1.6,390×844,320×844,
  375×667,0.6 and0.71. Maximum174,030desktop/118,631portrait submitted triangles,
  including conventional shadow submission, below180k/120k. The phone4-step
  cavea tier preserves every band's exact extent and all city lots. Earlier
  6-step short-phone sweeps reached122,423; this is repaired, not waived.
  Evidence:`review/camera-budget-sweep.json`, `review/phone-budget-sweep.json`.
- Fourteen final production captures at1440×900 and390×844 cover dawn,
  sunrise, daytime construction, sunset, Moon descent, low Moon and after-set.
  All confirm the exact final JS bundle, real Apple M2 Ultra Metal renderer
  and zero console/page errors. Capture peaks143,790desktop/93,010portrait.
- Actual UI forward/reverse seeks preserve the canvas and deterministic sky;
  continuous last-quarter playback has57desktop/58portrait samples with
  monotone Julian-day clock, peaks163,373/109,419triangles, and zero errors.
  Replay returns to the beginning; returning home has no loader or overflow.
  `production/live-review.json` and actual UI screenshots preserve this evidence.
- The ephemeris is validated against191 separate off-grid Horizons samples;
  the calendar/date parsing, phase geometry, physical rise/set, continuous
  clock, world reflection/culling, Sun/Moon key split, crew foot shadows and
  late scaffold support have dedicated regressions.

Mobile is browser emulation on the stated GPU, not physical handset/FPS evidence.
Independent final visual review accepts the scoped change with no remaining blocker: [review/FINAL-VISUAL-REVIEW.md](review/FINAL-VISUAL-REVIEW.md). It inspected all14 production and four actual-UI frames.
Intermediate `dev/`, `review/`, `review-light/` and `production-v1/` captures are
preserved, including rejected shadow/contact artifacts. They are not the final
acceptance set.

Existing broader art limitations remain: broad simplified floor/road ends,
repeated pine silhouettes and simple wall materials. This pass does not claim
AAA completion, physical-phone performance or an exact archaeological model.
No commit, push, publication, deployment or visibility change was performed.
