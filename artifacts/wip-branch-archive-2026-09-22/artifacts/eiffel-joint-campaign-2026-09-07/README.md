# Two ground deliveries and a supported splice — 2026-09-07

The local main Eiffel movie now includes a135-second two-load passage. It starts
at70.516s (about27% of the264-second film). Both independent iron members are
visible on ground stock carts, are rigged by workers, rise in fixed basket
slings, and seat at campaign46/114s. The first waits on real braced falsework
while the second arrives. Captive steel plates ride up on the first member,
slide across the joint and are fastened by a worker on a supported platform.
They remain after the temporary equipment leaves under an explicit editorial
cut. The existing first ground-lift passage is retained.

Review: http://127.0.0.1:5589/?review=eiffel-supported-joint-v12#/wonder/eiffel-tower

## Blender source and actual assets

Parent used the installed Blender Lab MCP, with a read-only probe before each
build. No new plugin or third-party model generator was installed. Editable
source is `blender/eiffel-joint-campaign.blend`; `blender/mcp-readonly-probe.json` and
`blender/mcp-build-result.json` record the actual bridge calls. Reproduction scripts:
`scripts/blender_eiffel_joint_campaign.py` and
`scripts/build-eiffel-joint-campaign-via-mcp.py`.

The new model has22 braced timber members and4 boxes, two reusable period
carts with independently rolling spoked wheels, and real slotted steel plates
with retaining pins. Full-width50mm deck channels clear the underside of the
basket slings. `public/models/eiffel-joint-campaign/` contains the three GLBs
and their manifest. Web crew and flexible ropes are articulated by deterministic
engine samplers; the saved Blender file is an editable model, not a baked
135-second animation.

The earlier photo-led Paris model remains in
`artifacts/paris-photo-study-2026-09-07/blender-final/paris-1889.blend`, with
historical references and glass/water evidence in that folder and
`artifacts/eiffel-flicker-2026-09-07/`. This is reference-led modelling, not
single-image photogrammetry or a claim of photographic realism.

## Verification

- Full suite:581 tests across76 files passed. The subsequent editorial-cover
  change passed37 focused film/UI tests. Typecheck and production build pass.
- Final two-load physical contract:6 tests, including the evidence seal.
-6,751 sampled articulated states at20ms intervals and104 conservative swept
  translation enclosures: no new external penetration beyond the explicitly
  named existing final-joint contacts. Curved paths are sampled, not a formal
  continuous collision proof.
- Actual Blender cart geometry:50 validated closed-box primitives,135,100
  transformed states against tower/support, both loads, all four basket loops
  and the other cart. No penetration. Slots are also checked by real GLB
  raycasts, not just metadata.
- Actual platform worker/tool:48,618 source-mesh states, fixed arm lengths,
  planted feet, plate grips and wrench contact. Ground slingers are checked
  against both carts, loads,1,900 completed tower solids and245 supports.
- Hardware batching preserves every transformed Blender vertex while reducing
  eight hardware submissions to two. The final campaign capture has maximum
 163calls/212,264triangles desktop and149calls/148,911triangles at390×844.
- `qa-final/report.json`:19 seeks per viewport, three actual playback intervals,
  natural transition into completion, and replay; no page/console errors.
  Production bundle for that campaign pass was `main-DK8-zYKb.js`.
- The final `main-tcABPxYm.js` adds only the opaque bridge between editorial
  cards separated by0.101s of compressed production. `qa-cut-final/` checks
  that transition through real playback and captures the finished Paris view.
  This prevents a bright construction frame flashing between the two cards.

Early `qa/` videos include superseded harness attempts: the driver initially
tried to click auto-hidden chrome, requested a seek smaller than the range
step, and expected a paused seek to enter complete automatically. The final
driver wakes chrome with real pointer movement and reaches complete by actual
playback. Only completed reports are used as evidence.

## Remaining work — goal is still active

This is improved ground provenance for two additional members, not completion
of the full Eiffel construction goal. Many other members still enter through
the legacy elevated receiver schedule; equipment installation/removal and
stock loading remain explicitly omitted.

The original kit contains seven named final connection overlaps. In particular,
`lower-ne-02-m015-c000` is a thick, wrongly oriented gusset slab through which
the first selected member passes at its final pose. The current clearance gate
allows that pre-existing connection; it does not certify a nonpenetrating
finished joint or structural capacity. `NEXT-JOINT-GEOMETRY.md` records the
specific Blender/source identity/dependency correction required next.

The fastening camera now looks down over the foreground diagonal; hands and
plates are clearer, while part of the worker's head remains occluded. Distant
city materials and people remain stylized. Continue those issues before moving
to another wonder or declaring parity with Giza.

The final full-city capture still shows repeated far-bank courtyard blocks and
sparse open areas. Treat the historical-image background request as only
partially satisfied; selected Exposition details improved, the full city has
not reached photographic realism.
