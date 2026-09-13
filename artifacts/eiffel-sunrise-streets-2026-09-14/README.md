# Eiffel night streets and morning ending — 2026-09-14

Owner requested a sunrise after the night passage and historically appropriate street lighting. See specs/47-eiffel-night-to-sunrise.md.

## Result

The existing 180-second cinematic edit now goes into night over 162–170s, holds night to 172s, moves through dawn to 178s, then holds warm morning light to 180s. Construction, installed parts, camera paths and mechanical clocks retain their existing sequence. Detailed playback keeps its previous atmosphere. The actual sun direction advances below the horizon before rising; there is no reverse sunset. The final camera is unchanged, so the visible result is morning light across the tower and city, not a centered rising solar disk.

Eiffel's existing city GLB already contains eighteen period gas-lamp standards. Their original geometry remains; three shared batches add warm apertures, optical halos and small ground pools on the actual paved surfaces. These fade with dawn along with existing window/beacon lighting. No additional point lights, shadow passes, lamp poles, or Blender asset changes. Placement is a plausible period treatment, not a documented reconstruction of every historical pole position.

The final halo is 5.2m of optical spread with opacity 0.65 and a 0.4m view-space offset to keep its core in front of the opaque glass. The physical glass stays 0.45m wide. Depth testing still hides lights behind buildings. All new lighting geometry totals 1692 triangles in three batches, with no per-frame instance-matrix updates.

## Historical sources

- BnF, gas and electric illumination in Paris: https://expositions.bnf.fr/sciencespourtous/grand/spt_101.htm
- CNAM, 1889 Exposition electrical illumination monograph: https://cnum.cnam.fr/pgi/redir.php?ident=4XAE40&onglet=i

## Implementation boundaries

- src/engine/eiffelCinematicAtmosphere.ts is a pure deterministic sampler. Its cinematic ending anchors the production-light state at 162s, avoiding changing sunset start values every frame.
- LightState.sun.visibility defaults to one. RenderPipeline must multiply the entire directional-light formula, including its existing intensity floor, by visibility. God rays and grading also respect visibility.
- WorldScene forwards cinematic viewer seconds separately from production time. Its original Paris correction path must not be applied a second time to the sampled ending.
- src/engine/eiffelStreetLights.ts records positions matching the shipped GLB; EiffelStreetLights mounts only when that city asset is available and disposes its geometry/materials.
- Earlier continuous construction, staggered ground-scaffold retirement, CPU sampler guard and audio recovery changes remain. Earlier documented upper-freight and later-plant editorial omissions are outside this change.

## Verification

- Full suite: 213 files / 1122 tests passed (tests.log), before the final optical halo adjustment.
- Final focused contracts: 3 files / 10 tests passed (final-focused.log), after the halo adjustment. Cover atmosphere continuity, reverse seeks, production renderer wiring, exported lamp positions, actual pavement contact, route/building/tree clearance and disposal.
- Final typecheck and production build passed; build output in final-build.log. Existing bundle-size warning remains.
- Final served bundle: main-_B1o6cqn.js / main-BqeLL_Kj.css, checked against dist/index.html by browser QA.
- final/observations.json: ten desktop samples including a backward seek, five mobile samples, no console or page errors. Desktop 1280x720 DPR1; mobile 390x844 DPR1.35. Peak desktop sampled draw calls: 150.
- Visually inspected final desktop and mobile night and morning captures. Warm street points are visible at night, with correctly occluded lamps behind buildings. Morning has sun elevation 14 degrees, visibility one, and zero street/window/beacon night amount. Screenshots remain in final/desktop and final/mobile. Earlier weaker-halo samples remain in after/ for comparison.
- Final continuous playback over 14.5s on Apple M2 Ultra recorded 972 frame intervals, mean 14.92ms, p95 26.0ms, max 110.3ms, and 1 interval above 50ms; peak 134 draw calls. Installed sources advanced from 7147 to 7172 and ending night amount reached zero. Evidence is recorded in final-live/observations.json and cpu-profile-166.json; this is scoped real-GPU playback, not a locked-frame-rate guarantee.

## Local preview

https://wonderforge.localhost/#/wonder/eiffel-tower

The recovered detached preview on loopback 5589 remained running through builds and QA. Do not stop it for builds. This change is local only; nothing was published or pushed.
