# Eiffel long-load film renderer — 2026-09-08

Promote the reviewed 128-second ground-to-first-floor long-load study into the
main film as an explicitly bounded delivery chapter. Render the actual corrected
carrier, closed sling/master ring, raised receiver and opened freight bridge
from their saved Blender exports. The main tower renderer remains the sole
owner of seated tower geometry. Suppress the separately transported kit identity
while the delivery renderer owns the actual payload; landing on the cart is
not final tower installation.

The freight hatch belongs to the added bridge spanning the tower's existing
central first-floor opening. Preserve its five rotated planks and real hinge
geometry. Do not cut or hide unrelated tower decking. Preserve the fixed-size
source geometry and articulated transforms; only flexible rope segment length
may change. The hoist sampler controls carrier, ring, drum, trolley, sheave and
rope continuously and remains attached at the chapter end. Entry/exit equipment
changes must be hidden by the film's opaque transition cut.

Batch exported meshes without discarding source triangles or replacing small
mechanical parts with proxies. Own/dispose all loaded geometry, materials,
batch textures and rope resources, including disposal while loads are pending.
Keep deferred updates until loading finishes. Tests must exercise actual GLBs,
rigid poses, open-hatch clearance, reverse seek and resource disposal. Desktop
and mobile production QA remains required; this chapter does not claim that
unrigging, onward relays, final installation, equipment erection, drive or brake
mechanisms have been completed.

The main film also owns the separately saved steam-drive model on the same
chapter clock, including the 12-tooth driving pinion and matching 24-tooth
receiver gear. Use receiver-driven.glb rather than the superseded receiver's
prototype gear. Preserve source child rotations while animating the crank and
fixed-length connecting rod about world +Z. Drive model loading/disposal and
visibility obey the same chapter/opaque-cut lifetime as the hoist model.

Render only source instances intersecting each current view/shadow frustum; keep
whole-batch culling disabled because articulated bounds change. Keep all exact
geometry available for reverse seeks. During a fully opaque film cut, hide the
Eiffel world group while continuing all sampler, camera and lighting updates;
restore visibility on the first uncovered frame. This avoids spending the
mobile triangle budget on equipment and city geometry behind an opaque cut.

## Onward platform delivery extension

Extend the same carrier/payload identity beyond cart landing through visible
fastening, scaffold access, upper-clevis release, retained sling support, rigger
descent, manually operated hatch closure, a thirteen-metre cart push and stop.
The renderer must retain original rigid hardware and actor pivots from the new
Blender addon; no scaled mechanical proxies, duplicated payload, or disappearing
released hardware. New roles receive deterministic local rigid poses; resetting
omitted channels to exported poses must make reverse seeking independent of
previous calls. Keep all exact source child geometry, batch by material/layout,
use per-instance view/shadow culling, and dispose pending/completed loads safely.
Actual source assets and pure-engine route must be ready before production
integration. This extension does not claim the later final summit installation.

## Mobile equipment profile

The scene constructor passes the existing width<700 mobile quality decision to
Eiffel's equipment renderer. The default desktop profile keeps exact original
exports. Mobile selects separately saved closed-sling-mobile.glb and
onward-mobile.glb only; these preserve every role/pivot and rigid motion while
reducing source mesh tessellation. Asset modules never inspect the DOM. Keep
source/profile identity in browser diagnostics and test equal role transforms,
resource disposal and reduced triangle count with actual files. Whole-scene
mobile300000triangles/150calls remains the gate; no limit relaxation.

Mobile also selects bridge-mobile.glb. Its fixed coplanar timber floor is a
coalesced geometric union and fixed iron faces are partitioned spatially for
culling. Preserve original role transforms, cart/hatch hardware and desktop
bridge; the static iron role may be a parent group of exact-face chunks.
