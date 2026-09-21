# Receiving worker and a rejected extraction order

Review: http://127.0.0.1:5590/artifacts/eiffel-face-installation-2026-09-08/review.html

The 82-second delivery now includes a prepositioned receiving worker on a
separate supported standing platform. He waits until 72.5 s, reaches during
72.5–73.5 s, then guides the actual outside tray rail through descent and landing.
The crane/deck carry the load. This is **receiving, not installation**.

Parent built the standing deck, four knees, bearing posts and three-sided
guard rails through actual Blender Lab MCP with a fresh read-only probe.
Editable file: `blender/eiffel-face-worker-platform.blend`; export:
`model/worker-platform.glb`; source: `scripts/blender_eiffel_face_worker_platform.py`.
The source prisms are retained hidden; visible joined wood is an actual Boolean
union. Worker motion uses the existing Web renderer's low-poly limb approach,
with a pure fixed-length IK sampler in `src/engine/eiffelFaceReceivingWorker.ts`.
It is not a Blender-rigged human asset.

## Checked

- The standing deck top is 17.7 m. Actual exported deck rays meet both soles,
  and 121 interior deck probes show no missing Boolean-cut plank area.
- Both 0.38 m upper arms and 0.4 m forearms keep their lengths across 821
  states. During guiding, each hand's inner face meets the actual exported
  tray rail at x=52.24; six time samples test the live GLB rail with raycasts.
- `receiver-worker-audit.json` tests added support/worker primitives against
  the frozen tower and all support frames at 411 poses. Worker versus actual
  articulated crane primitives is also sampled. Payload/rope/crane clearance
  is rechecked with the standing platform added; exact straight sweeps of
  payload/upper legs are retained. It is not continuous rotational clearance,
  full worker-versus-payload body clearance or an exact rope-eye certificate.
- Desktop 1440×900 and mobile 390×844 QA: playback, 12 seeks, exact reverse
  pixels, real pointer orbit, actual crane-tip alignment and no browser errors.
  The final camera moves to an oblique view so the worker does not hide the
  tray. Ground and final desktop/mobile captures were inspected.
- Full suite **599 tests / 83 files**, typecheck and build pass. Logs are in
  this folder. Production main bundle remains `main-rhqaRE78.js`; the 264 s
  main film has not been replaced. The usual large-chunk warning remains.

## Installation finding — act on this next

The main plate is about 37.91 kg. It must not become an unsupported one-person
carry. More fundamentally, the four fitted pads cannot simply be pulled upward
while this plate stays packed. `rejected-pad-extraction.json` uses exact convex
translation sweeps over 0.7 m and finds plate intersections for all four pads.
The reported 59.9–117.3 mm SAT values concern the **swept volume**, not an
instantaneous overlap depth. Do not script that extraction order.

Next work must resolve the assembly/packing sequence and handling of the plate:
either a properly joined prefabricated plate/pad unit, or supported plate
removal before the pads. Then complete supported installation and permanent
fastening. Do not add another decorative action and call the joint installed.
Both kit LODs, occupancy/dependencies and route-cache admission still need a
coherent production update. Existing beam-first ordering must remain: the
preinstalled candidate plate blocks the incoming first beam.

The worker starts positioned on the platform. His access journey, platform
erection, fixings, rated strength, unrigging and permanent installation are not
reconstructed. The broader Eiffel/Paris goal remains active, including legacy
materials originating aloft, other old joint contacts, Paris density/variation,
sky/summit quality and full-film rendering stability. No other wonder started.
No new plugin or skill was installed.

## Reproduction

Use Node 24.4.0. `scripts/audit-eiffel-face-receiving-worker.ts` is compiled as
`audit-worker.mjs` here. Actual MCP wrapper:
`scripts/build-eiffel-face-worker-platform-via-mcp.py`, run with the installed
Blender Lab extension's `.venv/bin/python` and Blender TCP 9876 available.
Run this folder's `qa-review.mjs` against Vite on 5590. Preliminary standing
deck/support searches are retained as bounded evidence, not certified designs.
