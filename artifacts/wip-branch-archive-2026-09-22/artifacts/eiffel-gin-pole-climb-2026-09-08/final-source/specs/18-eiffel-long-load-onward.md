# Eiffel long-load onward crossing

## Scope

The existing 128-second ground-to-first-floor chapter continues to 280 seconds.
It follows the same `summit-access-stair-m000-c000`, carrier, cart, and retained
closed sling through fastening, upper-hook release, manual hatch closure, and
the complete 13 m first-floor crossing. Landing and cart fastening do not seat
the tower member. The opaque exit cut may omit later relay transport and final
installation, and only that cut may return the identity to the seated kit.

This is cinematic support and continuity evidence, not a capacity, fastener,
or historical-detail certification.

## Clock and visible work

The carrier trajectory and lower-sling geometry from seconds 0–128 remain unchanged. The upper rope endpoint moves from 0.25 m to 0.325 m above the master-link origin to meet the new clevis eye; its payout reference changes consistently. Relative lifting drum motion remains unchanged.

| Local seconds | Required visible state |
| --- | --- |
| 128–154 | The cart is chocked and stationary. A deck rigger inserts and turns four distinct carrier bolts. |
| 154–168 | The upper rigger climbs the prepared scaffold with alternating boot and hand contacts. |
| 168–172 | Hoist tension eases while the closed sling settles onto its carrier saddle. |
| 172–180 | The rigger opens the keeper and withdraws the clevis pin. Neither part disappears. |
| 180–184 | Only the free upper connector and rope retract. The master link and four lower loops remain on the carrier saddle. |
| 184–198 | The upper rigger descends and leaves the cart movement envelope. |
| 198–206 | A deck worker closes the freight hatch by hand while the cart remains chocked. |
| 206–212 | The pusher reaches both handles and the chock is visibly removed. |
| 212–272 | The same cart, carrier, member, saddle, and retained lower sling move smoothly through the full 13 m crossing. |
| 272–280 | The cart stops, is chocked, and remains awaiting the next supported relay. |

Every boundary is position-continuous and deterministic under reverse seeking.
The cart displacement drives its wheel rotation. Workers remain present between
jobs and move between supported poses; labels alone do not establish contact.

## Physical contracts

- Four fastening operations finish before hoist release. Each bolt and washer
  follows a continuous stored-to-seated path and remains present afterward.
- The master link transfers from the hoist connector to the authored carrier
  saddle before the pin clears. At no sampled time may the retained lower sling
  be unsupported or shrink away.
- The pin remains in its guide or tether after withdrawal. The keeper, clevis,
  and free upper rope retract as separate visible hardware.
- The scaffold is erected during the opaque preparation cut. Its feet and
  worker contacts must use authored deck support; it does not travel with the
  cart.
- The hatch closes only after the load has cleared its opening and before the
  cart crosses it. A worker hand remains on the operating handle during motion.
- Pusher hands meet both cart handles before wheel motion begins. The pusher's
  feet use the existing distance-driven gait, with no sideways cart slide or
  instantaneous pivot.
- Carrier origin stays exactly cart position plus `[0, 0.34, 0]`. The payload,
  carrier, lower sling, and parking saddle remain rigid and unit scale through
  the crossing.
- The carried identity remains in `transportedPartIds` for the entire chapter.
  It enters `seatedPartIds` only after the opaque later-work cut.

## Engine and renderer ownership

`sampleEiffelLongLoadOnward` is pure and clamps finite seconds to 128–280. It
exposes one phase, cart motion/support state, hatch angle, fastening progress,
connector transforms, sling support, workers, and the existing pusher sample.
`sampleEiffelLongLoadFilm` delegates 0–128 to the reviewed hoist sampler and
128–280 to the onward sampler while retaining the common carrier, master-link,
rope, sling, wheel, trolley, and drum fields expected by the renderer.

The renderer consumes authored role pivots and sampler transforms. It must not
duplicate the payload or carrier, hide the retained sling, or infer a final
seat from cart fastening. Flexible rope may deform between sampled endpoints;
structural solids remain rigid.

## Verification

Tests cover every clock boundary and dense samples of the 13 m crossing:

- exact continuity at second 128 and every later phase boundary;
- four bolts complete before connector release;
- saddle contact precedes pin withdrawal and persists through cart motion;
- hatch angle changes only during the worker-contact interval and is closed
  before the crossing;
- zero cart displacement until hands grip and the chock clears;
- exact 13 m endpoint, wheel angle `-13 / 0.12`, carrier/cart offset, and fixed
  payload identity;
- worker arm lengths, hand contacts, supported feet, and clearance from the
  cart movement envelope;
- deterministic forward, backward, clamped, and serialized queries;
- film duration, insertion coordinates, transported identity, opaque exit,
  and delayed seated handoff.

