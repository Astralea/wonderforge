# WonderForge Agent Handoff

Last updated: 2026-08-18 (Asia/Tokyo), reveal-camera fix plus the realism
pass (trajectories, sled physics, haul crews, dawn/dusk grading)

## Start here

Read `specs/00-overview.md` through `specs/08-scene-realism.md` before changing
behavior. The specs were intentionally rewritten around Three.js and physical
construction; old instructions that describe Canvas 2D as the production
renderer are obsolete.

The repository is not currently a Git worktree. There is no branch, commit
history, or reliable dirty-file inventory. Preserve files carefully and ask the
user before initializing version control or deleting generated artifacts.

## Current product state

WonderForge is a React/Vite fan recreation of Civilization VI-style World
Wonder construction movies. The current milestone focuses on one reference
scene, the Pyramids of Giza. The other nine catalog entries remain navigable
through the legacy Three.js fallback and must not be broken or renamed.

The Giza scene now has:

- an imperative Three.js/WebGL production renderer;
- deterministic human-scale exterior masonry;
- 11,591 deterministic interior core cells with direct course support;
- quarry, dressing yard, haul routes, sleds, ramps, levers, workers, and dust;
- a layered worker settlement, fields, irrigation, Nile, palms, reeds, boats,
  distant city, necropolis, desert heightfield, clouds, fog, and analytical sky;
- an era/place-grounded background (Spec 08 §Era and place grounding): typed
  sky keyframes and sun path (`src/data/gizaSky.ts`), a custom analytical sky
  dome shader with sun disc and dust haze (`src/render/three/SkyDome.ts`),
  sector-aware horizon ridges (Muqattam hills east, low dunes west), a
  Memphis skyline (mud-brick, whitewashed walls, domed granaries, pylons,
  obelisks), and era-correct river craft (square sails, Tura casing barges);
- procedural surface detail (Spec 06 §Materials and color): typed recipes in
  `src/data/materialDetail.ts` injected into the shared materials via
  `onBeforeCompile` (`src/render/three/proceduralDetail.ts`) — limestone
  bedding, granite speckle, sand mottling, earth compaction, timber grain,
  and a playback-phased Nile ripple. ALU-only: zero added textures, draw
  calls, or triangles; fully deterministic;
- a horizon/camera pass: pure camera math in `src/engine/gizaCamera.ts`
  (breathing cinematic pitch 16–29 degrees with minima at the dawn and reveal
  beats so the sky band enters frame; a seamless 100-second ambient orbit for
  the homepage), a curved braided Nile described as typed channel data
  (`GIZA_RIVER_CHANNEL` in `src/data/gizaEnvironment.ts` with pure samplers
  consumed by banks, reeds, and boats), and widened monument spacing (Khafre
  and Menkaure moved outward along the plateau axis so footprints no longer
  touch);
- a river-meander pass: the channel now swings in a broad S-meander
  (peak-to-peak ~14–16 world units; northward apex near x +75, clear of every
  monument) and the whole cultivated strip follows it — greenbelt ribbon,
  field parcels (`fieldParcelAt`), palm rows, and irrigation feeders all
  sample the near bank via `greenbeltInnerEdgeAt`, and the necropolis
  exclusion follows the strip. Memphis moved to z −136.5 for clearance;
- a ramp-orientation fix: terraced ramps now rise TOWARD their monument
  (highest terrace at local +z, which every ramp yaw maps to the pyramid
  side; high-end face retaining wall moved accordingly) and `rampFoot`
  waypoints moved to the far low ends, so sleds visibly climb toward the
  working face. Contract-tested (foot farther/lower than crest per route);
- living river and palms: `riverCraftStateAt` (pure, in gizaEnvironment.ts)
  drifts barges north / sailboats south / bobs the moored skiff; palms have
  leaning tapered trunks, two drooping frond tiers with per-instance colors,
  dead-frond skirts, and a gentle t-phased sway;
