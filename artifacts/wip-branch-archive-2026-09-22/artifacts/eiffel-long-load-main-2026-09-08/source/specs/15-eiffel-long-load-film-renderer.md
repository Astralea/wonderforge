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
