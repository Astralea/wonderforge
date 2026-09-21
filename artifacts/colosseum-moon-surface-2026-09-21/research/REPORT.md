# Colosseum lunar surface research and orientation review

Reviewed 2026-09-21, scoped historian/astronomy pass. App changes in this pass are limited to the pure orientation helper and its tests. The root agent owns texture loading, radiance, renderer integration, specifications, credit UI and final browser acceptance.

## Recommendation

Use the unchanged native **1024×512 NASA JPEG**, spherical albedo projection, and a restrained reflected-light appearance. The existing analytic sphere already supplies a surface normal and physically derived Moon-to-Sun lighting. A generated Moon model would add no necessary geometry for the roughly 30–40 px closing disc and could replace recognizable geography with invented details.

The Moon's projected north should also tilt with the observer's view. The supplied helper corrects that roll using the scene's Rome latitude and a bounded fixed lunar position angle. It leaves the existing sky direction, phase, angular size, light vector, film clock and camera unchanged.

## Assets and provenance

The [NASA CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/) provides longitude/latitude base-color maps centered on 0° longitude. Its 2019 edition uses LROC color data with LOLA polar fill, with visual adjustments; it is an illustration asset, not a calibrated scientific radiance map. The 2025 edition offers improved color range and polar detail. Either supplies lunar geography before runtime lighting is applied.

| Native asset | Dimensions | Downloaded bytes | Decision |
| --- | --- | ---: | --- |
| [2019 JPEG](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_1k.jpg) | 1024×512 | 139,068 | Selected unchanged |
| [2025 JPEG](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg) | 2048×1024 | 457,942 | Researched, not required |

Downloaded-file SHA-256 values are recorded in [provenance.json](provenance.json). The chosen map is `b246064f217f8d479df78c49c7c8595a8f5fbda008a72fd539978d2e121e0109`. Assuming decoded RGBA8 and a complete mip chain, its texture storage is approximately 2.67 MiB; this is a calculated allocation estimate, not a browser GPU measurement.

[NASA's ready-made Moon sphere](https://svs.gsfc.nasa.gov/14959/) starts at a listed 13.2 MB for the smaller color-only GLB; a topography mesh is unnecessary here. No Meshy asset was selected in this research pass.

## Credit and permitted use

The asset page requests the credit **“NASA's Scientific Visualization Studio”**. [NASA's media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) permit factual educational/informational use of NASA texture and model media, generally without US copyright restrictions, with NASA acknowledged and no implied endorsement. Material marked as third-party copyrighted requires separate permission; the selected item is not marked that way. Record these actual guidelines, rather than inventing a CC0 license. Root is adding a visible Colosseum Info credit and asset provenance. No NASA insignia is needed.

## Spherical UV convention and limits

The map is visually north-up, with increasing lunar east longitude toward image-right; recognizable mare positions confirm the orientation. The selected mean-nearside view is centered on 0° longitude and 0° latitude. For existing renderer normal `n`, rendered observer-to-Moon direction `D`, and returned surface axes `right/up`:

```text
x = dot(n, right)
y = dot(n, up)
z = dot(n, -D)
u = 0.5 + atan2(x, z) / (2*pi)
v = 0.5 + asin(clamp(y, -1, 1)) / pi
```

This `v` assumes Three.js TextureLoader's default vertical upload flip. A loader using `flipY=false` requires the opposite latitude sign. The spherical near hemisphere occupies the middle half of the full longitude map, not the entire rectangular texture stretched across a circle. Geographic albedo is multiplied by the existing illumination; a photographic Moon with a baked-in phase would conflict with the scene's computed terminator.

**This remains a mean-nearside presentation, not a full libration reconstruction.** The direct 20:09 Horizons probe gives subobserver longitude +0.193312° and latitude −5.559074°. The helper handles sky-plane north roll only; it deliberately does not apply those offsets. Modern global lunar geography is suitable for this small historical illustration, but the asset is not an AD 80 lunar survey.

## Pole reference and independently sampled error

