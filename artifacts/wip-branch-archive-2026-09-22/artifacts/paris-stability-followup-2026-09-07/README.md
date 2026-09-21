# Paris photo reference and display stability follow-up — 2026-09-07

This checkpoint improves north-bank roof geometry and removes a demonstrated
source of animated display noise. **Eiffel and the full goal remain unfinished.**
Local review: http://127.0.0.1:5589/?review=paris-photo-stability-v13#/wonder/eiffel-tower
Production bundle: `main-CAyRK-CY.js`; the movie remains264seconds.

## Model and historical evidence

Parent used the installed Blender Lab MCP after a fresh read-only probe:
Blender5.2.1 LTS, prior joint-campaign scene61objects. No plugin installed.
`blender/paris-1889.blend` is the editable53MB source; prior scenes/files remain.
MCP probe, build result and render result are retained alongside it.

The actual reference inspected is Alphonse Liébert's1889 balloon photograph,
[Library of Congress92514593](https://www.loc.gov/item/92514593/), albumen print,
no known reproduction restrictions. `references/loc-balloon-paris-large.jpg`
is its unmodified large JPEG and is packed into the Blender reference collection,
excluded from GLB export. `references/sources.json` records source URLs and limits.
The newly fetched LoC92519630 is another frontal fair view; it does not prove
north-bank cadastral geometry. The BnF Passy reference was found but image fetch
failed403; it was NOT used as observed modeling evidence.

Photo observations: uneven eaves, narrow attached roof parcels, mixed ridges,
and interrupted courts.93 reserved parcels now contain390 wings in five
ensembles: perimeter, split-front, L court, open court and double court. Roof
heights/directions, broad cornices and front-row dormers are actual mesh geometry.
Existing road reservations, Palais keepout and traffic paths are preserved.
This is photo-informed original modeling, not automatic image-to-3D,
photogrammetry, or identified building-by-building reconstruction. Hidden
surfaces, colors, dimensions and compressed placements are authored.

Runtime asset `public/models/paris-1889/paris-city.glb`:239742triangles,
13634608bytes. Pre-change GLB and manifest are retained under `before/`.
`renders/north-bank-roofscape.png` is an actual Blender Cycles review.
Far facade windows remain a Web shader effect; they are not baked into the GLB,
and consequently the Blender roofscape render has blank far walls. Do not call
this a finished photographic city model.

## Demonstrated display-noise correction

Eiffel alone calls `RenderPipeline.setFilmGrain(0)` when its world is created.
Other wonders retain their default. Existing5m camera near plane and derivative
water filter remain. No new render passes, materials or runtime textures.

`qa-stability.mjs` freezes geometry, camera, lights and water, changes only the
postprocessing clock, and captures ten frames for each grain setting at desktop
1440x900 and mobile390x844. The actual production default is asserted to be zero.

|Viewport|Old mean adjacent luma change /255|New mean|Old maximum|New maximum|
|---|---:|---:|---:|---:|
|Desktop|1.89798|0|7|0|
|Mobile|1.91620|0|7|0|

This proves removal of the grain's temporal variation only. It is not a claim
that all water highlights, thin edges, coplanar faces or shadows are flicker-free.
Same harness records336desktop and348mobile realRAF orbit frames in two intervals
covering early palaces/pools and late north-bank views; no browser errors.
See `qa/stability-report.json`, the PNGs and WebM recordings.

## Verification

- Full582tests in76files passed (`tests.txt`), typecheck and production build pass.
- After adding actual GLB roof-corner checks, the3Paris asset tests passed again
  (`asset-tests.txt`). The initial rounded-string check failed on Float32 rounding;
  the final check measures actual point distance with1mm tolerance.
- `qa/production-final/report.json`: two viewports, six seeks each, exact reverse
  canvas pixels, and two actual4x playback intervals each; no console/page errors.
- `qa/mobile-budget/report.json`:101positions across the actual264s movie,
  mobileDPR1.35; max299707triangles at.97, max149calls at.66,
  169geometries/29textures; no browser errors. This is a sampled budget gate,
  with little remaining triangle headroom, not a continuous every-frame proof.
- Initial `qa-production.mjs` falsely compared DOM overlays inside canvas-region
  screenshots. Its incomplete `qa/production/` is preserved. Final harness hides
  DOM chrome only for the two pixel-equality captures and passes. Screenshots
  and live playback otherwise use normal production UI.

## Asset sourcing / technical art ledger

Skills consulted: repository `threejs-aaa-graphics-builder` and its implementation,
model, render, technical-art, shader, performance-checklist references; local
`threejs-3d-generator` and `threejs-image-generator` capabilities were inspected.
This is a bounded improvement checkpoint, not a premium/AAA completion claim.

Credential probe (values never printed):
```
TRIPO_API_KEY=MISSING
GEMINI_API_KEY=MISSING
ELEVENLABS_API_KEY=MISSING
```
No generation service was invoked. Authentic historical images serve as reference
boards; parent-authored Blender meshes serve runtime architecture. No new audio.
Materials reuse the existing stone/zinc/slate/glass kit and multi-draw spatial
culling. Cost goes into roof silhouettes, not additional effects. Limits:
static city<240k; mobile<300k triangles/150calls, DPR cap1.35. Existing sky,
lighting, post stack and shadow tier remain except Eiffel's grain amplitude.

## Next work / do not overclaim

The city's street grid, distant facades and sparse quays are still too regular
and stylized for the owner's photo-quality request. Next substantive material
work should preserve real facade UVs/textures from Blender through the city
loader; it currently flattens materials to vertex color and adds analytic
windows. Do not spend another pass merely recoloring repeated blocks or adding
unfiltered high-frequency noise. Keep the true photo / authored inference
boundary explicit and verify actual rotating-camera footage.

The supported two-load chapter is preserved. Most legacy construction deliveries
still originate aloft, and the original gusset overlap remains; no claim of
complete physical construction. Independent face-joint candidate numbers are
under `artifacts/eiffel-face-joint-2026-09-07/`, but the subagent hit its usage
limit before finishing its audit. No candidate geometry was installed this turn.
Do not proceed to another wonder until Eiffel's remaining requirements are met.