- a 60-second base movie (was 30s) with a 1×/2×/4× speed toggle on the
  transport bar (speed multiplies wall-clock only; `t` stays authoritative);
- desktop/mobile camera compensation and deterministic authoring routes;
- a sky-seam fix: the "sky" below ~13° elevation is actually the fully fogged
  ground plane / horizon heightfield, and their far silhouettes used to read
  as a hard horizontal band against the dome in the t=1.0 reveal. The dome
  now blends to the exact scene fog color at low elevation
  (`deriveSceneFogColor` shared between `RenderPipeline.ts` and `SkyDome.ts`);
  the mix happens after tone mapping in sRGB space because that is where
  three.js applies scene fog;
- a haul-route clearance pass (construction-archaeologist criticals F1/F2):
  Menkaure hauls every side up its own ramp (the temple-causeway assignment
  used to lerp its stones through the finished Khafre pyramid), khufu-east
  rounds the south-east corner wide instead of tunneling through Khufu's
  base, khufu-south mounts its foot end-on, the drawn roads follow the
  actual sled chords, and camp props are nudged off the corridors.
  Contract-tested (queued legs outside every footprint; raised legs never
  enter another monument);
- a site-clearance pass (Spec 08 §Physical plausibility): ramp footprints are
  now typed data (`plan.ramps`) driving both the geometry and a keep-out set,
  so camp props, scatter, stakes, and tombs can no longer grow through an
  earthwork or block a haul lane (`src/engine/siteClearance.ts`, pure and
  contract-tested; verified with a Node probe that reads back every instance
  matrix — zero overlaps). Corridors resolve before footprints so solid
  geometry wins; props with genuinely no clear ground are rejected rather
  than nudged. Placement loops now set `mesh.count`, fixing 24 mastabas that
  were rendering as unset instances stacked at the world origin inside Khufu;
- a reveal-camera fix: the cinematic shot schedule is now pure engine math
  (`gizaCinematicShotAt` in `src/engine/gizaCamera.ts`, consumed by
  WorldScene) with the ensemble blend starting at t = 0.88 instead of 0.92 —
  the Menkaure close-up used to hold so long that the finished Khufu sat
  outside the frustum from t ≈ 0.86 to ≈ 0.95, which viewers read as the
  Great Pyramid disappearing near the end. Frustum contract tests project
  the real camera and pin all three apexes on screen through the reveal;
