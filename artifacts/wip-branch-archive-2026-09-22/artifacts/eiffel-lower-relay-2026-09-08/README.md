# Lower freight relay — clearance and receiving site

The current bridge invalidates the earlier central ground-lift corridor.
Tests now explicitly reject a vertical crate through x=0,z=-1.8 because its
sweep intersects bridge planks and cross-joists. All 211 current bridge prisms
and all 11,386 completed tower envelopes through stage45 are included.

A crate-only four-leg route alongside the bridge at x=-8.5,z=-4, then at y=118
via x=-15 to the stock cart, has no penetration. This is not an operational
single ground-to-second-floor lift. Watson pp823–824 documents first- and
second-floor winch relays; no mechanism may skip those handoffs.

A separate ground lift at x=-19.75,z=-4 clears through stage23. Raising the
crate center to y=60.5, moving to x=-21.5, then lowering to y=58.84000244140625
also clears those envelopes. Four downward rays under the crate corners hit
the actual first-floor mesh platform-1-3-03-m000-c007 at y=57.94000121951103.
The 1.22 micrometer source/export difference is within the 20 micrometer
contact tolerance. This identifies a real receiving site for the next model.
Continuing the outer shaft to the second floor would penetrate a deck member
by 0.8m. Directly lifting beneath the second-floor stock cart would intersect
two deck members by 0.45m and 0.15m.

Next model: a first-floor-supported winch/receiving mechanism at this landing,
then a supported transfer to the second hoist's separate lane. Actual rope,
sling, operator, anchorage and power geometry are not yet included. Do not
animate a floating cargo polyline or describe this as a finished supply chain.

Evidence: `audit-route.ts`, executable bundle `audit-route.mjs`, `route-run.log`,
and `route-audit.json`. Run the bundle from the repository root with Node24.
`tests/eiffel-lower-relay-clearance.test.ts` provides two regressions.
Full 659 tests / 103 files, typecheck and build passed; logs are here.
No runtime/rendering or Blender model changed in this pass; main v15 remains
unchanged. No new browser QA or Blender generation is claimed.
