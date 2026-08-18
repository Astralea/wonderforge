Task ID: 6811f2fd-d183-4eaf-a477-41cf6afae657
Subagent Type: Worker
Description: Engine determinism review
Status: completed
Duration: 285.7s

The IsoCanvas (legacy 2D renderer) ambient mode also uses wall-clock (`now/1000`) — same documented ambient exception, and it's the legacy fallback path. Its cinematic `tick(dt)` uses `Math.min(100, now - lastNow)` — note: no `Math.max(0, ...)` clamp here unlike ThreeCanvas, so a negative dt is theoretically possible if `now` ever goes backwards (RAF timestamps are monotonic per spec, so practically fine). Note-level at most. Also IsoCanvas calls `store.tick(dt)` unconditionally in cinematic mode — but tick no-ops unless playing. ✓

Spec 05 §Home documents: "The ambient orbit is continuous and seamless — constant azimuth rate, fixed ensemble target, constant radius, breathing pitch — with no periodic snap on loop" and the speed toggle "multiplies wall-clock advance; t stays the single source of truth". ✓ All documented.

I now have everything for the review. Let me compile the findings.

Findings summary:

**Checklist results:**

1. **Purity** — PASS. Grep for React/DOM/Three imports in `src/engine/` and `src/data/`: zero matches. No `Date.now`/`performance.now`/DOM globals/timers in either (the two `window.start` hits in `timeline.ts:67,140` are `TimeWindow` object properties, not the DOM global; `gizaSky.ts:9` "window" is a comment word). Exported functions are side-effect-free; module-level plan factories (`GIZA_CONSTRUCTION`, `GIZA_ENVIRONMENT`) are deterministic seeded computations.

2. **Determinism** — PASS. Zero `Math.random` in all of `src/`. All randomness flows through `mulberry32` with stable string seeds (`giza:khufu`, `giza:khafre`, `giza:menkaure`, `giza:*:core`, `giza:fixed-horizon:v1`, `giza:boat:<id>:<index>`, `wonderforge-stars` in the legacy IsoCanvas). `riverCraftStateAt` (gizaEnvironment.ts:154-190) constructs its own seeded PRNG per call and consumes it in fixed order — call-order independent, identical t ⇒ identical state (test giza-river.test.ts:117-121 verifies).

3. **Time model** — PASS. Everything animated is a pure function of normalized t: blocks, core-fill `readyAt`, boat kinematics/bob/roll, Nile ripple (`uWfTime` phased from playback t, WorldScene.ts:133), cinematic camera, sky/sun (with the documented 0.9 daylight hold, daynight.ts:88, gizaSky.ts DAYLIGHT_HOLD_T). The one wall-clock exception is the ambient homepage mode: `ambientElapsed` accumulated from RAF deltas in ThreeCanvas.tsx:21,39-42 feeding `gizaAmbientOrbitAt` — documented in gizaCamera.ts:44-53, WorldScene.ts:88-94/164-170, Spec 02 §Camera, Spec 05 §Home. Speed multiplies wall-clock advance only (playback.ts:76; Spec 02 §Normalized time; Spec 05).

4. **Scheduling** — PASS with notes. Verified arithmetically: 5,372 blocks (khufu 2,608 / khafre 2,132 / menkaure 632; within the 4,000–8,000 budget); slot ≈ 0.0001527, duration = 20 slots ≈ 0.003053; starts tile [0.085, 0.905] exactly; max concurrency 20 ≤ 24 (Spec 03 budget); lane = index % 24 recurs every 24 slots > 20-slot duration ⇒ no same-lane temporal overlap; last block ends t ≈ 0.9079, before the 0.92 reveal. Course ordering bottom-up (generation order ⇒ monotone starts). Core-fill `readyAt = courseStart + (nextCourseStart − courseStart)·progress·0.94 ≥ courseStart` — never precedes its course's first block start (gizaConstruction.ts:173-181, 207). Monument scheduling boundaries (khufu ends ≈ t 0.483, khafre ≈ 0.808) align with the camera target handoffs (0.5→0.58, 0.8→0.86, WorldScene.ts:64-77) — co-authored, consistent.

5. **Camera math** — PASS. Cinematic pitch envelope: desktop [16°, 29°] = spec's ~16°/~29°; mobile [16.5°, 26.5°] ⊂ envelope and inside the 42° FOV. Minima exactly at t = 0.12 and 0.92 (phaseT 0.12, period 0.8), max at t = 0.52 mid-build. Ambient orbit: azimuth linear unbounded (no modulo ⇒ no snap), pitch sinusoidal; both continuous in elapsed; combined pattern period lcm(100, 80) = 400 s with no discontinuity anywhere. Tests (giza-camera.test.ts) verify envelope, minima timing, and step continuity < 0.05 rad across loop boundaries. `GIZA_CAMERA.startAzimuth = 0.56` matches the cinematic azimuth origin hardcoded in WorldScene.ts:59.

