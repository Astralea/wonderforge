# Sydney Opera House overhaul — 2026-09-23

Local implementation and review evidence. Preview: http://127.0.0.1:5591/#/debug/film/sydney-opera-house . The released four-film catalogue is unchanged; no deployment, push, repository visibility change or publication occurred.

## Result and scope

The production roof is rebuilt as seven paired spherical vaults from one pure surface authority, with the larger Concert Hall west, Opera Theatre east and the restaurant southwest. Radius is exactly 75 m. Separate curved concrete segments, offset tile panels, glazing and mullions replace the old whole-roof GLB swaps. The broad southern stair and concrete podium are supported by the terrain. Geometry remains full size throughout construction.

Concrete form bays cast in place. Precast pieces travel from the south yard on supported trolleys, stage on ground, lift vertically, slew above completed work and lower into their final seats. Two fixed, rigid crane rigs have non-overlapping hoist windows and real surface hook contacts. Four larger existing pieces receive longer visible operations; their dimensions are not inflated. Construction finishes before the glazing/temporary-work removal and nighttime hold. Reverse seeking recomputes exact draw ranges and poses.

The harbour has typed named precincts, routes and exclusion footprints; connected bridge approaches and four pylons; continuous shore terrain; Circular Quay sheds, offices with four articulated façades, varied residential masses and gardens. Existing original harbour kit assets are reused. Camera, sky and lighting are Sydney-owned, including a portrait clip distance beyond the fully fogged terrain.

## Source and interpretation

