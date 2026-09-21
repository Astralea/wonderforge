# Ground-to-original-second-cart diagonal supply — 2026-09-08

Parent actual Blender Lab MCP probed live Blender and saved
`blender/eiffel-diagonal-winch.blend` plus `model/diagonal-winch.glb`.
21objects/18meshes:8support/source parts and10drum/guide hardware meshes.
Read mcp/ and mcp-run.log. The receiver was also re-exported throughMCP with
17sourceprisms after splitting its front head into two segments; frame-mcp-run.log.
Prior receiver geometry/Blender files preserve before-rope-clearance versions.

The independent guide-post layout collided with shaft braces; symmetric widths
.3,.4,.6,.7,.8,1.0 did not resolve it. Replaced with two1m risers on the existing
rear head, v±.6, and1.18m outriggers supporting the fixed guide. Risers bottom
Y120.72 contacts actual rear-head top; the winch bed rests on116.14m floor.
Design/audit attempts are preserved before-clearance/before-bracket/
before-riser-inset. Current source8prisms,4bed corners,8riser corners,18worker
parts and103rope samples clear the audited environment. This is not a capacity,
stability, power or erection certificate.

Local U follows the6.862215m diagonal from(-8.5,-4) to(-15,-1.8).
Drum U=L+3.6,Y117.05,R.30; fixed guideU=L+2.8,Y121.35,R.25.
Travelling sheaveU=cargoU+.25,Y121.35; trolleywheelaxisY121.495.
`eiffelDiagonalRig.ts` constructs drum tangent→fixed upperarc→horizontal run→
travelling quarterarc→vertical hook. Deployedlength accounts for horizontal and
vertical motion; drum/fixedsheave rotation follows cable travel. Travelling
sheave spin follows vertical cargo motion, wheels follow trolley distance.

`eiffelDiagonalSupply.ts` composes302s SAME cargo:
- earlier ground/first-cart sequence through166s, secondslings attach163–166;
- lift166–272; diagonal transfer272–288; lower288–292;
- release292–296; emptyhook rises .6m296–298; holdthrough302.
Cargo remains on the ORIGINAL first-asset root the whole time; second-cart at
(-15,116.14,-1.8) is the existing upper-relay cart. No second sourcecargo swap.
The old compact secondreceiver is not present in this new viewer.

Web: http://127.0.0.1:5590/artifacts/eiffel-diagonal-winch-2026-09-08/review.html
Desktop/mobile19seeks include166/166.001, arrival/unrig/emptyhook and reverse;
actualcargo/trolley/worldcart match sampler, exactlyonecargo, liveplay and
viewcontrols pass without pageerrors/overflow. web/qa.json. Parent inspected
first-cart145s, transfer280s andmobile302s. Camera transitions250–272 from the
first-stage overhead offset to an interior side view; earlier camera captures
are preserved in web-before-lower-camera/ and web-before-camera-profile/.

Still unfinished: powered winch/trolley drive, brake, wheel lateralretention,
stability/anchorage, riggers, erection and integration into main. Next join this
same cargo at302s to the existing upper-relay cart/197m study once mechanisms
and clearances are coherent. This is a rope/transport study, not production
construction completion. Main264sParis and older290s study remain available.

Validation:715tests/117files pass with npm run test -- --maxWorkers=4;
typecheck/build pass. Earlier fullrun captured tests under active agent edits
and a foundation-crew5s timeout underhighload; preserved tests-before-final-review.log.
Final files were frozen before the successful full rerun; no timeouts relaxed.
Actualwinch tests verify8sourcecorner sets, bed/riser contacts,10hardwaremeshes,
rope clearances including flanges (only guidegroove/drumcore tangent exclusions),
and the actual trolley translated+.25 before sweepingL. Wheel/rail tolerance
20micrometers; other envelope penetrations use1micrometer. See tests/logs.
Maximumstudy metrics: desktop82082tris/108calls,mobile83070tris/112calls.
