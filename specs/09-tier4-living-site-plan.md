# Spec 09 — Tier 4 Plan: Living River, Working Foreground, Real Farm Strip

This is a **plan**, not yet behavior. It records the owner's three directives
(ships that move realistically, a realistic foreground, a farm-strip
"revolution"), the reference language from the owner's bookmarked visual
benchmarks, the review-board evidence, and the agreed design before any code
changes. When a phase ships, its design text moves into Specs 06/08 as
behavior; this file remains the plan of record.

Owner directives (2026-08-20):

1. Ships more realistic — "shall be moving realistically".
2. Foreground quality/realism.
3. "The farm — like things under trees — still just dull copy paste. Needs
   revolution."

Evidence base: four-role review board ran 2026-08-20 on the `aaa-t3` build
(reports preserved in-session; captures under `artifacts/aaa-t3/` and
`artifacts/review-board/vd-*`). Headline: construction causality is
best-in-class; **motion clarity is the release blocker** — the fleet drifts
2–3 hull lengths per film, wakeless, with frozen steering oars.

## Reference language (owner's "Frontend Technology" bookmark folder)

Inspected sites and what transfers to a daylight Egyptian diorama:

- **Terranova (WebGPU showcase)** — iridescent thin-film rims, ground ripple
  rings, confident HDR highlights. Transfers to: water optics confidence
  (already landed in Tier 3) and wet-edge/caustic accents.
- **Vanta.js BIRDS** — large living murmurations (separation/alignment/
  cohesion, variance colors, hundreds of bodies). Transfers to: the scene
  wants *more visible life* — a second, larger field-bird group and busier
  river; not literal boids (determinism forbids simulation), but coupled
  multi-bird orbits can read as flocking while staying pure functions of `t`.
- **Infinite Liquid Glass** — chromatic edge dispersion, deep refraction,
  buttery speculars. Transfers to: material confidence at glancing angles
  (water, wet stone), not literal glass UI.
- **Aether 1** — cinematic restraint: darkness, one glowing focal element,
  orbital motion. Transfers to: discipline — every addition must earn its
  draw call; motion reads through a few strong signals (wakes, crews,
  smoke), not particle clutter.

## Hard architecture rules (unchanged, restated for this plan)

- `src/data/` and `src/engine/` stay pure: no React, DOM, or Three imports.
- Everything animated is a pure function of normalized playback `t`; all
  randomness flows through `mulberry32` with stable seeds. The ambient
  homepage orbit remains the single documented wall-clock exception.
- Procedural or locally licensed assets only; no texture fetches; ALU-only
  shader detail; instancing over loose meshes.
- Instance hygiene: variable-count batches set `mesh.count`; per-frame
  batches set `frustumCulled = false`; new materials are owned and disposed.
- Deep links depend on wonder `id`s — never rename.

## Scope A — Living river (P1, release blocker)

Goal: any frame with a boat in it reads "underway" or "deliberately moored".

Motion model (`riverCraftStateAt`, pure; data layer):

1. **Perceptible speed + re-phasing**: raise drift to ~26 units/movie for
   barges and ~40 for sailboats (3–4× current), with per-craft start phases
   seeded so at least one barge and one sailboat cross the camera-near reach
   mid-movie. Constant + phase terms only; determinism intact.
2. **Arc-length-true progress**: precompute the channel's cumulative
   arc-length table once (pure, from the typed centerline), and advance boats
   by arc length, not raw x — ground speed no longer surges through bends.
3. **Speed modulation**: gust band and bend braking —
   `speed *= (0.82 + 0.18·gust(t, phase)) · (1 − 0.3·|curvature(x)|)`,
   both pure. Hulls breathe with the weather instead of metronoming.
4. **Heading life**: yaw follows the tangent at a slightly *astern* sample
   (heading lag) plus a slow ±0.05 weave; roll gains a heel term coupled to
   yaw-rate (`roll += k·dYaw/dt` evaluated analytically); pitch/bob couple to
   the same ripple field the water shader draws (CPU port of the value noise
   in `src/engine/`, seeded identically — one source of truth for waves).
5. **Steering-oar sweep**: oar blades oscillate ±0.1 rad about their pivots
   with per-boat phase, biased into the turn (pure).
6. **Wakes**: an instanced fading foam ribbon trails each moving hull —
   segments sample the boat's own recent path (a `t−Δ` lookback window of the
   pure state fn, so the trail is exactly where the boat was), narrowing and
   fading astern; plus a small bow pulse. One instanced mesh for the fleet.
   Moored skiff emits none.

Scene life (render layer):

7. **Deck crews**: 1–2 seated/standing figure instances per moving hull
   (helmsman at the quarter oars, lookout forward) — reuse the WorkerSystem
   figure geometry, tinted linen; static poses that ride the boat transform.
   Board evidence: tomb reliefs consistently show crews; an oar with nobody
   at it reads broken.
8. **Deck detail**: one water jar + one rope coil per hull (instanced);
   the moored skiff gains a mooring rope to a bank stake.
9. **Second bird group**: a larger, lower flock (kites/pigeons over the
   fields, ~18 birds) on coupled orbits — the "murmuration" read — reusing
   `birdStateAt` with a second typed `BIRD_FLOCK`-style description; both
   stay clear of masonry per the existing contract test pattern.

## Scope B — Working foreground (P2)

Goal: the site reads as a place where stone is won, dressed, and moved —
messy, causal, inhabited.

