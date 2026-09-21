# Eiffel refinement — 6 September 2026

**Status: in progress.** This is a reviewable Blender model and web preview,
not acceptance of the complete Eiffel construction film or the full owner goal.

## Actual Blender pipeline

The parent invokes the installed Blender Lab MCP's `execute_blender_code`
through `scripts/build-eiffel-via-mcp.py`. Blender runs the original modeling
script `scripts/blender_eiffel_tower.py`, saves the editable source, and exports
local GLB geometry plus a construction manifest. Three.js loads those artifacts;
its pure timeline sampler moves the exported assemblies. There is no runtime
Blender service or generated remote asset dependency in the website.

- `summit-mcp-build-result.json`: actual successful MCP response, scene `.004`.
- `summit-eiffel-tower.blend`: current dated editable source.
- `summit-build-summary.json`: 363 groups, 7,190 mesh nodes, 86,652 triangles.
- `model-provenance.json`: source/export hashes and sizes.
- `before-model/`: preserved previous model, GLB, manifest and script.
- `blender/`: refreshed complete tower, lower-pylon and shaft studio renders.
- `summit-blender-review.png`: refreshed summit detail including access spiral.

No additional plugin or skill installation is needed. Parent alone performed
Blender work. In-session subagents handled bounded camera/environment code and
read-only mechanical review; the superseded K3-only clause was removed.

## Changes and evidence

The 1889 summit has a glazed gallery, apartment/terrace, curved campanile,
lantern with cupola, upper balcony and original-height flagstaff. The principal
visual reference is Rouillard's 1889 section, linked in Spec 14. Smaller details
remain an authored interpretation, not a claim to reproduce shop drawings.

The camera now makes a continuous 125-degree orbit and fits current construction
height before framing the complete tower. Paris has courtyard blocks, corrected
side-facing windows, a five-arch Pont d'Iena, distant bridges, and a carved Seine
channel sharing its water datum with the environment. Terrain tests verify
submerged river samples and level foundation footprints.

`qa/` is the first integrated 18-frame desktop/mobile sweep, including real
playback, pointer seeking, exact canvas pixels after a backwards seek, replay,
and reduced-motion loading. It passed without console/page errors. Maxima:
desktop 94 calls / 296,122 triangles; mobile 76 calls / 296,109 triangles.
Visual inspection found excess haze and flat trees; `qa-polish/` preserves
the follow-up with neutral blue-grey horizons, fuller deciduous crowns and
redundant facade-window shadows disabled. That run also passed all playback
checks; its maxima were 93/75 desktop/mobile calls and 292,072/292,059
triangles. A remaining dusk horizon seam led to a final narrow fog transition
correction; final validation is recorded separately.

`giza-reference/desktop.png` is a fresh 1440x900 reference at t=.58. Giza still
has more legible labour and construction logistics. Numeric test results must
not be represented as equivalent visual/mechanical quality.

## Remaining acceptance requirements

See `mechanical-review.md`: whole shaft tiers on giant wagons, unbounded jibs,
and inferred AABB support are still unacceptable. Replace these with bounded
connected assemblies, real joint/lift contacts, supported stations and clear
routes, then review live desktop/mobile motion against Giza again.

Only after Eiffel meets those requirements should the next unfinished catalog
wonder be selected at random and built through the same complete pipeline.
All saved Blender versions and evidence must remain in the repository.

Local review: http://127.0.0.1:5589/#/wonder/eiffel-tower
No public deployment or source publication was performed.

## Final verification of this refinement checkpoint

- 424 tests across 41 files; typecheck and production build pass.
- Served bundle `index-BB1RzAdS.js` verified from the loopback preview.
- `qa-final/report.json`: 18 desktop/mobile captures, no browser errors,
  exact reverse-seek pixels, pointer seek, live 4x completion, replay,
  and reduced-motion t=1 with assets ready.
- Final peak workload: desktop 93 calls / 292,072 triangles; mobile
  75 calls / 292,059 triangles. These are sampled workloads, not all-frame
  worst-case guarantees.
- Parent visually inspected final desktop and portrait dusk frames:
  the hard horizon seam is gone; neutral haze and fuller crowns are present.
- `tests-final.log`, `typecheck-final.log`, `build-final.log`, and
  `browser-qa-final.log` retain the evidence.

The mechanical rebuild and the subsequent wonder remain unfinished. The
active owner goal is deliberately left active; this checkpoint does not
establish Giza-level acceptance.
