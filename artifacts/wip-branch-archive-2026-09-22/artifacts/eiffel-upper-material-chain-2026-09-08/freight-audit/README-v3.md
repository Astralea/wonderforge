# Freight frame v3 bounded source and wheel gate

Actual source SHA256 `797b38244b6d219cc520eaec436052efa962fc74440c4a70bd143e5b62ef7399`,265 meshes. Earlier v1/v2 evidence remains unchanged.

The static/source gate passes: zero new local occupied-bound intersections with actual frozen tower/platform surface triangles; four complete carrier route sweeps clear of new actual triangles; all16 sole corners within6.713micrometres of the197m support surface. See `audit-v3.json` and its separate script/log.

Eight actual wheel assemblies were sampled at0,π/4,π/2, retaining source parent matrices and applying local rotation about each authored axle. Their tread/flange actual triangles were checked against29 fixed runway, girder, hanger and tie mesh local bounds. No penetration remains beyond20micrometre contact tolerance. All24 wheel poses retain a tread-to-runway contact: bridge overlap6.744micrometres and cross-trolley overlap5.031micrometres are export rounding.

Shafts use their actual exported maximum radial extent relative to the wheel axis, not cylinder AABBs. Ninety-six bore rays per rotating tread/flange at each tested pose produce minimum sampled radial shaft clearance0.777534mm. `wheels-v3-aabb-shaft-falsepositives.json` preserves the initial conservative-cylinder-box false positives; the final source check replaces that invalid cylinder proxy with bore/actual-radius evidence. See `wheels-v3.json`, `wheels-v3.mjs`, `wheels-v3.log`.

This passes the requested initial wheel-pose gate and source route/support scope. It does not establish all continuous bridge/trolley translation, arbitrary rotation angles, reeving, drive operation, operator access, equipment erection or capacity. New local bounds conservatively represent non-box fixed meshes; whole internal assembly connectivity is not certified by these checks.
