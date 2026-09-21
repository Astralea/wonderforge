# Current loading-wave verification

Read-only check on 2026-09-13 JST. No application source was changed.

The live local HTTPS page served `main-CarPen2B.js`; the current dist stylesheet is `main-CdvrPBT9.css`. The loader still includes the SVG wave and its 3.6-second infinite CSS translation. The loader TSX/CSS hashes exactly match the September 12 implementation whose desktop and mobile screenshots proved visible movement at unchanged 80% and film time 0.

Current `current-stall-a.jpg` captures the actual current dist with a real model request delayed by the temporary loopback preview server. At 2026-09-12T19:18:54.092Z, readiness was 80%, film time 0, and the wave had transform `matrix(1, 0, 0, 1, -78.5444, 0)` with the 3.6-second infinite animation. `observations.json` records the read-only DOM measurements. `current-stall-b.jpg` is already ready: its name does not imply a second fixed-progress sample.

A reload to obtain a current paired sample became unresponsive to browser inspection. No current paired-motion claim is made. The existing paired proof is `../eiffel-modeling-2026-09-12/loader-verification.json`: desktop 8.122 seconds and mobile 33.543 seconds, both at 80% and film time 0, with visibly changed wave edges.

This animation does not depend on percentage updates. However, the animated element is an SVG clip path, so uninterrupted compositor execution during synchronous model parsing or GPU setup is not guaranteed. Inspection timeouts alone do not prove a visible animation freeze. Reduced-motion intentionally disables the wave; zero percent uses an outline pulse and 100% uses a complete fill.

The temporary 127.0.0.1:5590 server was stopped and its listener verified absent. The existing HTTPS/5589 service and parent tabs were untouched. Closing the owned tab 1736589980 timed out during browser unresponsiveness; it was not marked for preservation and remains eligible for automatic ephemeral-tab cleanup.
