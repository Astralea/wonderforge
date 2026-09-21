# Deck seam raster diagnostic — 2026-09-08

Scope: isolated two-floor supply viewer, desktop 1440×1000, time 220 s.
Production Paris and its glass/water have NOT been diagnosed by this experiment.
No production renderer or Blender asset was changed. The isolated viewer now uses
the cleanup described below by default.

`diagnose.mjs` captures front/double-sided comparisons; `diagnose-no-aa.mjs`
uses the explicit `?noAA` diagnostic query. The normal viewer retains MSAA.
Earlier baseline/shadow/near-plane captures and `review-before-depth.ts` are preserved.

`contrast.json`: in ROI x[220,330), y[350,650), count pixels whose luminance
is >10 below the mean of pixels two rows above/below. Baseline, shadows off,
near 1/5, FrontSide and DoubleSide each have 10 such pixels, maximum contrast
37.56. MSAA disabled has zero, maximum 0.50. This is a static local diagnostic,
not a temporal flicker score or a whole-scene quality measure.

`pixel-rays.json` records center rays hitting the deck top at y57.94000244;
some deeper intersections repeat at an internal shared vertical face x0.
This does not prove the precise subpixel cause. The evidence narrows it to
raster/sample behavior at the seam. Near5 clips the nearby rope. Disabling AA
creates visibly jagged lattice edges, so neither change is adopted as a fix.
Next test removing shared internal faces / a coherent seated deck surface while
retaining separate construction parts, then repeat moving-camera desktop/mobile QA.

The independent second-floor cart audit is in
`../eiffel-second-floor-cart-route-2026-09-08/cart-route-audit.json`.
Its sampled reverse route strikes receiver base members; the forward route
approaches unsupported aperture. These samples do not rule out every route.
A crate-only transverse sweep has no modeled handling mechanism. Steerable cart,
open-portal receiver, extended trolley and dismantling/transfer are untested options.

## Exact internal face cleanup

`src/render/three/removeInternalBoxFaces.ts` removes only exactly matching,
opposed axis-aligned rectangular faces, each consisting of two distinct
triangles. Cloned vertex attributes and exterior topology are preserved. Gaps,
partial overlaps and duplicate same-facing triangles are retained. Deformed
geometry, partial draw ranges and incomplete/overlapping groups are skipped.
This is a rigid-rendering cleanup, not a boolean or structural substitution.

The two-floor viewer applies it within each rigid mesh after tower context
merging; separately articulated parts are never merged together. Normal MSAA
remains enabled. `?rawFaces` reproduces the uncleaned geometry. `?noAA` is only
a diagnostic. `diagnose-seam.mjs` now captures the generic cleanup as cleaned.png;
seam-test.png preserves the earlier one-off removal of deck x=0 internal faces.

1540 internal triangles removed; maximum79310 triangles,114calls. In the same
static ROI cleaned.png has0 dark pixels, maxcontrast0.50, versus baseline10,
37.56. Parent inspected desktop cleaned.png and both pointer-orbit captures.
Other seams and bridge details still show speckles from rotated views: this is
NOT a whole-scene or temporal flicker-free claim. Do not snap uncertain geometry
or remove partial contacts merely to hide the remaining dots.

Validation:700tests/111files pass, typecheck/build pass (logs here).14new utility
tests include independent ray intersections, partial visibility and ownership.
`qa-cleanup.mjs` / web-cleaned/qa.json: desktop1440×1000/mobile390×844,16seeks,
reverse, liveplay, overview/follow, actualpointerdrag; one persistent cargo,
actualworldposes match sampler, no pageerrors or overflow. MainParis unchanged.
Next: residual nonexact seams require source-level topology investigation;
second-floor supported transfer still needs receiver/cart redesign.
