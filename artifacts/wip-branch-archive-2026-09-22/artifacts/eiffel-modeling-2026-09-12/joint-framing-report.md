# Bounded joint framing result

The admitted change is lens framing only in the cinematic edit. It retains the
original target, eye position, radius, pitch and azimuth. During64–74seconds the
vertical field of view changes42° to26°, producing1.663× linear image scale for
the worker, splice and bearing deck on both tested profiles. The lens is fitted
to the existing focus envelope with horizontal82% and vertical75% frame bounds.
Source time, detailed edition, captions, worker and hardware poses are unchanged.

This is a legibility improvement candidate, not a claim that structural
occlusion is eliminated. The same world-space rays remain blocked. Enlarging
the work also enlarges any remaining foreground member; final pixels must be
reviewed with the changed caption placement before accepting the combined view.

The CPU probe uses159 exact loaded equipment meshes, prior seated kit oriented
boxes and both current campaign payload poses. It samples head, hands, wrench
contact and feet plus six small offsets at six fastening source times (252rays).
The original view has5 blocked rays, all at current iron near work contacts.
Side views around110° remove those sampled occlusions, but both110° and160°
attempts fail strict near-frustum clearance against the completed tower,
including during the approach. They were rejected. Tested pitch changes0–45°
also increased sampled obstruction compared with the inherited view; rejected.
The original25° work pitch and orbit remain authoritative.

Artifacts:
- joint-side-angle-candidates.json records the rejected side-angle screen.
- joint-sightline-candidates.json records the pitch screen; its `angle` field
  names pitch degrees, and null denotes the original source camera.
- joint-sightline-probe.ts reproduces the exact CPU mesh/box ray screen.
- joint-framing-result.ts/json records admitted before/after shots and scale.

Verification:7/7 eiffel-film-edit tests pass, including continuous/reversible
camera, source clock preservation, full worker/splice/deck projection during
the spoken cue, and completed-kit near-frustum clearance over all approaches
at1280/720,1.6,390/844. Typecheck passes. The test is intentionally not weakened
to ignore future tower members. Parent owns final build and actual64/68/72s
render review. No browser or source modifications remain in progress here.
