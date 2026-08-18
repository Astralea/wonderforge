---
name: scene-physical-plausibility
description: "Physical rules a WonderForge construction scene must obey — support, occupancy, right-of-way, continuity of appearance, path validity, ground contact, and instance hygiene — plus how to verify each one numerically instead of by eye. Use when placing props, scheduling construction, adding earthworks or routes, or when a reviewer reports clipping, floating, popping, or objects growing through each other."
---

# Scene Physical Plausibility

WonderForge is a diorama, not a simulation. It does not need rigid-body physics —
it needs to never show the viewer something that could not happen. A single
canopy growing out of a ramp, or a foundation that blinks into existence,
undoes an hour of careful masonry, because the eye reads *contradiction* long
before it reads detail.

These are the rules the scene has to obey, and how to prove it obeys them.

## Use when

- Placing any prop, scatter, structure, or vegetation.
- Adding or moving an earthwork, road, route waypoint, or monument.
- Changing the construction schedule or any appear/disappear window.
- A review reports clipping, floating, sinking, popping, or "objects overlap".

## The rules

### 1. Support — nothing floats, nothing is buried

Every object rests on something: ground, masonry, sled, ramp surface, or
cribbing. A raised block must be in contact with whatever is said to carry it.

The trap is a *label* that disagrees with the *geometry*: a block whose state
says `support: 'ramp'` while its interpolated height leaves it above the
terrace surface, or below it. Both are failures — one floats, one is buried.
When a path is eased and the surface it follows is linear, the two curves
separate in the middle even though the endpoints match. Match the profile, or
clamp the path to the surface.

### 2. Occupancy — solid volumes are exclusive

Masonry, earthworks, and props may not intersect. Ground occupied by the
construction is not available for scenery.

Enforce this from **one shared footprint**, never from two hand-maintained
copies. In this repo the ramps are typed in `src/data/gizaConstruction.ts` and
the same rectangles drive both the geometry and the keep-out set
(`src/engine/siteClearance.ts`). If the renderer owns a private copy of a
footprint, the two will drift and the clash will reappear.

Two ways to resolve a prop that lands on occupied ground:

- **Nudge** (`pushOutOfSiteWorks`) — for props whose exact position does not
  matter: tents, crates, shade frames. Push along the shallowest axis so the
  layout keeps its authored shape.
- **Reject** — for props on a rigid grid or meant to look scattered: survey
  stakes, rubble. A nudged rock lines up along the ramp edge and reads as a
  wall; a skipped rock reads as nothing at all.

Use the prop's own half-extent as the margin. Clearing a *center point* leaves
a 5-unit-wide canopy overhanging by 2.5.

### 3. Right of way — working lanes stay open

Haul corridors are the straight chords sled teams actually travel, not the
decorative roads. Keep props out of them, and keep the drawn road following
the same chord — a road that diverges from the traffic is worse than no road.

Where clearances conflict, **solid geometry wins over lane clearance**. A prop
overhanging a ramp is clipping; a prop close to a lane is just a busy site.
Resolve corridors first and footprints last so the hard constraint has the
final say.

Accept that some positions are genuinely impossible: a ramp abuts the face it
serves, so the gap between them is zero-width. A prop trapped there must be
rejected, not shuffled between two walls forever.

### 4. Continuity — things appear at the rate they are built

Nothing large may pop into existence. If an object is the product of work, the
time it takes to appear must be proportional to the work it represents.

The classic failure is counting the wrong unit. Scheduling by *exterior
blocks* gives a course time proportional to its perimeter, but the material it
places grows with its **area** — so the base slab of a pyramid gets the same
screen time as a course near the apex and snaps into being in about a second.
Budget by total placed units, interior fill included.

Bias toward the foundation on top of that: levelling, the largest stones, and
the finest bedding really did consume a disproportionate share of the effort,
and it gives the opening of the movie something to show.

Keep per-object duration a fixed multiple of the *local* slot, not a global
constant. That holds the number of simultaneously active operations steady,
which the worker and draw-call budgets depend on.

Removal needs the same courtesy: a monument-height earthwork that vanishes in
one frame is magic un-dismantling. Ramp it down.

**Scaffolding is built too.** An earthwork, crane, or falsework that the work
depends on must itself come into being at a believable rate. Two failures hide
here, and fixing only the obvious one leaves the scene still popping:

- *Full extent from frame one.* A ramp whose height grows with the courses but
  whose footprint is complete from the first frame still slams a full pad onto
  the ground. Grow the bed as well — anchored at the high end, the part any
  ascent actually needs, extending outward toward the foot.
- *A quantised frontier.* Growth expressed as a whole number of terraces
  advances in visible jumps. Keep the terraces at their final size and place
  and let a partial one ride the frontier. Earth already piled must never
  slide: recomputing every terrace from the current length makes the whole
  bank creep, which reads worse than the pop it replaced.

**Beware quantities derived from "the maximum so far".** A crest height taken
as `max(height of every block started)` is a step function: it jumps a whole
course the instant that course's first stone leaves the quarry. Interpolate
*through* the course instead — track which course is current and how far it
has progressed. Watch the last element of any such series: with no successor
to interpolate toward it will snap to its final value, which is exactly the
kind of single-frame jump the rest of the work was spent removing.

### 5. Path validity — traffic never passes through solids

A straight interpolation between two waypoints is a claim that the straight
line is walkable. Check it:

- No queued leg may cross a monument footprint.
- No raised leg may enter *another* monument.
- A route serving a monument must reach an earthwork that touches it.

Beware routes assigned by an index trick (`routeIds[side % routeIds.length]`).
It silently sends half of one monument's stones up a ramp belonging to another,
and the flight passes through whatever stands between them.

