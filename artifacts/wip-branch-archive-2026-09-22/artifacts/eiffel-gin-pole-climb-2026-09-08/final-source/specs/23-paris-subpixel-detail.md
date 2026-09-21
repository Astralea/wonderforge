# Paris subpixel architectural detail

Target the actual exported palace crossbars and Galerie des Machines ribs whose
medium-view widths are below one pixel. The measured baseline is saved under
artifacts/eiffel-paris-shimmer-2026-09-08/. This changes the Paris city renderer
only; no water, crowd, construction clock, Blender file or GLB bytes change.

Recognize source components using actual transformed geometry plus the existing
wf_material tags. The current city has 84 matching arched panes, 84 horizontal
5.2×0.22m bars, 84 vertical 0.14×10.6m bars, one 36-triangle barrel roof and 378
square rib segments. Verify individual component dimensions and support matches;
if recognition fails, retain original rendering rather than classify loosely.

Keep every source vertex, triangle, material palette, spatial cell and depth
surface. Near details retain original appearance. Below resolvable widths, blend
both supporting surface and overlaid detail toward the same derivative-integrated
coverage using their actual dimensions. Preserve the two outer vault ribs and
keep original appearance at grazing roof silhouettes. There are no discrete
visibility switches, geometry scaling, random dithering or transparent layers.

Validate the actual GLB feature mapping and unchanged geometry/culling arrays,
near and grazing behavior, continuous coverage and material disposal. Compare
warmed, fixed-clock small-orbit captures in desktop/mobile with the filter on/off,
using actual response identities. A lower temporal metric is insufficient if
near shape, silhouette or overall appearance degrades. Retain production budgets
450k triangles/200 calls desktop and 300k/150 mobile. No full-scene or water aliasing
claim is implied by a targeted improvement.

## Verification on 2026-09-08

The actual city GLB retains 202,324 triangles and one opaque city batch. Four
geometry/filter tests, six existing Paris tests, and TypeScript checking pass.
Matched-clock, twelve-position GPU captures on the actual development renderer
reduce tracked temporal luminance change for palace vertical/horizontal bars by
56%/55% desktop and 44%/52% mobile; vault ribs improve by 43%/39%. Glass and roof
control samples change little. Identical-camera repeats are byte-identical and
the measured main-window center at 12m is unchanged in both profiles. Triangle
and draw-call counts are identical with the filter off/on.

Evidence and limits: `artifacts/eiffel-paris-detail-filter-2026-09-08/README.md`.
These are targeted development-renderer A/B measurements, not the subsequent
production whole-film budget gate. Exterior vault ribs and grazing silhouettes
retain their original geometry and can still exhibit aliasing.
