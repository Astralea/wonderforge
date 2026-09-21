# Connected Caelian context and authoring pipeline — 2026-09-20

The owner rejected the aqueduct as a lonely background object and asked to
inspect/update the existing pipeline, then apply it to the scene. This pass
repairs those relationships locally. No deployment, push or visibility change.

## Pipeline finding and repair

Spec 07 already required world-inward authoring and forbade disconnected props.
Specs 10–14 referenced `.agents/skills/wonderforge-scene-builder/`, absent in
the current checkout and available user skill roots. The surviving procedure
was scattered across Specs 03/04/07/08/12 and Blender scripts. This pass does
not claim to recover the missing original skill verbatim.

Spec 49 is now the maintained entry: historical evidence/compass → connected
context plan → whole-scene blockout → original Blender kit/manifest → pure
engine + Three.js delivery → physical/budget checks → full-film review.
AGENTS and the broken scene-spec links now point to it. Context must precede
asset detail: every prominent utility needs a source/recipient or explicitly
off-scene continuation, access corridors, shared footprint exclusions and
whole-scene evidence. Studio asset approval cannot approve a scene by itself.

## Scene changes

- Kept the original 28-pier Neronian Blender kit and courtyard/roof kit.
  Relocated the western endpoint to the Claudian precinct's eastern retaining
  wall, with a continuous covered entry at the same grade.
- Added a compressed precinct: grounded retaining masonry, north approach and
  stairs, open court, U-portico and schematic temple mass. Maximum height43.06m
  stays below the48m amphitheatre. Stair footprint flares from the street and
  has <=0.20m risers; every tread clears the actual terrain.
- Added37 aligned, smaller courtyard fronts along adjoining streets, replacing
  part of the anonymous valley scatter. Buildings and vegetation clear the
  full utility/road/precinct footprints, including actual imported roof extents.
  New houses have level masonry foundations extending to their rotated corners.
- Corrected Aventine to southwest, Quirinal/Viminal north; added nearer Velia
  and Oppian relief. The original flat working floor inside140m is preserved.
- Added a one-draw,2,766-triangle distant continuation with230 coarse bays,
  real arch openings, terrain-supported piers and continuous grade. A short
  extension still exposed its endpoint; the final boundary is outside frame
  or past fog at101 samples for each of four aspect ratios, including320×844.
- All new context is static from opening, deterministic and shadow-free.
  Arrival, audio, catalogue availability, monument construction and UI timing
  remain unchanged. See the separate Eiffel icon report for the concurrent
  owner-requested summit correction.

## Evidence and historical limits

Official Rome describes the Temple of Claudius on western Caelian, a northward
front and a large platform whose eastern Neronian nymphaeum connected to the
Neronian arches. Frontinus identifies their end beside the temple.
[Official Rome](https://www.turismoroma.it/en/node/1137),
[Capitoline archaeology](https://www.sovraintendenzaroma.it/content/acquedotto-neroniano),
[Frontinus20](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Frontinus/De_Aquis/Rodgers/1%2A%2A.html#20).

The118×88m precinct compresses the reported180×200m platform. The exact plots,
stair/elevation, schematic six-column temple and long straight distant route
are authored interpretation. No precise AD80 restoration state, source-site
location, operating Neronian fountain, direct Colosseum water supply or later
Domitianic Palatine bridge is asserted. This is a stylized connected context,
not a surveyed reconstruction.

## Verification

- Focused scene contracts:6 files /38 tests passed. Typecheck and production
  build passed. Served production entry: `main-Boi6IwOt.js`.
- Complete frozen-source suite: **230 files / 1,232 tests passed**,230.39s.
  Full result recorded in `validation/test.log`.
- Whole-film CPU sweep:3,601 frames each at1.6,16:9 and390×844. Maximum total
  submitted triangles including shadow contributions:160,744 /162,394 /118,656,
  within180k desktop /120k portrait. These are geometry counts, not FPS.
- Production Chromium, real Apple M2 Ultra Metal backend: desktop1280×720 and
  mobile390×844 at t=0,.58,.86,1. All8 captures are nonblank, correct scene,
  with zero console/page errors. Actual captured maximum:102 calls /145,936
  triangles desktop;82 calls /103,605 triangles mobile. Mobile is browser
  emulation on the desktop GPU, not a physical phone performance measurement.
- Live production UI: same canvas survives forward/reverse seeks; replay and
  return-to-catalog work; no homepage loader or application errors on either
  viewport. `validation/live-review.json`.
- `context.manifest.json` includes typed relationships, full lot inventory,
  imported asset hashes and context geometry/part bounds. `context-plan.png`
  is an authored layout diagram. Dated before/after full frames are preserved.

## Independent review and remaining debt

Read-only historian/visual-director review accepts the scoped isolated-arcade
repair in desktop .86/1. Portrait .86/1 establishes continuous upstream route
and urban adjacency; the receiving precinct is cropped left, so those two
views do not establish destination legibility. Opening desktop establishes
the precinct and surrounding city before construction.

The broader Rome scene still has repetitive residential blocks, large gaps
away from this district and a uniform ochre atmosphere. The distant arcade
is a long thin diagonal, especially portrait; temporal shimmer has not been
separately accepted from a continuous visual watch. The precinct is deliberately
schematic. Do not call the whole city AAA/release-ready based on these checks.

Application source was frozen before the final build and complete test run.
Existing dirty/untracked work and earlier evidence are preserved.
