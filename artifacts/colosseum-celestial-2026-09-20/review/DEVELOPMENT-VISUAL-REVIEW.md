# Development visual review — not final acceptance

Reviewed the 14 desktop/portrait frames in `../dev/`, followed by `../production-v1/` and independent captures alongside this note. The shared capture diagnostics report actual Apple M2 Ultra / ANGLE Metal rendering and no console/page errors. Review scope is celestial framing, illumination and newly exposed contact issues; this is not a fresh acceptance of all Rome art.

## Accepted improvements in the intermediate captures

- `production-v1/{desktop,mobile}-moon.png` (t=.88): waxing crescent is lit on the right and tilts toward the below-horizon Sun. Geographic reflection is visually coherent. Additive lunar compositing has removed the earlier ink-black unlit hemisphere seen in `dev/*-moon.png`.
- `review/shadow-far1200-{sunset,moon}/mobile.png` (t=.702/.88): the abrupt, screen-wide near-ground shadow cutoff is gone after the shadow camera's far range was extended. Compare `dev/mobile-sunset.png` around y707 and `dev/mobile-moon.png` around y662.
- The same updated Moon capture has readable facade arches, distinct city roof silhouettes and an unambiguous dark sky. It fixes the nearly black monument in the initial dev Moon images without invented city floodlights.
- `review/sunrise-006/desktop.png` (t=.06) shows the actual rising Sun; the original .047 frame was just before the solar centre rose. `review/moon-low-094/mobile.png` shows the low descending crescent at lunar elevation .609 degrees. `review/after-set-1/mobile.png` correctly contains no Moon after its physical disc is below the horizon.
- `production-v1/desktop-day.png` (t=.48), `desktop-sunset.png` (.702), `desktop-moon.png` (.88), and `desktop-after-set.png` (1) preserve increasing construction progress, continuous monument framing and final scaffold removal. Portrait retains the full ellipse, although small labour details naturally read less strongly.

## Corrections requested before the final capture set

1. **Sunrise worker shadow contact.** `review/sunrise-006/desktop.png` has a roughly95px gap between the nearest worker's feet and the beginning of its shadow. Parent investigation confirmed the major cause: articulated legs do not cast, leaving the elevated torso as the first shadow caster. Low solar elevation magnifies this missing lower silhouette. A cheap physical leg/foot shadow proxy and target-specific world-distance bias are in progress; a torso-only shadow must not be treated as contact evidence.
2. **Solar halo clipping.** The same .06 frame has a straight horizontal edge in the atmospheric glow below the Sun. Parent separated the actual disc's horizon clipping from the smoothly fading atmospheric halo. This fix awaits a fresh production capture.
3. **Late climber support.** `production-v1/desktop-moon-low.png` (t=.93) visibly puts the central climber above the dismantled scaffold. The pure crew code clamps against a global scaffold height while the scaffold renderer uses station-staggered retained bay heights after .9. Bind the climber to its actual bay support; do not solve it with darkness or a different camera.

## Remaining broader art limitations

The city still has broad bare ground, repeated pine silhouettes and simple material surfaces. The late portrait framing contains considerable dark sky and foreground, although the body movement uses that sky and the complete monument remains legible. These are recorded art limitations, not evidence that astronomical coordinates or phases are wrong. No full-release scorecard or motion/shimmer acceptance is issued from these stills. Final review should inspect the rebuilt production frames after the three corrections above.
