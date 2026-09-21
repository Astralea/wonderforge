# Frozen-clock Paris shimmer diagnosis — 2026-09-08

The dominant exhibit-building defect is subpixel geometry coverage. Removing
lighting, reflections and even diffuse texture detail leaves the thin palace
crossbars and Galerie des Machines ribs unstable during a tiny camera orbit.
The fountain behaves differently: its view-dependent reflection/highlight path
accounts for almost all measured interior variation. The north-bank facade
texture contributes a smaller, separately reproducible variation.

This is a read-only diagnosis. No production/model source was edited, no Blender
was invoked, and no app build was run. The earlier rejected water quadrature
candidate was not loaded or evaluated here.

## Method and provenance

Actual production at 5589 was fetched: `main-CwBAhlf1.js`, SHA256
`e4bab0de2f6b86029b68089e8310c3f7de6f948cd9550516cefd2dda77252d3c`.
`production-identity.json` records the response byte identity. Its closure-local
WorldScene is not exposed: `ThreeCanvas.tsx` owns the object and
`__THREE_GAME_DIAGNOSTICS__` contains read-only camera/scene arrays, not camera or
material handles. Consequently, a controlled camera/material override cannot be
performed through the current production hooks.

Following the existing water/physical QA harness mechanism, `review.ts` imports
the actual WorldScene on dev5590 into an isolated artifact page and accesses its
ordinary TypeScript-private pipeline field. This is actual GPU rendering of the
production classes and saved assets, **not a claim that the production bundle's
camera was overridden**. It does not modify the application route or source.

Both desktop and mobile captured the actual city response: 14,663,452 bytes,
SHA256 `0655c59d789822aead5703399199b9cc96afd22ca581d29ffb016d209da263ae`, matching
production. The response hashes for `eiffelParis.ts`, `eiffelWater.ts`,
`proceduralDetail.ts` and `EiffelEnvironment.ts` match between diagnostic profiles.
All captured response identities and compiled diagnostic shader strings are
saved under `web/`. Two unrelated response-body capture attempts were evicted
from Chromium's inspector cache; these are recorded in `web/report.json` rather
than suppressed. The relevant city and shader source identities succeeded for
both profiles. There were no page or shader-console errors in the run.

- Desktop 1440×900, mobile 390×844; diagnostic DPR 1 on both. These are matched
  appearance comparisons, not the earlier production mobile DPR1.35 budget gate.
- All three WorldScene clocks fixed at 0.5; Eiffel film grain remains zero.
- Twelve orbit positions, -0.003 to +0.0025 radians in 0.0005-radian steps.
- Three warmup draws before every measured variant; repeated identical-camera
  frames were byte-identical for all 22 profile/region/variant combinations.
- City-only or water-only isolation for measurements; correctly framed full
  scene screenshots also retained. Original, middle and last measurement PNGs
  were visually inspected for palace, vault, facade and water framing.
- Variant 0: original lighting/material output. Variant 1: final outgoing light
  replaced with the existing diffuse color, preserving texture/procedural
  diffuse detail. Variant 2: authored vertex palette only, also bypassing atlas
  and procedural diffuse patterns. The shader insertions are saved explicitly.
- Metrics bilinearly sample luminance at projected fixed world-space points,
  then average absolute changes between adjacent camera positions. This reduces
  unregistered screen motion but is **not a physical aliasing oracle**: ordinary
  view-dependent reflection, changing occlusion, finite point sampling, fog,
  bloom and contrast changes can contribute. Projected points are not each
  independently ray-certified as visible. Flat-palette facades become brighter
  and bloom on desktop, so its relative percentage is not a fix-quality score.

## Observations

Mean adjacent tracked luminance change, on a 0–255 scale:

| Profile / region | Original | Diffuse only | Vertex palette only |
|---|---:|---:|---:|
| Desktop palace horizontal bars | 4.828 | 7.142 | 5.774 |
| Mobile palace horizontal bars | 3.526 | 5.082 | 5.155 |
| Desktop vault ribs | 5.180 | 5.992 | 5.666 |
| Mobile vault ribs | 4.476 | 5.192 | 5.215 |
| Desktop north-bank facade | 0.476 | 0.547 | 0.041 |
| Mobile north-bank facade | 0.432 | 0.492 | 0.137 |
| Desktop sun-aligned fountain | 1.353 | 0.007 | — |
| Mobile sun-aligned fountain | 0.455 | 0.009 | — |

