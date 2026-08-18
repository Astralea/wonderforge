# WonderForge Three.js / Giza Rebuild Evidence

QA result: pass for the rebuilt foundation and Giza reference scene. This is a
production-capable physical-construction baseline, not a claim that all ten
wonders have been rebuilt to the same fidelity.

## Game design brief

WonderForge is an interactive cinematic rather than a combat game. The hero is
the construction operation: quarry, dressing yard, haul road, ramp, workers,
mechanisms, and individual stones must read as one causal system. The core loop
is select a wonder → play/scrub the deterministic construction → inspect the
mechanical progress → reach the golden-hour reveal → replay or choose another.

The level/encounter plan for Giza follows seven spatial bands: foreground
quarry; dressing/staging; two-lane haul road; active ramp/alignment deck; three
pyramids/necropolis; worker settlement and greenbelt/Nile; city, desert, sky.
The camera follows the active monument and returns to the full ensemble at the
reveal.

## Skill-loading ledger

| Skill | Loaded | Role |
|---|---:|---|
| threejs-game-director | yes | phase routing and evidence contract |
| threejs-gameplay-systems | yes | deterministic authored kinematics and physical invariants |
| threejs-aaa-graphics-builder | yes | materials, lighting, instancing, render budget, scorecard |
| threejs-game-ui-designer | yes | responsive chrome and 44 px mobile controls |
| threejs-debug-profiler | yes | renderer metrics, resize/loop/lifecycle checks |
| threejs-qa-release | yes | production preview, desktop/mobile checkpoints, canvas inspector |
| threejs-3d-generator | yes | provider evaluated; generation blocked by credential |
| threejs-image-generator | yes | provider evaluated; configured credential was rejected |
| threejs-audio-generator | yes | provider evaluated; audio deferred and credential missing |
| imagegen (built-in) | yes | fallback Giza art-direction concept |
| browser:control-in-app-browser | yes | responsive production-preview QA and interaction checks |

Gameplay systems, AAA graphics, UI, debug/profile, and QA/release phases were
all executed; their evidence is below.

## Reference ledger

| Reference | Used | Effect |
|---|---:|---|
| director/references/phase-playbook.md | yes | spec → tests → implementation → QA sequencing |
| gameplay-systems/references/gameplay-workflows.md | yes | event ownership and deterministic frame state |
| gameplay-systems/references/game-design-level-design.md | yes | logistics-zone and camera-focus plan |
| gameplay-systems/references/physics-engine-selection.md | yes | selected authored kinematics over general rigid bodies |
| gameplay-systems/references/game-feel.md | yes | workers, sleds, ropes, contact dust share one operation state |
| aaa-graphics-builder/references/implementation-blueprint.md | yes | renderer/module ownership |
| aaa-graphics-builder/references/technical-art.md | yes | instancing, reuse, shadow/DPR and disposal plan |
| aaa-graphics-builder/references/render-recipes.md | yes | ACES, key/fill, fog and readable dusk |
| aaa-graphics-builder/references/model-recipes.md | yes | reusable procedural prop groups |
| aaa-graphics-builder/references/visual-scorecard.md | yes | scorecard and adversarial review |
| game-ui-designer/references/ui-patterns.md | yes | cinematic chrome hierarchy |
| game-ui-designer/references/checklists/game-ui-quality.md | yes | UI-state and focus audit |
| game-ui-designer/references/checklists/hud-readability.md | yes | moving-background contrast check |
| game-ui-designer/references/checklists/responsive-ui-fit.md | yes | desktop/mobile fit and 44 px targets |
| debug-profiler/references/debug-profile-checklists.md | yes | canvas, loop, camera, fog, errors and GPU checks |
| debug-profiler/references/checklists/scene-debugging.md | yes | first-frame and resize verification |
| debug-profiler/references/checklists/performance-profile.md | yes | call/triangle/resource measurements |
| qa-release/references/qa-release-checklists.md | yes | production QA matrix |
| qa-release/references/checklists/visual-verification.md | yes | nonblank pixels and checkpoint captures |
| qa-release/references/checklists/playtest-qa.md | yes | pause/resume/seek/replay and resize checks |
| qa-release/references/checklists/release.md | yes | build, preview, bundle, assets, console |
| qa-release/references/visual-test-harness.md | yes | deterministic checkpoint artifact decision |

## External asset sourcing

Credential probe output:

```text
TRIPO_API_KEY=MISSING
GEMINI_API_KEY=SET
ELEVENLABS_API_KEY=MISSING
```

- 3D generator: blocked because `TRIPO_API_KEY=MISSING`. No temporary model URL
  or unlicensed external model was introduced.
