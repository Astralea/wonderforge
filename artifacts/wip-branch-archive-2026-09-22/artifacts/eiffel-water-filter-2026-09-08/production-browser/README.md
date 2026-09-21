# Production verification — water and basin correction

The actual preview at `http://127.0.0.1:5589/?review=water-basins-v24#/wonder/eiffel-tower` now serves the water filter and basin-ground/paving corrections. This does not integrate the separate summit gin-pole candidate.

Built bundle: `main-YIEMSNba.js`, 2,076,259 bytes, SHA256 `3165595290f146b46e67184dddbb7aa5e306fc5470dc4be11a270d880808108d`. Each browser intercepted and hashed the actual served JavaScript and model bytes, then fulfilled those same bytes. Local/served identities match. Paris GLB bytes and tower manifest remain unchanged; the runtime removes only the exact audited paving area inside the basins.

Each real desktop/mobile run covers101 whole-film seeks,7 first-floor handling poses,10 final-wave poses and9 first-mast poses. Both pass actual cargo-root checks,648 crowd identities, Space playback, pixel-exact reverse,125-degree monotone camera orbit, no overflow and no browser errors. Desktop maximum346205 triangles/166 calls; mobile296099/149. Original limits450000/200 and300000/150 are unchanged. Culling means these whole-film maxima need not equal the isolated pool-view geometry delta.

The film remains651.4267707038563 seconds. The QA harness is copied from the previous mast-assembly pass with only output/review URL/import paths changed. Its explicitly imported prior sampler remains valid because no film, camera, cargo, or traffic timeline source changed in this production pass. The earlier harness, source snapshot, captures and seals were not modified. Focused water/basin comparisons are in the parent artifact README and `../pool-ground/README.md`; these production captures are a regression check, not a fresh high-resolution water comparison.

Full source suite at the production freeze:870 tests/157 files pass; typecheck and production build pass. Candidate-only source edits after that freeze require their own final focused/full checks and are documented in the gin-pole artifact. No claim that all water shimmer, material appearance or incomplete summit construction is solved.
