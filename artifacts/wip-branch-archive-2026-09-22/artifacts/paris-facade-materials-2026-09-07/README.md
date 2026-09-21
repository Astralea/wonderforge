# Embedded Paris facade material — 2026-09-07

The north-bank walls now carry an actual embedded UV-mapped facade in both
Blender and the web renderer. This replaces their Web-only analytic window grid.
The larger Eiffel goal remains active and incomplete.

Local review: http://127.0.0.1:5589/?review=paris-facade-materials-v14#/wonder/eiffel-tower
Current production bundle: `main-rhqaRE78.js`. Movie length remains 264 seconds.

## Art asset and modeling

- `public/models/paris-1889/textures/haussmann-facade-v1.png` is original art
  generated with the built-in image tool, not a historical photograph. It has
  three window bays, four residential levels and a ground-floor entrance/shop
  level, limestone courses, shallow window surrounds and iron balcony details.
  No remote image-to-3D service was used and no new plugin was installed.
- The authoring brief requested an orthographic, horizontally repeating 1880s
  limestone facade, neutral light, restrained patina, no roof/sky/people/text.
  The image retains some baked relief shading; it is base color, not a scanned
  PBR material or physical window recess geometry.
- Parent used the actual Blender Lab MCP after its fresh read-only probe.
  `blender/paris-1889.blend` preserves the scene and packed facade image; prior
  Blender checkpoints are untouched. MCP probe/build/render results are saved.
- Each wall uses an integer number of horizontal repeats, approximately one
  three-bay unit per 11.4 m. UV height maps ground to eave. The top and bottom
  remain ordinary solid faces. All 390 north-bank wings retain their previous
  geometry, street clearances and five ensemble types.
- `renders/north-bank-roofscape.png` is an actual Blender Cycles render.
  Compare with the prior stage's render: its far walls were blank in Blender.
- The prior historical Liébert aerial reference remains packed in the source.
  Generated facade art supplements that reference; it is not historical proof.

## Runtime changes

`eiffelParis.ts` preserves the source facade UVs while chunking triangles into
spatial cells. A mapped-face attribute selects the facade texture inside the
existing single multi-draw material. Plain surfaces retain their original color;
earth wear and the legacy analytic grid are excluded from mapped walls.

The embedded image remains sRGB, with trilinear mipmaps, repeat wrapping and
8x anisotropy (device-clamped). The material owns the texture and closes its
ImageBitmap on disposal. No geometry, draw calls or render passes were added.
The city stays at 239,742 triangles; GLB grows to 16,786,008 bytes.

## Verification

- Full suite: 584 tests in 77 files pass; typecheck and production build pass.
- `paris-facade-materials.test.ts` decodes the actual embedded PNG and verifies
  exact RGBA equality with the generated source. It also compares every mapped
  source corner's position/UV with the final spatial batch, and checks ownership,
  color space, repeat/mipmap configuration and once-only disposal.
- Node tests use a clearly scoped CPU PNG decoder as an ImageBitmap stand-in.
  This verifies asset bytes, not GPU rendering. Real upload and filtering are
  tested in Chromium below.
- `qa/production/report.json`: desktop and mobile, six timeline seeks each,
  exact reverse canvas pixels, two real 4x playback intervals each. Actual
  production bundle is asserted; no console/page errors.
- `qa/mobile-budget/report.json`: 101 points across the real movie at mobile
  DPR 1.35; max 299,707 triangles, max 149 calls, 169 geometries, 30 textures.
  Triangle/call counts are unchanged; texture count rises by one. This is a
  sampled gate with little geometry headroom, not an every-frame proof.
- `qa/lifetime.json`: actual GPU texture uploaded, then deallocated when the
  real WorldScene is disposed; one texture-dispose event and one bitmap close.
  No browser errors.

### Texture motion comparison

`qa-facade.mjs` moves the same camera by 4.56 m over 20 captures, keeping model,
light, postprocessing and world sample fixed. It projects front-wall world
points anew per frame. Both variants use the exact same loaded GLB and image:
linear/no-mip/1x versus trilinear/8x. This isolates the combined texture filtering
policy, not a comparison against the previous untextured model.

| Viewport | No mipmaps, mean adjacent luma /255 | Production filter | Reduction |
| --- | ---: | ---: | ---: |
| Desktop | 16.6504 | 7.5897 | 54.4% |
| Mobile | 18.6151 | 7.4772 | 59.8% |

Raw results, PNGs and WebM recordings are in `qa/facade/`. Desktop has 2,345
valid projected-point pairs; mobile has 836. The metric includes nearest-pixel
sampling, visible image features moving across pixels and possible occlusions.
It does not prove zero flicker or physically correct reflections. Real browser
shader compilation has no errors; both views report sRGB and the intended
mipmap/anisotropy defaults. The component camera is a review lens, not a newly
added production shot; the main movie has separate playback evidence above.

## Skill / asset ledger and remaining work

Repository graphics/model/render/technical-art guidance continues to apply.
The built-in imagegen skill was used for this material; no API key was required.
The previously probed Tripo/Gemini external-generation keys remain unavailable,
but that does not block the built-in image tool or the local Blender MCP.
Asset chain: generated original PNG -> parent Blender UV/packed image ->
embedded GLB -> source-preserving web batch -> actual browser QA.

This is a material-pipeline improvement, not a premium/AAA completion claim.
The facade tile is still shared across all north-bank wings, floor heights are
compressed, most near-bank buildings retain simpler geometry/windows, roofs and
streets remain stylized, and the regular street grid and sparse quays still fall
short of the owner's photo-quality city. The next city pass should add distinct
facade families and less repetitive streets using observed historical layouts,
rather than replacing the missing detail with another Web-only effect.

No construction route/joint changes this turn. The 264-second movie and supported
two-load chapter remain; most legacy high-origin deliveries and the bad original
gusset still need substantive correction. Do not move to another wonder yet.
