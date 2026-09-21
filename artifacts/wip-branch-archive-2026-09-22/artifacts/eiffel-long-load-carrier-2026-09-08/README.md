# Actual long-load carrier and first-floor hoist

Review: http://127.0.0.1:5590/artifacts/eiffel-long-load-carrier-2026-09-08/review.html

This128-second study transports the actual5.992500305m `summit-access-stair-m000-c000` member from ground level to the first-floor cart. It preserves the member dimensions and keeps the same carrier and payload through the route. This is separate from the main film and the old488-second proxy study.

## Blender asset

Parent used the installed Blender MCP after a read-only probe to save `blender/eiffel-long-load-carrier.blend` and export `model/long-load-carrier.glb`. Source: `scripts/blender_eiffel_long_load_carrier.py`; reproducible invocation: `scripts/build-eiffel-long-load-carrier-via-mcp.py`. The result contains nine meshes under one tagged root: the real member, bottom shoe, four tension rods, two lateral collars and a head plate with four unioned bored lifting eyes.

The0.08m bottom shoe bears the member. Four15mm-radius rods meet the shoe top and head underside; collars at1.25m and4.75m have real payload openings and matching rod bores. Carrier plate top6.232500305m, overall eye top6.317500305m, exterior width/depth0.44m. Sling endpoints use the inner eye radius minus8mm cable radius. The ring holes and plate/eye connections are geometry, not painted details. This is an interpreted unrated carrier, not a measured historical replica or a load-capacity claim.

## Continuous motion

Pure `src/engine/eiffelLongLoadHoist.ts` lifts the entire carrier, traverses above the open hatch, and lowers the shoe to firstFloor+.34m. Six seconds of initial hold, hoist6–112s, transfer112–120s, lower120–124s, attached hold124–128s. Carrier bottom during transfer is firstFloor+.54m. Drum, sheave and trolley follow the raised receiving rig; rail-wheel rotation retains initial wheel orientation. The four sling contact points follow the actual carrier eye centres. The hook location is6.882500305m above carrier bottom.

The load remains attached after landing. No cart motion, sling release, unloading or final tower installation is asserted. Rigging is already attached at the opening; its manual assembly is not animated. The visual sling apex is still a mathematical junction: the hoist master link/hook hardware remains to be modelled, along with powered drive, brake, cart fastening and equipment erection.

## Evidence

- `carrier-audit.ts/json`: full0.44×6.317500305×0.44m carrier envelope clears all four prior route translation legs against11386 stage45 tower envelopes,449 bridge prisms and21 raised-frame prisms. Open-hatch legs include the real rotated five planks. All12 rigged strand-leg sweeps clear; the optional fourth onward cart leg is geometry-only and is not animated.
- Maximum hook65.362502747m leaves0.637499693m beneath the proposed sheave. This is a geometric bound, not crane capacity.
- Independent actual-asset tests verify original member dimensions and four bottom contacts on the shoe; all four rod ends contact shoe/head triangles; two collar openings are checked in32 radial directions each; four eye bores permit the prescribed rope endpoints and through-bore directions. Most mesh/contact gates use20micrometre tolerance. Eye inner-face comparison uses0.1mm for the48-sided bore tessellation and does not claim ideal-circle exactness.
- Pure motion tests cover phase continuity, positive hanging rope length, real eye contact offsets, retained attachment and supported final height.
- Desktop1440×1000 and mobile390×844 each pass11 seeks, reverse seek, live play, overview/follow and pointer orbit. Browser verification checks actual exported payload bounds against5.992500305m and its0.08m offset above the carrier origin, rather than merely echoing engine coordinates. No page errors or horizontal overflow. Parent inspected desktop80s and mobile128s.

Full verification logs, actual MCP responses, and browser captures are retained here. Remaining gates include actual apex hardware, load rating/stability, cart attachment and release workers, later receiver upgrades, broad-panel routes, final member placement, production integration and all other Eiffel/Paris goal requirements. No next wonder has been started.

Full project verification:728 tests in122 files passed, followed by successful typecheck/build (existing bundle-size warning retained).

After the full run, an additional actual final-bearing test verifies all four shoe-bottom corners against actual cart-bed triangles within20micrometres. The final focused carrier/hoist suites passed7 tests; agent typecheck also passed after that addition.
