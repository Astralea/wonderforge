# Eiffel mast assemblies, floor joint and Paris detail filtering

This pass uses the installed Blender Lab MCP for the actual saved mast source,
then applies matching rigid assembly transforms in the Three.js construction.
The parent authored all Blender changes. Subagents implemented and audited the
pure engine, production rendering and independent geometry checks.

## Changes admitted by the geometry checks

- Three mast assemblies carry four existing 0.6 m crossbars from pickup through
  seating. Every original part ID remains, with one lifting job per assembly.
  Children have no independent cranes or receiving equipment.
- The first mast formerly occupied the already-solid stair column and crown
  floor. Its foot now sits at approximately Y300.670 on the twelve radial floor
  members; its upper joint and the completed flagstaff's Y312 top are preserved.
  All other 13,851 kit records/nodes and both original GLB binary buffers remain
  unchanged. The actual floor-top triangle union covers the whole mast foot.
- The first assembly starts flat on a carrier on the west terrace, rises above
  the railing, travels outside the roof, turns upright and crosses to its joint.
  Its compact 3.4×0.30×2.2 m crane pad and carrier are checked against exported
  floor triangles. The receiver uses that floor directly; the former generic
  grillage was removed because it intersected the deck.
- All seven cargo meshes pass the 2,401-sample-per-member route audit. The sole
  admitted contact exception is an explicitly named adjacent mast joint within
  0.1 mm export tolerance. There is no blanket exemption for final poses or
  deeply intersecting parts.

Editable sources are in `blender/eiffel-tower-mast-joint.blend` and
`blender/eiffel-summit-mast-assemblies.blend`; the separate review file is
`blender/eiffel-summit-mast-review.blend`. The seven-mesh GLB in
`model/summit-mast-assemblies.glb` verifies the Blender hierarchy against the
production kit. The renderer uses those same kit parts with exact relative
transforms; it does not load a duplicate copy of the assembly GLB.

The final public manifest SHA-256 is
`e054bfb8cbded7e636075ba1371e624430f600da0b2e8f0cc765e205d1e54080`.
`kit-joint-revision/README.md` and `floor-hub-audit.json` distinguish the accepted
floor joint from the rejected stair-top candidate. Earlier source, candidates,
failed audits and logs are preserved. The first final-source readback attempted
to inspect an unevaluated scene; `mcp-readback-floor-unevaluated.log` records that
harness failure, not a model geometry failure.

## Paris anti-shimmer change

The companion `../eiffel-paris-detail-filter-2026-09-08/README.md` records the
actual GPU A/B comparison and exact source identities. The renderer filters
subpixel palace crossbars and interior exhibition-hall ribs while preserving
all 202,324 city triangles, source positions, depth surfaces and batch counts.
At the tracked features, camera-motion luminance variation fell 39–56% across
desktop/mobile measurements. The near-window comparison is pixel-identical.
These are specific tracked-feature measurements, not a whole-scene flicker
score. Fountain water, facade-atlas patterns and unclassified features are not
changed by this filter.

## Historical basis and remaining mechanisms

The Eiffel Tower's official history describes factory prefabrication/preassembly
and small cranes attached to the tower:
https://www.toureiffel.paris/en/news/130-years/how-did-they-build-tower-so-quickly
and https://www.toureiffel.paris/en/the-monument/history . These support the
assembly approach. They do not authenticate the exact authored crossbars, butt
joint or crane dimensions as surveyed 1889 machinery.

The compact climbing gin pole is a saved Blender **candidate only**:
`blender/eiffel-summit-gin-pole-candidate.blend`,
`blender/eiffel-summit-gin-pole-context-candidate.blend` and
`model/summit-gin-pole-candidate.glb`. Static bore, clamp, fork and obstacle
checks pass, but the complete supported climb, guide opening/closing, tackle,
drive and worker actions are not implemented. The context snapshot predates
the final 0.16 m floor-hub correction. It must not be presented as a current
production rendering. `support-audit/` contains proposals, with explicit scope
and older coordinates; use the current public kit for subsequent work.

The production c001/c002 rigs and the incoming elevated-stock supply chain
remain unresolved. The first assembly's local handling begins at terrace stock;
this does not show how that stock arrived from the ground. Earlier first-floor
delivery and onward crossing remain separate completed chapters. Cargo route
clearance and floor contact do not establish crane structural capacity, rope
clearance, rig installation/removal or complete ground-to-summit provenance.
The goal remains active; do not switch to another wonder yet.

## Integration verification

The initial full-suite run found four failures because changing the entire
manifest identity invalidated unchanged first-floor route evidence.
`tests-full.log` preserves that failure. The fix retains the immutable baked
routes and separately admits the exact new manifest only if all 6,984 records
through stage23 retain the original domain hash; each derived route input must
still match its original hash. Archived seals are unchanged.

`tests-full-compatible.log`: **842 tests / 151 files pass**, with four workers,
65.81 seconds. `typecheck-compatible.log`: application TypeScript passes.
Final production build, browser results and new source seals follow below.

`build-compatible.log`: production build passes as `main-BT_fuIWM.js`,
2,066,857 bytes, SHA-256
`5044a836d6d9579333b09284b909f0d916688de6fd9f908f5783c6664edf513c`.
Both actual desktop/mobile production runs verify that served bundle and every
requested model identity match the frozen local bytes. Each runs 127 seeks:
101 whole-film, seven first-floor mechanism, ten final-wave and nine c000 frames.
Desktop peaks at 346,029 triangles / 166 calls; mobile at 295,923 / 149, within
their original budgets. Both preserve the monotone 125-degree orbit, fixed crowd
identities, seven sampled actual first-floor root poses, real Space playback and
pixel-identical reverse crops, with no browser errors or overflow.

The c000 report includes expected source poses alongside real screenshots; it
does not claim actual renderer-matrix comparison for c000. The normal camera
stays wide during that 9:38–9:42 chapter and the native slider's 0.001 step is
approximately 0.651 seconds, so its short stock/lowering phases may be skipped
by seeking. Supplementary exact-time close-camera views in `browser/` are
diagnostics, not the normal film or user camera. The parent inspected both
normal and final-wave captures. See `browser/README.md` for precise scope and
the separate startup-harness failure caused by conflicting sampler generation.

Local review:
http://127.0.0.1:5589/?review=paris-filter-mast-assemblies-v23#/wonder/eiffel-tower
The final mast close view runs approximately 9:59.66–10:45.43 (midpoint10:22.54).
The film lasts651.4267707038563 seconds; earlier first-floor review positions
remain6:23 for landing and7:47 for cart crossing. Preview5589/dev5590 remain
running. The UI open request was queued by Codex because the task was hidden;
the local URL itself was verified by the production browser runs.

`source-seals.json` records577 frozen source/config files and16 model/source/
bundle files, with matching copies under `source/`. A final rehash found no
source or asset drift. `mcp-readback-floor.log` verifies the actual final Blender
libraries after scene evaluation. Only the parent's temporary Blender17950/9877
was stopped after work completed; the original desktop Blender was untouched.
Read `next-model-work.md` before continuing: the remaining generic summit rigs
are visibly disproportionate, and a diagnostic close view is not a substitute
for readable production framing of the eventual supported mechanism.
