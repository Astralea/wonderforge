# Main-film second-floor relay build verification

Local production build is available on port5589. This folder records the build and asset identity checks; final browser/GPU evidence is recorded separately under `../main-gpu/`.

- Node **v24.4.0**.
- Full suite: **952/952 tests**, **176/176 files**, passing with four workers and unchanged test thresholds;84.59seconds.
- The initial default-parallel run had951passes and one30-second timeout in the existing joint-rigger solid-clearance test. The isolated5-test file passed in10.8seconds, then the complete capped-concurrency suite passed. No assertion or timeout threshold was relaxed.
- The full-suite pass preceded the final continuation-camera revision. Parent then ran all **34 affected tests** across five camera/main-film files successfully on the frozen final camera. These are repeated affected tests, not34 additional unique tests.
- Final `npm run typecheck` and `npm run build` pass on the frozen source.

Exact logs: `test.log` (initial run), `test-timeout-recheck.log`, `test-final.log`/`test-baseline-952-before-orbit-correction.log`, `camera-final.log`, `typecheck.log`, and `build.log`. Camera summary is `camera-checks.json`.

## Actual production identity

`dist/assets/main-DEqd7NcA.js`: **2,103,626bytes**; SHA256 `3ee1723c1c4eace10fb293f515ba9c58755bfd2bb7f41f062ec2aec63b0663f9`.

`public/models/eiffel-second-floor-relay/relay.glb`: **1,580,952bytes**; SHA256 `4b71e83c5e2403feceb44e6da7543fcc3ac96736af969adabdd96807067f4e76`.

`check-build-identity.mjs` fetched the actual port5589 HTML, named JavaScript bundle and relay GLB. All returned200 and their byte hashes match the built HTML/bundle and public/dist model exactly. This establishes what the local server serves; it is not a claim about screenshots, frame rate, visibility or the full GPU budget. `build-identity.json` also records the frozen integration-source hashes.

## Carrying the bounded upper-source evidence forward

`compare-source.mjs` compares archived V4 (SHA `1ee73a0c07d7d1eb6efb05c8e993cee5069a50afaa141baaf04372ba3a08be10`) with final public V6 using per-mesh canonical world-triangle hashes. It transforms actual vertices, sorts each triangle's three world positions and sorts the triangles before hashing. Names, draw ordering and winding are irrelevant to this surface comparison; no positional rounding was needed for the result.

**All165 upper meshes match exactly.** Across the full301mesh asset,286match exactly. The15changed meshes are five tray pieces, four wrench pieces and six longitudinal members spanning the three lower scaffold rows. The tray/tool moved north; those scaffold members shortened from1.2m to0.8m. Exact bounds and both full asset hashes are in `source-comparison.json`.

This preserves the geometric scope of the sealed V4 upper-frame, winch, receiving-cart and fixed-rope clearance/support evidence. It does not recertify changed lower scaffolding, tool/worker contacts, material/normal behavior, drive strength, winding capacity or equipment installation/removal. The earlier sealed route reports remain unmodified. Worker and final main-browser gates belong to their separate evidence folders.
