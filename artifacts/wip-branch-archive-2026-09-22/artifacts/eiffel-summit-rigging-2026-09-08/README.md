# Upper freight relay and paired crane study — 2026-09-08

## Source changes the implementation direction

William Watson, *Civil engineering, public works, and architecture: Paris Universal
Exposition,1889*, Washington Government Printing Office, **1892**, printed
pp823–824, §§345–346, Fig239 and PlateXVI. The filename1889 describes the
Exposition, not the publication date. Complete source PDF/OCR and rendered PDF
pages345–347 are retained here. Canonical source:
https://archive.org/details/civilengineering00wats

The report describes first-floor and second-floor steam winches, followed by
another at the197m Edoux intermediate floor, supplying the upper erection cranes.
Those cranes are a back-to-back pair on vertical central elevator guide pillars,
with three3m auxiliary frames, temporary beams, bolts and backup jacks. This
supports a relay logistics architecture rather than a giant summit gantry or
an undocumented single uninterrupted ground-to-top lift.

Current kit manifest/source inspection found no deck material meshes between
185 and205m and no modeled Edoux intermediate platform/central guide system.
This is missing supporting architecture, not a license to float a winch there.
The earlier central-shaft prefetch is an authored clearance proposal, not the
historical relay. Preserve its results for reuse, but do not call it a replica.

## Actual Blender model

Parent used the installed Blender Lab MCP with a fresh read-only probe and
scripts/blender_eiffel_vertical_pair.py. Existing articulated Guyenet parts are
adapted to vertical guides and duplicated back-to-back. Three3m auxiliary frames
and shared lattice guide pillars are authored. The two reference pages are
packed into the saved .blend. Unlabelled sizes reuse authored prototype dimensions.

- blender/eiffel-vertical-pair.blend
- model/vertical-pair.glb
- renders/vertical-pair.png

Initial render showed inward-pointing jibs crossing the guide; it was rejected,
retained as vertical-pair-before-yaw-correction.png, corrected in source and actual
MCP scene, then re-exported/saved/rendered. The actual exported GLB test verifies
both tips point away from the central guide and oppose one another. This test is
not a complete contact, swept-clearance or installation certificate.

**Not production-ready:** no actual tower anchorage, guide erection, crane climbing
lifecycle, operating ropes/cargo, winch supply or support-capacity admission. The
lower guide stub is a model boundary, not an independently standing structure.
Main Paris v15 /264s film is unchanged; no new main-film/browser QA is claimed.

## Whole summit inventory handoff

probe-handling-envelope.ts expands each canonical cargo bound by0.04m and searches
upright yaw/offset sweeps toY292. All247 clear the completed stage56 kit. It is a
conservative handling-space study, not actual crate contact or rigging admission.
The literal paths still need recomputation once missing guides/relay equipment exist.

The stock handoff audit is in ../eiffel-summit-stock-2026-09-08/:
- handoff-before-dogleg.json retains237clear/10corner collisions.
- handoff-audit.json clears247/247 with unchanged racks/packing.
- Ten loads use0.2m longitudinal detours; two adjacent window pairs reverse order.
- Each route rotates high, moves above the inside aisle, descends outside the shelf,
  inserts horizontally, then slides lengthwise if necessary. Lower shelves load first.

scripts/audit-eiffel-summit-handoff.ts uses conservative enclosing spheres for
in-place rotation and exact convex translation sweeps for travel. Sampled SLERP
is diagnostic only. tests/eiffel-summit-handoff.test.ts independently rebuilds
completed kit/rack solids and preceding stock and replays all four translation
legs from recorded poses; metadata flags alone are not the geometry oracle.
Cargo is still a local-bound envelope; shaped cradles, rollers, worker access,
ropes, machinery, extraction and final erection are unresolved.

## Verification

620 tests /89 files pass (`npm run test -- --maxWorkers=4`), final typecheck and
build pass. A first typecheck/build caught readonly/excess-property types in the
agent's test; fixed before final passes. Main bundle unchanged. Actual Blender
final render inspected. Evidence hashes are recorded in verification.json.

Next: model and verify the actual relay supports/guide anchorage, with persistent
machines and continuous same-cargo handoffs. Do not promote the offline route
or machinery study into the main film before those missing physical links exist.
