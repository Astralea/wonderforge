# Final visual review — Colosseum celestial sequence

**Accepted for the scoped celestial change. No remaining visual blocker was found in the reviewed production frames.** This accepts the Sun/Moon presentation and related corrections, not a new full-release or AAA rating for all Rome art.

Reviewed all14 deterministic frames and four actual film-UI frames under `../production/`. Every capture names production bundle **main-4VdPjiiz.js** from port5590. `production/captures.json` records Apple M2 Ultra / ANGLE Metal and zero console/page errors. The separate `production/live-review.json` records actual UI seek/replay/navigation and57 desktop /58 portrait samples through the closing playback, with zero errors. That runtime evidence was inspected as diagnostics; this review does not claim physical-phone performance or a separate real-time temporal-shimmer study.

## Visual acceptance

| Check | Evidence and result |
| --- | --- |
| Sunrise and worker contact | `production/desktop-sunrise.png`, `mobile-sunrise.png`, t=.06: visible rising Sun; long, thin lower-leg shadows now join the workers' feet to their torso shadows. The former unsupported shadow gap is resolved. |
| Solar halo | The same sunrise images and `production/{desktop,mobile}-sunset.png`, t=.702: one solar disc, a smooth surrounding glow and no rectangular horizon cut or repeated-disc lens streak. |
| Night readability | `production/{desktop,mobile}-moon.png`, t=.88: the scene clearly reads as night, while arcade openings, travertine bands, roof silhouettes and the worksite remain visible. No invented city floodlights were added. |
| Lunar phase and orientation | At t=.88 and .93, the waxing crescent is lit on the right and tilted toward the below-horizon Sun. The unlit portion retains atmospheric sky radiance rather than becoming an ink-black cutout. Phase remains a crescent as it descends; there is no artificial monthly phase cycle during one evening. |
| Natural descent and disappearance | `production/{desktop,mobile}-moon-low.png`, t=.93, shows the Moon lower and farther right than at .88. `*-after-set.png`, t=1, contains no Moon. The bodies cross a settled view rather than being pinned to the monument's axis. |
| Near-ground shadow coverage | `production/mobile-sunset.png` and `mobile-moon.png` no longer have the abrupt horizontal foreground lighting cutoff seen in the early dev captures. |
| Late climber support | `production/desktop-moon-low.png`, t=.93: the central climber is now alongside the retained scaffold poles, below its cap. The previously floating climber in `production-v1/desktop-moon-low.png` is corrected. Portrait agrees. |
| Construction and portrait seating | `production/*-day.png`, t=.48, retains the partially built outer arcade and visible tiered cavea; sunset progresses farther; final frames show the completed oval. The compact portrait seating keeps its radial stepped-bowl reading and all three broad tiers. The complete monument remains inside the frame. |
| Actual film UI | `production/{desktop,mobile}-ui-0.88.png` and `*-ui-0.93.png`: controls remain readable below the monument, and neither the chapter list nor closing text obscures the Moon. The crescent's descent remains visible with real UI chrome. |

## Boundaries of the result

The Moon rises during daylight and is outside the chosen camera view then. This review accepts its computed position and the visibly rendered evening descent; it does **not** claim that an on-camera moonrise was shown. Angular size is deliberately enlarged2.4×; sky coordinates, illuminated geometry and phase are separate from that disclosed cinematic treatment. The selected AD80 day is representative, not an asserted dedication date.

Broader scene simplification remains visible: wide bare ground, simple masonry/roof materials, repeated pine silhouettes and a sizable dark-sky/foreground allowance in portrait. Those are existing art limitations and are not newly introduced blockers for this celestial change. No broad art score is invented from this focused pass. The source freeze, complete test suite, final geometry sweeps and build results belong to the main implementation report.
