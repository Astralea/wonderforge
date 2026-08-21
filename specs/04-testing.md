# Spec 04 — Testing and Acceptance

## Required commands

`npm run test && npm run typecheck && npm run build`

Engine and data tests run without a DOM or WebGL context. Browser and visual QA
exercise the production bundle.

## Existing contract suites

- Catalog: ten unique stable IDs, authentic attributed content, valid palettes,
  deterministic recipe expansion.
- Timeline/easing/camera/daylight: clamped endpoints, overlapping weighted
  stages, 30° camera pitch, 1.25-turn default orbit, deterministic light state.
- Playback/UI: store transitions, deep links, transport controls, keyboard,
  quote reveal, reduced motion, and catalog navigation.
- Legacy geometry: retained while nine non-reference scenes use the temporary
  Three.js fallback. These tests do not define the Giza quality bar.

## `tests/construction.test.ts`

- Giza plan is deterministic and contains 4,000–8,000 structural stones.
- Every structural stone has scale `[1,1,1]`, finite transforms, and dimensions
  within the human-scale limits in Spec 08.
- No block spans a full pyramid face/course/tier.
- Core fill is deterministic, human-scale, progressive, and forms a supported
  stacked volume; no course-wide surface or unsupported cell is allowed.
- Block IDs and final transforms are unique.
- State order is monotone: quarried, dressed, loaded, hauled, queued, raised,
  aligned, seated.
- Phase boundaries are position-continuous; a block never appears first at its
  destination and never moves after seating.
- At representative times, active count respects the 24-block cap and route
  lane assignments do not collide.
- Raised blocks follow ramp height; aligned blocks remain above their support;
  seated blocks match their final transform exactly.
- Contact dust is false during free motion and true only for drag/seat windows.
- Workers, sleds, ropes, and stones reference the same construction event.

## `tests/giza-world.test.ts`

- Layer order includes foreground quarry, active site, greenbelt/Nile, city,
  dunes/cliffs, atmosphere, and sky.
- Quarry, dressing yard, road, queue, ramp, and final seat are connected by at
  least one continuous route.
- Ramp crest tracks active course height and never intersects settled masonry.
- Khufu, Khafre, and Menkaure retain correct visual hierarchy.
- Seeded environment placement is identical on repeated expansion.
- Far terrain is a continuous, fixed world-space mesh rather than an orbiting
  ring of giant polygonal props. It overlaps the local ground below grade and
  extends beyond the fogged view distance, so neither radial edge is visible.

## Renderer tests

Pure adapter tests assert generated matrices, material assignments, culling
groups, and disposal bookkeeping. WebGL output is accepted through browser QA,
not fragile pixel snapshots in jsdom.

## Browser/visual acceptance

At desktop 1440×900 and mobile 390×844, capture `t = 0.12, 0.35, 0.62, 0.9,
1.0` on the chrome-free Giza debug route.

Each frame must show:

- a full-bleed world with no floating island or empty flat backdrop;
- human-scale stones, at least one causally supported moving operation during
  BUILD, and no course-sized slabs;
- readable foreground, construction site, greenbelt/city, distant desert, sky;
- no see-through pyramid silhouette, floating working lid, or background prop
  that appears to rotate in lockstep with the camera;
- no camera/cloud intersection or screen-filling cloud edge at any mobile
  checkpoint;
- stable camera framing with no near/far clipping or mobile crop;
- limestone detail readable at reveal and no crushed blacks/blown highlights.

The browser console must have no uncaught errors or WebGL warnings. Renderer
diagnostics are recorded at each checkpoint. Desktop steady state must meet the
budgets in Spec 03; mobile may reduce shadows, worker count, and environment
detail but never merge stones into giant slabs.

## Visual scorecard

Before release, score 0–5 for composition, silhouette, construction causality,
material readability, lighting, environment depth, motion clarity, and UI
restraint. No category may score below 4; construction causality must score 5.

Amendment (Tier 4 P4): the four-role review board scores 0–3 per category; map board marks onto this card as board × 5/3, so the floor of 4 corresponds to board ≥ 2.4 and the causality 5 to board 3.