6. **playback.ts speed/tick** — PASS with minor notes. tick scales deltaMs by speed and clamps; completes exactly at t ≥ 1; no-op unless playing. seek clamps and converts complete→paused (resumable via play). replay restarts from any status. setSpeed validates membership and applies from the next tick with no t discontinuity. ThreeCanvas clamps delta to [0, 100] ms so a hidden-tab frame advances ≤ 400 ms of movie at 4×.

**Minor/note-level observations:**

- (note) `play()` from `complete` is a no-op (playback.ts:57-60); recovery is via `replay()` or `seek()` — matches the state machine and Spec 05's "replay button when status === 'complete'". Intended.
- (note) `select()` resets t/status but preserves `speed` (playback.ts:49-54) — speed behaves as a user preference across wonders; spec is silent. Consistent either way.
- (note) `seek(1)` while playing leaves status `playing` until the next tick flips to `complete` (playback.ts:62-65, 74-79) — one-frame lag, harmless.
- (note) `tick` does not guard against negative `deltaMs` (playback.ts:74-79); both callers clamp to ≥ 0 (ThreeCanvas.tsx:33; IsoCanvas.tsx:480 clamps only the upper bound — RAF timestamps are monotonic so dt ≥ 0 in practice). A defensive `Math.max(0, ...)` in the store would make monotonicity caller-independent. Minor.
- (note) The boat doc comment "no hull reaches a ribbon end within one movie even at 4×" (gizaEnvironment.ts:148-153) is trivially true — kinematics are t-domain, so speed cannot extend travel; the wrap is indeed just a safety net. Wording could mislead a reader into thinking distance scales with speed.
- (note) WorldScene.ts:59 hardcodes the cinematic azimuth origin `0.56` and turns `1.25` instead of importing `GIZA_CAMERA.startAzimuth` (gizaCamera.ts:24) — duplicated constant; a future change to one would silently desync the cinematic/ambient start alignment.
- (note) The ambient exception covers a second wall-clock consumer beyond the orbit: `daylightT = 0.79 + sin(ambientElapsed/55_000)·0.035` (ThreeCanvas.tsx:40). It is part of the same documented ambient hero mode (Spec 05 §Home "slow day cycle"), so it's within the exception's spirit, but the role checklist's "one exception" phrasing strictly names the orbit; the daylight breathing is worth knowing about. Both are confined to `mode === 'ambient'`.

Severity assessment: nothing critical or major. All notes are minor/informational.

Test run: 190/190 pass; typecheck clean.

Now write the final report.
Review complete. All evidence gathered, tests green (190/190), typecheck clean.

---

# Simulation Engineer Review — Engine Determinism & Purity

## Checklist results

**1. Purity — PASS.** Grep for React/DOM/Three imports across `src/engine/` and `src/data/`: zero matches. Grep for `Date.now`/`performance.now`/DOM globals/timers in both directories: zero real hits (`src/engine/timeline.ts:67,140` matches are `TimeWindow` object properties named `window`, not the DOM global; `src/data/gizaSky.ts:9` is a comment word). Exported functions are side-effect-free; the module-level plans (`GIZA_CONSTRUCTION`, `GIZA_ENVIRONMENT`) are one-shot deterministic seeded computations.

**2. Determinism — PASS.** Zero `Math.random` anywhere in `src/`. All randomness flows through `mulberry32` (`src/engine/random.ts:9-16`) with stable string seeds: `giza:khufu|khafre|menkaure`, `giza:*:core` (`src/data/gizaConstruction.ts`), `giza:fixed-horizon:v1` (`src/data/gizaEnvironment.ts:416`), `giza:boat:<id>:<index>` (`gizaEnvironment.ts:160`). `riverCraftStateAt` builds its own seeded PRNG per call and consumes it in fixed order, so it is call-order independent; identical `t` ⇒ identical state (verified by `tests/giza-river.test.ts:117-121`).

**3. Time model — PASS.** Everything animated is a pure function of normalized `t`: block state graph (`src/engine/construction.ts:91-128`), core-fill `readyAt`, boat kinematics/bob/roll (`gizaEnvironment.ts:154-190`), Nile ripple phased from playback `t` (`src/render/three/WorldScene.ts:133`), cinematic camera, sky/sun with the documented 0.9 daylight hold (`src/engine/daynight.ts:88`, `DAYLIGHT_HOLD_T` in `gizaSky.ts:18`). The single wall-clock exception is the ambient homepage mode: `ambientElapsed` accumulated from RAF deltas (`src/render/three/ThreeCanvas.tsx:21,39-42`) feeding `gizaAmbientOrbitAt` — documented in `src/engine/gizaCamera.ts:44-53`, `WorldScene.ts:88-94,164-170`, Spec 02 §Camera, and Spec 05 §Home. Speed scales wall-clock advance only (`src/store/playback.ts:76`; Spec 02 §Normalized time).

