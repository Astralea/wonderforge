# Admission boundary — independent read-only review, 2026-09-08

The implementation advances three local assembly deliveries and targeted Paris
rendering. It does **not** complete the Eiffel ground-to-summit supply chain or
admit the proposed climbing gin pole. This review reads existing source and
evidence; it does not rerun tests, Blender or browser QA.

## Implemented and bounded evidence

- **Three mast assemblies, seven retained part IDs.** m073 follows m072-c000;
  m074/m075 follow c001; m076 follows c002. Runtime uses the existing kit meshes
  with exact parent-relative rigid poses. The separate Blender assembly export
  is source/validation evidence, not an additional runtime drawable. Children
  inherit their owner's phase and have no separate crane, receiver or carrier.
  The kit replaces subdivisions with the compact member only after every
  sibling of that source member is seated. This prevents duplicate crossbars
  and separately arriving rungs; it does not show factory fastening work.
- **Final floor-supported mast.** The public manifest identity is
  `e054bfb8cbded7e636075ba1371e624430f600da0b2e8f0cc765e205d1e54080`.
  Only c000 and its compact counterpart's Y transform changed. The foot is
  approximately Y300.670008 on the actual crown floor hub, not Y298 or the
  Y300.510 stair top. Twelve radial members' 24 actual top triangles cover the
  complete 0.18m-square foot. Signed separation/contact is within 0.1mm;
  next-mast contact and the 312m completed top remain. The current schedule seats
  all twelve floor supports before the first mast starts. See
  `kit-joint-revision/floor-hub-audit.json` and `floor-hub-public-tests.log`.
- **First terrace receiver.** Its bottom rests on the actual Y280.590 terrace;
  `directDeckSupport` suppresses the two obsolete axis-to-receiver braces that
  penetrated the floor. It does not hide the receiver or disable collision
  testing. The first crane still uses the existing procedural rig, with its
  fixed 3.4×0.30×2.2m pad and guy feet inside that pad. This is local geometric
  support, not a foundation/capacity proof or equipment installation animation.
- **Local cargo routes.** `route-clearance.json` records 2,401 sampled poses per
  assembly member against previously seated manifest convex boxes, clear at
  10µm except explicitly named adjacent mast end contacts allowed 0.1mm while
  lowering. Same/later-wave moving parts and assembly siblings are excluded.
  This is a sampled cargo-versus-fixed-tower result, not continuous all-body
  clearance, rig/rope/worker certification or a force calculation.
- **Paris filter.** Actual recognized crossbars/interior vault ribs use
  derivative-integrated coverage while vertices, depth and spatial culling stay
  unchanged. Valid matched-clock development GPU A/B reduces tracked variation
  by 39–56% across desktop/mobile; the tested near-window ROI is unchanged.
  Palette-only capture fixes source-buffer retention without changing GLSL.
  Water, facade atlas patterns, outer ribs and grazing silhouettes are outside
  the improvement claim. See the separate Paris filter README.

## Unresolved admission and next work

Incoming stock is still supplied at elevated receivers without its complete
visible ground-to-stock transport/handoff. The current equipment is not shown
being installed, climbing with continuously supported clamps, driven by a
verified rope/worker system, unrigged and removed. The 6m pole / 3m jib Blender
candidate and `support-audit/climb-plan.md` are **not production mechanisms**.
Their existence, static collar checks or interval calculations do not authorize
moving the entire rig root between heights. Generic upper receivers/rigs remain
subject to those unresolved support and installation requirements.

## Stale evidence and release wording

Spec22 correctly names the floor hub and rejects the stair-top candidate.
`kit-joint-revision/independent-stair-joint-v1/`, `candidate-stair-top/` and the
earlier unprefixed joint audit/logs describe rejected geometry. The support
proposal's `298..302.666687` c000 bounds and hardcoded-pad commentary are also
historical candidate information, not current production dimensions. Spec23's
four-test count describes the initial filter gate; the resource follow-up has
five focused tests. Preserve these evidence chains and label their scope.

At this review, `build-final.log` succeeds as `main-1p6K-VFw.js`, but
`tests-full.log` ends **4 failed / 837 passed**, including missing baked
first-floor upper routes after the manifest revision. A later passing log must
supersede that result before claiming the full suite passes. The parent owns
the final served-bundle identity, desktop/mobile budgets and visual QA; this
document grants none of those pending release gates.

Parent integration update after this read-only review: the narrow unchanged
stage23 compatibility gate restores the previous routes without rewriting baked
data or archived seals. `tests-full-compatible.log` passes842tests/151files;
`typecheck-compatible.log` passes. The initial failed log above remains intact.
Final browser/build identity is recorded separately in the parent README.
