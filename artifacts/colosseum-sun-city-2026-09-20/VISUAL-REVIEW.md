# Colosseum housing, distance and sunlight — final visual review

Read-only visual-director review, 2026-09-20. Scoped result: **materially
improved and accepted for this iteration**. This is not blanket AAA or release
acceptance.

## Evidence reviewed

- Frozen local production bundle `main-B0qUFHwR.js` at `127.0.0.1:5590`.
- All eight `production-{0,0.58,0.86,1}/{desktop,mobile}.png` captures in this
  directory, plus their JSON diagnostics. Desktop viewport1440×900;
  portrait390×844. Every JSON names the Apple M2 Ultra Metal renderer, reports
  `softwareRendered:false`, and contains zero console/page errors.
- Before: `artifacts/rome-context-2026-09-20/after-1/{desktop,mobile}.png`;
  opening and middle baseline frames were reviewed during the initial pass.
- Stonehenge comparison: `artifacts/review-board/roman-light/stonehenge-final/desktop.png`.

This reviewer checked still composition and the recorded diagnostics. The root
agent owns continuous playback, numerical sweeps and full test/build evidence.
Phone-sized Chromium captures are not physical-phone testing.

## Relevant scorecard

Board scale0–3. Scores below2.4 remain below Spec04's general release floor;
accepting this scoped improvement does not waive those broader requirements.

| Surface | Before | After | Evidence and judgment |
| --- | ---: | ---: | --- |
| Housing variety and urban grouping | 1.3 | 2.5 | `production-0.58/desktop.png` shows low court fronts, taller corner masses and longer wings, joined by a winding street band. The old final showed isolated, nearly identical red courtyard boxes. Portrait keeps the differentiated roof silhouettes even though wall detail is reduced (`production-0.58/mobile.png`). |
| Distant environment depth | 1.0 | 2.4 | `production-1/desktop.png` separates the near-left Velia street, larger right-hand Palatine fabric, a faded farther settlement and a soft western ridge. The baseline background mostly dissolved into the same brown atmosphere as the ground. The new layers also read above the monument in `production-1/mobile.png`. |
| Sunlight and ending | 1.0 | 2.6 | `production-1/desktop.png` and `production-1/mobile.png` include a visible warm sun, a restrained lit upper rim, readable shaded stone and a shadow toward the viewer. The baseline source was outside the shot and the whole image read as ochre front light. This ending has a deliberate light event, following the useful Stonehenge principle without copying its historical alignment. |
| Monument/context composition | 1.8 | 2.5 | The completed ellipse remains the main subject, the sun sits above/right, and roof fabric frames rather than obscures it (`production-1/desktop.png`). Both the whole monument and sun fit in the final portrait frame. At `.86` the sun is outside the portrait right edge; it enters for the ending, which requires the root's playback review to confirm smoothness. |
| Material separation | 1.8 | 2.3 | `production-0.58/desktop.png` separates pale stone, brown timber, red clothing, terracotta and cool green-gray ground. Late light no longer turns everything orange, but large walls and ground surfaces still read as broad simplified color fields (`production-1/desktop.png`). |

Construction causality, temporal stability, audio and UI are intentionally not
scored from these stills.

## What the request now achieves

The houses are no longer one repeated silhouette scattered around an empty
oval. Their changing heights, roof arrangements and connected lane fronts
create a recognizable city edge at both sizes. The background now has several
spatial layers with distinguishable color/value, instead of relying on a long
aqueduct diagonal over an empty brown plain. The sunset gives Colosseum an
ending of its own: a monumental shaded ellipse under warm western light, with
Rome receding behind it. These are visible changes in the production film
frames, not merely improvements to an isolated Blender asset.

## Honest remaining limits

- The opening still spends a large area on a smooth cleared valley floor
  (`production-0/desktop.png` and `production-0/mobile.png`). The construction
  site can be open, but finer site-ground transitions and more convincing road
  ends would improve its sense of place. Final foreground tracks likewise
  remain broad and schematic (`production-1/mobile.png`).
- Some house wall batches share the same finish, and umbrella-pine silhouettes
  repeat, especially in the larger background grove
  (`production-0.58/desktop.png`). This is reduced repetition, not a fully
  individualized archaeological city.
- The very broad final ground shadow and soft sun disk are stylized. They form
  a coherent lighting composition, but surface richness and optical subtlety
  remain below a high-end cinematic production (`production-1/desktop.png`).
- The new final view prioritizes the western city and sun; it does not show
  every infrastructure endpoint at once. Other film views and the shared
  context/clearance contracts must carry those relationships.

## Recorded browser evidence

| Capture | Desktop calls / triangles | Portrait calls / triangles |
| --- | ---: | ---: |
| 0 | 38 /43,691 | 22 /13,932 |
| .58 | 94 /119,000 | 86 /85,072 |
| .86 | 103 /150,448 | 86 /100,969 |
| 1 | 70 /125,679 | 54 /79,789 |

These are the submitted counts recorded by the capture tool, not FPS claims or
an independent proof of every film frame. Root's full sweep and sustained
playback checks remain separate evidence.

No application or specification files were changed by this reviewer.
