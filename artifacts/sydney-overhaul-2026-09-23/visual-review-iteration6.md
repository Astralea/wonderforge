# Sydney visual review — current capture pass

Reviewed 2026-09-23, read-only visual-director role. Current bundle: `main-CvgFu-A3.js`, confirmed in `production/report.json`. Reviewed all 12 current desktop/portrait checkpoints (`0.12`, `0.32`, `0.58`, `0.78`, `0.92`, `1`) and both actual-player `*-film.png` images. Earlier review is preserved as `visual-review-iteration5.md`. No source files were edited.

**Verdict: most prior static blockers are closed. Two bounded material-readability issues remain; construction causality awaits the new hero-operation evidence.** This evaluates the intended stylized harbour diorama, not photorealism. Spec 04 requires each board score >=2.4/3, construction causality 3/3.

## Scorecard

| Category | Score / 3 | Current evidence |
|---|---:|---|
| Composition | 2.4 | House, broad approach, bridge and harbour form a clear ensemble. Cranes and monument fit the reviewed frames. Portrait loses part of the bridge late, but retains its role and the complete house. `production/desktop-0.58.png`, `production/desktop-1.png`, `production/mobile-0.78.png`, `production/mobile-1.png`. |
| Silhouette | 2.5 | Separate large halls and smaller southern roofs are recognizable. Corrected shading now describes curved surfaces rather than flat gray blades; open rib fans explain the completed shape. `production/desktop-0.58.png`, `production/desktop-0.78.png`, `production/desktop-1.png`. |
| Construction causality | 2.4 provisional | Podium, curved ribs/falsework, tiles and cleared completion remain legible. Earlier full-frame lift extraction did not let the viewer confidently follow a single load through pickup/raise/slew/seat. A larger representative operation is being captured; no pass is inferred from the announced change. `production/desktop-0.32.png`, `production/desktop-0.58.png`, `production/desktop-0.78.png`, `live-film/lift-*.jpg`. |
| Material readability | 2.2 | Roof curvature and white ceramic values are much better, with no old moire. Two remaining issues: roof faces predominantly read as large rectangular panel fields rather than the required chevron fields; trees/boats/sheds become near-black in mobile and actual-player captures despite colored desktop debug counterparts. `production/desktop-0.78.png`, `production/mobile-0.78.png`, `production/desktop-0.58.png`, `production/desktop-film.png`, `production/mobile-film.png`. |
| Lighting | 2.4 | Daytime upper atmosphere is visibly blue; the previous gray-all-over problem is closed. Corrected shell winding gives substantially better curvature modeling, and night retains luminous white roofs against dark water. Prop blackening is tracked as the separate material/runtime issue above. `production/desktop-0.32.png`, `production/mobile-0.58.png`, `production/desktop-0.92.png`, `production/mobile-1.png`. |
| Environment depth | 2.4 | Late portrait hard horizon seam is gone. Windowed CBD, varied residential roof/footprint groups, streets, garden, quay, bridge and water establish distinct contextual layers. Sparse lots and simplified planting remain polish debt, but no longer justify reopening the whole context system in this bounded overhaul. `production/desktop-0.58.png`, `production/desktop-1.png`, `production/mobile-0.92.png`, `production/mobile-1.png`. |
| Motion clarity | 2.5 | Earlier live report verifies natural t=1 completion at 60.716 s, replay .015 and catalog return, zero errors. Its extracted sequence shows slewing cranes, crew changes and camera progression. New hero-operation changes still require fresh evidence. `live-film/report.json`, `live-film/lift-*.jpg`. |
| UI restraint | 2.5 | Real Sydney player, appropriate chapter text and controls; construction remains visible on portrait. `production/desktop-film.png`, `production/mobile-film.png`. |

## Closed findings

- **Portrait terrain/sky clipping band:** absent at .78, .92 and 1 in the current portrait set.
- **Gray daytime upper atmosphere:** current .32 and .58 visibly carry blue maritime atmosphere.
- **Inverted/flat shell lighting:** current .78/.92/1 have continuous curved light gradients; roof moire remains absent.
- **Blank CBD facades:** current desktop opening/middle/reveal show window articulation.
- **Wrong player evidence:** both player images remain Sydney, with matching chapter and transport controls.
- **Crane cropping:** no inspected checkpoint cuts the active crane tips.

## Remaining bounded fixes

1. **Resolve the prop-color difference between debug desktop and actual runtime modes.** Compare `production/desktop-0.58.png` with `production/desktop-film.png` (around .60): green trees and brown boat hulls in the former become nearly black in the latter. All portrait checkpoints show the blackened boats/trees as well; quay sheds also darken in player views. This looks consistent with a shared material, instance-color or mode-dependent rendering issue, but that is an inference, not a source diagnosis. Verify one daytime debug desktop, one desktop player and one portrait player side by side after the fix. Do not compensate with indiscriminate global exposure.

2. **Make the roof's broad chevron fields survive the actual camera.** The corrected white roof now reads as curved architecture, so preserve that work. At .78/.92/1, large nearly rectangular patch seams still dominate; the specified chevron identity is not clearly visible at full-frame viewing size. A restrained broad V-field pattern/contrast adjustment should close this without topology changes or tiny extra tile geometry. Recheck both viewports for moire.

3. **Close the identified hero-operation evidence gap.** Follow the larger existing part through support, pickup, hoist, slew and seating in the production camera with its cable. Do not count crane movement alone as construction causality 3. This is already being addressed by the construction agent; no additional whole-scene redesign is requested.

## Motion evidence boundary

`live-film/page@1c6572af1041e64481a8928ad7d88eca.webm` was independently probed as 66.36 s, 1440x900, VP8, 25 fps. The recorded report verifies natural completion, replay and catalog return with `errors: []`; `audibleListening: false` means no audio-listening claim. This recording predates the new winding/far-plane/material changes and validates lifecycle/motion evidence only. It must not be represented as the final visual bundle or proof of the newly selected hero lift. No physical-device performance claim is made.
