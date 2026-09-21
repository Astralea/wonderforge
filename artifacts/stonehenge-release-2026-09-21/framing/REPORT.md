# Stonehenge solar-disc framing repair

2026-09-21. Scoped camera repair authorized after the release review found the
desktop Sun partly hidden by the permanent top letterbox. Application changes
are limited to the camera, its scene specification, a new framing regression,
and one existing camera pitch-bound assertion.

## Change

The 35° FOV camera lowers its closing pitch by 2.3°, eased into the existing
t=.68–.78 approach. Its closing pitches are now 7.9° at .78, 7.3° at .92 and
6.9° at 1. The 42° portrait camera keeps its accepted pitch and composition.
Solstice azimuth, solar direction/elevation/radius, targets, camera distance,
construction, captions, and narration are unchanged.

## Verification

- Twenty focused tests pass across `stonehenge-camera-framing`,
  `stonehenge-world` and `stonehenge-rendered-support`; typecheck passes.
- The new regression projects the entire authored solar rim over 221 closing
  samples on nine aspect ratios, requiring the full 6vh letterbox plus 1.5vh
  breathing room. It also projects conservative envelopes from the actual
  worked/unworked rendered stone geometries, including the Heel Stone, and
  checks the approach's continuity and pitch speed. Existing portrait pitches
  and the solstice bearing are pinned.
- Fourteen initial dev captures cover 1440×900, 390×844, 2560×1080 and
  1024×768, including the approach and closing caption. Zero page/console errors.
  The entire Sun, monument and Heel Stone remain framed; the portrait axis
  caption remains between Sun and monument.
- Actual captured-camera projection matches source pitch to floating-point
  precision. At t=.78 the desktop Sun's upper limb is y=71.58px, below the
  y=54px letterbox by 17.58px (1.95vh); final clearance is 44.12px. Wide/tablet
  clearances have the same normalized minimum. Portrait is unchanged.

Evidence: [dev captures and runtime state](dev/results.json),
[measured solar clearance](dev/sun-clearance.json),
[desktop start of hold](dev/desktop-t0.78.png),
[desktop ending](dev/desktop-t1.png),
[portrait caption](dev/portrait-t0.86.png).

The earlier rejected clipping evidence remains in
`artifacts/review-board/release-2026-09-21/giza-stonehenge/`.

## Final production acceptance

**The solar-disc framing blocker is resolved in `main-BR6Phg3M.js`.** Eighteen
actual UI captures cover 1440×900, 1920×1080, 390×844, 2560×1080 and 1024×768.
Every capture records that exact served bundle and zero page/console errors.
The approach, complete stone setting, Heel Stone, closing caption and visible
Sun were inspected. The existing portrait layout remains unchanged.

At the requested 1920×1080 social-video size, the disc clears the top bar by
21.10px at t=.78, 33.22px at .86, 40.24px at .92 and 52.95px at 1. The minimum
is 1.95vh additional clearance, exceeding the 1.5vh requirement. These use
captured camera diagnostics and actual letterbox DOM bounds, not just the pure
sampler. Source/captured pitch agree to floating-point precision on all views.

Evidence: [production capture state](production/results.json),
[production solar clearance](production/sun-clearance.json),
[1080p start of hold](production/1080p-t0.78.png),
[1080p ending](production/1080p-t1.png),
[portrait caption](production/portrait-t0.86.png).

The parent owns the complete release gate and deployment. This scoped report
does not claim a deployment or broad scenery upgrade. Browser results are
viewport emulation on the host GPU, not physical-phone or FPS acceptance.
