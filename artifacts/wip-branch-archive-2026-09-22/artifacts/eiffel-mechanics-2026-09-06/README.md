# Eiffel bounded construction mechanics

This evidence chain separates the preserved Blender geometry from measured
kinematic checks. The trial planner is not a validated erection sequence.

## Follow-up audit — 2026-09-07

All sixteen trial pickups intersect the crane mast: pickup XZ equals station
base XZ. For `lower-ne-00-m000-c000`, the base is
`[42.25, 4.25, -60.75]`; the horizontal pickup envelope is
`[41.93, 4.55, -62.6768]` to `[42.57, 5.0492, -58.8232]`.
The deck top meets the load bottom, but the mast runs through the load.

The foundation union AABB also overstates support. The only geometry reaching
its reported top Y=4.25 is four 0.08 × 0.08 m post tops. The trial crane's
3.4 × 2.8 m deck has no authored grillage connecting it to those posts;
all four deck corners lie outside the actual top rectangles. Therefore the
current tests establish bounded reach and continuity only, **not supported
stations or clear pickup paths**. These known defects precede all upper-stage
work: author actual crane grillage/support polygons and offset loading points,
then check the swept cargo against mast, operator, deck and completed members.
The production path remains unchanged. Globally unique source members: 7,290.

## Construction kit

The construction kit contains 13,814 rigid pieces. Its canonical transport
envelope is at most 2.6 × 2.6 × 6 m, and the compact seated asset preserves the
complete final tower. The manifest deliberately remains
`constructionReady: false`; it still lists structural dependencies, supported
stations, clear rigid routes, and browser performance as whole-film gates.

The current pure pilot covers sixteen first-tier iron lifts: four sequential
lifts on each of the four pillars. Each operation uses a station on an aggregate
foundation bounding-box top, a 12 m mast, an 8.4 m fixed boom, a positive
cable, an above-work horizontal transfer, rigid rotation, and an exact final
pose. All other unproved kit members remain queued.

This pilot does not validate foundation bearing capacity, crane or member
stress, fastening, wind load, or geometry-level swept collision. Its support
check proves only that the station base lies on the exported bearing top
envelope. Extending construction above the first tier still requires authored
dependencies and supported climbing stations, clear routes, freight-elevator
handoffs at the first, second, and intermediate upper levels, and a complete
browser performance pass.

## Production status

The production Eiffel movie still uses the legacy 363-group assembly path. Its
whole-tier cargo and giant thin crane spans remain visible. The bounded kit is
not wired into `EiffelWorld` because replacing the legacy path with a partial
schedule would make the rest of the tower appear discontinuously. No cosmetic
suppression is used.

## Evidence

- Kit manifest: `public/models/eiffel-construction-kit/tower-kit.manifest.json`
- Pure planner: `src/engine/eiffelKitConstruction.ts`
- Rigid motion: `src/engine/eiffelRigid.ts`
- Bounded crane sampler: `src/engine/eiffelCrane.ts`
- Rendered fixed crane: `src/render/three/EiffelCraneRig.ts`
- Planner tests: `tests/eiffel-kit-construction.test.ts`
- Crane geometry tests: `tests/eiffel-crane.test.ts`, `tests/eiffel-crane-rig.test.ts`
- Rigid-motion tests: `tests/eiffel-rigid.test.ts`
- Existing inspection captures: `qa-crane/desktop-transport-0.png`,
  `qa-crane/desktop-transport-0.5.png`, `qa-crane/desktop-transport-1.png`, and
  `qa-crane/mobile-transport-0.png`

Focused verification command:

```sh
npm run test -- --run tests/eiffel-kit-construction.test.ts tests/eiffel-crane.test.ts tests/eiffel-crane-rig.test.ts tests/eiffel-rigid.test.ts
```

Result on 2026-09-07: 18 tests in 4 files passed. The renderer matrix test
samples 361 combined luff/slew poses. Fixed-member and boot-contact tolerances
are 10 µm and 1 µm respectively because `InstancedMesh` stores matrices as
float32. These scalar and contact checks do not validate support load capacity,
beam stress, wind response, or full cargo collision clearance.

## Full bounded production replacement — 2026-09-07

The production world now uses the 13,814-piece rigid kit instead of the legacy
whole-tier assembly. Four-lift dependency waves follow the camera's floor
milestones; selected hero waves last about 0.35 seconds. Every rendered jib is
8.4 m. Station-specific stayed masts range from 8 m to 22 m based on sampled
hook headroom. Temporary triangulated brackets extend at most 4 m and connect
through two saddles on transformed box faces of completed members.

Foundation cargo stays on a ground-contact carrier until its local derrick rope
attaches. Elevated cargo appears supported on a receiving deck whose two
grillage members terminate at the selected real-face saddles. Its later hoist,
polar transfer around the mast and seating are continuous rigid motion. Dense
representative samples keep the conservative transformed cargo AABB more than
0.17 m from the mast envelope; impossible crane reach or cable headroom throws
instead of clamping.

Focused evidence: `tests/eiffel-production-construction.test.ts`,
`tests/eiffel-production-works.test.ts`, `tests/eiffel-station-map.test.ts`,
`tests/eiffel-crane-rig.test.ts`. Typecheck and production build passed; local
browser inspection at debug t=0.30 loaded the kit-backed world without a giant
horizontal jib. This is diorama plausibility, not a capacity, stress or wind
certification. Freight delivery to elevated receivers is temporally compressed:
the ground-to-floor elevator journey is not animated, and cargo becomes visible
only when supported on the receiver.
