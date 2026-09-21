# Colosseum — city depth and western sunlight

The requested housing/depth/sunlight iteration is implemented locally and
verified in the rebuilt production preview at http://127.0.0.1:5590/#/wonder/colosseum.
Served bundle: `main-B0qUFHwR.js`. No deployment, publication, commit or push.
Existing dirty work and previous evidence are preserved.

## What changed

- Four original Blender housing silhouettes replace the single repeated block:
  low open court, stepped upper storeys, joined shop frontage and tall corner.
  The deterministic city now has 485 residences (132 court /95 stepped /188
  frontage /70 corner), 27 larger wings, 118 pines and 61 cypress. All houses
  remain below 19 m; ordinary scales are 1.12–1.36. The original 37 Caelian
  street-front transforms and connected aqueduct/precinct remain intact.
- Two terrain-following western lanes connect Velia, Palatine and the Janiculum
  foot. Full rotated roof/foundation bounds keep buildings, trees and roads
  separate. Shared terrain-level supports replace centre-only placement.
  Palatine/Velia relief and overlapping unnamed western shoulders give the
  far city real contours and depth. These are authored compressed layouts,
  not surveyed AD 80 streets or a new archaeological reconstruction claim.
- Camera moves around the eastern side toward a southeast reveal facing west.
  The sun now travels ENE → southern noon → WNW under the +X-east/+Z-north
  compass. Final pitch is 10.2°, sun elevation 4.8°. The full disc remains
  framed on desktop and narrow phones throughout the last six seconds.
  One world-space direction drives disc, key, shadow and atmosphere.
- Cooler sky/fill/fog, a thin horizon blend and warm late key separate shaded
  travertine from sunlit edges. Removed doubled brown terrain/house albedo and
  reduced grain. No new post-process pass or texture download was added.
- Portrait keeps the roof/body silhouette but simplifies tiny windows, trees,
  palace detail and tufts. Buried foundation bottoms are omitted; sky geometry
  is 528 triangles while weather/disc detail stays in the existing shader.

## Reproducible sources and review

- `housing.manifest.json`: original asset provenance, bounds, runtime tiers,
  distribution, triangle counts and hashes. GLB: 59,848 bytes.
- `scripts/generate-colosseum-housing-variants.py` reads the typed dimensions in
  `src/data/colosseumHousing.ts`. Background Blender 5.2.1 LTS produced
  `blender/colosseum-housing-variants-v1.blend` and the new runtime GLB.
  `blender/housing-variants-inspection.png` shows the four authored forms.
- `context.manifest.json`: current streets, hills/relief, lots, precinct,
  aqueduct connections, geometry and all three model-asset hashes.
- `HISTORY-REVIEW.md`: primary Vitruvius plus official pre-AD79 Pompeii evidence
  supports varied residential vocabulary. Its provisional tall-house concern
  is resolved by the final <19 m contract. Later landmarks remain excluded.
- `VISUAL-REVIEW.md`: independent review of all eight final production frames;
  scoped acceptance of housing variety, depth and sunlight. No AAA claim.
- Specs 12 and 49 now make sun/camera projection and mixed connected street
  fabric part of the authoring pipeline before decorative detail.

## Verification

- `npm run test -- --maxWorkers=2`: **232 files /1,242 tests passed**, 211.34 s.
- `npm run typecheck`: passed. `npm run build`: passed. `git diff --check`: passed.
  Existing bundle-size and browser-externalized Node fallback warnings remain;
  the exercised production route reports no errors.
- New meaningful contracts cover distinct delivered/fallback shapes, upward
  roof faces and open court, independent rotated footprint separation, actual
  delivered support against 25 terrain samples, offline fallback, late-load
  disposal, compass/sun projection and shared fog/light uniforms.
- Full 3,601-frame CPU sweep at each aspect, including conservative shadow
  submissions: 173,202 (1.6), 173,324 (16:9), 118,819 (390/844), 117,951
  (320/844). Peaks occur at t=0.8377778. Budgets remain 180k/120k.
- Eight real Metal/Apple M2 Ultra captures at t=0, .58, .86 and 1:
  desktop1440×900 and emulated portrait390×844. Zero page/console errors.
  Observed capture peaks: 103 calls /150,448 triangles desktop; 86 calls /
  100,969 triangles portrait. See `validation/browser-captures.json`.
- Actual UI: forward/reverse seek, stable canvas, replay, continuous .76→1
  playback (58 samples per viewport), then return home. Continuous peaks:
  162,484 desktop /112,292 portrait. No home loader or overflow, zero errors.
  See `validation/live-review.json` and `*-live-ending.png`.

Before: `../rome-context-2026-09-20/after-1/{desktop,mobile}.png`.
After: `production-{0,0.58,0.86,1}/{desktop,mobile}.png`.
The earlier `light-*` and `combined-*` directories are iteration evidence.

## Limits retained honestly

This is a stronger stylized reconstruction, not a complete detailed city or a
photoreal scene. Broad foreground lakebed, some road ends, simple material
surfaces and repeated pine crowns remain visible. The final sun enters the
narrow frame late (after the .86 checkpoint) and stays framed for the closing
six seconds. The conservative portrait triangle budget has about1k headroom;
further detail needs replacement/LOD rather than unchecked accumulation.
Browser portrait emulation is not physical-phone QA, and draw counts do not
establish a sustained frame-rate guarantee. No new audio or other-film visual
acceptance is asserted by this pass.
