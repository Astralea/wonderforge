# Ground lift followed by a supported receiver transfer

Review: http://127.0.0.1:5590/artifacts/eiffel-face-transfer-2026-09-08/review.html

This 82 s study extends the prior actual Blender package/cart/bridle lift.
The original same-sized packed load remains visible from the ground cart
through alignment, crane transfer, descent and deck contact. The receiver is
new actual Blender Lab MCP geometry, saved in `blender/eiffel-face-receiver.blend`
and exported as `model/receiver.glb`. Read-only connection and build responses
are under `mcp/`; `blender-build.log` confirms the live Blender 5.2.1 LTS run.

## State and scope

- 0–42 s: prior parked/rigged ground setup and continuous vertical lift.
- 42–48 s: align tray from -6 degrees to zero yaw at height 22.065 m.
- 48–64 s: crane moves the package to x=52, z=-43.1.
- 64–76 s: lower origin to 18.488 m; its -0.288 m bearing feet meet the
  receiver deck at 18.2 m.
- 76–78 s: deck takes 80% of the static weight; taut bridle retains 20%.
  Hold to 82 s. The steel parts remain packed, never claimed installed.

The receiver deck is .86×1.4 m, 120 mm thick, with two headers, four knees
and three distinct bearing posts. Posts meet the existing supported frame
at y=15.72. The visible Blender mesh unions its timber joints while retaining
hidden editable source prisms. The deck is a receiving shelf, **not worker
access**. Its erection, fixings and rated load capacity are unverified.
The lateral motion is quasi-static kinematic animation, not a pendulum or
rigid-body dynamics simulation. Ground loading/rigging, exact rope-eye contact,
unrigging, extracting parts, worker access, permanent installation and the
main production kit replacement are still unfinished.

## Verification

`transfer-audit.json` checks 411 poses at 0.2 s: actual package bounding envelope,
four upper-leg envelopes, full hoist rope and 623 articulated crane primitives
against the frozen tower and both support frames. Added supports have no
penetration into the prior fixed context. Working crane members clear fixed
guides/anchors/screw at every sampled pose. Additional exact whole straight
sweeps cover payload and upper legs during lift, lateral translation and descent.
All listed hit arrays are empty. Rotational/slew sampling is not a continuous
clearance proof; other crane self-pairs and payload-versus-crane remain outside
this audit. The timber union is bounded by the audited source prisms.

Actual GLB tests cast 231 rays across the exported deck and check the four
payload contact points, all three frame-bearing feet, source hash and bottom
extent. Pure sampler tests cover all phase joins, 821 forward/backward states,
reach and positive main-rope length. Browser QA separately exercises desktop
1440×900 and mobile 390×844 playback, 12 seeks, exact reverse pixels, pointer
orbit, actual crane-tip/rope agreement and shader/console/network health.
`qa/report.json` records zero errors, zero changed reverse pixels and maximum
actual crane-tip residual 4.92e-8 m. Captures were inspected; the cargo camera
now rotates outward during transfer to expose the receiving deck.

Full suite: **597 tests / 82 files pass** (`test-retry.log`), typecheck/build pass.
The first full run had one existing 15 s rigger test timeout; the unchanged
suite passed on rerun. This was not hidden or fixed by weakening its assertion.
Focused receiver tests were rerun after adding actual foot-contact probes.
Vite's existing large-chunk warning remains. Main bundle stays `main-rhqaRE78.js`;
this study is not integrated into the production 264 s movie.

## Sources and next work

Engine: `src/engine/eiffelFacePackageTransfer.ts`. Blender builder:
`scripts/blender_eiffel_face_receiver.py`; actual MCP wrapper:
`scripts/build-eiffel-face-receiver-via-mcp.py`. Clearance:
`scripts/audit-eiffel-face-transfer.ts`, compiled here as `audit-transfer.mjs`.
Preliminary location/support searches are preserved, including rejected anchors.
Use Node 24.4.0 and the installed Blender Lab extension's `.venv/bin/python`.
Run this folder's `qa-review.mjs` with Vite serving 5590.

Next is worker access plus supported extraction/installation of the five loose
pieces after both beams seat. Do not preinstall the candidate joint: the prior
incoming beam intersects it. Both kit LODs, manifest occupancy, dependencies
and route cache must be promoted together once the full delivery/install chain
passes. The broader Eiffel/Paris goal remains active, including legacy high-origin
materials, other original joints, Paris density/variation and rendering stability.
No other wonder started and no new plugin installed.
