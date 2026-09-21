# Independent ground package and playable vertical lift

Local review: http://127.0.0.1:5590/artifacts/eiffel-face-package-2026-09-08/review.html

Parent built the compact fitted timber tray, five loose steel joint pieces,
ground cart and four-leg bridle through the actual installed Blender Lab MCP,
with a read-only probe before each build. Editable sources are saved as
`blender/eiffel-face-package.blend` and `blender/eiffel-face-package-bridle.blend`.
The Web review loads their actual GLBs, the existing Blender Guyenet crane,
the frozen production tower kit and 245 support solids.

## What can be reviewed

The 46-second study begins loaded, parked and already rigged. During 0–2 s
the taut bridle takes over the cart reaction; during 2–42 s the same rigid
tray rises from origin height 0.858 m to 22.065 m at fixed orientation. It then
holds for transfer. Only the winched main rope changes length. The cart stays
on the ground; the bridle, payload and crane structural members keep their
sizes. Play/pause, seek, orbit and cargo/crane/overall views are available.
The geometry study has simple ground and frozen construction context; it does
not replace the Paris environment or the main 264-second movie.

## Evidence and limits

- Actual payload mesh mass is 105.664915 kg using iron 7800 and timber
  600 kg/m³. Its measured centre of mass sets the hook and positive four-leg
  force distribution. Tiny overlapping strap junction volumes are counted;
  this is not a solid-union mass or engineering load-capacity certificate.
- `package-measurements.json` records lower-face contact rays for all five
  iron pieces. Four actual bearing feet meet solid cart planks at 0.57 m.
  Contact sampling alone does not prove friction, retention or strength.
- `crane-column-audit.json` finds no collisions for the exact whole vertical
  package envelope, four upper-leg envelopes and full hoist rope against the
  fixed context. The 623 crane primitives pass 21 articulated poses against
  that context. Working members also clear the fixed guide/anchor/screw roles
  at the selected static yaw of 128.458328 degrees and reach 7.222546 m.
  This is not admission of every intervening slew angle or crane self-pair.
- Rope-eye links are actual perpendicular rings; exact eye contact, package
  versus crane, ground approach/crew, loading/rigging, onward transfer,
  supported placement, fastening and the full main-kit replacement remain
  unadmitted. The endpoint is suspended, never represented as installed.
- `qa/report.json` records desktop 1440×900 and mobile 390×844 real Chromium
  playback, nine seek states, exact reverse pixels, pointer orbit, shader
  health, actual crane-tip/rope agreement and no browser errors. Inspected
  captures include ground, half-lift and overall; these are component review
  evidence, not a whole-film historical realism or flicker certification.
- 595 tests / 81 files pass (`test.log`), with typecheck and build passing.
  New tests bind actual GLB hashes, actual cart bearing contact, fixed bridle
  lengths, force balance and deterministic reverse sampling. Vite retains
  its existing large-chunk warning. The main production code is unchanged.

## Reproduce

Use Node 24.4.0 under `/Users/hina/.nvm/versions/node/v24.4.0/bin`.
The actual MCP wrappers are `scripts/build-eiffel-face-package-via-mcp.py`
and `scripts/build-eiffel-face-package-bridle-via-mcp.py`; run with the
installed Blender Lab extension's `.venv/bin/python`, with Blender TCP 9876
available. They preserve separate scenes and response evidence.

Mass and column sources: `scripts/measure-eiffel-face-package.ts` and
`scripts/audit-eiffel-face-package-crane.ts`; their compiled `.mjs` outputs
are saved here. Playback: `src/engine/eiffelFacePackageLift.ts` and this
folder's `review.ts`. Run `node artifacts/eiffel-face-package-2026-09-08/qa-review.mjs`
against Vite on 5590 for browser checks.

Goal remains active. Next mechanics work is transfer and supported installation
of this separately delivered joint after the two beams, then coherent main-kit
LOD/manifest/dependency/route-cache admission. Remaining original contacts,
legacy materials originating aloft, Paris variation/density and full-film
render stability remain open. No other wonder started; no plugin installed.