### 6. Ground contact and scale

Objects sit *on* the terrain: sled runners on the road surface, foundations on
the ground plane, tomb aprons flush. Deriving a support height from
`max(floor, objectBottom)` sinks the object when the terrain is above the
floor.

Keep a human yardstick in frame. One world unit ≈ one metre here: a worker is
~1.8 units, a course ~0.55. Any new prop must measure sensibly against a
person standing next to it.

### 7. Instance hygiene — unplaced is not the same as placed at the origin

`InstancedMesh` slots that are never written keep the identity matrix, which
renders a unit cube at the world origin — usually inside the main monument.

Any placement loop that can reject a candidate must therefore set
`mesh.count = placed` when it finishes. And never retry a rejected candidate at
the *same* position: a loop whose angle derives from the success counter will
spin on a blocked sector until its attempt budget runs out, silently dropping
everything after it. Sweep the candidate positions once and skip what fails.

### 8. Culling honesty — a shadow without its object is a stale bound

Three.js caches an `InstancedMesh` bounding sphere on FIRST render and never
refreshes it. A mesh whose count or matrices change per frame therefore
carries bounds from whatever its first frame held — zero instances at t = 0
in a movie that starts empty. The camera pass culls against those stale
bounds while the sun's wider shadow frustum still draws the mesh, producing
the signature symptom: **objects vanish and their shadows remain**, all at
once, per batch.

Set `frustumCulled = false` on every mesh whose instances mutate per frame
(they span the scene; culling them never wins), including geometry whose
`drawRange` changes (ropes). Static instanced props written once before
first render are safe.

The trap hides from paused-frame captures: a debug route loaded directly AT
the target time computes bounds from the full population and renders
perfectly. Reproduce presentation bugs under the real playback path — first
render at t = 0, then seek — before declaring them absent
(`scripts/verify-live-playback.mjs`).

### 9. Determinism

All of the above must hold identically on every playthrough. No runtime
`Math.random()` — use the seeded generator. Scrubbing to a time must give the
same frame every time, or none of these rules can be tested.

## How to verify

Do not eyeball it. Perspective hides a 2-unit overlap and invents others.

**Measure the real scene.** Three.js runs in Node without a GL context, so the
production classes can be instantiated in a probe and their instance matrices
read back. Compose `matrixWorld` with each instance matrix — instance matrices
are in the parent group's local space, so a ramp's own bricks look like they
sit at the origin until you do. Then test every prop against the keep-out set:

```js
const env = new GizaEnvironment(plan, createMaterialLibrary(wonder));
env.group.updateMatrixWorld(true);
// for each InstancedMesh, for each instance:
//   world = matrixWorld * instanceMatrix  ->  decompose -> position, scale
//   flag if !isClearOfSiteWorks(x, z, keepOuts, corridors, { margin: half })
```

Exclude the earthworks themselves — they *are* the keep-out.

**Measure continuity as a curve, not as a screenshot.** "It pops" is a claim
about a derivative, and no still frame can show it. Sample a scalar that stands
for the thing's presence — total earthwork volume, placed stone count, visible
instance count — at the real frame rate across the movie, then look at the
differences:

- **Max per-frame change** as a fraction of peak. A large value may be
  legitimate: a fast dismantle has a steep but *constant* slope.
- **Max change in that rate** (the second difference). This is where a pop
  actually shows up, because a discontinuity is a spike in acceleration while
  a steady slope is flat.

Report both. On the ramp work here the per-frame change fell from 20.2% of
peak to 1.6% — and that residual 1.6% turned out to be the steady slope of the
dismantle, with the acceleration at 0.5%, which is what proved it smooth.
Sampling only the opening would have missed a snap at t=0.5; sweep the whole
timeline.

**Prefix rendering needs a sorted key.** Any renderer that shows "the first N
items" via a binary search owes that search a monotone sort key. A schedule
whose starts ascend does NOT give ascending *end* times once durations vary —
sort the render batch by the key you search on (here: seat time), and pin it
with a test that compares the prefix count against a brute-force count, plus
one test asserting the unsorted order really is unsorted (so the sort is known
to be load-bearing).

**Framing is physics too — contract-test the frustum.** "The pyramid
disappeared" turned out to be the camera: the shot schedule held a close-up so
long the finished monument sat outside the frustum for 5 seconds. Keep shot
math pure (engine, not renderer), then project the real camera in a test and
assert the subjects' apexes stay inside NDC bounds through the beats that
promise them. A viewer cannot tell "not rendered" from "not framed" — treat
both as the same defect class.

**Then pin it with a contract test.** A number that came from a probe belongs
in `tests/`, or it will regress. Prefer tests that would have caught the
original bug, and confirm that by mutating the fix back and watching the test
fail.

**Then look at a capture,** at the specific `t` where the problem was reported
— `#/debug/wonder/<id>/<t>` — to confirm the fix reads correctly on screen.
Numbers prove absence of overlap; only the image proves it looks right.

**Check the build actually rebuilt.** `npm run build` runs `tsc -b` first, and
a type error leaves the previous `dist/` in place; a preview server will keep
serving the old bundle and the capture will show the old behaviour. Confirm the
asset hash changed before trusting a screenshot.

## Reporting

When a rule is broken, state the failure as a physical claim with a coordinate,
not as an aesthetic note: "the shade canopy at (12.4, 38.3) has a 2.7-unit half
width and the ramp edge is at z = 38, so it overhangs the earthwork by 1.4
units" — not "the canopy looks like it clips". The first can be verified and
fixed; the second starts an argument.
