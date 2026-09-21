# Ground-delivery camera correction — 2026-09-07

The main movie now establishes the complete supported lifting station, moves to a low outboard view of the arriving cart and sling workers, follows the actual rigid load upward, shows the final joint region, and returns wide during empty-hook recovery. It changes the camera only. The 122-second film, 55-second physical operation, original 125-degree outer orbit, geometry, cargo dimensions, and editorial installation/removal omissions are unchanged.

## Implemented camera

`src/engine/eiffelFilm.ts`: establish through pilot1.5s; smooth dolly1.5–6s; local working view6–49s; smooth recovery49–54.5s; full supported rig at the end. The detail camera uses azimuth−15°, pitch5°, radius22m desktop and36.07m at390×844. It tracks the actual payload center with an0.8m vertical aiming offset. The wide lens uses current supported station bounds. Spec14 and phase-specific camera tests now reflect this sequence rather than requiring the complete30m rig in every detail frame.

The rejected high east view remains documented by `main-desktop/seek-22.1.png`: a foreground diagonal crossed the crew/cart. The final low outboard view is `final-desktop/seek-22.1.png` and its mobile counterpart. No structural mesh is hidden to create this view, and the5m near plane remains unchanged.

## Evidence and validation

- `npx vitest run tests/eiffel-film.test.ts tests/eiffel-delivery-camera.test.ts`:11/11 passed; dense geometry test9.74s. `npm run typecheck`:passed.
- Near-frustum exclusion checked at440 times per device against every final tower solid's transformed OBB and the219 actual falsework beam bounds. This is conservative with respect to unfinished parts. All camera samples keep the entire near-plane corner radius outside those solids.
- Actual exported rig/carrier/crew mesh bounds (including instanced source matrices) fit the establish/recovery frames on desktop/mobile.
- Fifteen rays along the actual moving payload's top centerline are clear against completed tower/falsework solids at9 working phases on each device. This does not assert that every pixel or sling is unoccluded.
- The physical4.3m centerline spans215.9–220.9px desktop and123.5–126.4px mobile at those phases; it is not scaled for the shot. See `current-numeric.json`.
- Camera position and orientation remain continuous across dolly, phase, seat, and recovery boundaries; original outer-orbit endpoints remain unchanged.

`final-qa.mjs` captures the actual mounted main React page at5590 after canvas assets report ready. It dispatches events to the existing DOM seek/play controls, then records normal RAF playback. It does not import an alternate playback store. This verifies the mounted handlers and actual elapsed playback, not physical pointer target hit testing.

| Device | Maximum calls | Maximum triangles | Real arrival/dolly elapsed | Real hoist elapsed | Browser errors |
|---|---:|---:|---|---|---|
|1440×900|139|169,690|13.664→17.202s|27.450→31.354s|none|
|390×844|123|119,139|13.664→16.226s|27.572→30.256s|none|

Metrics are chapter samples, not a new whole-film performance claim. Full-movie/Giza validation remains in the preceding integration evidence and parent validation. No build/server/Blender changes were made by this camera task.

Final evidence: `final-qa.json`, `final-desktop/`, `final-mobile/`. Videos: `final-desktop/page@fa67477bbb4e551fb9bc25d60c0313f0.webm` and `final-mobile/page@8725971ee9944dbe3b9f2a921e760767.webm`. Earlier `main-*`, `outboard-*`, grid/probe files are iteration evidence, not final QA.

## Remaining visual limit

The cart and people can now be read, and the moving bar/slings can be followed. Mid-hoist brown iron still meets a busy brown lattice background, particularly on mobile (`final-mobile/motion-27-3.png`). Clear geometry rays and useful projected length do not prove strong contrast. Seating is more distinct (`final-desktop/seek-49.5.png`). This bounded camera correction does not resolve every readability or physical-construction limitation in the full movie, and it does not verify the omitted installation/dismantling.
