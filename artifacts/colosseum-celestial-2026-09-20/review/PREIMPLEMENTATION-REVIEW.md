# Colosseum celestial framing review

Read-only visual director / simulation review. This is a projection and coordinate review, not acceptance of rendered celestial frames. Source requirements: Spec12 owner astronomical refinement; Spec49 whole-scene blockout and shared celestial clock; Spec04 visual scorecard and actual-camera validation.

## Required correction: geographic handedness

The current authored plan is +X east / +Y up / +Z north. Used directly as Three.js world coordinates it reflects geographic east/north/up. In the current `WorldScene.updateColosseumCamera`, authored Z reaches the render camera unchanged; no adapter was present during review. A camera east of the amphitheatre looking west consequently has south on screen right. A geometrically shaded waxing crescent can therefore be mirrored even if its illuminated side points toward the rendered Sun.

Use a single explicit authored-to-render boundary: content root Z reflection; camera position and target Z reflection; physical ephemeris render vectors `(sin(A) cos(e), sin(e), -cos(A) cos(e))`. Keep the existing geographic data and physics in their declared authored basis. Do not correct the crescent independently. Sky rays, key light, shadow directions and celestial bodies must all use the physical render basis. A spherical sky can sit outside the reflected content group.

`ColosseumEnvironment.cullCity` currently treats authored instance spheres as world spheres. After root reflection, transform each sphere through both its instance matrix and the owning mesh's current world matrix before the actual-camera frustum test. Update parent world matrices before that test. The other aqueduct camera dependency examined is aspect-only. Verify all budgets anew because the camera path also changes.

## Proposed composition

Open southwest looking ENE. Move around the south side, where the construction choreography remains readable, to a southeast closing viewpoint looking slightly north of west. The proposed final azimuth 6.08 (authored radians) is a stable viewpoint, not lunar tracking. At 21–22 UT1 the Moon drifts naturally through astronomy azimuth 275–285 degrees; final camera azimuth -0.45 instead faces 295.8 degrees and misses most of that descent in portrait.

Proposed camera keys and independent Three.js projection script are in `projection-review.mjs`; raw external five-minute ephemeris tables are read from the sibling `ephemeris/` directory. The result `proposed-projection.json` contains body directions, projected centers and complete-disc margins at 6,001 times for three aspects. It already applies the geographic reflection. These checks do not include terrain occlusion, atmospheric attenuation or shader readability.

| Visible beat | Desktop 16:9 | Portrait 390:844 | Portrait 320:844 |
| --- | --- | --- | --- |
| Sunrise | 1.95–3.81 s | 1.95–4.78 s | 1.95–4.64 s |
| Sunset | 41.34–42.94 s | 41.29–42.94 s | 41.47–42.94 s |
| Lunar descent | 50.48–58.81 s | 49.60–58.81 s | 50.11–58.81 s |

Pitch is 10 degrees at opening, 13–16 during construction, 9 at sunset framing and 6 by the lunar descent. At final camera height the nearby amphitheatre rim lies below the true sky horizon, so it should not block the positive-elevation crescent. Rendered terrain/tree silhouettes still require inspection.

## Highest-value checks, ranked

1. Correct parity as one scene boundary before judging the Moon. At this evening's western view the waxing crescent's lit limb points toward the below-horizon Sun, generally lower-right; a lower-left bright limb is the geographic reflection bug, not a phase option.
2. Preserve the natural third-act succession: warm late masonry, Sun crossing below the horizon, blue twilight, then a readable descending crescent with a final below-horizon frame. Do not force the final body onto the monument's central axis or freeze either body above the horizon. Keep phase evolution subtle over one day.
3. Verify the whole closing interval and all three aspects. Real lunar angular diameter projects to roughly 10–11 pixels here; a modest disclosed uniform angular enlargement can improve phase recognition while retaining the true center and illumination geometry. It must not be confused with astronomical size accuracy.

The Moon rises in daylight at approximately 08:08 UT1. This south-side proposal does not visibly frame its rise; its position can still be computed correctly offscreen. Do not claim visible moonrise acceptance from the above table. Framing that early eastern rise would require an additional early camera beat or a substantially slower early arc, followed by a faster later transit. This is a narrative decision, not grounds to move the Moon.

No full-film visual score is assigned before fresh rendered frames and playback are available. The earlier `colosseum-sun-city-2026-09-20/combined-v3-final/desktop.png` has a low warm Sun close to the center, clearly different from the requested natural day/night sequence; it is a before image, not evidence of the new implementation. Production GPU budgets remain 180k desktop / 120k portrait, including shadows.

## Implemented camera follow-up

The camera proposal now lives in `src/engine/colosseumCamera.ts`. Geographic authoring coordinates are preserved; the parent integration supplies the render reflection. Only the camera source and its scoped assertions in `tests/colosseum-world.test.ts` were edited by this reviewer. The new full-ellipse check projects ground and roof edges for 80 bays at 121 times and four aspect ratios; all 11 tests in that file pass.

`production-camera-projection.ts` uses the actual camera and shared PCHIP clock, but independently reads raw JPL angles for celestial positions. With the declared 2.4× angular scale, measured complete-disc framing is:

| Visible beat | Desktop 16:9 | Portrait 390:844 | Portrait 320:844 |
| --- | --- | --- | --- |
| Sunrise | 2.93–4.98 s | 2.93–5.98 s | 2.93–5.57 s |
| Sunset | 41.14–42.89 s | 41.22–42.89 s | 41.40–42.89 s |
| Lunar descent | 50.36–56.99 s | 49.61–56.99 s | 50.17–56.99 s |

These replace the earlier linear-clock proposal timings. The last three seconds are after moonset. Actual terrain silhouettes, fog and visible crescents remain browser-review work.

`camera-budget-sweep.ts` constructs the production Colosseum world, reflects the camera exactly as the renderer does, waits for assets, and traverses visible geometry including conventional shadow submission. Across 3,601 frames at each aspect, peaks were 173,174 (1.6), 173,302 (16:9), 118,829 (390:844), and 118,495 (320:844), all at t=0.8377778. All fit the existing budgets; portrait headroom is only 1,171 triangles. JSON results and the bundled reproducible script are adjacent. This is CPU geometry evidence, not GPU or physical-phone performance evidence.
