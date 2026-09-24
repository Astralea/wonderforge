# Sydney garden placement polish — visual review

Date: 2026-09-23. Production bundle: `/assets/main-a_zVs6Wg.js`.

**Accepted for the bounded garden placement pass.** The final composition improves the foreground through irregular spacing, stronger size variation, and a clear lawn opening toward Farm Cove. It introduces no observed obstruction of the Opera House, cranes, bridge, harbour channel, or existing approach. This is a modest composition improvement using the existing stylized tree kit, not a claim of dense botanical canopy or a reconstruction of individual historical plantings.

The previous complete-scene acceptance and scores in [the overhaul review](../sydney-overhaul-2026-09-23/visual-review.md) remain unchanged. This report assesses the garden delta and visible regressions; it does not rescore unrelated systems.

## Evidence reviewed

- Direct before/after comparisons: `before/desktop-0.58.png`, `before/mobile-0.58.png`, `before/desktop-1.png`, `before/mobile-1.png`, and the corresponding four `after/` captures.
- All twelve final desktop/portrait checkpoints in `after/`: t = 0.12, 0.32, 0.58, 0.78, 0.92, 1.
- Actual player captures: `after/desktop-film.png`, `after/mobile-film.png`; reduced-motion reveal: `after/mobile-reduced-motion.png`.
- Capture and lifecycle diagnostics: `before/report.json`, `after/report.json`, `live-film/report.json`.

## Before and after

The old layout distributed similarly sized, isolated crowns across the garden and continued onto the broad grey foreground. This was most conspicuous in `before/mobile-1.png`, where scattered trees extended down to the bottom edge. In `after/mobile-1.png`, the planting is confined to the visible green garden and the landward group is visibly denser. Removing that foreground scatter makes the green garden read as a deliberate space.

At t = 0.58, `after/desktop-0.58.png` has a tighter landward group, varied middle crowns, and a small separated waterfront group. The lawn opens toward the water. Portrait crops much of the left-hand planting at this phase, so `after/mobile-0.58.png` shows only part of the composition; its visible crowns remain secondary to the ribs and cranes. The improvement is clearer in the portrait reveal than in this mid-film frame.

The final relocation of two trees breaks the earlier draft's nearly closed perimeter ring. `after/desktop-1.png` and `after/mobile-1.png` now show an open-sided composition with a broad unplanted sector toward Farm Cove. A loose crescent remains, appropriately framing the lawn, but the trees no longer read as an evenly spaced necklace around a closed oval.

## Scoped acceptance criteria

| Criterion | Result and evidence |
| --- | --- |
| Three irregular groups | Pass at the authored-layout level and desktop viewing scale: a denser landward group, a looser middle group, and a smaller waterfront group are legible in `after/desktop-0.58.png` and `after/desktop-1.png`. Portrait does not show three discrete groups at every camera position; it does preserve uneven spacing and size variation. |
| Open lawn | Pass. A continuous central/lower lawn opening remains visible toward the water in desktop and portrait reveal captures. The final placement avoids the draft's closed ring. |
| Farm Cove and approach remain clear | Pass visually. No new crown or trunk intrudes into the water or blocks the approach in the twelve final checkpoints. This visual finding complements, rather than substitutes for, geometric clearance tests. |
| No new monument or construction occlusion | Pass. Garden planting stays below and separate from the podium, sail silhouettes, ribs, cranes, and bridge throughout the reviewed sequence. Both actual player captures retain construction as the focal point. |
| Same camera and no added rendering load | Pass in captured diagnostics. All twelve before/after camera records match exactly; each final checkpoint renders 4,784 fewer triangles than its baseline counterpart. This comparison measures the whole rendered frame, not a separate environment-only budget. |

## Playback and limits

`after/report.json` records zero errors for all twelve checkpoints and both player control checks. Both viewport modes advance naturally from 0.58 to 0.603; seeking and next-wonder navigation work. Reduced motion starts and remains at 1. Both modes use the Apple M2 Ultra ANGLE Metal backend: portrait evidence is viewport QA, not physical mobile-device verification.

`live-film/report.json` identifies the same production bundle and records uninterrupted progression from 0 to 1, completion at 60.286 seconds, replay to 0.015, successful return to the catalog, and an empty error array. This review verifies those lifecycle records; it does not claim a fresh audible listening pass (`audibleListening: false`) or independently re-audit every construction operation in motion.

Remaining limits are polish, not blockers for this delta. Crowns remain sparse individual stylized shapes rather than overlapping mature foliage. The simplified green shoreline and newly unobstructed grey foreground remain broad and plain, especially in portrait reveal. North-shore frontage and other city-art debt are unchanged. None requires expanding this accepted placement pass.
