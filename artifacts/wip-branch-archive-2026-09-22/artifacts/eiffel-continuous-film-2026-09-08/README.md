# Eiffel film editions — 8 September 2026

The complete film remains available at 829.4267707038563 seconds (13:49.43),
and is the initial selection. The separate cinematic edition lasts 180 seconds.
Choose **Detailed · 14 min** or **Cinematic · 3 min** above the scrubber. Changing
edition restarts that edition and preserves whether playback was running.

The short edit selects one ground lift, one fastening passage and a first-floor
ascent. The surrounding work advances in wider views. It is a cinematic account
of parallel construction; repeating every member and fastener is no longer an
acceptance requirement. The original detailed samplers and saved Blender studies
are preserved. The production renderer still receives the detailed source clock;
the selected edition owns the playback, camera, subtitle and soundtrack clocks.

Phase transitions retain the visible scene. The camera approaches the work and
withdraws into an overview while captions appear above the controls. Six new
local ElevenLabs Adam clips accompany these passages. The original five fact
clips remain in the detailed edition. Captions and audio use deterministic
edition time, including paused and reverse seeks. The camera routes are checked
against the completed tower's actual part bounds in desktop and portrait views.

## Music

Lyria 3 Pro on Vertex AI supports up to 180 seconds per generation; returned
recordings can be shorter. Six new raw takes and prompts are preserved under
`artifacts/soundtrack/eiffel-tower/editions-2026-09-08/`. Five distinct takes form
the detailed score, with five-second crossfades and a 3.1% tempo adjustment.
The short edition has its own complete performance, slowed with pitch retained
from 147.67 seconds to the three-minute film. Neither delivery loops a source
recording or fills its duration with silent padding. The old 60-second files
and raw takes remain available.

Delivery metadata and hashes are in that directory's `manifest.json`.
Integrated levels are -18.0/-18.1 LUFS; measured true peaks are -4.6/-6.3 dBFS.
Technical checks establish duration, clipping headroom, identity and browser
timing. They are not a human listening approval. See `audio/README.md`.

## Paris setting and editable Blender files

The parent used the installed Blender Lab MCP to build a distinct timber booth,
deep hipped eaves, recessed glazing, pointed fence, open gate and attendant,
after inspecting Hippolyte Blancard's 1889 photograph PH76865 in the Musée
Carnavalet collection. The source photograph and catalogue are visible in
`../eiffel-upper-material-chain-2026-09-08/references/captures/entrance-1889.png`.

The editable source is
`../eiffel-upper-material-chain-2026-09-08/blender/paris-photo-entrance.blend`;
the Blender preview is `../eiffel-upper-material-chain-2026-09-08/entrance/blender-review.png`.
The web delivery is `public/models/paris-1889/photo-entrance.glb`. Its 145
authored objects are merged into ten static material batches for the browser.
The entrance sits beside the existing west-market activity, clear of the tower
work area, promenade and neighbouring pedestrian loops. Ground datums were
sampled from the shared terrain function.

This is a photograph-guided interpretation in the existing diorama style.
Colour, hidden faces, dimensions and the entrance's position are inferred;
it is not photogrammetry or an assertion of the photograph's exact location.
Existing city blocks, period traffic and continuous procedural sky remain.
The parent alone performed Blender/MCP work; no plugin installation was needed.

## Preserved detailed studies

`../eiffel-upper-material-chain-2026-09-08/blender/` also retains the upper
freight frame, receiving fixtures, second-floor access bridge and corrected
second-floor machinery bay. The machinery-bay clearance correction is in the
main film. The separate freight/receiver/bridge studies remain editable evidence;
they are not additional mandatory scenes in the cinematic cut.

Specifications: `specs/34-eiffel-cinematic-editions.md`,
`specs/35-eiffel-camera-transitions.md` and
`specs/36-eiffel-cinematic-edit.md`.
Camera evidence is in `camera/README.md`; audio evidence is in `audio/README.md`.
Final build and composed browser evidence are recorded alongside this file.


## Rendering and verification

Exact per-object culling preserves the kit and Palais geometry, and equivalent
relay materials share batches. On far mobile overviews, major iron members still
cast the tower shadow; fine lattice shadows return for close views. The source
meshes themselves remain visible at every distance. The articulated Guyenet
crane now retains its 40 source meshes in seven material batches, with every
nested role transform and hoist-drum pose copied into those draws. No city,
traffic or source geometry was deleted to reduce the rendering cost.

The earlier CSL build passed all 1,002 tests and a 110-frame browser sweep had
zero runtime errors, but 11 early mobile frames exceeded the 150-call budget.
That failed sweep is preserved in `production-final-culling/report.json`.
The subsequent Guyenet batching correction addresses the measured call cause;
its separate full-suite and final production review are recorded below. Keep the 450,000-triangle / 200-call desktop and 300,000 / 150 mobile
budgets. A Chromium viewport sweep is not native iOS or whole-film FPS evidence.


### Final local review

`final-verification.json` binds the final build to its evidence. The served entry
is `main-CCYCtcGU.js`, SHA-256
`95dcc6e54450c869cba17c8447c070e940c8c4f8e4a60dcdb9f2168d36aa4614`.
The full suite passes 1,002 tests in 190 files (215.37 seconds), followed by
passing typecheck and build. Sixteen actual HTTP assets, including the dynamic
Guyenet JavaScript chunk, match bundled bytes; 505 source/spec/test hashes match.

The separate `production-final-guyenet/report.json` passes all 110 sampled
frames, with zero console/page errors. Desktop peaks at 424,937 triangles and
154 calls; mobile peaks at 289,274 and 141, within the unchanged caps. The report
records requested and actual slider times, including the native 0.001 step.
Eight representative screenshots are retained. Parent independently inspected
the final desktop joint closeup and mobile wide view: the crane, main shadows,
city and floating caption remain visible. Fine hand/tool detail is partly
obscured by foreground lattice. This does not certify every frame, physical
operation, native device or audible musical transition.

Review locally at http://127.0.0.1:5589/?review=eiffel-editions-ccyc#/wonder/eiffel-tower.
Detailed remains the default; the selector above the scrubber offers Cinematic.
The broader world-wonders goal remains active. Preserve all prior Blender,
audio and verification files; these editions do not delete the long study.
