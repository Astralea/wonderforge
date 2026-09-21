# Eiffel goal resumed — 2026-09-07

The goal remains active and unfinished. A fresh review found real construction collisions and unreadable operation timing despite the previous green tests. This checkpoint fixes foundation hauling, improves first-platform clearance, and adds connected Blender-authored scenery. It does not establish parity with Giza or finish the broader goal. Do not select the next wonder yet.

## Local review and saved source

Preview: http://127.0.0.1:5589/?review=eiffel-resume-v8#/wonder/eiffel-tower

Editable Blender scene: `blender/paris-1889.blend`. The parent used the installed Blender Lab MCP, after a read-only live connection probe. Build success and paths are in `blender/mcp-build-result.json` and `blender-build-v2.log`. No plugin installation was necessary. Earlier Blender scenes and dated evidence were preserved.

The builder consumes `src/data/eiffelSiteLayout.json`, `scripts/paris_exposition_geometry.py` and new `scripts/paris_workyard_geometry.py`. It exports 239,430 city triangles, 93 north-bank parcels with real courtyards and independent wing roofs, 486 road/sidewalk sections, and 25 work-yard prop footprints. The yard has an open gate linked to the delivery pads, two workshops/stores, low steel racks, timber and masonry stocks, and fences. Tower haul space remains free of fixed scenery props. New earth surfaces match the shared terrain; runtime shader finishing adds subtle damp patches and wear along the gate lane. Legacy isolated stock/forge boxes disappear only after the new asset loads successfully.

CNAM's 1889 Champ de Mars photograph remains the architectural reference for the exhibition palaces. The north-bank parcels, hidden elevations, colors, compressed distances and workshop placement are authored interpretations; they are not a surveyed reconstruction from a single image. Anno imagery informed activity density only. Existing 520 pedestrians, 24 horse vehicles, two steam boats and three barges remain. No game assets were imported.

## Mechanics

- `FOUNDATION-ROUTE-REVISION.md`: all 896 foundation routes now steer around all 16 complete bearing footprints. The fixed-attitude cargo rides on a turning carrier; wheels roll and rear crews turn and step with distance. Dense sampled checks cover cargo/carrier clearance, oriented crew/handle envelopes and actual transformed wheel/foot contact. Simultaneous loads, full swept-volume coverage and no-slip biomechanics are not certified.
- `UPPER-CLEARANCE-IMPLEMENTATION.md`: 1,085 of 1,296 first-floor operations have sampled-clear cargo, receiver and grillage routes. Both originally reported platform counterexamples are fixed. **211 first-floor operations remain explicitly unresolved.** Independent stage23 collision sample pairs fell 967 to 51; whole-film pairs fell 5,489 to 4,524. These are sample/solid pairs, not counts of unique defective objects. Other stages remain unfinished.
- Occupancy search is baked offline into fingerprinted typed route data. The several-second baseline plan creation still exists; removing the new search does not certify fast startup.

## Verification and visual limits

Full suite: **491 tests in 58 files passed**, followed by typecheck and production build. The final culling adjustment also passed the three Paris asset tests and a fresh production build. Final browser evidence is `qa-final/report.json`: 18 desktop/mobile frames, real playback completion/replay, pointer seeking, exact-pixel reverse seeking, and reduced motion; zero browser errors.

The first mobile sweep failed at 306,424 triangles. Finer 26 m city culling preserves every authored triangle while excluding off-screen cells. The complete 101-position rerun (`qa-mobile-budget-v2/report.json`) peaks at **295,227 triangles at .85** and **115 calls at .87**, within the 300,000/150 limits. It uses 1,491 culling cells inside one multi-draw batch. This is a measured submission budget, not an FPS or physical realism certificate.

Parent inspected final opening/first-floor/late desktop views, the mobile peak frame, and close work-yard/north-bank captures. The courtyard roofs and streets read more clearly, and cloud structure is more visible near the top of the late frame. The far-bank district still looks schematic, river-side empty strips remain, and the pools still have excessive fine sparkle. Sky/setting art direction is not finished. Most individual operations are still too short to follow at normal speed.

## Next action

`TIMING-AND-RIG-LIFECYCLE-PROPOSAL.md` records the concrete next design: stable rig identities, supported station campaigns and explicit relocation, plus four seconds-long signature lifts within the existing camera milestones. Current median operation duration is 8.81 ms and the plan uses 12,358 distinct station bases. Holding the last crane mesh would conceal relocation errors. Solve the physical campaign graph before promising a complete persistent-crane animation. Retiming invalidates baked upper-route fingerprints and requires regeneration/occupancy checks.

Continue alternate real support/receiver choices for unresolved first-floor operations, then other stages. Keep the complete original objective: camera, summit verification, sky/surroundings and finished Eiffel quality before selecting another unfinished wonder. The substantial camera orbit is already present; the summit was not re-certified from these distant frames.
