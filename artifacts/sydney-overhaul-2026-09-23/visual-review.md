# Sydney Opera House visual acceptance — 2026-09-23

Read-only visual-director review of frozen production bundle **`main-CC839RXx.js`**, confirmed in `production/report.json`. Prior report preserved as `visual-review-iteration6.md`. All 12 current desktop/portrait checkpoints (.12, .32, .58, .78, .92, 1), both actual-player frames, and the current rib and tile hero-operation frame sequences listed in their reports were inspected. No source files edited.

**Visual board result: accepted for this Sydney scene overhaul.** Each category meets Spec 04's board floor of 2.4/3, including construction causality at 3/3. This is acceptance of the authored stylized harbour movie against the identified scene requirements, not a claim of photorealism, a surveyed digital twin, or perfect visual finish. The earlier blocking findings were corrected rather than waived.

## Scorecard

| Category | Score / 3 | Authoritative visual evidence |
|---|---:|---|
| Composition | 2.4 | Complete monument and active cranes fit the checkpoints; desktop preserves the harbour ensemble, portrait retains the house and recognizable bridge context. `production/desktop-0.32.png`, `production/desktop-0.58.png`, `production/mobile-0.78.png`, `production/mobile-1.png`. |
| Silhouette | 2.5 | Distinct major hall groups and smaller southern shells, broad podium/stair, and connected bridge arch. Correct surface lighting reads as curved roofs rather than flat gray blades. `production/desktop-0.78.png`, `production/desktop-1.png`, `production/mobile-1.png`. |
| Construction causality | 3.0 | Current 1x hero sequences expose existing individual rigid rib and tile pieces in the yard, on carriers, under a crane cable, above the site during transfer and entering already-present rib/falsework support. The roof is assembled progressively; these are panel lifts, not whole-shell appearances. Rib frame 06 shows the pale segment suspended left of the site; 07-09 follow the loaded cranes toward the existing fan. Tile frames 01-03 show panels/carriers in the southern yard; 04 shows the attached cable pickup; 05 shows elevated panels over the structure; 06-07 show completion/next operations. `hero-motion/rib/frame-00.png` through `frame-10.png`, `hero-motion/sail/frame-00.png` through `frame-07.png`, their phase/time reports. |
| Material readability | 2.4 | Green canopy/brown trunks and boat hulls now remain consistent across desktop, portrait and actual player; prior blackening is absent. Roof low-frequency chevron bands are now discernible, with stable curved white ceramic shading and no old moire. They remain restrained at this wide camera. `production/desktop-0.78.png`, `production/mobile-0.78.png`, `production/desktop-film.png`, `production/mobile-film.png`, `production/desktop-1.png`. |
| Lighting | 2.4 | Blue daytime atmosphere, shaped shell highlights, and a white-roof night reveal on dark water. Prior flat gray roof lighting and all-gray daytime are resolved. `production/desktop-0.32.png`, `production/mobile-0.58.png`, `production/desktop-0.92.png`, `production/mobile-1.png`. |
| Environment depth | 2.4 | Water, peninsula, quay, windowed CBD, residential groups, gardens and bridge form distinct connected layers. No late portrait terrain/sky seam remains. `production/desktop-0.58.png`, `production/desktop-1.png`, `production/mobile-0.92.png`, `production/mobile-1.png`. |
| Motion clarity | 2.5 | Reported 1x time samples advance through two identifiable hero operations with moving cranes, cable/load positions, carriers and crews. Large selected members make the work followable at the production camera, closing the previous small-load evidence gap. `hero-motion/rib/report.json`, `hero-motion/sail/report.json`, associated frame sequences. |
| UI restraint | 2.5 | Actual Sydney player and construction-specific chapter text; controls remain legible without covering the central build. `production/desktop-film.png`, `production/mobile-film.png`. |

## Blocking findings closed

- Inconsistent black prop materials in mobile/player: closed in the current corresponding views.
- Roof material/shading: corrected curvature, visible broad chevron fields, no former concentric moire.
- Construction operation readability: current large-member rib and tile sequences provide visible cable/load/support relationships.
- Portrait hard terrain/sky clipping seam: absent in current .78/.92/1.
- Blank CBD walls: facade articulation present.
- Daytime gray atmosphere and cropped cranes: closed in reviewed checkpoints.
- Wrong-player evidence: current film captures are Sydney with its own captions and controls.

## Remaining polish, not blockers

1. Harbour districts remain sparse and deliberately compressed; a future dedicated city-art pass could improve street frontage, garden canopy layering and shoreline detail without changing this construction acceptance.
2. Chevron bands are subtle at the panoramic hold, especially portrait; preserve their stable filtering if increasing contrast later. Avoid reintroducing aliasing or darkening the white shell identity.
3. Smaller background construction pieces remain less individually readable than the selected hero lifts. The hero operations now carry the construction story; not every compressed background operation needs equal screen prominence.

## Evidence and claim boundaries

`production/report.json` identifies ANGLE/Metal on Apple M2 Ultra for both desktop and portrait browser configurations. Its frame errors are empty, and no nonempty warning collections were found. Portrait is browser viewport QA, not physical-phone performance verification. Its reduced-motion result remains at t=1 (`initial: "1"`, `held: "1"`).

The two current hero reports contain selected part IDs, phase positions, playback times, `playbackSpeed: 1`, and `errors: []`. The images were checked against those time/phase records. This is representative visual-causality evidence; exact 3 cm support residuals, determinism, collision and full part coverage belong to the separate engine/geometry checks, not this image review.

The refreshed `live-film/report.json` now explicitly identifies final bundle `main-CC839RXx.js`: natural progression reaches t=1 at 61.832 seconds, replay advances to .016, catalog return is true, and errors are empty. This final-bundle lifecycle report was inspected after the visual scorecard. The reduced-motion completion screenshot was also visually checked and retains the finished house and surrounding context. No audible soundtrack/narration listening or physical-device performance is claimed here. The board acceptance does not replace source tests, build verification, the final lifecycle check, or any publication authorization.
