# All ten wonder icons — 2026-09-20

Owner requested better icons in both catalog hover and initial film loading,
then clarified the scope as all ten wonders. This pass redraws/refines all ten
as original SVG line art, with two densities: small catalog drawings and larger
arrival silhouettes. No external art, raster dependency or runtime SVG filters.

## Visible changes

- Giza: three offset pyramid ridges and quieter masonry courses.
- Stonehenge: thick lintels, separate uprights, depth and open sky between stones.
- Colosseum: curved three-storey arcades, attic windows, open elliptical bowl,
  and the stepped surviving outer wall. The bowl and front arches are actual
  transparent holes in the fill and in its wave clip.
- Eiffel: splayed feet, clear open arch, two platform bands and leg/lattice detail.
- Petra: columned lower Treasury, pediment, upper tholos and side wings.
- Chichen Itza: stepped terrace edges, summit temple and continuous central stair.
- Machu Picchu: offset mountain profile, terraces and masonry clusters.
- Angkor Wat: five graduated lotus profiles instead of inverted triangular cones.
- Forbidden City: two curved eaves, posts and a tiered base.
- Sydney: pointed overlapping shells with curved ribs instead of rounded domes.

The existing glyph width/height (38.4 px), CSS classes, dotted underdrawing,
hover/focus activation, quiet production tone, motion preferences and pen-speed
planner stay intact. All builds retain their 0.5–1.3 second timing budget.
Homepage has no loading animation; cinematic arrival retains the readiness-capped
600 ms minimum and completed-frame hold. Those source files were not edited.

## Evidence

- `catalog-before.png` and `catalog-after.png`: every icon at 96 px for review,
  then 24 / 32 / 38.4 px. Final ink is the actual #d4a24e at 80% opacity.
- `catalog-quiet-after.png`: all ten with the production tone's 42% opacity.
- `arrival-a-0-50-100.png`, `arrival-b-0-50-100.png`: all ten at 0/50/100%.
- `cutout-raster-checks.json`: 24 external librsvg alpha checks of solid/empty
  probes for Colosseum, Petra, Chichen Itza and Stonehenge, separately checking
  filled surfaces and wave clipping. All passed.
- `focused-tests.log`: 35 tests / 4 files passed, including art/pen contracts,
  every loading state, cinematic timing and no-loader ambient behavior.
- `npm run typecheck`: passed during this pass. Root owns the final combined
  full suite/build once the aqueduct and icon work are both frozen.

These are static SVG raster renders, not desktop/mobile browser captures.
They verify drawing geometry, sizes and ink, but do not validate live hover
transitions or composited waterline animation. CUA connection was unavailable
in the inherited task; browser acceptance remains a separate integration check.
At 24 px the Colosseum arcade details are secondary texture; its outer outline
and rows remain the primary cue. The shipped catalog is 38.4 px.

## Edited source

- `specs/05-ui.md`: dedicated Monument drawing family subsection.
- `src/ui/WonderGlyph.tsx`: original typed stroke data only.
- `src/render/three/wonderArrivalDrawings.ts`: original silhouette/detail data;
  optional even-odd winding for architectural openings.
- `src/render/three/WonderArrival.tsx`: apply the drawing's winding to surface
  fill and monument clipping; all existing classes and loading mechanics kept.
- `tests/wonder-glyph.test.tsx`, `tests/eiffel-loading.test.tsx`: refreshed art
  contracts, bounded SVG cost, monotone fill and architectural cutouts.

Authoring/review utilities are saved beside this report. `build-arrival-art.py`
expands the authored small geometry into static arrival data; it is not run by
application startup/build. `render-icons.py` and `check-cutouts.cjs` reproduce
the raster evidence. Earlier source snapshots are preserved here for comparison.
No deployment, push or public file publication was performed by this pass.
