# Eiffel Paris environment integration QA — 2026-09-07

**Scope:** Read-only capture of the main debug movie at `t = 0.12, 0.32, 0.58, 0.92`, desktop 1440×900 and mobile 390×844. Captured from `http://127.0.0.1:5590` after the version 2 city asset (`211,846` source triangles) loaded. Renderer: Apple M2 Ultra through ANGLE Metal. No console or page errors occurred.

**Health:** 72/100. The exposition and varied city now read clearly, and no legacy École/path duplication or building/tree penetration is visible. Mobile remains outside the agreed render gates, the distant Seine makes a hard wedge in the fog, and most people still read as evenly spaced pins rather than a busy fair crowd.

## Render budget

| Device | Time | Calls | Triangles | Gate result |
|---|---:|---:|---:|---|
| Desktop | 0.12 | 197 | 248,019 | pass |
| Desktop | 0.32 | 195 | 299,438 | pass |
| Desktop | 0.58 | **201** | 352,594 | fail: calls > 200 |
| Desktop | 0.92 | 190 | 381,602 | pass |
| Mobile | 0.12 | **160** | 208,990 | fail: calls > 150 |
| Mobile | 0.32 | **164** | 270,904 | fail: calls > 150 |
| Mobile | 0.58 | **152** | 285,040 | fail: calls > 150 |
| Mobile | 0.92 | 134 | **306,753** | fail: triangles > 300,000 |

Desktop uses the agreed 450,000-triangle/200-call gate; mobile uses 300,000 triangles/150 calls. The raw capture data is in [report.json](report.json).

## Findings

### P1 — Mobile misses a render gate at every sampled time

Early and middle frames exceed the call cap by 2–14 calls; the late completed-tower frame exceeds the triangle cap by 6,753. The most targeted call reduction is to consolidate the detailed life articulation meshes: people, wagons, horses, wheels, and boats currently consume many persistent batches even when only a few detailed actors are visible. A small number of multi-geometry `BatchedMesh` groups can retain independent limb/wheel transforms and per-object culling while recovering roughly the required call margin. For the late triangle miss, measure visible city-cell and completed-tower contributions at `t=.92`; split only the dense cell crossing that mobile frustum if city submission is responsible.

Evidence: [mobile 0.32](mobile-032.png), [mobile 0.92](mobile-092.png).

### P1 — The Seine terminates as a long blue wedge in the horizon fog

At desktop/mobile 0.58 the river projects as a narrow triangular strip far behind the tower; at 0.92 the same strip points toward the left horizon. Its straight edges remain visible after the banks and city disappear, recreating a hard horizon even though the sky itself is smooth. Fade the river vertices/material toward the shared time-derived horizon color beyond the modeled quays, or extend/fog the banks so both river edges disappear together. Preserve the near-water color and boats.

Evidence: [desktop 0.58](desktop-058.png), [desktop 0.92](desktop-092.png), [mobile 0.58](mobile-058.png).

### P2 — Crowd quantity is visible, but fair activity reads as lane markers

Desktop views show many correctly scaled figures and recognizable carts, especially along the west promenade. Most economical people appear as single dark strokes at these camera distances, and the parallel routes still form even dotted lines. The six market clusters do not separate perceptually from walkers in the requested movie frames. Keep the population count, add deterministic lateral offsets inside the 10 m paving, and give the far-person geometry two vertex-color regions for garment/head contrast. Put a few detailed or middle-LOD pairs beside carts and pavilion entrances; consolidating detailed traffic batches first would cover their call cost.

Evidence: [desktop crowd crop at 0.58](crop-desktop-058-crowd.png), [desktop market crop at 0.12](crop-desktop-012-market.png), [mobile crowd crop at 0.58](crop-mobile-058-crowd.png).

### P2 — The distant city breaks into isolated strips during the back half of the orbit

The detailed city is convincing at 0.12 and 0.32. At 0.58 and 0.92, isolated rows remain on the far side of a large empty beige field, making the environment look clipped rather than continuous. Verify road and building triangles from the same spatial parcel share compatible chunk bounds. A very low-triangle fog-colored silhouette band behind the last real parcels would also maintain depth without restoring the duplicated procedural city.

Evidence: [desktop 0.32](desktop-032.png), [desktop 0.58](desktop-058.png), [desktop 0.92](desktop-092.png).

### P3 — Reflecting pools read as noisy gravel at wide distance

The pools occupy the correct formal garden positions, but the shared Seine surface treatment produces bright speckling at their small screen size. Reduce high-frequency water response for the shallow pools while retaining their darker blue value and exact coping height.

Evidence: [desktop 0.12](desktop-012.png).

## Checks that passed

- The authored twin palaces, central dome, Galerie des Machines, market pavilions, formal gardens, and varied city blocks are visible and spatially coherent in the first half of the orbit.
- Legacy Champ paths and the old École are not visibly duplicated.
- No obvious pedestrian, horse vehicle, tree, or pavilion penetration appears in the eight captured frames.
- Promenade lanes remain inside the visible paving; no abrupt actor route wrap was observed in the still captures.
- Sky color is temperate blue/grey without the former opaque pink-beige band.
- All eight frames rendered through the hardware Metal path with no browser errors.

## Evidence index

- Desktop: [0.12](desktop-012.png), [0.32](desktop-032.png), [0.58](desktop-058.png), [0.92](desktop-092.png)
- Mobile: [0.12](mobile-012.png), [0.32](mobile-032.png), [0.58](mobile-058.png), [0.92](mobile-092.png)
- Machine-readable counters: [report.json](report.json)
