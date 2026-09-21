# Four On site films: construction credibility audit

Read-only review, 2026-09-20. Role: `.factory/droids/construction-archaeologist.md`.
Scope: current source and CPU geometry, not a historical review or browser/GPU sign-off. Read Specs 00/01/02/08/10/12 and current Eiffel 44–47 plus HANDOFF before review. No application/spec changes, publication, or remote writes.

The most consequential work is fixing support and motion in Giza, Stonehenge, and Colosseum. These are reproducible geometric defects, even though their existing construction tests pass. Eiffel has substantially more explicit identity/support contracts; this audit did not establish a comparable new Eiffel defect.

Reproduce the findings from the repository root:

```sh
bun artifacts/public-release-audit-2026-09-20/construction-probe.ts
```

The probe constructs actual `GizaEnvironment` objects, runs their real update, refreshes instanced raycast bounds, raycasts terrace triangles, and inverse-transforms each hit into the specific box's local coordinates. It also inspects actual `StonehengeWorkSystem` crib matrices. These operations need no browser or GPU. GizaWorld uses the identical `GIZA_CONSTRUCTION` input at `src/render/three/GizaWorld.ts:16–19` and sends the same construction time to blocks/workers/environment at lines 31–35.

## Giza

**Critical / P1 — Make the rendered ramp, sled and worker feet share one support surface.** `src/engine/construction.ts:89–113,133–174` computes each load's surface as a linear foot-to-crest route, with crest derived from that block's final course. The renderer independently determines a growing height and twelve terraces using another footprint length (`src/render/three/Environment.ts:2890–2920,3012–3073`). Those are different surfaces. For `khufu-c41-s0-b00`, at `t=0.5002578037435307`, the active phase is `raised` and the sled's ground is **11.7500**. The actual terrace top beneath that X/Z is **15.7687**, a **4.0187-unit penetration**. The triangle hit is on instance 4, local `[0,0.5,-0.1420]`, inside the rotated box. The stone's center is only 12.3685, so this is not a slight runner overlap. The five-route probe finds the same class of error for both Khufu ramps, both Khafre ramps and Menkaure.

The worker compounds the mismatch: `WorkerSystem.ts:147–156` moves him ahead in X/Z but reuses the stone's `groundY`. At the same sample his feet are **11.7500** while the actual next terrace is **17.7398**. Ground each person at his own contact X/Z, and tilt sled runners/stone consistently with the chosen traversable surface. A constant horizontal sled on twelve tall stair blocks cannot meet every front/rear runner contact simultaneously.

**Major / P2 — Re-author the terminal lift method and return logistics.** The highest block's foot-to-crest gradient is about **43.1° Khufu, 48.3° Khafre south, 44.2° Khafre west, 36.4° Menkaure** under the current routes (`src/data/gizaConstruction.ts:112–128`). This is a source-derived steepness issue, not a claim about one archaeologically proven ramp solution. Introduce a visibly coherent late-course method or extend/switchback the usable ramp. Workers/sleds currently exist only for active deliveries (`construction.ts:207–219`, `WorkerSystem.ts:114–225`); a small deterministic return/parking beat would make the site read as a supply cycle.

Acceptance: actual-instance support raycasts at early/middle/high-course ascent and route boundaries; sled front/rear runners and every worker foot within 0.03 of the depicted support; reverse seeks; no intersection with masonry. The current “terrace line” test (`tests/construction.test.ts:159–180`) compares the engine to its own linear formula and cannot catch the rendered mismatch. Keep real desktop playback around `t≈0.50026` and `0.8444`, rather than relying only on stills.

## Stonehenge

**Critical / P1 — Derive the stone center, rotation, heel, rope attachment and pit from one rigid transform.** `uprightRaisePose` moves the center along `outwardFor(stone)` but leaves yaw at `stone.finalRotation[1]` (`src/engine/stonehengeConstruction.ts:114–119,148–170`). The actual stone uses `Euler(...rotation,'YXZ')` (`src/render/three/StonehengeStoneSystem.ts:120–131`). For `trilithon-00-upright-b` at `t=.083`, transforming local butt `[0,-height/2,0]` gives `[9.8199,-.3503,-6.5430]`; the declared heel/pit is `[4.5255,-.3503,-2.5456]`: **6.6340 m apart**. The renderer then computes a synthetic stone top from center and declared heel (`StonehengeWorkSystem.ts:282–286`), so the rope anchor inherits the wrong axis. The object rotates near a nominated pit rather than physically pivoting in it.

Acceptance: transform local butt and top using the same matrix written to the stone mesh; compare butt against the authored heel in all three coordinates, and rope attachment against transformed mesh points. Sweep all upright groups through tilt/raise. `tests/stonehenge-construction.test.ts:146–169` currently checks only center-to-heel distance, not its direction. Also audit final lintel/support overlap in X/Z: the existing joint test checks height only (`195–217`), and current yaw conventions warrant a separate bearing-footprint test. The horizontal-bearing issue is a review risk, not a quantified failure in this report.

