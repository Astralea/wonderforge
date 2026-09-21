# Supported climbing proposal — not yet implemented or admitted

The current static two-collar candidate cannot climb by translating its root.
That would move both supports off the already seated mast. Preserve the same
6m pole and jib, add two fixed mast collars at the next station, and animate
separate guide frames. The pole slides through stationary guides.

Prerequisite: c001 and both of its rungs are fully seated and connected; cargo
has been released and the empty hook/jib are safely parked. This is NOT a way
to climb while holding an uninstalled mast section.

## Exact guide overlap

Let b be pole-bottom Y, from300.90 to305.5666667. Each actual pole strap occupies
Yguide+/- .06m. Full engagement requires b<=Yguide-.06 and b+6>=Yguide+.06.

| Guide | CentreY | Full engagement interval for b |
|---|---:|---:|
| old lower |301.100000|295.160000..301.040000|
| old upper |302.300000|296.360000..302.240000|
| new lower |305.766667|299.826667..305.706667|
| new upper |306.966667|301.026667..306.906667|

Thus new lower is already engaged around the initial pole. New upper can engage
well before old upper loses its engagement. At final position, new lower still
has .14m pole protrusion below its full sleeve.

## Sequence, including the attached jib and lifting lug

1. Install new lower mast clamp and close its guide around the existing pole.
   Install the new upper mast clamp with its entire fork/guide frame swung aside.
   Attach lifting tackle to a FIXED lug on this upper mast clamp, independent of
   the swinging guide. Connect its moving end to a fixed pole-bottom lug.
   Tension tackle before unlocking any load-carrying pole clamp.
2. At b300.90, open/swing old lower guide completely away. Old upper and new lower
   remain engaged. This also clears the projecting bottom lifting lug before it
   passes the old lower frame. Merely opening a strap while leaving forks in its
   path is insufficient.
3. Pull the pole upward .40m to b301.30, then HOLD the tackle. New upper guide
   remains swung aside until the attached jib heel passes. Pole head now307.30;
   even allowing .05m downward heel-pin extent, clearance above the new guide's
   top307.026667 is .223333m. Close and latch new upper guide while old upper and
   new lower continue to guide. No instantaneous gate switch is permitted.
4. Lift to b302.00 (1.10m travel), HOLD, then swing old upper guide away. The two
   new guides are already engaged. This clears the bottom lifting lug before it
   crosses old upper. Continue lifting through the new guides only.
5. At b305.566667, tighten both new pole-clamping shoes. Transfer weight off the
   tackle only after this lock; retain the tackle until contact is visibly set.
   Old hardware remains attached to the old mast or is separately lowered; it
   does not disappear or travel with the pole.

A bottom lifting lug at pole-relativeY+.08, with .02m vertical half-extent, stays
.04m below the new lower guide underside at final position. Both old guide frames
must swing away before that protrusion reaches them. Suggested frame hinge is
mast-west outer face[-.13,Y,0], rotating the entire fork/strap around verticalY;
90deg moves the guide centre from[-.90,Y,0] to[-.13,Y,+/-.77]. The actual sweep,
bolts and latch contacts still require authored-geometry collision tests.

The current exact .13m pole-strap bore is a locked fit. A sliding guide needs
controlled running clearance, e.g .132m with tightening shoes, without scaling
source steel. The numeric intervals prove longitudinal engagement, not constant
normal-force contact on every wall, friction capacity or strength.

## Tackle and remaining admission gates

Proposed fixed tackle lug:[-.13,306.966667,+.20]; moving lug:[-.90,b+.08,+.20].
The +Z lead lies outside the central mast/rung plane. Its upper support remains
fixed on seated c001 throughout the lift. The rope carries weight while guide
shoes are released. Actual block extents, winding drive, bends, linkage and the
lead to a staffed winch at295m are NOT yet verified. A straight unreviewed drive
rope may cross the cupola.

climb-intervals.py/json samples10,001 pole positions with the above holds/gate
schedule: minimum2 fully engaged guides, no interval gaps. The interval table
also proves coverage between samples. This does not certify the unbuilt hinge
sweeps, worker access, tackle force, static capacity, attachment/release work or
upstream freight. Parent must author those mechanisms before production admission.
