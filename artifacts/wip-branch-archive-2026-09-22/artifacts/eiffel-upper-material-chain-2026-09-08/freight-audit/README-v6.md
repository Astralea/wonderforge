# Freight V6: bounded correction recheck

Actual GLB readback SHA256`93a2eb6b3beb0d76c106367d0861298e7c772d9a1521439f824d60ac3d16e3a2`;317 mesh primitives. V5 and earlier evidence remain unchanged.

The requested correction passes its bounded gate:

- No rigid new-frame local occupied-bound versus actual frozen tower/platform surface intersection.
- Actual rest-rope triangles no longer cross either relocated upper/diagonal support arm or the new connecting crossbars.
- Remaining rope surface crossings are confined to the existing intended termination/contact locations: upper rope eye(40 triangle pairs), fixed-feed sheave groove(24), and head sheave groove(24). No other own-frame/drive mesh is intersected.

`audit-v6.json/log/mjs` records the static source check. Its whole-compound-rope AABB flags are not treated as solid-frame intersections; the rope is checked separately using actual transformed surface triangles in `rope-v6-frame.json/log/mjs`. `rope-v6-arm-contact.json` is empty, confirming the previous arm crossing was removed. The exact former failure is preserved in V5 evidence.

This is not a claim of zero contact, capacity, continuous bridge/trolley travel, rope inventory, all-angle drive operation, crew access or production admission. Intended rope-eye/groove contact profiles were identified but not newly redesigned or mechanically certified. No production files were changed during this final V6 recheck.