**4. Scheduling — PASS** (verified arithmetically). 5,372 blocks (khufu 2,608 / khafre 2,132 / menkaure 632 — inside the 4,000–8,000 budget). Slot = 0.82/5372 ≈ 0.0001527; duration = 20 slots ≈ 0.003053; starts tile [0.085, 0.905] exactly; last block ends at t ≈ 0.9079, before the 0.92 reveal. Max concurrency is 20 ≤ the 24-active-stone budget (Spec 03); `lane = index % 24` recurs every 24 slots > 20-slot duration, so same-lane temporal overlap is impossible. Course ordering is bottom-up (generation order ⇒ monotone starts per monument). Core-fill readiness `readyAt = courseStart + (nextCourseStart − courseStart)·progress·0.94` never precedes its course's first block start (`gizaConstruction.ts:173-181,207`). Monument schedule boundaries (khufu ≈ 0.483, khafre ≈ 0.808) align with the camera target handoffs at 0.5–0.58 and 0.8–0.86 (`WorldScene.ts:64-77`) — co-authored and consistent.

**5. Camera math — PASS.** Cinematic pitch envelope: desktop [16°, 29°] matches Spec 02's ~16°/~29°; mobile [16.5°, 26.5°] sits inside the envelope and the 42° FOV. Minima fall exactly at t = 0.12 and 0.92 (`phaseT: 0.12, period: 0.8`, `gizaCamera.ts:22,37-41`); maximum at t = 0.52 mid-build. The ambient orbit's azimuth is linear and unbounded (no modulo ⇒ no snap) and pitch is sinusoidal in elapsed; both are continuous everywhere, and the 100 s turn vs 80 s wave produce no discontinuity (combined pattern period 400 s). `tests/giza-camera.test.ts` verifies envelope, minima timing, full-turn closure, and < 0.05 rad step continuity across loop boundaries.

**6. Speed/tick logic — PASS.** `tick` multiplies `deltaMs` by `speed`, clamps, completes exactly at t ≥ 1, and no-ops unless playing (`playback.ts:74-80`). `seek` clamps and converts complete→paused, resumable via `play()` (`playback.ts:62-65`). `replay()` restarts from any status. `setSpeed` validates against `PLAYBACK_SPEEDS` and throws otherwise; it takes effect on the next tick with no `t` discontinuity. Both tick callers clamp frame delta (ThreeCanvas.tsx:33 to [0, 100] ms ⇒ ≤ 400 ms movie time per frame at 4×; IsoCanvas.tsx:480 upper-bounds at 100 ms).

## Findings (all note-level; nothing critical, major, or minor-blocking)

1. **note** — `play()` from `complete` is a no-op (`playback.ts:57-60`); recovery is `replay()` or `seek()`. Matches the state machine and Spec 05's "replay button when `status === 'complete'`". Intended.
2. **note** — `select()` resets `t`/status but preserves `speed` (`playback.ts:49-54`). Speed behaves as a cross-wonder user preference; spec is silent. Consistent either way.
3. **note** — `seek(1)` while playing leaves status `playing` until the next tick flips to `complete` (`playback.ts:62-65,74-80`). One-frame lag, harmless.
4. **note** — `tick` does not guard against negative `deltaMs` (`playback.ts:76`); both current callers supply ≥ 0 (RAF timestamps are monotonic; ThreeCanvas additionally clamps with `Math.max(0, …)`). A defensive clamp in the store would make playback monotonicity caller-independent.
5. **note** — The boat doc comment "no hull reaches a ribbon end within one movie even at 4×" (`gizaEnvironment.ts:148-153`) is trivially true: kinematics are `t`-domain, so the speed multiplier cannot extend travel. The wording could mislead a reader into thinking distance scales with speed; the wrap is indeed only a safety net.
6. **note** — `WorldScene.ts:59` hardcodes the cinematic azimuth origin `0.56` and turns `1.25` instead of importing `GIZA_CAMERA.startAzimuth` (`gizaCamera.ts:24`). Duplicated constant; editing one side would silently desync cinematic/ambient start alignment.
7. **note** — The documented wall-clock exception strictly names the ambient *orbit*, but ambient mode has a second wall-clock consumer: `daylightT = 0.79 + sin(ambientElapsed/55_000)·0.035` (`ThreeCanvas.tsx:40`). It is part of the same documented ambient hero mode (Spec 05 §Home "slow day cycle") and confined to `mode === 'ambient'`, so it is within the exception's spirit — worth recording explicitly.

## Verdict

The engine layer is sound. Purity and determinism hold without exception: no forbidden imports, no runtime `Math.random`, all randomness seeded through `mulberry32`, and every animated quantity — including the new boat kinematics and the cinematic pitch wave — is a pure function of normalized playback `t`, with the ambient homepage orbit (and its daylight breathing) as the sole, well-documented wall-clock mode. The Giza schedule tiles the build span with bounded 20-stone concurrency inside the 24-lane budget, bottom-up course ordering, and core-fill readiness that never precedes its course; the camera stays inside its documented pitch envelope with exact minima timing and a snap-free ambient loop; and the 1×/2×/4× speed multiplier correctly scales wall-clock advance only, with clean seek/replay/setSpeed semantics. `npm run test` (190/190) and `npm run typecheck` are green. The seven notes above are documentation/robustness nits, none of which break determinism, purity, or the time model.