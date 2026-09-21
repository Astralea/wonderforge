# Paris environment optimization evidence — 2026-09-07

The detailed life renderer now uses four per-object-frustum-culled multi-geometry batches. Together with five far-life batches and two mooring batches, traffic contributes **34,624 authored triangles in 11 drawables**, compared with 33 drawables before this pass. Limb, wheel, hoof, and sole matrices remain independent.

The table reports the integrated live scene on port 5590. The parent city batching landed during the same interval, so the full-frame reduction includes both changes; the isolated traffic measurement above attributes the traffic reduction precisely.

| Device/time | Before calls | After calls | Before triangles | After triangles | Final gate |
|---|---:|---:|---:|---:|---|
| Desktop 0.58 | 201 | 153 | 352,594 | 323,650 | pass |
| Mobile 0.12 | 160 | 113 | 208,990 | 177,942 | pass |
| Mobile 0.32 | 164 | 115 | 270,904 | 234,680 | pass |
| Mobile 0.58 | 152 | 104 | 285,040 | 250,236 | pass |
| Mobile 0.92 | 134 | 88 | 306,753 | 274,873 | pass |

The mobile target is at most 150 calls and 300,000 triangles; desktop is at most 200 calls and 450,000 triangles.

Additional visual changes:

- Far people retain the 1.84 m silhouette but render garment and head as separate color regions.
- Deterministic lateral offsets of at most 1.2 m break straight dotted rows while remaining inside promenade and sidewalk widths.
- The Seine remains a continuous 7.8 km plane and retains the same terrain channel. Alpha now tapers after the outer bridges and the powered-vessel route fades/wraps inside the same ±720 m visual domain, softening the former infinite blue wedge without a hard mesh cutoff.

Validation:

- 21/21 focused traffic, transformed-contact, bridge-collision, mooring, lifecycle, and environment tests pass.
- Live browser captures produced no console or page errors.
- Whole-project typecheck is temporarily blocked by concurrent edits in `src/engine/eiffelConstructionTiming.ts` at lines 55 and 57; the reported errors do not reference the traffic/environment files.

Evidence:

- Before: [desktop 0.58](../desktop-058.png), [mobile 0.12](../mobile-012.png), [mobile 0.32](../mobile-032.png), [mobile 0.58](../mobile-058.png), [mobile 0.92](../mobile-092.png)
- After: [desktop 0.58](desktop-058-final.png), [desktop 0.92](desktop-092-final.png), [mobile 0.12](mobile-012.png), [mobile 0.32](mobile-032.png), [mobile 0.58](mobile-058.png), [mobile 0.92](mobile-092.png)
- Machine-readable after counters: [report.json](report.json)