Actual Blender hardware contacts and full rendered mesh clearance remain
separate asset and browser gates owned by the model and renderer passes.

## Construction camera

`eiffelLongLoadCamera.ts` owns the 280-second chapter framing; the main film
dispatches into it with the same continuously increasing azimuth as every
other chapter. The complete film traverses 125 degrees. The extended chapter
must not freeze or reverse the camera to conceal motion or visibility problems.
Additional orbit keys at local100/128/168/184 place the upper release near
90 degrees and finish the chapter at95 degrees; initial/final film angles remain
-20/105 degrees, and earlier chapters retain their previous path.

Ascent and landing establish the complete 6.3175 m carrier. The camera frames
the lower fastening operation at seconds 132–152 and the upper connector at
171–182. Climbing, descent and the 13 m crossing show the full carrier again.
The hatch gets its own lower work view at 200–206. Targets and lenses blend
continuously between world-space framing boxes, without instantaneous zooms.

The camera stays 16 m from its target on a checked path through the tower's
open interior. Elevation blends from 12 degrees during ascent and upper release
to 40 degrees for fastening/hatch work and 20 degrees for cart travel. The lens fits the current work
box at the actual canvas aspect ratio, with a minimum vertical field of view
of 6.5 degrees. Framing adapts to desktop and portrait screens. A larger radius
must not be assumed safer: the 32–90 m candidates cross lower ironwork or the
first-floor deck under this chapter's slower global orbit.

Camera gates are distinct from physical construction and image visibility:

- Check actual main-film dispatch throughout the complete 280-second chapter.
- Project all eight work-box corners at half-second samples in desktop,
  390 px portrait and 320 px portrait viewports.
- Keep the full carrier on screen for ascent, landing, climb, descent and cart
  travel, and provide readable projected worker size in the detail views.
- Check target, azimuth and lens continuity at both camera and action joins,
  including deterministic reverse seeking.
- Keep a conservative sphere containing the complete five-metre near frustum
  separate from every completed-tower solid OBB.
- Review actual desktop and mobile browser images for foreground obstruction,
  hand/body cropping and clear material ownership. Projection and OBB checks
  alone do not establish these visual properties.

The browser QA must record the actual served JavaScript and model byte hashes,
compare exposed applied addon role transforms with the sampler, exercise the
real pause/seek/play controls, and check the desktop/mobile render budgets.
Actual first-pass images showed receiver columns obscuring workers. The revised
yaw and pitch clear the upper release and hatch at the checked samples. Some
fastening actions remain partly hidden by the real carrier or receiver; this
limitation must not be described as complete visible proof of all four bolts.
Evidence belongs under
`artifacts/eiffel-long-load-onward-2026-09-08/camera-qa/`.

## Authored asset and crew details

The installed Blender Lab MCP builds the addon, retained sling and bored bridge from saved source scenes. Editable sources and MCP readback evidence live in `artifacts/eiffel-long-load-onward-2026-09-08/`. The thirteen retained sling meshes remain vertex-identical to the prior assembly.

The worker rig solves one pelvis and rigid torso pose before solving its fixed-length legs and arms. Both shoulders stay attached to that torso. The pusher stands 0.92 m behind the cart origin during this chapter, inside the scaffold and ahead of the fixed ladder; other cart scenes keep their previous offset.

Actual exported geometry must pass ring/pin/saddle contact and release-clearance checks, cart-bed and spreader bore rays, and real floor support for scaffold soles, all four wheel tracks, the pusher, accompanying chock carrier and hatch operator. These geometric checks do not certify member strength or load capacity.

## Mobile detail level

At scene creation, a canvas narrower than 700 CSS pixels selects the saved mobile addon and retained-sling GLBs. Other devices retain the original full assets. The 72 worker meshes retain their authored dimensions and pivots; mobile removes their small edge bevels. The master ring uses 32 by 8 segments and the lower ropes use a smaller cross-section tessellation with unchanged centerline paths. Upper release hardware remains exact.

The two mobile assets total 11,152 triangles versus 19,216 in the full pair, saving 8,064 before per-instance culling. Actual role transforms, master-ring inner/outer contact extrema, support and reverse-seeking must agree across both profiles. The whole-scene 300,000-triangle and 150-call mobile limits still require composed browser verification.

The same mobile profile also selects `bridge-mobile.glb`. Its 198 contiguous
fixed planks become one slab with the exact occupied envelope (zero gaps
filled). All 246 fixed iron components retain their triangles, split into 12
spatial chunks so offscreen pieces can be culled. The cart, hatch, bores and
role pivots remain exact. Desktop bridge geometry remains unchanged.
Actual triangle-corner equality and 1,190 floor-support rays guard this reduction.
