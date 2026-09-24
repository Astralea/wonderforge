# Sydney Opera House — photographic and map reference rebuild

Local implementation, not published. This supersedes the model rejected by the owner. It remains a stylized reconstruction, not surveyed or as-built geometry.

## Review the result

- [Review page: photos, model and film](final/index.html)
- Local production film: `http://127.0.0.1:5591/#/debug/film/sydney-opera-house`
- [Editable Blender scene](model/sydney-reference-model.blend) · [GLB](model/sydney-reference-model.glb)
- [18 reference views](final/sky-fixed/reference/index.html) · [map/source audit](references/geography-audit.md) · [visual qualifications](visual-review.md)

The final production bundle is **main-B7n23WDI.js**. The Blender JSON SHA-256 is `d08faa0fb85c993987cf8775243f34071dc0e18a45e259653f8d1e4e72113a2d`.

## What changed

The Blender model has ten paired shell groups: unequal, splayed main halls and a separate southwest restaurant; individual shell bearings, nested rising tips, closed white flanks, projecting curved northern foyers, banded granite podium and southern stairs. Twenty halves use 75 m sphere surfaces, with the tallest shell tip at 67 m above water. Shared authored JSON drives the production renderer. Blender is not an unrelated illustration or a re-export of the rejected vault model.

NSW aerial tracing places open water west, north and east, with only a southern land connection. Circular Quay is southwest and Farm Cove east/southeast; the bridge is northwest at its actual overall scale. The mapped coastline constrains an interpreted construction-era setting. Bridge placement, districts and terrain heights remain approximate. A continuous quay wall replaces isolated blocks; 82 garden figs form canopy groups; roads follow rendered terrain triangles at a 6 cm offset.

Visible human-scale crews work and walk on supported ground/decks. Boats follow continuous navigable-water voyages. The two cranes have supported foundations, continuous unloaded return/pickup/hoist cycles, and rigid loads. Eight large flank meshes are built as 282 loads, each bounded to 8 m, retaining all 5,120 authored triangles. Joint miters/bevels and 42 specific horizontal insertion approaches prevent collisions with already seated roofs. Four longer hero operations preserve readable handling time; other operations are deliberately compressed timelapse.

The camera crosses the open northern harbour and ends northwest, matching the supplied aerial direction. Its close yard view makes workers readable without enlarging them, then follows the Opera rib lift smoothly before returning to the panorama. The complete final roof and podium remain framed on desktop, portrait and landscape viewports.

## Flashing and bright-roof checks

Sydney uses a 20 m near plane rather than 0.5 m. A 31-angle fixed-geometry/daylight orbit against a 100 m precision reference measured **5,025 significant changed pixels at 0.5 m versus 91 at 20 m**, a **98.19% reduction** across the sampled views. Roads also no longer intersect sloping terrain. This is a depth-precision regression measurement, not a guarantee for every GPU or arbitrary camera path. [Exact measurement](final/depth/summary.json).

Full-film inspection found excessive bloom on white roofs. An A/B test ruled out sun shafts, then showed that lowering Sydney bloom from 0.32 to 0.06 restored detail at t=0.625 (7,043 near-white pixels became zero under the recorded threshold). Ordinary lighting, analytic sun and day/night grading remain active. [Bloom A/B](bloom-ab/report.json); the rejected shaft hypothesis is retained in `sun-ray-ab/`. New rigid-load partitions also retain a uniform flank color rather than introducing random camouflage patches.

## Black-flash root cause and repair

This was a separate fault from depth fighting. Sydney's sky projected cloud noise
with `1.55 / (dir.y + 0.38)`. At the lower-hemisphere singularity, one RGB pixel
became NaN even though the cloud mask was zero. Multiplication/mixing with a zero
mask cannot sanitize NaN. Water exposed that sky pixel; bloom's successive blurs
spread it across 96.7% of the image at the measured failing frame.

The denominator is now `max(dir.y, 0.0) + 0.38`, preserving the upper-hemisphere
cloud projection and keeping the lower hemisphere finite. The matched 900-frame
A/B had 28 nearly black frames before and zero after. Disabling MSAA or sun rays
retained exactly the same failing frame indices; bypassing bloom hid the symptom.
The final fix keeps bloom and MSAA enabled. HDR readbacks confirm the initial NaN
and its downstream spread, then zero NaN/Infinity after repair. See the
[causal diagnostic report](black-frames-ab/README.md).

## Verification

