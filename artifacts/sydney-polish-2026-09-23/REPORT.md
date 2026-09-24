# Sydney harbour frontage continuation — 2026-09-23

Continuation of the accepted local Sydney overhaul. Scope: recompose the foreground Botanic Garden into irregular canopy groups and an open lawn; defer street-front infill. The review found this visible on both desktop and portrait, while much north-shore detail falls outside portrait framing. Existing construction, roof geometry, audio, camera and released catalogue remain the reference.

Technical-art brief: preserve the white-roof focal point; recompose the original fig kit into three irregular groups around an open lawn, with a denser landward edge. Support surfaces remain instanced; no new material/texture or light is required. Preserve footprint, road, water and worksite clearance with the shared pure geometry. Environment budget stays below 115k conservative submitted triangles; complete desktop film below 90 calls. Asset strategy: reuse the existing original harbour GLB and procedural residential kit, adjusting context and placement only. No new hero model or external generation is involved.

Baseline: accepted bundle main-CC839RXx.js remains live on 5591. Fresh reveal capture is `before-reveal/desktop.png`; it uses ANGLE Metal/Apple M2 Ultra, reports 54 calls/250,589 triangles at 1280×720, and no console/page errors. Prior full 1440×900 and 390×844 evidence remains in the overhaul report; all artifacts are preserved.

The final composition uses 16 garden figs in three irregular groups, with a clear lawn and a broad canopy-free sector facing Farm Cove. The old district expansion produced 39 garden figs, many outside the visible green foreland. Total harbour figs decrease from 115 to 92. Two final camera-reviewed relocations break the initial draft's seaward ring; earlier draft captures are retained as iteration evidence, not acceptance captures.

`src/data/sydneyHarbourContext.ts` owns the group polygons, lawn, shoreline opening and two authored placement adjustments. `src/engine/sydneyHarbourLots.ts` preserves the original random stream and non-garden rejection context, then replaces only the garden. The established non-garden output SHA256 remains `f97a4c593f2360b18e4542118a5bff36dce732c0897a957927e881ec9d4671c0`. Exact planting is an authored composition, not a surveyed historical reconstruction.

Six new tests check the shoreline opening, repeatability, unchanged neighbouring districts, group membership and variation, denser landward spacing, actual transformed GLB canopy bounds, sampler contact, access/site/neighbour clearance and the full lawn polygon. Polygon intersection uses an independent clipping-area oracle. The original fig mesh fits the measured garden-only 16 × 15 m envelope before instance scale; all tree roots remain on the shared ground sampler. The existing environment budget test remains below 115k conservative submitted triangles.

Production browser evidence is in `after/`, bundle **`main-a_zVs6Wg.js`**: 12 deterministic frames at .12/.32/.58/.78/.92/1, 1440 × 900 desktop and 390 × 844 portrait, actual Sydney player seeking and playback, next-wonder navigation, and reduced motion held at t=1. Both configurations use ANGLE Metal on Apple M2 Ultra. Console/page/WebGL error collections are empty.

| Matched checkpoint | Before triangles | After triangles | Before/after calls |
| --- | ---: | ---: | ---: |
| Desktop .58 | 226,589 | 221,805 | 82 / 82 |
| Desktop 1 | 250,589 | 245,805 | 54 / 54 |
| Portrait .58 | 226,576 | 221,792 | 69 / 69 |
| Portrait 1 | 250,144 | 245,360 | 40 / 40 |

Every matched frame submits 4,784 fewer triangles; desktop sampled calls peak at 82, within the 90-call limit. The eight protected roof, construction, camera, renderer and sky source files match their pre-pass hashes (`preserved-source-verification.json`). No new assets, materials or renderer code were added. Browser script output directories are now configurable with `SYDNEY_QA_OUT` so previous evidence is preserved.

The uninterrupted `live-film/` recording uses the same bundle. Playback reaches t=1 in 60.286 seconds, replay advances to .015, and Escape returns to the catalogue; no errors. Across 61 samples, desktop calls peak at 82 and submitted triangles at 259,549. This is muted browser lifecycle evidence, not audible listening. The independent visual reviewer accepts the bounded placement pass: the earlier closed ring is broken, the lawn opens to Farm Cove, and the construction remains unobscured. See `visual-review.md` for the reviewed paths and limitations.

Final verification: **249 test files / 1,340 tests pass** in 211.94 seconds with `npm run test -- --maxWorkers=2 --testTimeout=30000`; typecheck, production build and `git diff --check` pass. The 30-second per-test allowance retains the previous overhaul's accommodation for the existing expensive Paris fixture; no assertions were relaxed. The final rebuild still serves `main-a_zVs6Wg.js`, matching both browser reports. Vite retains its existing large-chunk advisory.

Physical-phone performance and audible listening are outside this browser-only placement pass. Broader city frontage remains sparse and is deferred; the garden still uses separated stylized crowns rather than a lush overlapping canopy. Nothing has been deployed or published.
