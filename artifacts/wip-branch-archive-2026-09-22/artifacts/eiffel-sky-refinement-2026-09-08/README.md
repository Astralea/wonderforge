# Bounded Eiffel sky refinement — 2026-09-08

The baseline actual GPU dome showed very broad blurred pale patches and minimal
cloud thickness variation. The candidate modestly reduces angular cloud size,
uses cool denser cores and a short density sample toward the existing scene sun
to light edges consistently. It remains a soft authored two-dimensional cloud
field; this is not photorealistic volumetric weather or historical weather data.

Owned source: src/render/three/EiffelSkyDome.ts only. No sky keyframe palette,
clock, sun direction, camera, fog palette or other wonder changes. Spec16 and
one focused sky uniform/resource test accompany the change.

Actual Chromium GPU before/after: desktop1440×900 and mobile390×844, dawn,
morning, midday, dusk and night, three headings per phase (30frames each side).
All shader/browser error lists are empty. Both variants render one draw and1520
triangles. The candidate adds one three-octave FBM lookup in the fragment shader;
unchanged draw/triangle counts are not proof of unchanged GPU execution time.
No frame-time improvement is claimed.

All30 bottom below-horizon crops are pixel-identical before/after. Reverse
midday→dusk→midday is pixel-identical at both sizes. The three-degree blue
transition and apparent sun radius retain their existing constants; relevant
environment regression tests pass. Existing main-film mobile captures and
isolated noon/morning/dusk candidate captures were visually inspected.

Focused tests:11/11 across sky-refinement and rebuilt-environment suites. See
focused-tests.log, typecheck.log, before/report.json, after/report.json and
gpu-invariants.json. No production build or whole-film budget rerun was performed
for this bounded sky change; parent owns final build and composed desktop/mobile
QA after the concurrent summit asset change.

Adopted in the final summit V3 build `main-3-ssOnL1.js`. Parent completed all
770 repository tests, typecheck/build and actual composed desktop/mobile QA.
See `../eiffel-summit-revision-2026-09-08/qa-composed-status.md` for the current
served-asset identities, screenshots and frame budgets. This integration does
not change the isolated shader study's limitations above.