- `npm run test -- --maxWorkers=2 --testTimeout=30000`: **256 files / 1,377 tests pass**, final frozen source. [Log](full-tests-after-sky-fix.log).
- `npm run typecheck`: pass. `npm run build`: pass. `git diff --check`: pass.
- Build warnings remain: existing Node-module externalizations and large chunks; main JS is about 6.90 MB / 1.64 MB gzip; this pass does not claim a bundle-size optimization.
- [Blender round trip](model/verify.json): authored shells, podium and details match saved Blender geometry within 3.8e-6 m; GLB re-import has 115,704 triangles.
- [Desktop/portrait production QA](final/sky-fixed/production/report.json): 14 frames, forward/reverse seeks, real clock advance, next-wonder navigation, and reduced-motion completed still; zero page/console errors. Actual ANGLE Metal / Apple M2 Ultra, desktop 1440×900 and portrait 390×844. Portrait is browser viewport testing, not a physical phone test.
- [Rib hero playback](final/sky-fixed/hero/rib/report.json) and [tile hero playback](final/sky-fixed/hero/sail/report.json): actual 1× player recordings, 35 and 39 sampled frames, zero errors.
- [Fixed-daylight reference captures](final/sky-fixed/reference/report.json): 18 views, zero errors, same WorldScene code under Vite. These are separate evidence from the built player.
- [GPU finite-value regression](final/sky-finite/report.json): 36 desktop/portrait HDR inspections, with bloom deliberately enabled in both aspect ratios. The regression fails on the previous shader at t=14/3600 and passes after the fix. Command: `node tests/sydney-sky-finite.browser.mjs`. The production mobile quality tier normally skips bloom.
- [Natural full playback](final/sky-fixed/film/report.json): 60.310 seconds at 1×, replay and catalogue return pass, zero browser errors. The 1,596-frame browser video has zero detected black intervals (90% dark-pixel threshold); the capture includes startup and navigation around the film. [Video](final/sky-fixed/film/page@5a2db12cfb94b8afe1a68bbd4df86f0f.webm).
- [Immediate framebuffer audit](final/sky-fixed/rendered-film/report.json): a separate full 1× run read **3,658 frames**, zero all-black 5×5 grids, zero errors. All 492 saved source frames are retained and encoded without filtering in [the frame-audit recording](final/sky-fixed/rendered-film/sydney-rendered.mp4). Reads synchronize the GPU; the independent browser-video run above did not use them. This validates the tested ANGLE Metal/M2 Ultra path, not every GPU.
- These final production reports identify `main-B7n23WDI.js`; the source-geometry hash remains unchanged by the shader fix.

Initial failed checks, intermediate builds and prior captures are retained. Videos in `final/film`, `film-solo`, `canvas-film`, `canvas-preserve-ab` and `rendered-film` exposed real rendering faults despite zero browser errors; they are rejected evidence, not accepted playback. They disproved the earlier capture-only hypothesis. Do not cite the earlier `accepted-reference-views` directory: it exposed the color-partition regression that was subsequently fixed.

## Sources and actual delegation

The owner's two photos, [official 2017 Conservation Management Plan](https://www.sydneyoperahouse.com/sites/default/files/collaborodam_assets/soh-cmp-interactive-1.pdf) site/floor/section drawings, and [NSW Spatial Services SIX imagery](https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/LPI_Imagery_Best/MapServer) were inspected. Downloads, map extents and manually traced control points are retained in `references/`. The 1962 Yellow Book supports geometric history, not the realized glazing.

Claude Code actually ran canonical `claude-opus-5-5` for architecture review and Blender authoring, including a corrective iteration. Devin CLI actually ran `swe-2-high` for the reference-view capture harness. Briefs, outputs and model-usage receipts remain in `delegation/`. In-session reviewers handled maps, runtime integration, geometry collisions and worksite supports.

The active Blender UI scene was preserved: authoring/export/verification used separate background Blender processes. The first delivery remains in `model-first-delivery/`. `model/renders/*-workbench.png` are stale first-pass images; use the EEVEE renders and `final/` runtime captures.

## Limits and continuation boundaries

Glazing/lobby depth, podium relief, vegetation and fine tiled surface detail remain simplified. The flanks are approximate ruled surfaces, not a measured reconstruction of every side shell. The fixed falsework and compressed assembly sequence are interpreted, not an exact historical erection-day replay. Current mapped coastline does not prove the entire 1959–1973 shoreline. Bridge southern-pylon placement differs about 24 m from the mapped contextual bounding-box centre. No surveyed, photorealistic or AAA certification is claimed.

Application code is frozen after this verification. Preserve prior user changes and all evidence; no commit, push, deployment or public release was made. Dev port 5590 supports diagnostic scripts; preview 5591 serves the production build. The owner's active Blender scene was not opened or replaced.
