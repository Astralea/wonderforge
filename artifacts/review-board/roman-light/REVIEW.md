# Roman light and depth — visual-director review, 2026-09-20

Read-only review of the accepted local production baseline. No application or
spec edits. Read Specs 04, 12 and 49, HANDOFF and the visual-director role.
Reviewed all eight `artifacts/rome-context-2026-09-20/after-{0,0.58,0.86,1}`
desktop/portrait captures. Captured Stonehenge `t=1` with the production preview
at 1440×900: `stonehenge-final/desktop.png`. Its JSON records Apple M2 Ultra
Metal, 56 calls, 95,462 triangles and no console/page errors.

## Baseline scorecard (0–3)

| Category | Score | Evidence |
| --- | --- | --- |
| Composition | 1.8 | The ellipse is held clearly at `after-1/desktop.png`, but `after-1/mobile.png` spends almost half the image on an empty ochre sky; the aqueduct becomes a long isolated diagonal. |
| Silhouette | 2.5 | Complete arcade/attic reads immediately at `after-1/desktop.png`; this is the strongest existing feature. |
| Construction causality | Not accepted from stills | `after-0.58/desktop.png` shows workers, lifting structure and incomplete seats; stills cannot establish supported motion/continuity. |
| Material readability | 1.8 | Cream facade separates at `after-0.86/desktop.png`, but brick, roof, earth and sky compress toward brown. Near identical black window stamps are particularly obvious in `after-0.86/mobile.png`. |
| Lighting | 1.0 | Neither final capture includes the light source or a memorable directional-light event; `after-1/desktop.png` has warm frontal illumination over a dark brown ground. |
| Environment depth | 1.0 | `after-0/desktop.png` has disconnected roof groups on flat land. `after-1/mobile.png` repeats courtyard houses in the foreground and replaces most distant land with beige fog. |
| Motion clarity | Not accepted from stills | This review has not watched sustained playback; existing captures do not establish temporal shimmer or rhythm. |
| UI restraint | Not assessed | Debug captures intentionally omit UI. |

These ratings fail Spec 04's board floor of 2.4 for several visual categories.

## Why the Stonehenge ending works

`stonehenge-final/desktop.png` places a visible low sun above the monument,
with long shadows projecting toward the viewer and a warm sky separated from
green earth. Sparse objects still describe near/middle/far space through the
monument, hill crest and tree silhouette. The dramatic effect is coordinated
geometry, light direction and camera pitch, not asset density. Preserve that
principle for Rome; do not copy a solstice alignment or claim one existed.

## Ranked changes

1. **Compose the real setting sun with the complete amphitheatre.** The current
   final camera azimuth is 2.64 rad = 151.26° and therefore looks toward331.26°.
   The current final sun is107.2° /7.92° elevation, behind the viewer. This comes
   directly from `src/engine/colosseumCamera.ts:28`,
   `src/data/colosseumSky.ts:166` and `WorldScene.ts:197`. The data compass is
   +X east/+Z north (`colosseumUrbanContext.ts:19`), so moving the sunset to331°
   would put it in the southeast. A coherent candidate is an east-side camera
   arc from +0.55 rad to−0.35 rad, ending southeast and looking west-northwest
   at160°. Set the authored sun path approximately +14° sunrise →−90° noon →
   −194° (=166°) sunset, with a4.8° final elevation. Final camera pitch9.2°,
   targetY24 and radius392 are a starting composition. This is an authored
   clear day, not a date or alignment reconstruction. A sun6° right of the
   view direction projects to top-origin screen coordinates approximately
   `(0.596,0.104)` at16:9 and `(0.804,0.175)` at390×844. These are actual Three.js
   camera projections, not a visual guess. The current13.6° final pitch clips
   even a correctly aligned7.92° sun above the35° vertical field of view.
   Preserve both the light direction and disk direction from one state and
   verify ellipse fit and construction operations along the changed arc.