- a stale-bounds culling fix (the real "pyramid disappeared, only its shadow
  left" bug, reported from live playback): three caches an InstancedMesh
  bounding sphere on FIRST render, which in the watch view happens at t = 0
  with zero instances — late-movie cameras then culled whole batches
  (settled stones, core fill, workers) from the camera pass while the sun's
  wider shadow frustum kept drawing them. Every per-frame-mutating mesh now
  sets `frustumCulled = false` (BlockSystem, WorkerSystem, ramps, boat
  fleet, palm fronds, ropes). Debug-route captures could never reproduce it
  (a fresh load at the target t computes correct bounds);
  `scripts/verify-live-playback.mjs` reproduces the real playback path;
- a settled-order fix: BlockSystem sorts each settled material batch by seat
  time before binary-searching it. Plan order is starts-ascending but
  per-course durations make `start + duration` zigzag at course boundaries,
  and the old search over that unsorted key dropped wedges of finished
  masonry late in the movie (latent since the pacing rewrite;
  contract-tested now);
- a trajectory pass (archaeologist F3/F4): `rampCrestFor` is face-aware —
  every climb tops out at its route's own earthwork platform at the block's
  course height, never at a seat-anchored point across the monument; the
  crest-to-seat traverse happens on the working deck during the aligned
  phase (rollers/cribbing, the attested method). The climb itself is linear
  (steady haul pace) with a sine-tapered half-tread lift so sleds ride the
  terraces instead of swimming through them. Contract tests sample every
  97th block's climb: over the earthwork or deck always, terrace-line band
  held;
- sled physics (archaeologist F8): blocks on sleds ride a typed
  `SLED_BED_HEIGHT` (0.34 u) above the surface — lifted during loading,
  carried, lowered through the climb's last stretch — exposed as
  `state.sledLift` so the renderer draws deck and runners inside the gap
  and the assembly sits ON the road instead of ploughing through it;
- haul-crew causality (archaeologist F6): crews now pull from AHEAD of the
  sled, torsos leaning into the rope (lean is a quaternion pitch about the
  travel axis), with the rope taut from the stone's front lashing up to the
  lead crew's hands. Loading/alignment crews still work beside the stone;
- a dawn/dusk grading pass (visual director #2 and the monochrome-reveal
  note): typed `fogStretch` per sky keyframe (dawn 1.5 → midday 1.0 → dusk
  1.22) multiplies the scene fog distances so morning mist reads as mood
  instead of erasing the camp, and the dusk reveal separates Memphis, the
  river, and the monuments from the ground haze; the key light now carries
  the keyframe's sun tint, giving dawn/dusk their warm raking key;
- an Old Kingdom river-craft pass (material-culture minors, executed by a
  delegated agent within a confined scope): crescent-sheer hulls whose bow
  and stern rise above midships, a papyriform reed skiff in a straw tone
  with its declared reed-bundle cargo actually rendered, bipod A-frame
  masts with both upper yard and lower boom, tall-narrow square sails, and
  quarter steering oars — plus 7 render-level contract tests
  (tests/giza-river.test.ts) and probe scripts under scripts/. +6 draw
  calls;
- a ramp-material fix (visual director #3): retaining walls use a new
  `revetment` mud-brick material instead of `cityRoof` (which made every
  earthwork read as a giant terracotta-tiled building), and tread paving is
  near-flush so the shadow grid no longer reads as roof tiles;
- foreground interest at the reveal (visual director runner-up): quarry
  spoil heaps and abandoned rough-cut stones scattered across the southern
  and south-western foreground the reveal camera looks across, placed
  through the site-clearance system so nothing lands on a footprint or
  haul lane;
- the Nile ripple now animates on every water program variant (perf F5):
  `onBeforeCompile` collects shader handles per VARIANT (instanced
  irrigation channels compile separately) instead of keeping only the last;
- catalog quote/fact hygiene (historian minors): Machu Picchu quotes
  Bingham, Petra credits Burgon's rose-red couplet, Stonehenge
  distinguishes average sarsens from the great trilithons, Sydney states
  the real 14× overrun; the sun-path historicalNote now owns the
  peret-fields-under-a-near-summer-sun compression explicitly;
- an earthwork-continuity pass: the ramps are now built and struck rather than
  switched on. Their bed extends from the high end outward over a partial
  terrace at the frontier (terraces keep their final size and never slide),
  and the crest is raised continuously *through* each course — it used to be
  `max` over started blocks, which stepped the whole earthwork up 42 times per
  pyramid. Measured across the movie at 60 fps, the largest per-frame change
  in earthwork volume fell from 20.2% of peak to 1.6%, and that remainder is
  the steady slope of the dismantle (max acceleration 0.5%);
- a construction-pacing fix: screen time per course now follows the material
  it places (interior core fill included, plus a foundation bias) instead of
  its exterior block count, which scaled with perimeter rather than area.
  Khufu's 549-unit base slab took 1.2 s and appeared to pop into existence;
  it now takes 3.4 s and starts at t = 0.03, so the formerly dead opening
  shows the foundation being laid;
- a soundtrack: two cues generated with Google's Lyria 002 on Vertex AI and
  assembled locally (`scripts/generate-soundtrack.py`, typed metadata in
  `src/data/soundtrack.ts`). `giza-cinematic.mp3` is exactly 60 s so audio
  time is `t * duration`, with its climax landing on the reveal beat;
  `giza-ambient-loop.mp3` is cut to loop on itself for the home hero.
  `src/ui/useSoundtrack.ts` drives them (the store's `t` stays authoritative;
  the cue is corrected toward it, never the reverse), and `SoundToggle`
  appears wherever a cue can play;
- a frontend accessibility pass: the global keyboard handler no longer
  hijacks focused controls (scrubber arrows, Space on buttons), all touch
  targets meet the 44px floor, reduced-motion Play/Replay jump to the
  completed still instead of a dead perpetual "playing" state, and the
  transport bar reflows on narrow viewports so the scrubber keeps usable
  width.

The finite horizon annulus that looked like a rotating polygon has been
removed. The replacement is a fixed world-space radial heightfield that begins
below the local plateau and extends beyond the fogged view distance, so neither
radial edge appears during the orbit.

## Architecture map

The production path is:

```text
WonderCanvas.tsx
  -> ThreeCanvas.tsx
  -> WorldScene.ts          (applies GIZA_SKY sun/sky/fog override for Giza)
  -> RenderPipeline.ts
  -> GizaWorld.ts
     -> BlockSystem.ts
     -> WorkerSystem.ts
     -> Environment.ts
        -> SkyDome.ts       (analytical dome sampled from typed keyframes)
```

Important boundaries:

- `src/data/` and `src/engine/` are pure. Do not import React, DOM, browser
  globals, or Three.js there.
- `src/render/three/` owns GPU objects and must dispose everything on unmount.
- Playback time in Zustand is authoritative. The renderer never advances its
  own cinematic clock.
- `src/render/IsoCanvas.tsx` and the old vector modules remain as legacy code;
  they are not the Giza production path.
- Runtime `Math.random()` is forbidden. Use `src/engine/random.ts`.

## Key files

- `src/data/gizaConstruction.ts`: deterministic Giza blocks, routes, monuments,
  core fill, and layer plan.
- `src/data/gizaEnvironment.ts`: era context, world compass, geography zones,
  horizon sectors, river craft, Memphis settlement description, and the
  population plan.
- `src/data/gizaSky.ts`: sun path, time-of-day sky keyframes, sun disc/haze
  parameters, and cloud layers (`GIZA_SKY`, `sampleGizaSky`, `gizaSunStateAt`).
- `src/engine/construction.ts`: pure construction phase/state sampling.
- `src/render/three/SkyDome.ts`: analytical gradient/haze/sun-disc sky shader
  (replaced the three.js `Sky` addon for art-directable, fog-matched color).
- `src/render/three/BlockSystem.ts`: exterior and interior instancing plus active
  construction stones.
- `src/render/three/Environment.ts`: terrain, logistics background, settlement,
  Memphis, sky, clouds, necropolis, and retained ramps.
- `src/render/three/WorldScene.ts`: deterministic camera/light/world updates
  (also ticks the playback-derived material detail time for the Nile ripple).
- `src/data/materialDetail.ts`: typed surface-detail recipes with era/material
  rationale (`MATERIAL_DETAIL_RECIPES`, `materialDetailFor`).
- `src/render/three/proceduralDetail.ts`: `onBeforeCompile` injector with
  per-role `customProgramCacheKey`; object-space sampling for carried parts,
  world-space for placed surfaces.
- `scripts/inspect-threejs-canvas.mjs`: real-browser screenshot, GPU, pixel, and
  renderer-budget inspection.
- `scripts/generate-soundtrack.py`: Lyria 002 generation plus ffmpeg assembly
  and level-matching for both cues. `--assemble` rebuilds from the cached
  candidate WAVs in `artifacts/soundtrack/` (byte-reproducible); a full run
  regenerates them, and Lyria takes no seed, so results differ each time.
- `tests/construction.test.ts`, `tests/giza-world.test.ts`,
  `tests/giza-sky.test.ts`, `tests/material-detail.test.ts`,
  `tests/giza-camera.test.ts`, and `tests/giza-river.test.ts`: physical
  masonry, layered-world, era/place grounding, material-detail, camera, and
  river-channel invariants.

`.claude/skills/scene-physical-plausibility/` codifies the physical rules the
scene must obey (support, occupancy, right-of-way, continuity of appearance,
path validity, ground contact, instance hygiene) and — more importantly — how
to verify each one numerically with a Node probe rather than by eye. Read it
before placing props, moving earthworks, or changing the schedule. Spec 08
§Physical plausibility carries the same rules in short form.

Installed agent skills live in `.agents/skills/`: `threejs-aaa-graphics-builder`
(render budgets, shader cookbook, visual scorecard), `frontend-design`, and the
cloudai-x `threejs-shaders`/`threejs-postprocessing` references. The other eight
cloudai-x skills were removed after evaluation. Note: the aaa skill's external
AI asset-sourcing gate conflicts with Spec 00/03 (procedural + locally licensed
only) and is deliberately skipped.

## Verification state

The required verification passed after the reveal-camera and realism passes:

```text
20 test files
223 tests
npm run typecheck: passed
npm run build: passed
```

Run the full gate after any meaningful change:

```bash
npm run test && npm run typecheck && npm run build
```

The production build has a non-blocking Vite warning: the main JavaScript chunk
is about 906 kB minified (about 249 kB gzip), above Vite's 500 kB warning level.
Code splitting is future performance work, not a correctness failure.

Accepted Giza browser captures live under:

```text
artifacts/giza-solid-pass/accepted/
```

They cover desktop and mobile at normalized times `0.12`, `0.35`, `0.62`,
`0.90`, and `1.00`. The sweep used the Apple M2 Ultra GPU, produced no console
or page errors, and stayed within the starting budgets. The recorded maximum
was 97 draw calls and 232,766 triangles.

Post-restructure captures (new sun path, sky dome, Memphis skyline,
square-sail river craft) live under:

```text
artifacts/giza-sky-pass/
```

Material-detail-pass captures (procedural grain/banding/mottling/ripple) live
under `artifacts/material-detail-pass/` (desktop 0.12/0.62/1.0, mobile 1.0).
The recipe review board that preceded the pass is preserved at
`artifacts/material-board/` (open `index.html`; `board.png` is the capture).

Horizon-pass captures (breathing pitch, curved braided Nile, widened monument
spacing) live under `artifacts/horizon-pass/` (desktop 0.12/0.52/1.0, mobile
1.0). The desktop reveal frame shows the sky band, the Memphis skyline behind
the greenbelt and curved river, and three clearly separated pyramids.

River-meander-pass captures (visible S-curve, bank-following greenbelt) live
under `artifacts/river-meander-pass/` (desktop 0.12/1.0, mobile 1.0).
Ramp-fix evidence lives under `artifacts/ramp-fix/desktop-05/` (mid-
construction, ramp meets the working face); living-river/palms captures under
`artifacts/living-river-pass/` (desktop 0.12/0.62).

All seven review-board reports from the 2026-08-16 run are preserved under
`artifacts/review-board/reports/` (frontend-ux, material-culture,
engine-determinism, visual-scorecard, render-performance, wonder-historian,
construction-archaeologist). Sky-seam evidence lives under
`artifacts/sky-band-debug/` (`fogfix3*` are the fixed frames; the earlier
directories document the bisect) and route-fix evidence under
`artifacts/route-fix/`.

A seven-role review board now lives in `.factory/droids/`
(wonder-historian, material-culture-curator, construction-archaeologist,
simulation-engineer, threejs-performance-engineer, visual-director,
frontend-experience-engineer), organized by pipeline layer: data (facts /
objects / build logic), engine (purity), render (budgets), presentation
(scorecard), UI (experience). Run them in parallel after any meaningful
visual or data pass; they are read-only and must cite evidence.

Do not treat these generated captures as cross-GPU pixel-perfect baselines.
Use them as composition and regression evidence.

## Running locally

Install dependencies if necessary:

```bash
npm install
```

Start development on an explicitly chosen free port:

```bash
npm run dev -- --host 127.0.0.1 --port 5589
```

Or build and preview production:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 5589
```

The port is not reserved; check availability before starting. `package.json`'s
`inspect:canvas` script targets port `5589`.

Useful deterministic route:

```text
#/debug/wonder/pyramids-of-giza/0.62
```

## Decisions to preserve

1. Stay with imperative Three.js. React Three Fiber would add a migration
   without a corresponding visual gain in the current architecture.
2. Keep construction as deterministic authored kinematics, not a general
   rigid-body simulation.
3. Never replace supported core fill with a single top slab or hollow shell.
4. Never attach the background to the camera or counter-rotate it. Only living
   elements such as clouds, boats, and workers may animate independently.
5. Keep Giza as the only reference-quality scene until it passes the complete
   Spec 04 scorecard. Do not replicate the pipeline to the other nine wonders
   prematurely.
6. Prefer authored geometry/material improvements before using bloom, fog, or
   post-processing to conceal missing detail.
7. Sky and background stay era/place-grounded typed data (Spec 08 §Era and
   place grounding): the sun rises over the Nile (`-z` = east) and sets over
   the Libyan desert (`+z` = west); the distant city is Memphis with
   anachronisms excluded by contract tests; river craft use square sails only.
8. Surface detail is seeded procedural GLSL composed from typed recipes
   (Spec 06 §Materials and color), never fetched or AI-generated textures;
   the only animated detail term is the Nile ripple, phased from playback `t`
   so scrubbing stays deterministic.
9. The homepage ambient camera is a closed continuous orbit
   (`gizaAmbientOrbitAt`), never the one-shot cinematic path looped with
   modulo; the cinematic pitch breathes between 16 and 29 degrees so the
   horizon and sky band enter frame at the dawn and reveal beats (Spec 02).
10. Audio is the one sanctioned exception to Spec 00/03's "procedural or
   locally licensed assets only" rule: the two cues are AI-generated (Lyria
   002 on Vertex AI, SynthID-watermarked) at the user's explicit request.
   Visual assets stay procedural. Sound is never audible without a visible
   `SoundToggle`, the preference persists, and playback time `t` remains
   authoritative — the cue is corrected toward `t`, never the reverse.
11. The Nile is typed channel data (`GIZA_RIVER_CHANNEL` with pure samplers),
   not a placed plane, and its meander must stay visually obvious (peak-to-
   peak > 12 world units; contract-tested). The cultivated strip samples the
   near bank (`greenbeltInnerEdgeAt`, `fieldParcelAt`) — never reintroduce a
   fixed rectangular field grid. Monuments keep a real footprint gap
   (Khufu–Khafre > 8, Khafre–Menkaure > 4 world units) per Spec 08, and
   camera targets are recomputed from the monument centroid whenever
   monuments move.

## Known concerns and next priorities

All seven review-board reports are in `artifacts/review-board/reports/`;
triage state after the 2026-08-16 fixes:

1. **Construction trajectory pass — DONE (2026-08-18).** F1/F2 fixed earlier;
   F3/F4 now fixed too (face-aware crests, terrace-following linear climb,
   deck traverse on cribbing), plus F6 (crews pull from ahead, leaning into
   taut ropes) and F8 (typed sled bed height; runners on the road). Still
   open from that review: F7 (35–47° terminal gradients), F9 partially
   (ramps now grow/strike gradually), F10 (no return traffic). Historian
   majors on Memphis's bank and the pylons/obelisks note remain; the
   season/sun compression is now owned in gizaSky's historicalNote.
   Old text for context: `rampCrestFor` anchored the
   crest to the seat (far-face blocks cross their own monument; blocks
   overshoot the earthwork with open air beneath), and the eased height
   profile puts sleds inside the earthwork for most of the climb. The fix is
   a face-aware route model: per-side crests clamped to the earthwork's high
   end plus an elevation profile matched to the terraces. F6–F10 (trailing
   haul crews, 35–47° terminal gradients, sunken sled runners, instant ramp
   removal, no return traffic) ride along.
2. **Render hygiene (performance engineer F2/F3/F5).** InstancedMesh instance
   buffers are never disposed (~1.4 MB GPU leak per scene switch);
   `updateCoreFill` and the ramp updater rescan all blocks and re-upload full
   instance buffers every frame (the ambient homepage pays this forever);
   the Nile ripple time uniform only reaches one of the water material's two
   program variants, so the instanced irrigation channels' ripple is frozen.
3. **Historian majors — four honest-note/data fixes**: peret season vs 78°
   near-summer sun path; Memphis silently across the river (historically west
   bank); pylons/obelisks centuries early with no acknowledging note;
   three-reigns-in-one-day compression uncovered by any productionNote. Also
   pre-register `camels`/`horses` in `exclusions`, and fix the Machu Picchu /
   Petra quote attributions.
4. **Visual director follow-ups**: open up the over-fogged dawn grade and
   early-beat staging (t≈0.1–0.2, the movie's weakest stretch); re-texture
   ramp treads so they stop reading as terracotta roof tiles; fill the dead
   lower-third sand at the reveal. (#1, the reveal sky band, is fixed.)
5. **Material culture minors**: hull sheer inverted vs period practice; no
   bipod mast / lower boom / steering oars; reed skiff declares
   `reed-bundles` cargo that is never rendered.
6. Draw calls drifted 97 → 105–112, above Spec 03's ≤90 target — consolidate
   (ramps alone are 15 calls; Memphis 8 meshes; quarry 5) before any
   post-processing pass.
7. Code-split the main ~918 kB bundle when load performance becomes a
   priority; consider a preview-port-aware `inspect:canvas`.

## Pitfalls already encountered

- A ring of large dune cones looked like a polygon rotating with the camera.
- A finite radial horizon annulus exposed its outer boundary in the tall mobile
  projection.
- Large low cloud meshes could become screen-filling surfaces when the camera
  passed too close.
- A course-sized synthetic core lid made the pyramid appear hollow and the
  working surface appear unsupported.
- Tall boxy silhouettes in the distant city read as a modern skyline; Memphis
  stays low, and pylons/obelisks carry its skyline.
- The gstack headless browser failed to create WebGL through SwiftShader on this
  machine. `scripts/inspect-threejs-canvas.mjs` successfully used full Chromium
  with the real Apple GPU and is the trusted visual-inspection path here.
- A hard horizontal "sky band" in the reveal turned out not to be clouds or a
  dome gradient stop: everything below ~13° elevation is the fully fogged
  ground plane, and the dome peeking above its far silhouette mismatched the
  fog color. two subtleties: three.js applies scene fog after tone mapping
  and colorspace conversion, and uploads the fog uniform converted to the
  output color space — a dome that wants to match fogged geometry must mix
  at that same stage in that same space (see SkyDome.ts).
- Lyria's WAV output declares a `data` chunk size twice the real payload.
  Decoders that trust the header (Python's `wave`) report double the true
  ~32.8 s duration; ffmpeg computes it from the file and rewrites a correct
  header. Never measure these clips without re-encoding first.
- jsdom implements no media playback, so `tests/ui.test.tsx` stubs
  `HTMLMediaElement` play/pause/load. The soundtrack's own contract (cue
  length pinned to the movie) lives in `tests/soundtrack.test.ts`.
- `npm run build` runs `tsc -b` first; a TS error makes the build fail
  silently when output is piped through `grep`/`tail`, leaving a stale
  `dist/` that the preview server keeps serving. Check the `dist/assets`
  hash changed before trusting a capture after an edit.

## Suggested first action for the next agent

Run the required verification once, read the seven reports under
`artifacts/review-board/reports/`, then start the construction trajectory
pass (priority 1 above): make `rampCrestFor` face-aware, clamp crests to the
earthwork's high end, and match the raised-leg elevation profile to the
terraces — extending the new clearance contract tests in
`tests/giza-world.test.ts` to cover the block's own monument (blocks may only
enter their own footprint above the current working course). Note the mobile
reveal crops Khufu at the right edge by design (the reveal push-in); revisit
only if users read it as a bug.