[Horizons observer quantity 17](https://ssd.jpl.nasa.gov/horizons/manual.html#observer-table) measures the apparent lunar north-pole angle counterclockwise from **true-of-date celestial north**. Quantity 32 instead reports pole RA/Dec in the requested inertial frame; it is not mixed into this helper. The local true celestial pole in renderer east/up/south coordinates is `(0, sin(latitude), -cos(latitude))`. Thus the horizontal projection and the position-angle reference are consistent without a J2000 conversion.

Two preserved requests explicitly specify **AD 0080-Jun-21**, Rome 41.8902° N, 12.4922° E, 25 m, apparent AIRLESS, UT1, Julian calendar. `moon-orientation.*` contains six 15-minute probes covering the closing window; `moon-endpoint.*` adds the actual off-grid film endpoint 20:09 and 20:10. These are separate from the production position/phase table. Their raw responses include the quantity definitions and exact epoch headers.

| UT1 | Moon altitude | Horizons pole angle, signed | Derived north roll from local vertical | Fixed-angle roll error |
| --- | ---: | ---: | ---: | ---: |
| 19:00 | −0.339311° | −3.7270° | −41.401576° | 0.1230° |
| 19:15 | 2.065338° | −3.7755° | −40.108860° | 0.0745° |
| 19:30 | 4.415563° | −3.8229° | −38.710403° | 0.0271° |
| 19:45 | 6.705244° | −3.8692° | −37.203461° | 0.0192° |
| 20:00 | 8.927831° | −3.9144° | −35.585099° | 0.0644° |
| **20:09, film end** | **10.226285°** | **−3.9410°** | **−34.559344°** | **0.0910°** |
| 20:15 | 11.076324° | −3.9586° | −33.852223° | 0.1086° |

Negative roll means lunar north leans left of local vertical. Fixed `P=-3.85°` has maximum sampled error **0.123°**, and **0.091°** at the direct endpoint. This is an error against Horizons' model at the queried samples, not an ancient observational accuracy claim or an all-day bound. The full output, including 20:10, is in [orientation-analysis.json](orientation-analysis.json).

The independent oracle in [analyze-evidence.py](analyze-evidence.py) uses a scalar horizontal-coordinate formula, rather than copying the runtime cross-product algorithm. If `A/h` are Moon azimuth/elevation and `phi` is latitude, the roll of celestial north is:

```text
beta = atan2(-cos(phi)*sin(A), sin(phi)*cos(h)-cos(phi)*cos(A)*sin(h))
lunarNorthRoll = beta - HorizonsNPang
```

## Implementation and verification

`src/engine/colosseumMoonSurface.ts` exports `colosseumMoonSurfaceBasisAt(moonDirection)`. Input is the pure astronomy API's east/up/north tuple. Output `{right, up}` is explicitly **renderer east/up/south**, reflected once at the boundary. The axes are perpendicular to the line of sight, and `right × up = -D` preserves an observer-facing, unmirrored lunar map. Only albedo projection uses these axes.

Focused command: `npx vitest run tests/colosseum-moon-orientation.test.ts` — **6 tests passed**. Coverage includes 1001 film samples for unit/orthogonal/handed axes, direct pole-roll probes and the off-grid endpoint, near-side UV signs, repeated/reverse seeks, input preservation and invalid/degenerate directions. The pure helper rejects a direction exactly at a celestial pole, where projected north is undefined; the Moon is nowhere near this case in the sampled film/table.

No astronomy-research blocker remains for this bounded texture repair. Rendered readability, phase contrast, load/disposal behavior, full-suite checks and desktop/portrait screenshots remain the root agent's acceptance work; this report does not substitute for them. If the authored date or closing time changes, recompute the fixed pole angle or replace it with a sampled orientation table.

Reproduction within this directory: run `python3 fetch-evidence.py` (cached original downloads and two sequential Horizons requests), then `python3 analyze-evidence.py`. Source/response hashes are in `provenance.json`; no runtime network dependency is introduced.
