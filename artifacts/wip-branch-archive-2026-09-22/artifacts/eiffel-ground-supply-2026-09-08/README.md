# Full upper supply-path audit and timing kernel — 2026-09-08

This work addresses the production plan across the whole tower, not another
single decorative lift. It is **not yet promoted into the main film**. The local
main remains Paris v15, `main-Dcd_FVbt.js`, 264 seconds. No new Blender model or
MCP mutation was needed for this pure geometry/timing work; it uses the existing
Blender kit. No plugin installed. The overall goal remains active.

## What is wrong in the current plan

The generic plan has 13,814 operations, including 12,918 upper operations.
Every upper pickup is derived from an elevated crane station and receiver.
There is no preceding ground delivery. The main film overrides three of these
members with its previously admitted ground-lift and two-load chapters; this
audit intentionally examines the complete generic plan, including those entries.

Simply moving every pickup down to the ground is invalid:

| Complete generic upper plan | Result |
| --- | ---: |
| Upper operations examined | 12,918 |
| Direct ground ascent intersects its own receiver deck | 12,918 |
| Direct ascent also intersects previously seated iron | 9,124 |
| Outside ascent / lateral handoff / receiver descent has a clear cargo envelope | 7,741 |
| No candidate found around the existing station | 5,177 |

All rejected IDs and first blockers, accepted four-pose chains, per-stage counts
and search-rejection counts are in `ground-feed-audit.json`. The earlier search
without the receiving carrier/brackets is preserved separately; its 7,747 count
is superseded. Stages 61–63 have no accepted candidate at the existing stations.

The four anonymous crane slots also change station between waves without a
persistent equipment lifecycle. Only stage 23 consults the existing baked upper
route cache: 1,085 entries are accepted and 211 remain unresolved; other upper
operations use the generic orbit path. A clear ground-feed envelope does not
repair that final route automatically.

## Implemented kernel

`src/engine/eiffelGroundSupply.ts` now provides a deterministic offline proposal:

1. Position the complete transported footprint 0.6 m above sampled terrain,
   representing a proposed bed height rather than an already modeled cart.
2. Search outside columns at 7.2 / 5.4 / 3.6 m from the existing finite crane
   station, sixteen azimuths each. Test finite hook geometry at the route endpoints.
3. Sweep the cargo from ground to an elevated hold, across above the receiver,
   and down into its **same existing pickup pose**. The sampler preserves rigid
   orientation, continuity and reverse seeking; no scaling or identity swap.
4. Reject whole translation sweeps against all completed kit occupancy at the
   original operation start. Include the receiver deck/supports, stock table and
   its feet, crane bracket/saddles, and a simplified mast envelope.

The SAT sweep is exact for the rectangular kit occupancy and fixed orientation.
Non-box cupola parts use conservative box envelopes and are not silently omitted
from the spatial index. A rejection involving such an envelope is not proof of
intersection with the detailed curved surface.

Every returned route explicitly has `productionReady: false`. The search does
not certify articulated crane solids, slings, ground cart/loading, city/roads,
workers, concurrent moving loads, persistent equipment, capacities, or the later
receiver-to-final installation. Original operation times are used to determine
which iron exists; supply rescheduling must revalidate that occupancy.

Run the audit through local esbuild and Node; see
`scripts/audit-eiffel-ground-supply.ts`. Final complete search took about 55 s.

## Timing evidence

An in-session agent implemented only `src/engine/eiffelReadableClock.ts` and its
tests after a read-only architecture audit. Parent reviewed the code and renamed
the test to avoid claiming actual GPU frame guarantees.

The original upper operation median is about 9.85 ms; 8,218 are shorter than a
60 Hz frame and 12,860 are shorter than 0.1 s. Only 58 hero operations receive
the 0.35 s interval. The clock kernel preserves simultaneous waves, dependency
order, hold gaps and a reversible production-coordinate/seconds mapping.

Reserving four 60 Hz frame intervals for each of the 3,574 waves requires
**250.936804387 s** for the original 60 s production timeline. Existing admitted
chapters add 204 s, so the complete film would be at least **454.936804387 s**
(about 7 min 35 s), before additional supply travel. This is a lower-bound study,
not a physical speed schedule or proof that a four-frame operation reads well.
The clock is deliberately not connected to main playback yet.

An optional user question about longer continuous coverage versus explicit
editorial time jumps was sent; no answer was available when this note was
written. It does not block independent geometry work.

## Historical basis

The [official tower history](https://www.toureiffel.paris/en/the-monument/history)
describes factory-made assemblies around five metres long. The
[official construction account](https://www.toureiffel.paris/en/news/130-years/construction-eiffel-tower-exemplary-project)
describes preassembled parts arriving on horse-drawn carts and three-ton steam
cranes climbing the pillars. This supports bounded prefabricated freight,
persistent working levels and delivery from the ground. It does not justify
material appearing on a high receiver or an arbitrary long unsupported jib.

## Verification and next gate

- 607 tests / 85 files pass (`npm run test -- --maxWorkers=2`). Typecheck/build
  pass. This includes all existing actual-GLB kit coordinate checks.
- New tests detect a thin obstacle between clear ascent endpoints, honor the
  time at which an obstacle exists, test rotated ground-footprint clearance,
  route continuity and reverse seeking, reject rotation in a translation sweep,
  and test clock inverses/durations/boundaries across the complete manifest.
- No renderer change, no asset replacement and no claimed new browser/GPU
  evidence. Production bundle remains unchanged; the previous Paris main-film
  QA still corresponds to that bundle. New code is currently offline-only.

Next work must introduce persistent receiving levels and stock ownership,
especially stock delivered before upper enclosures close. Then validate complete
loaded carriers/rigging and receiver unloading, replace unresolved final routes,
and connect the resulting same-part ledger to the main renderer. Do not promote
the 7,741 envelope candidates merely because their cargo sweeps pass. The earlier
face-package pad extraction collision also remains unresolved; that evidence
is retained in the preceding handoff.