- [Official Concert Hall venue](https://www.sydneyoperahouse.com/visit/our-venues/concert-hall): western hall.
- [Conservation Management Plan](https://www.sydneyoperahouse.com/sites/default/files/collaborodam_assets/soh-cmp-interactive-1.pdf), §§3.3 and 4.7.5: southwest restaurant and 86 m broad southern stair.
- [Arup Journal 1973 issue 3](https://www.arup.com/globalassets/downloads/arup-journal/the-arup-journal-1973-issue-3.pdf): 75 m sphere radius.
- [The Spherical Solution](https://www.sydneyoperahouse.com/our-story/the-spherical-solution): precast chevron panels, cream/white ceramic cladding and casting process.
- [Peter Hall and completion](https://www.sydneyoperahouse.com/our-story/peter-hall-and-completion-opera-house): 2,194 precast segments and final rib segment erected in January 1967.
- [Construction begins](https://www.sydneyoperahouse.com/our-story/construction-begins): podium then shell construction chronology.
- [Delivering new technologies](https://stream.sydneyoperahouse.com/videos/tristram-carfrae-rdi-delivering-new-technologies): historical cranes retreated north on rails.

The movie compresses 1959–1973 into sixty seconds. It is an original interpretive diorama, not a measured digital twin. Seven paired vaults, representative assembly units, static crane bases, compressed bridge/settlement dimensions and macro tile contrast are disclosed artistic simplifications. No claim is made to model every historical segment or individual ceramic tile. Existing captions, Alice narration and Sydney music files are retained.

## Asset and skill ledger

Applied the project `threejs-aaa-graphics-builder` skill, its visual/implementation/model/render/technical-art/shader guidance, the physical-plausibility skill, Spec 49 and the browser-verification skill. Delegated read-only historical/visual review and narrowly owned construction/harbour implementation roles. No external model generator or commercial game assets were used.

The surface is authored in `src/data/sydneyShells.ts`; renderer bounds, panels, ribs and inspection export use those exact samples. `scripts/export-sydney-overhaul.ts` writes the manifest and exact triangles; `scripts/blender-export-sydney-overhaul.py` creates a separate original `.blend`, GLB and studio inspection render. `model/manifest.json` records units, axes, shell definitions and mesh triangle counts. The studio image does not substitute for film acceptance. Legacy nine sail GLBs are preserved as compatibility artifacts and are not used for production roofs.

## Verification evidence

Production bundle: `/assets/main-CC839RXx.js`. Final full-suite results are recorded below after the frozen-source pass. Earlier `tests.log`/`tests-final.log` contain concurrent-run failures and timeouts. `tests-frozen.log` passed 1,333/1,334 tests and found only the generic contrast ceiling; the explicit tile-field contract and its test were corrected, with all 19 material tests passing. Those earlier logs are retained for provenance.

- Geometry oracles: exact spherical radius, paired ridge continuity, transformed bounds, outward triangle winding, tile offset, and deterministic reverse-seek draw ranges.
- Physical contracts: ground/trolley/staging contact, uninterrupted seating handoff, no hoist double booking, fixed jib length and cable support, bearing curves over the podium, falsework contacts, and raycast descent clearance against neighbouring shells.
- Production `production/report.json`: desktop 1440×900 and portrait 390×844 at .12/.32/.58/.78/.92/1; correct scene diagnostics; forward/reverse seeks; live time advance; reduced-motion completed still.
- `live-film/report.json` and video: complete natural playback, replay and return to catalogue. Output muted during automation; no subjective listening or physical-device performance claim.
- `hero-operations.json`: exact selected part IDs, dimensions, timeline samples and support phases.
- `visual-review.md`: independent evidence-cited review, with earlier iteration verdicts retained.

## Rendering decisions and limits

Seated structural parts are three merged batches with bounded active buffers. Spherical radial normals agree with outward triangle winding. Thin tile skins cast shadows but do not receive their own shadow map to avoid interference between closely separated rib/tile surfaces. Cream/white macro fields are filtered visual shorthand for tile chevrons. The scene remains stylized, and the distant settlement is an authored compression.

Browser captures use local Chromium on the workstation GPU. They do not establish performance on an actual iPhone or mid-range Android device. The hidden full-player route enables local review without declaring Sydney released.

## Browser acceptance details

Final production and natural-film reports identify the same `main-CC839RXx.js` bundle. Twelve construction checkpoints, two actual player views and the reduced-motion still have zero console errors or WebGL warnings. The existing deprecated shadow-map alias was replaced with its canonical PCF value; Three.js had already used that same filter as its fallback. Desktop/portrait backend: ANGLE Metal, Apple M2 Ultra. Next-film controls return to the released Giza route.

Measured checkpoint maxima: desktop 82 draw calls / 257,029 submitted triangles / 37 geometries / 16 textures; portrait 69 calls / 257,016 triangles / 37 geometries / 5 textures. These are workstation browser counts, not mobile-device frame-rate claims.

Natural final-bundle playback reached t=1 after 61.832 wall-clock seconds (nominal film 60s), replay advanced to .016, and Escape returned to the catalogue. No errors. The `hero-motion/rib` and `hero-motion/sail` captures record supported large-piece operations at 1×; their exact source poses and timing are in `hero-operations.json`.

## Visual review outcome

The independent final review accepts the Spec 04 visual floor, including construction causality 3/3 from the normal-speed large-panel and rib sequences. The prior hard horizon, inward roof lighting, black async materials, blank office façades and unreadable tiny hero lifts are closed. Tile fields are intentionally subtle and the compressed settlement remains relatively sparse; these are recorded polish limitations. See `visual-review.md` for the evidence and per-category scores. This acceptance does not publish Sydney or certify physical-device performance.

## Regression runtime qualification

The default five-second fixture limit remains flaky for the existing Paris
moorings test: `tests-accepted.log` passed 1,333 tests and timed out only there;
`paris-isolated.log` then passed its unchanged assertions in 4.429 seconds.
The final full run uses `npm run test -- --maxWorkers=2 --testTimeout=30000`
with no assertion removal or source-fixture change. Its authoritative log is
`tests-final-30s.log`. Typecheck and build follow that command in sequence.

## Final checks

- **248 files / 1,334 tests pass** with two workers and a 30-second per-test timeout; `tests-final-30s.log` is authoritative.
- `npm run typecheck`, `npm run build`, and `git diff --check` pass.
- Rebuilt preview HTML still serves `main-CC839RXx.js`, exactly matching the desktop/portrait and complete-film reports.
- Independent visual board accepts the overhaul; source remains local and uncommitted. No publication or deployment.