1. **Crossbars/ribs need a distant representation.** At these medium views, the
   authored 0.14 m vertical crossbars project to ~0.50 CSS pixels, the 0.22 m
   horizontal bars ~0.86 pixels, and the 0.32 m vault ribs ~0.79 pixels on desktop.
   Even the diffuse/palette controls retain their changing bright coverage.
   Glazing interiors change only 0.132 originally; roof-skin points 0.567, versus
   4.828/5.180 at the thin features. This is evidence for geometry coverage as
   the dominant visible mechanism, not a glass transparency or roughness issue.
   Paris uses one opaque roughness-0.85 material, and the actual pipeline already
   uses a four-sample HDR render target.

2. **Facade detail is a smaller texture issue.** Removing lighting does not
   remove its variation, while removing the diffuse atlas/pattern does. Keep the
   architectural masses and near detail. Test a slightly coarser mip/detail fade
   for distant facades using this matched orbit. Current atlas already has
   trilinear mipmaps and anisotropy 8, so simply enabling mipmaps is not a fix.

3. **Water interior variation is shading-driven.** The same sheet is stable at
   an unchanged camera. Disabling its outgoing reflection/highlight contribution
   leaves almost no interior variation. `proceduralDetail.ts` adds analytic sky,
   narrow sun halo/disc and Fresnel into emissive radiance; ordinary material
   roughness does not govern that added lobe. Some glitter is physically expected
   when viewpoint changes. This experiment does not justify removing reflection
   or claiming that all remaining sparkle is aliasing.

## Smallest useful next work

Prioritize palace crossbars and vault ribs. Preserve their actual close geometry;
for subpixel distances, put their integrated color coverage on the supporting
opaque glass/roof surface with a footprint-filtered mask or mipmapped detail.
Blend near/far representations without doubling surfaces or creating a popping
threshold. A shader-only roughness increase cannot solve these solid edges.
This is a proposed implementation, not a tested fix or an authorization to
silently thicken all historical members.

For facades, retain the current atlas and compare a modest far-distance detail
fade/coarser mip choice against the current source. Texture minification and
mipmap choices are described in the [Three.js Texture documentation](https://threejs.org/docs/pages/Texture.html).

For water, first compare any future lobe/normal-filter change against a warmed,
supersampled reference at these same camera positions. A lower raw temporal
score alone can reward simply deleting legitimate sparkle. Do not reinstate the
rejected four-sample quadrature from `eiffel-water-reflection-2026-09-08`; that
candidate already failed its valid comparison. No new water fix is claimed here.

## Reproduce / evidence

`PATH=/Users/hina/.nvm/versions/node/v24.4.0/bin:$PATH node artifacts/eiffel-paris-shimmer-2026-09-08/qa.mjs`

- `web/report.json`: 22 warmed comparisons, exact repeat-frame checks, real
  response hashes and complete metric values.
- `web/*-full.png`: normal scene context; `*-0/6/11.png`: isolated sample frames.
- `web/*-shaders.json`: actual compiled shader sources with explicit controls.
- `production-identity.json`: actual 5589 bundle/city response identity.
- `motion/`: additional full 12-frame desktop palace/water sequences, captured
  by `SHIMMER_OUT=motion SHIMMER_MOTION=1` using the same harness.

No full-film, performance, physical construction, historical-geometry or
whole-scene flicker certification is implied by this bounded diagnosis.

`motion.html` presents the original/diffuse palace and fountain sequences with
play/pause and a frame slider. On the existing dev server:
http://127.0.0.1:5590/artifacts/eiffel-paris-shimmer-2026-09-08/motion.html

The supplementary motion capture is a separate page load while other agents
worked on the dev film clock. Palace metrics exactly repeat the first run;
water is 1.850 original versus 0.00924 diffuse-only in that capture. Do not
combine its absolute water values with the first run or infer cross-load
bitwise determinism from them. The relevant captured rendering module/city
hashes are unchanged, but the harness did not record every engine-module
response or every water uniform. All its within-page unchanged-camera checks
still pass. Its single inspector-cache omission is explicitly identified as
`tower-kit.manifest.json`, not the measured city response.
