# Eiffel real-load main-film integration audit

## Decision

The shortest credible production change is to insert the already verified 128-second
`summit-access-stair-m000-c000` ground-to-first-floor hoist immediately before that
part's legacy production operation, keep the actual carrier visible on the first-floor
cart, and suppress the legacy elevated pickup for that identity. The closing opaque cut
must say that later cart relays and final installation are omitted. It may then reveal
the member in its final seated pose after elapsed time. This replaces one visible
airborne pickup with continuous ground provenance without presenting the unverified
upper route as animation.

Do not put the part in `seatedPartIds` when it first lands on the cart. That field means
the kit mesh is at its final tower pose: `EiffelWorld` returns `seated` before consulting
any chapter sampler (`src/render/three/EiffelWorld.ts:38-48`). A distinct transport
disposition is required until the omission cut completes.

## Current main-film gap

- The film admits only `ground-lift` and `joint-campaign` insertions
  (`src/engine/eiffelFilm.ts:18-44`) and exposes only their chapter clocks
  (`src/engine/eiffelFilm.ts:55-72`). The real long-load samplers are absent.
- Outside those insertions, the kit asks the production planner for every part and
  renders its sampled pose (`src/render/three/EiffelWorld.ts:49-58`). The works renderer
  likewise shows every active legacy operation only in `main`
  (`src/render/three/EiffelWorld.ts:95-100`).
- For every non-foundation part, the production planner invents a pickup beside an
  elevated short-boom station at `station.base.y + 0.9 - localBounds.min.y`
  (`src/engine/eiffelProductionConstruction.ts:266-274`). It constructs a small receiver
  under that pickup (`src/engine/eiffelProductionConstruction.ts:358-383`) and proceeds
  staged, hoist, transfer and lower (`src/engine/eiffelProductionConstruction.ts:389-453`).
  There is no ground-to-receiver provenance in that operation.
- `summit-access-stair-m000-c000` is stage 59.55, has a true
  0.15 x 0.15 x 5.992500305 m transport box, and explicitly requires an authored
  support and route in the authoritative kit manifest. If integrated without identity
  withholding, the same member would land on the first-floor cart and later reappear at
  the legacy elevated pickup.

## Reusable, already checked work

- `src/engine/eiffelLongLoadHoist.ts:6-28` carries the actual member in one retained
  carrier for 128 seconds: hold 0-6, hoist 6-112, traverse 112-120, lower 120-124,
  attached hold 124-128. It deliberately reports `released:false` and
  `productionReady:false`; those flags describe the isolated study, not a reason to
  discard its verified motion.
- `src/engine/eiffelMasterLinkHoist.ts:13-20` composes the actual master-link/closed-sling
  endpoint onto that unchanged carrier trajectory.
- The carrier audit clears the complete 0.44 x 6.317500305 x 0.44 m envelope, open hatch,
  raised 21-member receiver, sling legs and three moving route legs. The evidence and
  limitations are recorded in
  `artifacts/eiffel-long-load-carrier-2026-09-08/README.md:13-27` and
  `artifacts/eiffel-closed-sling-2026-09-08/README.md:12-18`.
- The recovered cart asset supplies actual bored fastening geometry and a corrected
  nine-mesh carrier. It is preassembled and does not animate release or cart travel
  (`artifacts/eiffel-cart-fastening-recovered-2026-09-08/README.md:23-32`). Its conditional
  mass/COM calculation is planning evidence only, not a transport admission.
- The 488-second three-floor study proves continuity for one 0.6 x 1.8 x 0.6 proxy crate,
  not this upright carrier. It explicitly leaves actual structural-member placement and
  production integration open
  (`artifacts/eiffel-three-floor-supply-2026-09-08/README.md:5-10,24-26`).

No new Blender asset is required for the first integration slice: the raised receiver,
bridge, corrected carrier, closed sling, master link and stationary fastened cart already
exist as reviewed GLBs.

## Exact blockers to onward physical animation

1. **No releasable interface.** The closed lower rope eyes cannot detach from the closed
   carrier eyes. The cart-fastening report identifies this directly
   (`artifacts/eiffel-cart-fastening-recovered-2026-09-08/README.md:27-32`). Therefore a
   visible unhook-and-cart-departure sequence would currently be false.
