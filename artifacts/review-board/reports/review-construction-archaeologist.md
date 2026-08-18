# Construction Archaeologist — Review Board Report

(Re-run 2026-08-16 after the original background task errored on usage limits.
Findings F1 and F2 were fixed the same day — see the addendum at the end.)

Scope: `src/data/gizaConstruction.ts`, `src/engine/construction.ts`, `src/render/three/Environment.ts` (`addRamps`/`update`), `src/render/three/WorkerSystem.ts`, specs 02/08, contract tests, and captures under `artifacts/`. Numeric claims verified by sampling `constructionStateAt` against the shipped plan.

## Verification of the prior fix

**V1 — note (verified, holds).** The inverted-ramp bug is fixed in code, contract, and pixels. All five earthworks place their high terrace at local +z with yaws mapping +z to the monument side; `rampFoot` waypoints sit at the far low ends; the contract test enforces foot-farther-and-lower per route; captures show terraces descending away from the working face.

## New findings

**F1 — critical: Menkaure blocks fly ~95 units through the finished Khafre pyramid.** `routeIdsByMonument.menkaure` assigned `temple-causeway` (waypoints near Khufu) as Menkaure's second route. The raised leg lerps straight from that rampFoot to the crest at the seat, so every Menkaure side-1/side-3 block made a ~95-unit diagonal flight across the plateau labeled `support: 'ramp'` with no earthwork beneath — probe: block `menkaure-c15-s1-b00` samples at `(−40.2, 6.6, −35.5)` mid-raised, **13 units deep inside the completed Khafre pyramid**. Dominates the movie's closing ~10%. Violates Spec 02 invariants 6 and 7.

**F2 — critical: khufu-east sleds tunnel through Khufu's base at ground level.** The queued leg ran `roadQueue [−24, 0.3, 23] → rampFoot [43, 0.35, −1]` — a straight ground-level chord entering the +z face at ≈(−4.5, 16), transiting the footprint interior, and exiting through the +x face at ≈(24, 5.8). Every side-1/side-3 Khufu block — half of ~2,600 stones — did this for the entire Khufu build. Blocks visibly melt into one wall and re-emerge from the adjacent one. Violates Spec 02 invariant 7.

**F3 — major (borderline critical): the crest is anchored to the seat, not to the earthwork.** `rampCrestFor` applies a universal +z side offset from the block's final position regardless of which face the block seats on or where its route's ramp stands. Probe-confirmed consequences: (a) far-face (side-2) blocks cross their own monument (`khufu-c10-s2-b00` samples inside Khufu's fresh course fill, support `'ramp'`); (b) Khafre side-1 blocks climb the west ramp then cross the pyramid west-to-east; (c) even correctly-faced blocks overshoot the earthwork (`khufu-c20-s0-b00` leaves the ramp footprint at y=11.4 with ~7 units of open air below, still labeled ramp-supported). A single straight-line leg from a fixed foot to a per-seat crest cannot follow any one earthwork when seats span four faces. Violates Spec 08 "Ramp ascent follows the ramp surface."

**F4 — major: sleds ride inside the earthwork for most of the climb.** The raised leg's `easeInOutQuad` height profile toward a seat-anchored crest lags the linear terrace profile: probe shows the block 0.5 units below the terrace surface at f=0.66 and 1.6 units below at f=0.70; for far-inset crests the deficit reaches ~2.5 units. Stone, sled, and crew travel inside the compacted-earth mass and pop out near the crest.

**F5 — minor: the khufu-south approach cuts through the ramp's west flank.** The queued leg `roadQueue [−29, 0.3, 20] → rampFoot [7, 0.35, 37]` entered the earthwork footprint at ≈(−8, 29.9) at ground level and stayed under mid-height terraces to the foot.

**F6 — minor: the haul crew reads as trailing, not pulling.** Both workers are placed behind the sled and the rope runs from behind-worker space to the block's rear face (`WorkerSystem.ts:119-151`). Spec 08 asks that "haul teams lean into tensioned ropes"; as depicted the motive force is unexplained. Two haulers per multi-ton stone is also light (real crews ~20 for 2.5 t) — acceptable under diorama compression, but the geometry inverts the causality of hauling.

**F7 — minor: terminal ramp gradients are 35–47°.** Earthwork lengths 17–26 units versus `maxHeight` 12–24 give ~1:1 final slopes; real sled ramps were ≤~10°. Terracing plus the Spec 08 disclaimer keeps this readable as a stepped embankment.

**F8 — minor: sled runners sit below grade on the roads.** `supportY = max(0.08, blockBottom)` with road waypoints at y≈0.25–0.5 puts the sled deck at y≈−0.04 and runners at −0.15 — the stone drags on its belly with the sled buried. Largely masked by dust.

**F9 — note: monument-height ramps vanish in a single frame** at `end + 0.018` — magic un-dismantling. A height ramp-down over a few percent of t would read as method.

**F10 — note: no return traffic.** Crews and sleds exist only while bound to an active operation; Spec 08 lists "workers return without a block" as mechanical motion.

## What reads well

Human scale is right (≈1.8-unit workers vs ≈0.55-unit courses); courses build strictly bottom-up with core-fill maturing inside each course's window; monuments rise in dynastic order; Menkaure gets granite lower courses and Khafre keeps casing on its top ~28%; dust is bound to drag/seating contacts; levers appear only during alignment; the terraced earthworks grow with, and toward, the working face.

## Verdict

The earthworks are now credible; the credibility gap has moved from the ramps to the *trajectories*: monument-blind straight-line lerping between a shared route skeleton and a seat-anchored crest put roughly half of all blocks inside masonry, inside the earthwork, or in open air labeled "ramp" — culminating in Menkaure's stones flying through the finished Khafre pyramid during the finale. F1 and F2 are the mandatory next pass before further visual polish; F3/F4 (face-aware routes, crests clamped to the earthwork, terrace-matched elevation profile) complete the fix.

---

## Addendum — fixes applied 2026-08-16 (same session)

- **F1 fixed:** `routeIdsByMonument.menkaure` is now `['menkaure-south', 'menkaure-south']` — Menkaure has exactly one earthwork, so every side hauls up the same ramp. No Menkaure trajectory crosses Khafre or Khufu.
- **F2 + F5 fixed:** khufu-east now rounds the south-east corner wide (`roadQueue [28, 0.3, 47]`) before turning to its foot; khufu-south swings south of its earthwork (`roadQueue [-29, 0.3, 41]`) and mounts the foot end-on. Drawn haul roads (`addRoads`) were re-laid along the actual sled chords, and the worker-camp props now keep a clear right-of-way over the corridors (`clearOfHaulRoads` nudge in `addSettlement`).
- **Contract tests added** (`tests/giza-world.test.ts`): queued haul legs must stay outside every pyramid footprint, and no block's raised leg may enter another monument's footprint (verified to fail on the old data).
- **F3, F4, F6–F10 remain open** — documented as the next construction pass in HANDOFF.md.