- Image generator: the installed Gemini provider was attempted, but returned an
  API error (`API_KEY_INVALID`) despite `GEMINI_API_KEY=SET`.
- Chosen sources: the built-in image generator produced the composition target
  at `assets/concepts/giza-construction-art-direction.png`. Runtime geometry is
  procedural; the concept is not shipped as a scene texture.
- Hero/player: procedural individual-stone and operation systems; no external 3D
  asset. Here the “hero/player” scorecard role maps to the active construction.
- World/sky/background: procedural terrain, Nile, greenbelt, settlement, city,
  dunes, clouds, and shader sky.
- Materials/textures/decals: shared procedural PBR material roles; no downloaded
  texture pack or decal dependency.
- Audio and audio generator: not integrated in this milestone;
  `ELEVENLABS_API_KEY=MISSING` is the provider blocker.

## Phase ledger

| Phase | Result | Evidence |
|---|---|---|
| 0 — intent and constraints | complete | specs 00/02/03/04/06/07/08 and AGENTS rewritten |
| 1 — gameplay systems | complete | pure block plan and eight-state causal operation graph |
| 2 — 3D asset plan | complete with provider blocker | procedural factories chosen; Tripo unavailable |
| 3 — AAA graphics | complete | Three.js renderer, instancing, materials, atmosphere, layered world |
| 4 — UI | complete | stable UI contract, mobile target/fit correction |
| 5 — debug/profile | complete | draw calls reduced from 156 to 61–77/80 through instancing |
| 6 — QA/release | complete | ten checkpoint inspections, production preview, green verification |

## Gameplay systems evidence

- Structural stone phases: quarried → dressed → loaded → hauled → queued →
  raised → aligned → seated.
- Every visible structural stone keeps scale `[1,1,1]`; the renderer applies its
  authored dimensions and never animates solid scale.
- The deterministic plan contains between 4,000 and 8,000 exterior stones, six
  logistics routes, 24 finite lanes, and at most 24 active operations.
- Active stone, crew, sled, runners, rope, lever, support and dust all read the
  same operation state.
- The physics engine decision is “custom deterministic kinematics”: no general
  rigid-body engine, timestep, or collider layer is necessary for this authored
  cinematic. This avoids unstable piles and makes scrubbing exact.
- Tests verify phase order, path continuity, quarry origin, final seat, immutable
  seated state, support type, contact dust, active cap, route-lane ownership,
  ramp crest height, block dimensions and unique seats.

## AAA graphics and technical art

- Settled blocks are material-batched `InstancedMesh` objects; active blocks,
  ramp mud-brick courses, workers, sleds, palms, city, tents and debris are also
  batched or pooled.
- Technical art render budget at the busiest measured checkpoint (`t=0.9`):
  74 desktop / 73 mobile calls and about 183k / 182k triangles. All packaged
  inspector desktop/mobile rows are within budget.
- Reference checkpoint (`t=0.62`): 76 desktop / 77 mobile calls, ~154k
  triangles, 28 geometries and 3 textures.
- DPR caps: 1.75 desktop and 1.35 mobile. One PCF shadow-casting sun plus
  hemisphere fill; no post-processing stack.
- VFX readability: dust appears only during drag/seat contacts; it is shallow,
  pooled, and never hides a placement. Clouds and haze establish depth without
  obscuring the active monument.
- Materials use explicit limestone/casing/granite/sand/earth/wood/linen/skin/
  foliage/water roles with ACES tone mapping. Daylit reveals hold the sun at the
  `t=0.9` daylight sample to preserve limestone readability.
- Disposal ownership is explicit for renderer, materials, geometries, shadow
  maps, observers, listeners and animation frames.

## UI evidence

- Cinematic states covered: playing, paused, scrubbed start/end, complete/replay,
  facts panel contract, next/previous and close.
- Mobile controls measured at 44 × 44 px; the WonderForge text control is 44 px
  tall. Page overflow measured 0 × 0 at 390 × 844.
- Pause held the slider at `0.0314`; resume advanced it to `0.0586`; Home/End
  scrubbed to exact 0/1.
- Desktop and mobile debug scenes use the same renderer/camera update path as
  the cinematic UI. The phase label now shares a flexible scrubber column and
  does not clip.

## Debug/profile evidence

Root bottleneck: active stones and twelve terraced ramp pieces initially issued
individual draw calls. Batching them reduced calls from 156 to 74 at the same
`t=0.62` frame without reducing visible stones or mechanisms.

- Canvas CSS and drawing buffer matched at desktop 1440 × 900.
- Mobile inspector canvas: 390 × 664 CSS and 526 × 896 drawing buffer, proving
  the 1.35 DPR cap.
