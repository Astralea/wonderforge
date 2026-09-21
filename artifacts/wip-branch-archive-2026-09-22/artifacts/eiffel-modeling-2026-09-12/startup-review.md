# Deferred Eiffel environment preparation

Successful rebuilt Paris loading no longer allocates the hidden procedural
Ecole, Champ paths or thirteen scatter meshes. Owned constructor geometries
fall from16 to11, materials from20 to17. The deferred scatter matrix arrays
occupy846,976bytes; their allocations and19,748 identity/placement matrix calls
are avoided on the successful path. Remaining eager matrix calls:1,648.
These are CPU/resource counts, not a measured network or wall-clock speedup.
See startup-measurements.json for measurement/reconstruction details.

Quay trees, terrain, water, pools and bridge geometry remain eager and present.
The same random continuation resumes after the trees if city or life fails;
full matrix/color hashes captured before editing match both failure orders.
On a city-only failure, city/stocks/forges are shown but procedural barges stay
hidden. On a life-only failure, barges show but the authored city stays intact.
The shared fallback continuation allocates both sets in these rare cases to
preserve the original shared RNG exactly. Legacy false-mode remains eager.
The rebuilt legacy arch falsework is explicitly hidden even when failure
arrives after a render update.

Nine new startup tests cover zero eager fallback resources, exact original
scatter, both success/failure completion orders, actual rejected city fetch
with Node file recovery disabled, and disposal before late failures. Nineteen
startup/rebuilt tests and seven additional legacy environment tests pass.
The ten rebuilt tests continue to parse actual saved city/life/entrance assets
and inspect bridge/traffic contact, far-crowd cost and resource disposal.
Logs: startup-tests.log; startup-focused-final.log. Typecheck also passed.
No dist build was performed by this subtask; composed browser QA belongs to
the parent modeling/release evidence chain.
