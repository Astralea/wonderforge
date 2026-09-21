# Paris architectural detail filter — 2026-09-08

The admitted candidate continuously filters the apparent coverage of actual
subpixel palace crossbars and interior Galerie des Machines ribs. Every source
vertex, triangle and depth surface remains. Near detail and exterior end ribs
remain original; grazing roof views fade back to original appearance. The filter
changes neither water nor facade atlas patterns, crowd, construction animation,
Blender files or public GLBs.

## Geometry and implementation

`src/render/three/eiffelParisDetail.ts` recognizes components from the actual
transformed source vertices and existing `wf_material` tags. The material-merged
nodes are `Paris Exposition architecture and streets-glass.009`, `...-iron.009`
and `...-stone-light.009`; individual feature names are not present in the GLB.
Recognition requires 84 matched arched panes, 84 horizontal 5.2×0.22m bars,
84 vertical 0.14×10.6m bars, one 36-triangle roof and 378 rib segments. The 36
exterior end segments remain unfiltered. Pane offsets and actual rib support
planes are checked before enabling the shader. A failed recognition leaves
original rendering. Support tests use triangle planes; shading uses the actual
exported normals.

`src/render/three/eiffelParis.ts` carries the recognized attributes through the
existing spatial batching. Finite-band coverage uses a box-filter integral and
fragment derivatives. Both the supporting surface and overlaid detail converge
to the same filtered appearance as projected width falls below 2.5 pixels.
There is no discard, transparent overlay, random dithering, visibility switch,
additional batch or geometry movement. Current source count remains 202,324
triangles. `components.json` records the source geometry audit.

## Actual GPU comparison

Run: `qa.mjs`, actual `WorldScene` from development port 5590, all three clocks
fixed at 0.5, twelve camera offsets from −0.003 to +0.0025 radians in 0.0005
increments. Desktop: 1440×900 CSS pixels at DPR 1. Mobile: 390×844 CSS pixels at
DPR 1.35, actual framebuffer 526×1139. Explicit canvas CSS dimensions are
asserted in each measurement. Both variants are warmed before capture.

| Tracked feature | Desktop off → on | Reduction | Mobile off → on | Reduction |
| --- | --- | --- | --- | --- |
| Vertical crossbar | 0.884258 → 0.389398 | 56.0% | 0.617372 → 0.347084 | 43.8% |
| Horizontal crossbar | 4.827907 → 2.161670 | 55.2% | 3.302462 → 1.601663 | 51.5% |
| Vault rib | 5.180210 → 2.935628 | 43.3% | 3.628701 → 2.203750 | 39.3% |
| Glazing control | 0.132140 → 0.134274 | −1.6% | 0.303450 → 0.294454 | 3.0% |
| Roof control | 0.566719 → 0.566196 | 0.1% | 0.357889 → 0.357692 | 0.1% |

Values are mean absolute tracked-point luminance change in 8-bit image units,
not a universal aliasing score. Samples are reprojected through the recorded
camera and CSS-to-framebuffer mapping. All eight repeated fixed-camera captures
are byte-identical. At the actual main window centered at z=172.25, 12m away,
off/on central ROI (x35–65%, y30–75%) has zero changed channels in both profiles.
Off/on images were visually inspected; framing, building masses, glazing and
near crossbars remain recognizable, with less intermittent medium-view ribs.

Actual isolated triangles/calls are identical off/on: desktop palace 57,363/17,
desktop vault 42,439/17, mobile palace 26,048/4, mobile vault 18,392/4. This is
not a whole-film budget sweep. Full-context images are retained for inspection.

`web/report.json` contains metrics, actual cameras/canvas dimensions, and served
renderer/model identities. Both city responses are 14,663,452 bytes, SHA-256
`0655c59d789822aead5703399199b9cc96afd22ca581d29ffb016d209da263ae`.
There were no recorded application or shader errors. Two response-body capture
errors concern the unrelated large tower manifest being evicted from the browser
inspector cache; that manifest's identity is not certified by this run. City and
filter-module response identities were captured. All 96 sequence images, near
pairs, full-context images and compiled shaders are under `web/`.

## Verification and limits

`focused-tests-v2.log`: four new actual-GLB mapping/geometry/coverage tests plus
six existing Paris tests pass (10 total). `typecheck.log`: TypeScript passes.
No full application build or full suite was run by this subtask; the parent
coordinates the final production build and desktop/mobile route budgets.

This targeted improvement does not eliminate all Paris shimmer. Dome lines,
unclassified features, outer ribs and grazing silhouettes remain original;
reflections and animated water are unchanged. Geometry/depth is preserved, but
this is a view-dependent shading approximation, not a new historical model or
physical structural validation.

The first harness run is preserved under `web-intrinsic-canvas-invalid/`.
Its mobile canvas displayed intrinsic framebuffer dimensions as CSS size,
clipping the viewport and invalidating the tracked-point sample locations.
Those mobile metrics must not be used. `qa-correct-css.log` and `web/` are the
corrected evidence. The intermediate pixel-stride hypothesis was disproved;
the correction was explicit CSS sizing, not a production shader change.

## Resource-capture follow-up

A bounded code review found that the compile callback retained `analysis.colors`
through the whole analysis object, which also keyed Maps by imported meshes.
The callback now captures only three cloned Color values so those source CPU
buffers can become collectible after batching. The new regression proves that
later compilation does not dereference the analysis palette. Five focused filter
tests and TypeScript pass (`palette-capture-test.log`,
`palette-capture-typecheck.log`). Both GLSL section hashes are exactly unchanged
(`palette-capture-before.json`, `palette-capture-after.json`); the earlier GPU
source identities remain preserved and are not rewritten. Final production QA
will identify the bundle containing this resource-lifetime correction.