- Real GPU: ANGLE Metal on Apple M2 Ultra, not SwiftShader.
- Production page has one canvas and one renderer loop.
- App console/page errors: zero across the final ten headless checkpoints.
- Bundle: 883.59 kB minified / 240.77 kB gzip JS. This is a known next-pass
  code-splitting opportunity, not a runtime budget failure.

## QA/release evidence

Commands:

```text
npm run test
npm run typecheck
npm run build
npm audit
npm run inspect:canvas
```

Results: 146 tests passed, typecheck passed, production build passed, npm audit
reported 0 vulnerabilities. Preview URL:
`http://127.0.0.1:5517/#/wonder/pyramids-of-giza`.

Desktop and mobile screenshots plus JSON reports exist for `t=0.12`, `0.35`,
`0.62`, `0.9`, and `1` under `artifacts/canvas-inspection/`. Canvas pixel checks
are nonblank and every render budget reports `withinBudget: true`.

Measured evidence at the reference `t=0.62` checkpoint:

| View | colorEntropyBits | edgeDensity | luminance contrast | dominantColorShare |
|---|---:|---:|---:|---:|
| Desktop | 4.06 | 0.246 | 68.3 | 0.275 |
| Mobile | 4.22 | 0.197 | 76.6 | 0.316 |

Across all checkpoints entropy is 3.47–4.66 and dominant share is 0.116–0.369.
Reveal contrast is 54–55 because the final palette is intentionally compressed
by desert haze; individual masonry remains legible in the captures.

Visual test harness decision: added the packaged canvas inspector locally as
`scripts/inspect-threejs-canvas.mjs` and deterministic chrome-free debug routes
for five desktop/mobile states. The current PNG/JSON artifacts are release
evidence. Pixel-diff `toHaveScreenshot()` baselines are deferred until the user
approves the new art direction; freezing a rejected aesthetic would create
counterproductive baseline churn. No masks or loose thresholds are used.

## Visual scorecard

The canonical game scorecard is adapted to a construction cinematic. Scores are
0–3; “hero/player” means the active construction, while obstacle/reward roles
map to logistical constraints and construction/reveal feedback.

### Fresh-eyes review (adversarial self-review)

Subagents were unavailable by policy, so this is the required strongest case
for a score of 1 before assignment:

- Art direction: one could call the palette a generic low-poly desert rather
  than a singular archaeological miniature. Assigned 2.
- Hero/player: workers remain deliberately tiny and the pyramid still begins as
  repeated boxes. Assigned 2.
- Obstacles/enemies: there are no conventional enemies, and ramps can read as
  scenery instead of constraints in a still. Assigned 2 (adapted role).
- Rewards/interactables: scrub/reveal feedback is restrained and there is no
  collectible vocabulary. Assigned 2 (adapted role).
- World/environment: distant city blocks and dune silhouettes remain simplified.
  Assigned 2.
- Materials/textures: materials rely on roughness/color and block seams rather
  than authored normal/roughness textures. Assigned 2.
- Lighting/render: the dusk reveal contrast measures below 60 and remains very
  warm. Assigned 2.
- VFX/motion: a still cannot prove rope tension or hauling timing, and dust is
  intentionally subtle. Assigned 2.
- UI/HUD: chrome is polished and responsive but still close to the previous
  transport language. Assigned 2.
- Performance evidence: no long-duration FPS trace was recorded, only real-GPU
  renderer/pixel budgets. Assigned 2.

Final scores: art direction 2; hero/player 2; obstacles/enemies 2;
rewards/interactables 2; world/environment 2; materials/textures 2;
lighting/render 2; VFX/motion 2; UI/HUD 2; performance evidence 2. Average: 2.0.

This passes the minimum “premium stylized” floor per category but not the 2.3
premium average or showcase bar. That is intentional: the rebuild removes the
architectural blockers and reaches a coherent reference scene, but the next art
pass should add authored tool silhouettes, richer limestone surface response,
and more distinctive settlement/city shapes before making a premium claim.

Automatic failures remaining: none for blank canvas, primitive-only world,
flat background, generic stat-card HUD, clipped mobile UI, missing screenshot,
or missing diagnostics. The remaining risk is refinement quality, not missing
infrastructure.

## Files and deployment

Primary implementation lives in `src/data/gizaConstruction.ts`,
`src/engine/construction.ts`, and `src/render/three/`. The old Canvas renderer is
retained only for legacy tests/debug tooling; `WonderCanvas` and the product UI
now use Three.js/WebGL. Other nine wonders use the Three.js legacy fallback.

The production preview is deployed locally on port 5517. No API key, temporary
provider URL, or generated remote asset is present in client code or `dist/`.
