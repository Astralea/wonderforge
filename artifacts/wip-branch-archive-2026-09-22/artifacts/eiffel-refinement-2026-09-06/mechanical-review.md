# Mechanical review — remaining Eiffel work

The new Blender model and improved camera do not establish mechanically
credible erection. This review concerns the current translation-only sampler
and is a reason to continue the owner goal, not a completion report.

## Measured defects

- `shaft-00` is 36.848 × 7.024 × 36.848 m. Its wagon becomes roughly
  37.25 × 37.25 m. The four foundations are 22 × 4 × 22 m cargo.
- The current 363-group manifest has 107 groups exceeding 12 m on an axis.
- Review of `eiffelAssembly.ts` found crane reach up to 174.48 m and mast
  height up to 71.70 m. The contract limits these to 8.4 m and 22 m.
- The crane base is selected from an earlier part's AABB center; that is
  not a structural bearing. An arch on one face can use an earlier arch
  on the opposite face as its support.
- Ground-support envelope tests pass, but do not establish wheel contact,
  cargo occupancy, road clearance or structural attachment.

## Required next implementation

Parent owns all Blender changes. Preserve the current dated .blend/GLB
and visual evidence before replacing assembly ownership.

1. Split masonry into courses/blocks, pylon and shaft tiers into connected
   shop panels/chords, platform sectors into girders and deck panels,
   and summit stairs/roof into bounded units. Preserve the completed
   tower silhouette and original model provenance.
2. Export manifest v2 with local rigid transforms, actual lift lugs,
   support and joint contacts, dependencies, named crane stations and
   exterior lift corridors. AABB remains broad-phase evidence only.
3. Tie each station to actual previously seated support/falsework; use
   station occupancy to schedule loads. Enforce bounded jib/mast sizes.
4. Animate pickup and erection orientation rigidly. Derive rope endpoints
   from transformed lugs, not the center of an envelope. Wheels follow
   the road and turn with distance; workers stand on actual decks.
5. Validate support contacts, oriented cargo/carrier dimensions, stage
   dependencies, swept clearance and finished-vertex round trips. Keep
   unresolved mesh collisions explicit; do not turn them into passing
   scalar envelope checks.
6. Re-run Giza comparison and desktop/mobile playback before accepting
   Eiffel. Only then randomly select an unfinished catalog wonder and
   repeat the Blender-to-web pipeline, as the owner requested.

The review-board agent was read-only. It did not invoke Blender or MCP.
