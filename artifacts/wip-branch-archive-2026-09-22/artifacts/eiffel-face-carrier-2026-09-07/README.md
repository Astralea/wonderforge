# Ground-loaded face-joint carrier study — 2026-09-07/08

**Not admitted into the live movie. The co-carried load intersects a lower
diagonal during the original vertical hoist.** Do not reuse the original
two-sling lift, or equate final clear geometry with a clear delivery route.
The main 264 s movie and `main-rhqaRE78.js` remain unchanged.

The parent built and saved this study through actual Blender Lab MCP after a
fresh read-only probe. It contains a real 6 mm angle-iron carrier, two split
clamps gripping the first beam, the candidate face plate/pads and a modified
ground cart. The model is an authored handling study, not a documented Eiffel
carrier design. Plate-to-pad manufacturing fasteners are still unmodelled.

## Artifacts and local review

- `blender/eiffel-face-carrier.blend`: editable source, including ground view.
- `model/face-carrier.glb`: 20 actual occupied solids; L-section empty corners
  remain empty. Eight clamp solids and twelve angle legs.
- `model/carrier-cart.glb`: reusable cart at its original local coordinates.
- `model/ground-loaded-carrier.glb`: complete ground study with the beam and
  candidate parts, positioned on the cart.
- `renders/ground-loaded-carrier.png`: inspected final Cycles render.
- `renders/rejected-boolean-bed.png`: retained failed Boolean experiment.
- Local review: http://127.0.0.1:5590/artifacts/eiffel-face-carrier-2026-09-07/review.html

The cart retains all seven planks. Two 20 cm wide, 35 mm deep channels clear the
underside clamp locations at beam offsets -1.6 m and +0.9 m. Existing sling
and splice recesses remain. A Boolean across the imported touching plank
solids removed unrelated faces; direct interval construction fixes that error.
The final asset is ray-tested at 777 positions against expected surface height.

## What the transport evidence proves

Inputs and scripts remain under `../eiffel-face-joint-2026-09-07/`:

- `design-carrier.ts` / `carrier-design.json`: selected final clamp positions
  and occupied carrier envelope. Final context clearance alone passes.
- `carry-probe.json`: original plate-only coarse placement experiments; no
  carrier, cart or crane admission. Do not promote from this file.
- `carrier-probe.json`: final 20 ms sampling using the actual angle-leg solids,
  plus an exact convex sweep over the complete 14–26 s straight hoist. The
  original column fails against `lower-ne-02-m013-c001`. Coarse 100 ms tests
  missed these fast thin-member intersections.
- `carrier-column-search.json`: 35 nearby vertical-column candidates for the
  combined beam and carrier. None pass the exact occupied-volume sweep.
  This is a bounded search, not proof that every possible co-carried route is
  impossible. It is sufficient reason to stop tuning clamp ends on this route.
- `package-column-search.json`: a **separate** .52 × .56 × 1.12 m package
  envelope containing the candidate, after both beams have seated. Two of the
  same 35 column candidates have clear exact vertical sweeps: shifts
  `(dx,dz)=(1.5,-1)` and `(1.5,-.5)` from the old pickup column. This is space
  planning only, not a built package, supported ground pose, rigging, crane,
  transfer or worker certificate. In particular, inspect crane yaw: these
  columns can extend beyond the old narrowly reviewed sector.

Probe code: `scripts/probe-eiffel-face-joint-carry.ts`, bundled with esbuild.
Use `CARRIER_FRAME=1 CARRIER_STEP=.02` for the occupied carrier probe;
`SWEEP_GRID=1` for exact column search; additionally `INDEPENDENT_PACKAGE=1`
for the independent package search. Current source hashes bind the final
carrier probe to the candidate. Earlier numbered coarse probes are superseded.

## Next implementation step

Build a compact independent ground-delivery tray for the plate and pads,
rather than extending the tested cantilever carrier. Establish actual stock
support, captive handling and a balanced bridle. Then verify the crane at the
candidate column, including its articulated geometry, hoist rope and yaw;
route the smaller load to a supported positioning station after the first beam
has seated. Resolve pad retention, plate placement, actual fastening and crew
access before modifying the production kit/LOD/dependencies/cache/seal. The
earlier 40 cm final insertion proof remains relevant but is not the entire
installation process.

Official sources rechecked this turn describe workshop preparation and riveted
subassemblies sent to site, followed by site assembly with scaffolding and
small tower-mounted steam cranes: [Tower history](https://www.toureiffel.paris/en/the-monument/history),
[construction preparation](https://www.toureiffel.paris/en/news/130-years/how-did-they-build-tower-so-quickly).
They support the workflow, not dimensions or authenticity of this authored
carrier, fitted pads or joints.

## Verification and limits

592 tests / 80 files, typecheck and build pass. New asset tests parse the actual
GLBs, test the complete cart-bed height grid, confirm twenty carrier solids,
check their source bounds and ray-test the empty L-section corner. The pure
convex transform also preserves measured separating depth under rigid motion.
Desktop/mobile browser QA checks shader compilation, real-pointer orbit,
overflow and errors; screenshots were inspected. The route is **rejected**,
despite these asset and UI checks passing.

Broader goal remains active: no new carrier enters the main film, the old
intersecting gusset and other original contacts remain there, legacy upper
deliveries still need ground provenance, and Paris variation/density remain
unfinished. No other wonder has been started. No new plugin was required.
