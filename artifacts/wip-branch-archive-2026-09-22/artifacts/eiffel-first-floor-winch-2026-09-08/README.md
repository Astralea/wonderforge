# Ground to first-floor receiving mechanism

Parent used the installed Blender Lab MCP after a fresh read-only connection
probe. The separate 79-object scene is saved as
`blender/eiffel-first-floor-winch.blend`; export `model/first-floor-winch.glb`.
Evidence: `mcp/mcp-readonly-probe.json`, `mcp/mcp-build-result.json`.
No plugin installation was needed.

The interpreted 22-prism head-frame rests on the verified first-floor deck
at57.94000244140625m. It reauthors taller mast/brace endpoints and uses a
rigid root rotation/translation; no structural part scales during animation.
The sheave is at63.00000244m, leaving1.05m above the hook at maximum cargo
height. A traveling trolley carries the same suspended crate1.75m inward.

`src/engine/eiffelFirstFloorSupply.ts` drives a128s excerpt: grounded stock
0–6s, hoist6–112s, traverse112–120s, lower120–124s, received124–128s. The crate
starts with bottom0 on shared level terrain atx-19.75,z-4 and ends with bottom
on the real first-floor deck atx-21.5,z-4. Peak ascent speed is below.85m/s.
The shared rig sampler accepts an optional sheave/reference-height profile;
existing upper receiving and second-floor samplers retain their defaults.

Review: http://127.0.0.1:5590/artifacts/eiffel-first-floor-winch-2026-09-08/review.html

## Evidence and limits

Full666tests/105files, typecheck and build passed. The final4-test contact
check and typecheck also passed after removing an incidental exact Float32
assertion. Logs are in this folder; the existing build chunk-size warning remains.

Tests check all fixed frame prisms against completed stage45 iron, whole crate
sweeps, actual exported skid corners against real floor triangles, every
exported trolley mesh through its travel, and fixed-size/continuous rope poses.
The four wheel/rail contacts show3.685 micrometers of Float32 quantization;
only named rolling contacts use20 micrometers tolerance, with a separate
wheel-bottom/rail-top contact assertion. Other collision pairs use1 micrometer.
The test accepts future exports with smaller contact error rather than pinning
that incidental Float32 value.

Desktop1440x1000 and mobile390x844 QA each covers9 time samples including
backward seek, live playback, overview/follow controls, console and overflow.
Parent inspected desktop ground/transfer and mobile receiving captures.
Evidence is `web/qa.json` and images; the snapshot reads the actual GLB cargo's
world position. A local ground plane and cargo shadow make the ground contact
visible. This is a mechanism viewer, not a new Paris background pass.

This is not a complete powered reconstruction. Steam drive, brake, trolley
drive, operating crew, hold-downs, erection and supported first-to-second-floor
transfer remain required. The test crate is not yet a final structural iron
member. Main production v15/264s is unchanged; do not claim full-film repair.
Next connect this first landing to the second-floor lift while preserving the
same load and physical support at the handoff. Keep the overall goal active.
