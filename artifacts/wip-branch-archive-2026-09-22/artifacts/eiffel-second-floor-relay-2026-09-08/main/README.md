# Main-film second-floor relay build verification

Local production build is available on port5589. This folder records the build and asset identity checks; final browser/GPU evidence is recorded separately under `../main-gpu/`.

- Node **v24.4.0**.
- Full final-hold baseline: **953/953 tests**, **176/176 files**, passing with four workers and unchanged test thresholds; 312.64 seconds.
- The initial default-parallel run had951passes and one30-second timeout in the existing joint-rigger solid-clearance test. The isolated5-test file passed in10.8seconds, then the complete capped-concurrency suite passed. No assertion or timeout threshold was relaxed.
- Parent's final contact-camera subset passes **35/35 affected tests** across five camera/main-film files. These are repeated affected tests, not 35 additional unique tests. The complete 953-test run includes the new four-second visible landed hold.
- The subsequent bounded culling changes pass **21/21 focused tests** across five files, including exact city/terrain geometry and populated tree-instance preservation, contact rays and disposal. This is separate coverage from the 953-test baseline; overlapping tests are not added to claim a new full-suite count.
- Final `npm run typecheck` and `npm run build` pass. All eight main-film integration source hashes match the pre-culling build exactly (`integration-source-comparison.json`). The final identity also records the four culling renderer/helper hashes.
- Actual development-browser mobile measurements on the final culling source are **293,212 triangles / 55 calls** in the final wide view and **250,377 / 101** at the landed hold, with zero errors. The 300,000-triangle / 150-call limits remain unchanged. Actual final production browser/GPU evidence is owned separately under `../main-gpu/`; a build or development probe alone does not establish that production gate.

Exact logs: `test.log` (initial run), `test-timeout-recheck.log`, `test-final.log`/`test-baseline-952-before-orbit-correction.log`, `test-final-hold.log` (953-test baseline), `camera-contact-final.log`, `final-culling-tests.log`, `typecheck.log`, and `build.log`. Summaries are `camera-checks.json` and `test-final-hold-summary.json`. Earlier build snapshots remain under `versions/`.

## Actual production identity

Final `dist/assets/main-sSeE3a1U.js`: **2,106,252 bytes**; SHA256 `85bc2321a16b3321049d847374e91309146fd28173361fea834113db905c57a5`.

`public/models/eiffel-second-floor-relay/relay.glb`: **1,580,952bytes**; SHA256 `4b71e83c5e2403feceb44e6da7543fcc3ac96736af969adabdd96807067f4e76`.

`check-build-identity.mjs` fetched the actual port5589 HTML, named JavaScript bundle and relay GLB. All returned200 and their byte hashes match the built HTML/bundle and public/dist model exactly. This establishes what the local server serves; it is not a claim about screenshots, frame rate, visibility or the full GPU budget. `build-identity.json` also records the frozen integration-source hashes.

## Carrying the bounded upper-source evidence forward

`compare-source.mjs` compares archived V4 (SHA `1ee73a0c07d7d1eb6efb05c8e993cee5069a50afaa141baaf04372ba3a08be10`) with final public V6 using per-mesh canonical world-triangle hashes. It transforms actual vertices, sorts each triangle's three world positions and sorts the triangles before hashing. Names, draw ordering and winding are irrelevant to this surface comparison; no positional rounding was needed for the result.

**All165 upper meshes match exactly.** Across the full301mesh asset,286match exactly. The15changed meshes are five tray pieces, four wrench pieces and six longitudinal members spanning the three lower scaffold rows. The tray/tool moved north; those scaffold members shortened from1.2m to0.8m. Exact bounds and both full asset hashes are in `source-comparison.json`.

This preserves the geometric scope of the sealed V4 upper-frame, winch, receiving-cart and fixed-rope clearance/support evidence. It does not recertify changed lower scaffolding, tool/worker contacts, material/normal behavior, drive strength, winding capacity or equipment installation/removal. The earlier sealed route reports remain unmodified. Worker and final main-browser gates belong to their separate evidence folders.

Final production viewport replay is now complete on the verified sSeE3a1U bundle: desktop343,524 triangles/118calls; mobile293,212/106; zero errors; exact reverse pixels; Play/Pause pass. Evidence: `../main-gpu/production-final-terrain/report.json`. Phase screenshots use the normal0.001 seek step; requested seconds are approximate. Exact subframe continuity is a separate engine-test result. No physical-device FPS or fine fastening-detail claim is made.