2. **Remove broad ochre fog and expose a cooler layered atmosphere.** The sky
   shader's horizon blend continues to0.16 sine elevation (~9.2°), but the
   baseline desktop frame only sees sky to~3.9° above the horizon; almost
   everything becomes the horizon/fog color (`ColosseumSkyDome.ts:60,86`).
   Thin the fog seam to roughly1–3° and show a blue/lilac upper sky above a
   localized warm sun region. Current sun radiance is also overwritten by
   the post-tone-mapping fog blend (`ColosseumSkyDome.ts:78–87`); preserve its
   visible radiance through the seam rather than increasing bloom. Use the
   same neutral/cool fog neutralizer in the dome and pipeline, avoiding the
   existing mismatch `#c7b499` versus `#cbb49a`. Keep restrained haze/shafts;
   no second sun, opposite-facing key, or screen-covering gold haze. Sky and
   light changes should remain Colosseum-owned.

3. **Make Rome read in masses before surface detail.** With a westward final
   camera the Palatine and Janiculum can form separate middle/far layers;
   new roof variety must occur on those visible ridges, not only near the
   aqueduct. Break repeated stand-alone squares into attached street fronts,
   longer courtyard/wing masses, variable storey counts, rooflines and wall
   finishes, with routes defining meaningful gaps. Retain open construction
   access. Do not add hundreds of detailed window meshes. The current terrain
   also multiplies a warm material base `#c4a882` by already-authored vertex
   colors (`ColosseumEnvironment.ts:78,223–250`), darkening/browning the whole
   palette twice. A white base material preserves the intended vertex colors;
   tune ground/vegetation after looking at the actual lit scene. Add broad
   subdued far relief and city silhouettes where needed rather than hiding
   missing depth with fog. Respect the existing grounded sampler and budgets.

## Acceptance recommendation

The current frame reads as a recognizable amphitheatre study, not yet a
finished Civilization-style reveal. The most valuable improvement is a
physically consistent visible setting sun that catches the upper rim and
part of the cavea, with cool readable stone on the shaded near facade and
an actual Roman roofscape receding behind it. Capture at least0/.58/.86/.96/1
on desktop and portrait, because the sun should enter the composition as a
deliberate late-film event rather than jump into the last frame. Assess
shadows and exposed rock/roof edges in playback, not only screenshots.

## Combined implementation iteration review

Reviewed `artifacts/colosseum-sun-city-2026-09-20/combined-v1-opening/desktop.png`,
`combined-v1-final/desktop.png` and `combined-v2-reveal/desktop.png`. These are
iteration captures; housing placement/vegetation and portrait budgets are still
being changed, so this is not final acceptance.

The new direction corrects the fundamental lighting problem: the sun is visible
above the upper rim, the shadow points toward the viewer, and cool shaded stone
is separated from the sunlit sky. The final monument occupies a useful~38% of
frame width. Do not pull back to force the Caelian precinct into this shot.

1. Balance the right-hand Palatine mass by filling the **visible Velia side**
   with connected fronts. Three.js projection using the actual captured final
   camera gives normalized screen positions: Velia(-235,195)=(.365,.390),
   Palatine(-400,-80)=(.757,.376), Janiculum(-720,80)=(.641,.324). Caelian itself
   is offscreen atX≈2.1. The large bare left half is therefore a Velia/northwestern
   fabric issue, not an invitation to add more houses near the aqueduct. During
   this review the street data used `velia-north-lane` while the house generator
   filtered `velia-north-spur`; root and housing agent were alerted to reconcile
   that in-progress mismatch.
2. Keep the final camera stable while strengthening the soft, separate ridge
   behind this left-hand fabric. Currently left distant land and fog still meet
   in one horizontal gray band, while the right mass has three readable layers.
   At most reduce final camera pitch10.2°→9.2° for slightly more sun-halo
   headroom (~top10% instead of7%). Another substantial yaw or pullback would
   disrupt the improved hero/sun relationship without filling missing context.

No application/spec edits were made for this review.
