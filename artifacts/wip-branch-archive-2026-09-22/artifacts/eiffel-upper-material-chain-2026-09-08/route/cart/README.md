# Second-floor cart route and machinery relocation

Recommended candidate machinery relocation: **+2.3m along relayU**, world delta`[-2.178596730017,0,+.737371200929]`, original drumU8.55→10.85. Translate the complete `relay-steam-drive`, `relay-drum` subtree, separate drum-shaft, winch bed and bearings together. Preserve the fixed sheave/guide/frame/cart. This is a proposed source edit for the parent, not a production change performed here.

Actual original cart at[-15,116.13999938964844,−1.8] already intersects engine-bed and cylinder-foot boxes before any new motion. Original source cart-bed triangles against the foot boxes and rear axle/wheel triangles against the engine bed establish concrete collisions; curved machinery box candidates are separately conservative. `audit.json` preserves them. The +2.3m relocation clears all41 sampled actual cart/handle poses through the proposed S-turn against unchanged fixed equipment. +1.8m/+2.0m also clear the sampled cart path; +2.3m retains additional clearance for the human operating space rather than selecting a zero-margin limit.

`relocation-support.json` finds no relocated machinery occupied-bound versus actual frozen tower or unchanged-frame surface intersection. Twenty actual bottom source vertices (winch bed, engine bed, boiler foot and both existing operator boots) retain tower-deck support within30micrometres. All source relative engine/gear transforms stay exact. This does not revalidate rope tangent, old source drive motion or a moving pusher's full articulated body.

## Forward route and necessary steering hardware

Use two opposed90° arcs with rear-axle radius.60m, beginning heading+X. First arc ends rear axle[-14.65,F,−1.2], cart centre[-14.65,F,−.95], heading+Z. Stop, steer the front wheels in the opposite direction, then perform the second arc. It ends rear axle[-14.05,F,−.6], centre[-13.8,F,−.6], heading+X. Straight travel then reaches[-2,F,−.6]. No cart translation occurs during steering reversal, and no rear-axle lateral slip is prescribed.

The actual wheelbase is.50m; track.76m. Existing front wheels have fixed axle mountings and cannot execute this route unchanged. Author separate supported kingpin/stub-axle assemblies at frontX+.25,Z±.38 (wheel centresY+.12), replacing the fixed front wheel attachments and trimming the axle ends so they do not cross steered hubs. Maximum Ackermann steering is66.25° for the inner front wheel and27.03° for the outer; rear wheels retain straight rolling. Provide visible steering linkage/drawbar control and independent wheel roll; do not rotate the entire cart about its centre while translating sideways. This is a fixture design requirement, not already existing geometry.

Pure `route.mjs` gives a91s design clock with stopped steering changes and unchanged rigid payload height. `route.test.mjs` checks joins and rear-axle velocity alignment. The clock is not added to the production film. All41 turn poses have actual tower support under the four wheel-centre ground contacts; the straight run outside the proposed bridge also has support. Inside the central opening it deliberately requires the new bridge. Source steering-wheel geometry, continuous swept turn bounds and articulated moving-pusher clearances remain to be verified after authoring.

## Bridge dependency

The proposed spanning lane runsX−9.75..+9.75,Z−.6, width1.2m. Both sides must bear on the existing ring; X−9..+9 is the floor opening. Current candidate motion uses floorF116.13999938964844. If the authored bridge deck is higher, add a physically supported ramp and use its actual profile; do not silently keep the wheels at this height. Truss sides nearZ−1.4/+.2 leave1.6m between their centre planes; actual thickness and worker clearance still need the new source check. A push-behind worker does not require an invented side walkway.

Evidence is confined to this folder. No production files or Blender assets changed. Original cart geometry is checked with fixed steering as a source envelope; new articulated steering parts are explicitly absent and not admitted by this audit.
