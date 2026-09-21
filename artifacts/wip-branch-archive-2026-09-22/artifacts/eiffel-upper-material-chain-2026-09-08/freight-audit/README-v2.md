# Freight frame v2 bounded source gate

Actual readback SHA256: `3ee04dc9f63e680867d3a19f06266ca538406841cbef2fc4a64910a8ebf32812`;239 meshes. V1 reports remain unchanged.

- No new local-mesh-bound versus actual frozen tower/platform surface intersections. The east-frame relocation clears the two previous tower conflicts.
- All four full-carrier swept segments are clear of actual new model triangles: receiver approach, lowering, Z−1.8→+.6 transfer, and cross-X−2→0 transfer. The translated boiler no longer occupies the receiver.
- All16 actual sole corners contact197m platform top within6.8micrometres of export rounding.
- Both sleeves now have actual open bores. Ninety-six radial source-triangle rays per sleeve, centred on the actual exported shaft axis, give a minimum sampled clearance0.505639mm beyond the shaft's conservative maximum radius. This is a sampled bore gate, not an assertion of continuum contact or dynamics.
- Gear-side sleeve has25.000mm axial clearance to the gear and22.501mm to the flange. Opposite sleeve has22.499mm to its flange and30.001mm remaining shaft beyond the sleeve. All sleeve axial intervals lie on the actual shaft.

Evidence: `audit-v2.json`, `audit-v2.log`, `bearings-v2.json`; runnable `audit-v2.mjs` and `bearings-v2.mjs`. Gate passes its bounded source/route/contact scope. It does not admit the complete moving bridge/trolley, all internal part contacts, reeving, drive operation, worker access, equipment erection or capacity. In particular new mesh local bounds are conservative for curved/compound shapes; absence of a conservative broad occupied-bound intersection with old triangles is useful clearance evidence, not a mechanical rating.
