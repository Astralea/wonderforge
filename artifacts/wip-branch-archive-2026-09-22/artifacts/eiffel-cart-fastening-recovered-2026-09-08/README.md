# First-floor cart fastening study

Stationary, preassembled geometry for the existing real 5.9925 m member/carrier
on the existing first-floor stock cart. This is an isolated review asset, not
an update to the main construction animation.

The parent uses the installed Blender Lab MCP, with a read-only live probe
before building a separate scene. Prior assets are preserved. Four 18 mm
shafts run through actual 20 mm bores in the shoe, timber bed and 600 × 600 ×
20 mm underside spreader. Upper washers contact the shoe; lower washers and
nuts bear against the spreader. Its outline clears the original wheel-bearing
blocks. Shoe bottom remains 340 mm above the wheel contact plane.

- `blender/eiffel-cart-fastening.blend`: saved Blender scene.
- `model/cart-fastening.glb`: browser asset with named role extras.
- `design.json`: authored dimensions and explicit admission limits.
- `mcp/`: live probe and generation response.
- `review.html`: top, underside and whole-load orbit views.

Run the local review at
http://127.0.0.1:5590/artifacts/eiffel-cart-fastening-recovered-2026-09-08/review.html .

## Limits

Smooth shafts and bored nuts represent fastener envelopes; there are no
resolved threads, preload, rated strength or historical replica claims. The
model is already assembled. No bolts appear during the existing hoist, no
unhooking occurs, and no cart transport is admitted. Tightening access, actual
release hardware, load/cart stability, drive/braking and later relay routes
remain necessary before production integration. The existing closed sling
loops cannot simply be detached from their closed eyes without an opening
interface; that release mechanism remains unfinished.

## Actual verification

Four focused asset tests pass: unchanged member dimensions and shoe seating;
actual measured shafts and through-bores; both sides of sixteen washer/head/nut
interfaces; all added hardware vs existing rods, axles and bearings. The
shoe/bed mismatch is7.45nm and maximum interface mismatch18.63nm, both inside
the20µm export tolerance. Radial bore sampling retains at least.9mm shaft
clearance. This is not exhaustive triangle-pair or capacity verification.

The two imported collars were subsequently rebuilt with .40 m outer width,
retaining .06 m thickness, .15 m square payload opening and four .030 m rod
bores. The old .37 m outline touched the bores at zero-thickness tangent points.
Both corrected collars now pass the strict welded-edge test; all46combined
meshes pass, with no omitted meshes. Earlier failing audits/assets are retained.

The assumed-density volume study now gives1796.9003kg and COM height2.901626m,
with a conditional quasi-static tipping threshold.842691m/s². Iron7850 and
timber650kg/m³ are assumptions; this does not establish actual historical mass,
connection strength, traction, braking or dynamic stability. It is an animation
planning calculation, not a demand for engineering certification.

`model/long-load-carrier-corrected.glb` separately exports only the same9carrier
meshes at bottom-origin0. An additional test matches every transformed vertex
against the seated assembly minus.34m and excludes cart/fastener hardware.
The existing closed-sling hoist review now uses this corrected asset, with
unchanged engine trajectory and rigging. Desktop/mobile11seeks, reverse/play
and orbit pass (`hoist-web/`, `hoist-qa.log`). The prior review source is saved
as review-before-collar-fix.ts in the closed-sling folder. No production/main
scene change is implied.

Desktop1440×1000/mobile390×844 four-view controls, repeat view, pointer orbit,
no page errors and no overflow pass. Parent inspected the top and corrected
mobile underside captures. Peak8164 rendered triangles.

## MCP recovery

The initial all-object import in the desktop instance timed out; it is preserved
in the sibling non-recovered folder and may still be running. The corrected
build ran through the installed official Blender MCP addon in an isolated
background process on9877. No plugin installation was required. A first startup
with factory settings lacked the configured extension repository; normal
background startup loaded the installed addon successfully.

The first recovered export had iron material on the wooden bore; it is retained
under before-bore-material filenames. Cutters now use the target material.
MCP saved-file-check.json reads back one scene,48objects,46meshes. The new .blend
is913KB. The temporary background process45170 was stopped after saving and
verification; the user's original desktop Blender process was not terminated.

Full-suite results follow in tests.log, typecheck.log and build.log. The first
full run had741passes and one existing foundation-crew5s timeout. Its exact log
is retained as tests-first-timeout.log. Rerun uses --maxWorkers=2 with unchanged
assertions and timeout values.


Final rerun:742tests/126files passed, typecheck passed, build passed (existing
bundle-size warning). Commands/processes for recovered build and verification
are terminal. Original desktop import state remains separate as described above.

## Collar correction verification checkpoint

Six focused asset tests pass, including strict collar manifold/bore/ligament
checks and separate-carrier equality. The carrier remains .44m wide/deep and
6.3175m high. Parent inspected mobile collar and live desktop80s hoist captures.
MCP saved-file-check-after-collars.json reopens the saved library metadata.
Final full-suite results are in tests.log; prior743-test checkpoint is preserved
as tests-before-separated-carrier-gate.log. Earlier742-test figures above refer
to the fastening-only checkpoint. No structural certification is required for
this visual animation task; credible support, contact, operation and continuity
are the remaining animation requirements.

Final current verification:744tests/126files passed, typecheck/build passed.
The isolated background Blender process54703 was stopped after successful
save/re-read; the original desktop import remains separate.
