# Diagonal receiver empty trolley fit — 2026-09-08

Parent actual Blender Lab MCP probe/build/export saved
`blender/eiffel-diagonal-trolley.blend` and `model/diagonal-trolley.glb`.
17 meshes under one rigid trolley root: four bored wheels, two axles, four bored
bearing blocks, a top plate, two bored sheave hangers, one sheave shaft, one
bored groove and two bored flanges. wf_part metadata is explicit. The initial
unbored sheave export/source blend is preserved with before-sheave-bore names.

Wheel radius .115m, root/wheel axes at121.495m, actual rail top121.38m.
Sheave center121.35m. A full moving-mesh sweep found initial portal-head
penetrations up to.189986m; portal heads were lowered to center120.61m,
top120.72m meeting girder bottoms, with post tops120.50m meeting head bottoms.
Old receiver design/GLB/blend preserved with before-sheave-clearance names.
The receiver frame was re-exported via parent MCP; frame-mcp-run.log records it.

`src/engine/eiffelDiagonalTrolley.ts` is a16s empty kinematic fit over6.862215m.
The viewer updates one actual trolley root, preserving rail height, and rotates
wheel geometry by minus distance/radius around the exported axle axis. The parked
crate remains on the old cart throughout. This is not powered cargo handling.
Drive, connected rope, braking, wheel lateral retention, bracing, anchorage,
crew access and erection remain unfinished. Do not admit into production yet.

Reproduce Blender via scripts/blender_eiffel_diagonal_trolley.py and
scripts/build-eiffel-diagonal-trolley-via-mcp.py. Receiver geometry comes from
scripts/plan-eiffel-diagonal-receiver.py and its existing MCP wrapper.

Review: http://127.0.0.1:5590/artifacts/eiffel-diagonal-trolley-2026-09-08/review.html
Main animation and prior290s supply sequence remain unchanged.

Independent geometry gates pass after the portal correction: all17actual moving
mesh envelopes clear frame/tower/bothbridges overfulltravel, allowing onlynamed
wheel/rail contact. Fouractualwheelbottomcenters atfivepositions ray-contact actual
exportedrailtriangles within20micrometers. Allmetadata counts asserted; actual
wheel/bearing/hanger/groove/flange bores admit shaft-axis rays, while shafts remain
present on their axes. Receiver actualvertex/foot tests were repeated afterreexport.
The rigid-box sweeps are conservative and do not certify load/stability.

Browser QA: desktop1440×1000/mobile390×844, sixseeks including reverse tozero,
liveplayback, actualpointerorbit, noerrors/overflow. Actualtrolley worldpose and
allfourwheelquaternions match clock; parkedcrate remains fixed. Evidenceweb/qa.json,
parentvieweddesktop8s andmobile8s.72688triangles recorded. Mainunchanged.

Full707tests/114files, typecheck andbuild pass; logs inthisfolder.
