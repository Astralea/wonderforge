Latest receiver revision: front portal head split into two segments leaving
.42m central rope passage,17sourceprisms. Read ../eiffel-diagonal-winch-2026-09-08/README.md
for final715-test actualMCP export evidence. Previous versionpreserved.

Current frame revision: see ../eiffel-diagonal-trolley-2026-09-08/README.md.
Portalheads lowered tocenter120.61m/top120.72m, posttops120.50m after actual
sheave sweep exposed a collision. Priorframe/GLB/design preserved with
before-sheave-clearance names. New actualMCP export and707-test gate passed.

# Diagonal second-floor receiver candidate — 2026-09-08

A new, unrated frame candidate connects pickup x-8.5,z-4 to the existing upper
supply cart x-15,z-1.8 over a6.862215m diagonal. It avoids the sampled compact
receiver/cart-route obstruction, but is not yet an operational replacement.
No historical measured-replica claim is made for this interpreted structure.

Parent used the actual installed Blender Lab MCP after a successful read-only
probe. Saved `blender/eiffel-diagonal-receiver-frame.blend` and exported
`model/diagonal-receiver-frame.glb`;16objects. Evidence in mcp/ and mcp-run.log.
Reproduce with scripts/plan-eiffel-diagonal-receiver.py,
blender_eiffel_diagonal_receiver.py and build-eiffel-diagonal-receiver-via-mcp.py.

Local u follows the pickup-to-cart diagonal; v is its horizontal perpendicular.
Portals at u2.9 and L+1.8, posts v±.8. Four .8×.35m feet rest on116.14m floor.
Two .54m deep girders support .12m rails; rail top121.38m. These are geometric
members, not a strength calculation. Side ties alone do not establish stability.
Drive, trolley, sheaves, ropes, bracing, anchorage, rigging, operation and erection
remain unmodeled. The viewer shows a parked crate on the existing cart, no lift.

Initial rejected design/audit preserved as before-clearance: front foot hit old
bridge by.06m; rear column hit waiting worker arm by up to.104745m. Revised audit
has no source-frame or crate-sweep failures against11386stage45 envelopes plus
660bridge prisms.16source foot corners contact actualfloor;18waiting worker parts
clear frame and actual cart. This does not imply capacity or full personnel access.

Three independent tests replay source clearances and verify actual GLB vertices
(16members/eightunique worldcorners each within20micrometers) and all16exported
foot corners on actual stage34 floor triangles. Full703tests/112files pass;
typecheck/buildpass, logs here. Desktop1440×1000/mobile390×844 static and real
pointerorbit QA passes without errors/overflow; web/qa.json. Parent viewedboth.

Review: http://127.0.0.1:5590/artifacts/eiffel-diagonal-receiver-2026-09-08/review.html
Main production and prior two-floor supply animation remain unchanged.
Next author a supported trolley and connected winch route, brace/anchor the frame,
validate all moving geometry and then replace the second relay continuously.
Full Eiffel/next-wonder goal remains active.