Quarry (currently 5 clean boxes + a flat floor):

10. **Extraction evidence**: 2–3 benched working faces with wedge-slot
    notch lines, 3–5 half-extracted blocks still attached at one edge, and a
    chip/debris apron at the bench toe. Instanced; placed through site
    clearance.

Dressing yard (currently a 13×4 storage grid; route waypoint at z≈29 but the
visual yard sits at z≈17–26 — spatial disconnect):

11. **Work-in-progress states**: blocks cluster by state — rough queue,
    in-dressing (some scaled/shifted mid-face, chip piles, measuring-cord
    lines stretched between stakes), dressed stack squared and aligned.
    Re-anchor the yard so the haul route visibly passes through it.

Camp (currently identical cones on a 9×3 grid with ±0.8 jitter):

12. **De-gridding + domestic kit**: per-tent scale 0.8–1.3× and free yaw; a
    second ridge-tent archetype; work-clusters of baskets, water jars, and
    rope coils; cooking vessels at the fire pits; trampled-path darkening
    from tents to the haul road (thin compacted-earth ribbons).

Site-wide staging:

13. **Idle equipment**: 3–5 parked sleds near road ends, 2–3 lever piles at
    ramp feet, rope coils by the queue areas, marker stones + water troughs
    at the typed `roadQueue` waypoints (roads are "wetted" — show the
    source). All placed through `pushOutOfSiteWorks`/reject rules.
14. **Scatter variety**: spoil heaps gain 3 silhouettes (conical dump,
    windrow ridge, skirted mound) in 2 tints with clustered overlap; scatter
    boulders gain size/tint variance — kills the "muffin field" read.

## Scope C — Farm strip revolution (P3)

Goal: no two parcels alike; the strip reads as a farmed floodplain, not a
checkerboard — while parcels stay on the strip and clear of the river,
levee, and palms (existing contract tests must keep passing).

15. **De-regularized lattice** (`fieldParcelAt`, pure): seeded per-parcel
    width/depth jitter (0.6–1.4×), ±3° yaw jitter, irregular gaps; adjacent
    same-crop cells merge into one larger field polygon; some cells go bare
    fallow/scrub with no crop mesh (gap cells grow scrub tufts instead).
16. **Visible water infrastructure**: bunds raised and contrasted; the 10
    irrigation feeders get a narrow water-glint surface (same sky-reflection
    recipe as the river — they already share its material).
17. **Between the parcels**: trodden field paths (dark earth ribbons from
    levee toward the camp side), stooks of bound sheaves standing in stubble
    parcels (instanced small cones), one circular threshing floor with a low
    grain mound near the strip's west end.
18. **Under the palms**: fallen-frond and fallen-date litter beneath the
    crowns (instanced litter), so shade has a floor story.
19. **Field labor**: a few static worker/ox figure pairs at parcel corners
    (hoeing, gathering stooks) — the strip is worked, not wallpaper.

## Stretch (P4, only if P1–P3 land green)

20. Sky presence at dusk: verify the sun disc reads at the reveal and the
    cloud layers carry structure (VD: dusk sky is a flat orange wash on
    desktop; mobile reveal wastes ~45% of the portrait frame on sky).
    Out of scope here but recorded: mobile reveal framing crops both
    flanking pyramids — separate camera follow-up; and the Spec 04
    scorecard-scale conflict (0–5 vs board 0–3) needs a one-line amendment.

## Contract-test plan

- `riverCraftStateAt`: speed bands per kind; arc-length progress uniformity
  (equal Δt ⇒ equal Δs within tolerance); yaw/weave/roll bounds; boats stay
  in the channel; moored skiff emits no wake; determinism (pure fns).
- Wake ribbons: trail points match the boat's own `t−Δ` positions; opacity
  fades astern; never on the skiff.
- `fieldParcelAt` v2: parcels still inside the strip and clear of
  water/levee/palms/corridors at their *jittered* extents; merged cells
  share crop; gap cells carry no crop mesh; all five crop states present.
- Stooks/litter/equipment: clearance contracts (keepOuts + corridors) and
  ground-contact bottoms ≥ 0, same probe pattern as Tier 2/3.
- Crew/figure batches: counts and `frustumCulled=false` wiring, as in the
  Tier 2 ecology render tests.
- Fleet draw-call budget test updated to name the wake batch explicitly.

## Budget + QA

Current desktop totals (incl. ~15 post passes): 109–122 calls, ≤ 247k tris;
mobile 93. Plan adds: wake ribbon +1, crew figures +2, deck detail +2,
stooks/litter/paths/equipment +4–6, second bird flock +2 → target ≤ +12
desktop, mobile trims instance counts, not features. Textures stay flat
(procedural only). Verification per phase: `npm run test && npm run
typecheck && npm run build`, then the deterministic capture set
(0.12/0.35/0.62/0.9/1.0 desktop + 1.0 mobile) with `renderer.info` budgets,
plus a `scripts/verify-live-playback.mjs` pass for the moving fleet.

## Phase order

1. **P1 living river** (release blocker: motion clarity).
2. **P2 working foreground** (quarry → dressing yard → camp → staging).
3. **P3 farm strip revolution**.
4. **P4 stretch** (sky presence; recorded follow-ups stay out of scope).

Each phase: move its design text into Specs 06/08 as behavior, write or
extend contract tests first, implement, run the full gate, capture the
checkpoint set, re-run the review board, update HANDOFF.md.
