# Eiffel orbit flicker correction — 2026-09-07

## Implemented and demonstrated

1. **Palace glass depth interference:** the shared camera near plane was 0.5m while thin glass stood centimetres in front of masonry several hundred metres away. The same loaded model, identical pose and lighting shows changing horizontal masonry stripes across glass at near=0.5, clean panes at near=5. See `glass-near-comparison.png` (left old, right new), plus `baseline/` and `near5/` eight-frame matched camera sequence. `WorldScene.updateEiffelCamera` now uses the Eiffel-only `EIFFEL_CAMERA_NEAR=5`; other wonder cameras retain their previous policy. No polygon offset, material replacement or hidden buildings.

2. **Water normal aliasing:** the shared water recipe feeds two unfiltered procedural octaves into finite-difference normals and a sharp sun lobe. At the fountain pools these octaves become smaller than a screen pixel and flash as dense white speckle. `eiffelWater.ts` filters each octave smoothly according to its actual screen derivatives, preserving low-frequency water and resolved close detail. `EiffelEnvironment` applies this only to rebuilt Eiffel water. Same compiled material can toggle the filter for an internally comparable A/B. Shared recipes and postprocessing are unchanged.

The composer already uses 4× multisampling. This was not a missing-MSAA bug. City culling was inspected but no culling change was justified or made. These changes add zero geometry, render passes or draw calls.

## Browser evidence

- `before/motion-00.png` … `motion-19.png`: original production 5589 true playback before fixes.
- `glass-near-comparison.png`: magnified same-pose depth A/B on the older frozen model. Glass broken into stripes on left, clean on right. `before/paris-city.glb` retains that model.
- `verified-desktop/` and `verified-mobile/`: final **new parent-generated city** with real requestAnimationFrame camera/construction progression, each showing before then after with the same loaded scene and pipeline. Desktop 1440×900, mobile 390×844. Videos are `verified-desktop/page@7bebfca052ffc9b5e527c8a2700259bb.webm` and `verified-mobile/page@93240dfd1b8cb0523220caf310d73011.webm`.
- `verified-motion-qa.json`: 374/312 desktop before/after frames, 261/252 mobile before/after frames. All four sequences have monotonic movie time and no page or console errors. Desktop spans about t=.10–.19; mobile .10–.16. This is an orbit interval check, not a whole-film/performance certification.
- `water-metric.json`: matched deterministic camera samples, near=5 for both water variants. Tracks 156 world locations in the first pool through 12 positions (.100–.10917), projecting each location afresh. Mean absolute adjacent-frame luminance change falls from **13.0466 to 1.9730 levels out of 255 (84.9% reduction)**. This is a local temporal-speckle metric, not a claim that all water motion should disappear. Nearest-pixel sampling includes post grain and sampling noise.
- `probe-report.json`: matched initial geometry and calls across near/filter variants, no page errors.

**Do not use `final-desktop/` for timing evidence:** its first recorder attempted to stop an RAF loop using a shared boolean and restarted the old loop during the second run. Retained as superseded evidence. `motion-qa.mjs` was corrected with a per-run generation token and the verified folders/report were recaptured. Final verified capture is monotonic and independent per run.

Current Paris asset SHA256: `d80837cb16a3ae732f2f16fdac61ac81207859e6fbfb7ee9d5df7fb7184cc904`.

## Verification and boundaries

- `npx vitest run tests/eiffel-render-precision.test.ts`: **2 pass**, 185ms test time.
- `npm run typecheck`: pass.
- Material test composes the real shared water recipe, checks one filter hook, its uniform and distinct cache key.
- Clipping test reads both actual GLBs, transforms every mesh bounding box, and checks all boxes against a sphere enclosing the entire 5m near-frustum at 201 positions for desktop and mobile (402 poses). The bounds clear the new near region. Scope: authored city and tower assets; this is not a continuous-time proof of every traffic/scaffold particle.
- Static geometry audit identifies glass/masonry separations of 0.02–0.13m. It also finds some coincident different-material triangles, but orientation/visibility of all such pairs was not established; they are not all asserted to be flicker sources. Exact coplanar geometry cannot be guaranteed repaired by a near-plane change.
- Remaining visual limitations outside this fix: very brief operation cranes still blink as operations change; distant fine edges can alias; shared post grain remains; a complete 60-second orbit was not reviewed here. Parent owns crane campaign/model work and final full-suite/build review.