**Critical / P1 — Keep the entire lintel crib grounded, and retain real support during alignment.** `StonehengeWorkSystem.ts:290–310` caps the crib at 22 layers of 0.22 m and hangs those layers down from the rising soffit. For the central lintel at `t=.21055`, actual rendered matrices contain 66 logs whose **lowest bottom is 2.3916 m above terrain Y=0**. At `t=.2135`, the state switches to `guide-rails`; actual renderer counts become **zero crib logs, two guide beams**, with the lintel soffit at 7.62 m. The source switches branches outright (`319–329`); there is no retained ground-rooted staging crib in that operation. The nominal `cribHeight` test only certifies the top, not its load path to earth (`tests/stonehenge-construction.test.ts:173–208`).

Fix with enough final-size logs assembled from ground upward, a small supported jacking/crib-insertion step, and a retained platform/guide load path until both stone joints bear. Existing logs should not all rise when a new course is inserted. Acceptance: bottommost logs contact terrain, contiguous support reaches soffit, no whole-crib disappearance across phase 5→6, and shortest visible guide segment remains supported during the traverse. Capture the central lift around `.19875`, `.21055`, `.2135`.

## Colosseum

**Critical / P1 — Connect the haul subroutes and preserve carrier orientation/contact.** `haulPose` finishes its first subsegment at authored road X/Z and starts the next directly on an ellipse (`src/engine/colosseumConstruction.ts:101–129`). For `arcade-1-8` at `t=.36984519655558806 ± 1e-10`, the load jumps from `[128,6.475,3.9]` to `[115.9072,6.475,2.5989]`: **12.1626 m**. Existing continuity tests inspect the major phase boundaries `.14/.48/.58/.9`, omitting the internal eased `.34` boundary (`tests/colosseum-construction.test.ts:96–106`). Add the missing entry leg and drive yaw from route tangent, then test position and rotation at every internal waypoint.

The wagon renderer also places its deck **0.43 m into the block at full lift**: stone bottom is `terrain + .9`, whereas deck top is `bottom - .9*.2 + .42 + .38/2` (`src/render/three/ColosseumWorkSystem.ts:280–305`). Test rendered deck top/wheel contact, not the engine's own `wagonLift` equation.

**Critical / P1 — Replace the telescoping crane with fixed timber geometry and a supported station.** `colosseumCraneRigAt` derives mast top and boom tip directly from the moving hook (`src/engine/colosseumConstruction.ts:171–185`), and the renderer scales timber to these changing lengths (`ColosseumWorkSystem.ts:322–340`). In one `arcade-1-8` hoist the mast grows **7.5→13.875 m**, while the horizontal boom grows **0→10.122 m**. This is not a rigid mast with a luffing/slewing jib. Define the station and final timber dimensions first; solve reachable hook motion from that rig. Include base/foot bearing tests against an actual scaffold/deck footprint, since `workingDeckY` currently supplies only a scalar height.

**Major / P1 — Dismantle the entire scaffold instead of dropping its remaining lower storeys.** At `t=.979999`, every scaffold station still has **37.375 m** of poles. At `.98`, all stations have zero. `colosseumScaffoldStackHeightAt` shrinks only the current storey's rise but retains its 38 m base until `envelopeHeight` abruptly returns zero (`src/engine/colosseumConstruction.ts:188–215,261–281`). Remove final-size lifts from the top all the way to ground in staggered station windows. Existing tests only assert a scaffold is present early and absent at 1 (`tests/colosseum-construction.test.ts:218–236`). Acceptance: bounded per-step/member removals through `.90–1`, reverse seeks, and one continuous shot through `.979–.981`.

## Eiffel

**No newly demonstrated construction failure from this bounded review.** Current code explicitly separates the monotone structural clock from the signature mechanical clock (`src/engine/eiffelFilmEdit.ts:65–103`). Tests operate on the actual kit, preserve all four ground payload identities, gate first-/second-floor plant on completed bearing decks, and check dense forward/reverse identity continuity (`tests/eiffel-progress-story.test.ts:39–87`). Preserve this stronger baseline.

The highest-value acceptance work is perceptual: establish the member, rig and destination together; verify the entire **34–42 s** cue shows full iron travel; verify **104–124 s** shows visibly rising exterior shaft geometry in the current camera. Those are explicit current contracts (`specs/46-eiffel-progress-story.md:34–46,59–75`), not newly discovered violations. Do not reintroduce a tiny fastening-worker close-up. Record continuous real-GPU playback, with caption/voice and actual moving payload visible, to distinguish a motion hold from a renderer hitch.

Documented scope limit remains: freight above the second-floor receiver and final summit connection are omitted (`specs/46-eiffel-progress-story.md:85–90`). Treat a future complete upper freight chain as a substantial new scene task, not a last-minute pre-posting edit. This audit does not claim historical equipment capacity or a complete structural simulation.

## Verification and verdict

Executed `npx vitest run tests/construction.test.ts tests/stonehenge-construction.test.ts tests/colosseum-construction.test.ts --maxWorkers=2`: **3 files / 40 tests passed**. These passed before the numeric probes; no tests or source were changed to obtain results. Full-suite/typecheck/build and live-site desktop/mobile verification belong to the parent audit. The standalone probe ran successfully against current source, with actual Three.js terrace intersections and crib instance matrices.

Construction credibility is currently uneven. The broad silhouettes and typed construction graphs survive, but Giza's visible ramp disagrees with its traffic, Stonehenge's signature lift breaks its pivot and supporting crib, and Colosseum has discontinuous routes and changing-length timber rigs. Fix those causal defects before spending effort on more background decoration. Eiffel's main remaining audit burden is proving the existing physical story remains legible in actual playback.
