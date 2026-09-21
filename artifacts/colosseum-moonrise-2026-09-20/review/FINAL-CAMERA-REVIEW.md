# Colosseum daylight construction and moonrise camera review

2026-09-20. Scoped acceptance of the camera and geometry budget changes in the current source and the dev browser at `http://127.0.0.1:5589/`. This is not a production-bundle, publication, or hardware-phone signoff.

## Result

The camera now travels gently from southwest around the west side to northwest (authoring azimuth 3.55 → 2.59 radians). The final view faces geographic bearing 121.61° and settles by film t=.84. The Moon moves across this fixed bearing naturally; the camera does not follow it. The final 4° downward pitch preserves the complete monument while leaving room for the Moon under the actual 6vh letterbox.

The prior 6° pitch was rejected in the actual desktop UI because the final Moon was hidden by the letterbox. That evidence is preserved in `ui-pitch6/`. Final source uses pitch 5° at t=.78 and 4° from t=.84 onward. No geometry, celestial direction, phase, or angular scale was changed in this repair.

## Actual UI evidence

Captured the actual film route with the controls visible at t=.88, .94 and 1 on desktop 1280×720 and mobile viewport 390×844. All six frames have zero recorded page or console errors. Diagnostics confirm constructionT=1 and workComplete=true at every captured evening frame.

- `desktop-ui-0.88.png`: the Moon first appears above the finished roofline; the lower limb is naturally clipped by the astronomical horizon at this early rise.
- `desktop-ui-1.png`: the complete Moon remains below the black letterbox; its upper limb is at y=56.62px, the letterbox ends at y=43.19px, leaving 13.44px clearance.
- `mobile-ui-0.94.png`: the rising Moon remains clear of the evening caption.
- `mobile-ui-1.png`: full Moon and monument silhouette remain visible; the upper limb is at y=129.90px, leaving 79.27px below the letterbox.
- `ui-clearance.json`: browser diagnostics and actual DOM rectangles.
- `ui-disc-clearance.json`: full enlarged-disc rim projection using the captured camera and sky diagnostics; no guessed screen coordinates.

The completed Colosseum still reads in its city, with foreground roofs below the facade and the eastern aqueduct receding into the background. The lower pitch increases foreground overlap at the base, but the complete roofline, lateral silhouette, and main arcade tiers remain readable. The long aqueduct is prominent from this new direction; its existing stylized silhouette is an art limitation, not a new camera crop or floating-contact defect. The nearly circular Moon matches the selected approximately 99.1% illuminated waning phase; the screenshots alone cannot validate sub-degree terminator orientation.

## Framing and budgets

`production-camera-projection.json` uses the actual source camera/shared clock and independently interpolated raw JPL angles. On 16:9, 390:844 and 320:844 the enlarged Moon is within the image frame from its centre crossing the horizon at 52.68 seconds through the 60-second close. This means its image-frame bounds fit; the horizon still clips the rising lower limb, and terrain/monument occlusion is assessed in browser captures separately.

`camera-budget-sweep.json` samples 3,601 frames on each of seven aspects. It uses the reflected production compass and `colosseumFilmAt(t).constructionT`, including the complete evening hold. The CPU triangle accounting includes one shadow pass for each casting mesh. It is a geometry-budget check, not a frame-time benchmark.

| Aspect | Peak triangles | Budget |
| --- | ---: | ---: |
| 1.6 | 147,831 | 180,000 |
| 16:9 | 149,429 | 180,000 |
| 390:844 | 106,773 | 120,000 |
| 320:844 | 107,115 | 120,000 |
| 375:667 | 106,548 | 120,000 |
| 0.6 | 106,662 | 120,000 |
| 0.71 | 107,242 | 120,000 |

All peaks occur at t=.6702777778. Actual GPU counts at the final UI frame are 112,404 triangles / 77 calls on desktop and 72,452 / 58 on the mobile viewport. Browser rendering used Chromium on the host GPU, not a physical phone.

## Tests and scope

- `tests/colosseum-world.test.ts`: three camera assertions pass: gentle geographic arc, complete-ellipse projection over 121 film frames × seven aspects, and the full enlarged lunar rim below the 6vh letterbox with at least another 1.5vh margin over the evening interval.
- `tests/colosseum-repair.test.ts`: all nine tests pass, including actual reflected-camera culling restoration and the newly mapped construction-time budget sweep over 101 checkpoints plus the measured peak, with desktop detail restored after portrait.
- `tests/colosseum-urban-context.test.ts`: five tests pass.
- `tests/colosseum-geography.test.ts`: one test passes.
- `npm run typecheck`: passes.

The combined four-file run had 26 passing tests and one opening narration assertion failure while the parent agent was migrating caption/audio data. That assertion is outside this agent's camera ownership and was reported to the parent. Full-suite/build verification and final production captures belong to the parent after all parallel source changes settle.

Camera source and tests changed only in `src/engine/colosseumCamera.ts`, camera assertions in `tests/colosseum-world.test.ts`, and the explicitly assigned `tests/colosseum-repair.test.ts`. No remaining camera blocker was found in the examined dev UI frames or the dense projection/budget checks.