2. **The verified upper chain carries a proxy.** `sampleEiffelThreeFloorSupply` composes
   the proxy diagonal and second-floor samplers and hard-codes sling contacts around a
   1.8 m-tall cargo (`src/engine/eiffelThreeFloorSupply.ts:8-15`). Its clearance evidence
   cannot be transferred to the 6.3175 m carrier.
3. **No identity handoff state.** Film state has only final `seatedPartIds`; renderer state
   has queued/moving/seated kit poses. Neither can represent “same kit part retained in a
   carrier at first-floor stock.” This is the immediate software blocker.
4. **No main-film renderer for the studied chain.** `EiffelWorld` owns only the ground
   pilot, joint campaign and fastening systems (`src/render/three/EiffelWorld.ts:21-74`).
   The long-load receiver, bridge, trolley, master link, sling and carrier exist only in
   isolated review pages.
5. **Pacing and camera need a chapter contract.** Adding 128 seconds changes the film
   duration and orbit timing. The new chapter needs its own current-envelope shot points;
   simply using the wide production camera would make the human-scale rig unreadable.

These are geometry/continuity and representation gates. The animation does not require
stress, load-rating or historical certification, and the slice must not claim them.

## Concrete next implementation slice

1. Add a `long-load-first-floor` insertion at the operation start obtained from
   `plan.byPart.get('summit-access-stair-m000-c000')`; do not duplicate a hard-coded stage
   time. Its active duration is 128 seconds, followed by an opaque `Later work` cut.
2. Extend the film sample with an explicit `transportedPartIds` (or a typed disposition
   map). During the chapter and landed hold, the kit-owned source member is withheld so
   the corrected carrier asset owns the sole visible payload copy. After the omission
   cut, transition directly to final `seated` and state plainly that cart relays,
   unrigging and final installation occurred during omitted elapsed work.
3. Add one production renderer that loads the already reviewed first-floor bridge,
   raised receiver, corrected carrier, closed sling/master link and cart-fastening assets.
   Drive all moving transforms from `sampleEiffelMasterLinkHoist`; keep bridge/receiver
   fixed and keep the hook attached through the final visible frame. Reuse material
   batches where the isolated viewers already do so.
4. Suppress both the matching legacy kit operation and its `EiffelProductionWorks`
   crane/carrier/receiver for the whole retained/omitted interval. All unrelated
   production operations remain frozen during the insertion, following the existing
   film insertion contract.
5. Add local shot bounds for actual receiver, load, hook, cart and workers while passing
   the global film azimuth into the shot. Re-run desktop/mobile framing and near-plane
   clearance; do not modify the established monotone orbit unless these measured bounds
   prove a conflict.

Suggested ownership for that slice:

- Engine: new `src/engine/eiffelLongLoadFilm.ts`; modify
  `src/engine/eiffelFilm.ts` for insertion/disposition/clock only.
- Renderer: new `src/render/three/EiffelLongLoadFilmSystem.ts`; modify
  `src/render/three/EiffelWorld.ts` for ownership, visibility, update and disposal.
- Tests: new `tests/eiffel-long-load-film.test.ts`; update `tests/eiffel-film.test.ts`,
  `tests/eiffel-world.test.ts` (or the current World ownership test), and
  `tests/eiffel-delivery-camera.test.ts`.

The tests should prove one visible payload owner at dense chapter boundaries and reverse
seeks; exact carrier/master-link poses against the pure sampler; no legacy crane/work
sample for the selected part; retained cart support at 124-128 seconds; an opaque cut
before final seating; dependency time does not advance during the insertion; and desktop
plus portrait frustum/near-plane containment.

## Following slice, after this integration is visible

Design the opening link first, rather than adding another receiver asset: author a
releasable lower connection and animate unhooking from the first-floor cart. Then adapt
the existing first-to-second/197 m chain to a generic rigid payload and run the full
6.3175 m carrier and sling envelope through it. Only after those exact sweeps, cart
stability/restraint geometry, and receiver headroom pass should the first chapter flow
into visible onward cart travel. Broad gallery panels remain a separate handling class;
the existing route audit found no clear axis permutation for the representative panel.

This audit changed no application source and ran no broad test suite.
