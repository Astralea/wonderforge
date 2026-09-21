# K3 — "Floating Stones" Review: Stonehenge Physical-Support Audit

**Reviewer roles:** construction-archaeologist + visual-director (review board, read-only)
**Trigger:** owner report — "some stones seem to be floating"
**Scene:** `#/wonder/stonehenge` (typed `stonehenge-reference` scene, confirmed live in every capture)
**Date basis:** probe re-run + captures from this session; preview at `http://127.0.0.1:5589`

## Method (measure, don't guess)

1. **Engine replay probe** (`/tmp/k3-probe.mts`, run via `vite-node`; no repo files touched). It calls the production `stonehengeConstructionStateAt` for every stone at phase midpoints, reconstructs each stone's true rotated bottom corner from the same YXZ-Euler math the renderer uses, and diffs it against a verbatim copy of the renderer-private `terrainHeight` (`src/render/three/StonehengeEnvironment.ts:32`). Output numbers below are quoted from that run.
2. **Real-GPU debug captures** at the five mandated checkpoints via `scripts/inspect-threejs-canvas.mjs` (Chromium, Apple M2 Ultra Metal, not software-rendered). Every capture reports `diagnostics.scene === "stonehenge-reference"` and zero console/page errors:
   - `artifacts/review-board/reports/k3-floating-stones/desktop-0.12/desktop.png` — 66 calls / 80,176 tris
   - `artifacts/review-board/reports/k3-floating-stones/desktop-0.22/desktop.png` — 75 calls / 83,932 tris
   - `artifacts/review-board/reports/k3-floating-stones/desktop-0.40/desktop.png` — 79 calls / 96,590 tris
   - `artifacts/review-board/reports/k3-floating-stones/desktop-0.66/desktop.png` — 76 calls / 99,738 tris
   - `artifacts/review-board/reports/k3-floating-stones/desktop-0.78/desktop.png` — 86 calls / 126,022 tris
   All within Spec 10 budgets (≤120 calls, ≤180k tris desktop). Companion cinematic evidence: `artifacts/stonehenge-realism-qa/cinematic-caption-022.png`.
3. **Vertical-support chain trace** across data → engine → renderer for Stonehenge, with Giza as the gold-standard counterpart.

**Verdict up front: the owner's report is real and measurable.** Bare stones in the `rough` and `dressed` phases hover up to **+0.46 m** above the turf with no support geometry drawn under them, and hauled uprights sink up to **0.48 m through** the sled deck that is drawn. Both defects trace to one design flaw: a permanent +0.36 m carriage allowance baked into every horizontal pose, paid for by sled geometry that only exists in two of the four horizontal phases.

---

## 1. Spec 04 visual scorecard (0–3 per axis)

| Axis | Score | Evidence |
|---|---|---|
| Composition | 2 | Wide orbit frames read cleanly; monument, route rings, dressing yard, and spoil heaps are all legible at t=0.22/0.66 (`desktop-0.22/desktop.png`, `desktop-0.66/desktop.png`). Docked one point: the dressing yard (where the worst floats live, x≈19–25, z≈67–78) sits at the edge of most checkpoint framings, so the defect is under-surveilled by the authored camera. |
| Lighting | 2 | Dawn-to-dusk sweep works; assembled uprights cast grounding shadows (`desktop-0.66/desktop.png`). Floating stones still cast shadows, but the shadow lands directly under a stone that is shin-deep in air, which sharpens rather than hides the defect at t=0.22. |
| Materials | 2 | Turf/sarsen/bluestone contrast is adequate at distance; no texture-level complaints at capture resolution. Flat ground albedo gives no occlusion cue to forgive the air gaps. |
| Motion / dynamics | 1 | A-frame raises are excellent (taut ropes, heel-arc descent verified healthy, §2 F4). Hauled stones on sleds read correctly. But the rough/dressed population visibly levitates at every checkpoint (2–4 floating stones visible at each of t=0.12/0.22/0.40/0.66/0.78, §2 F1), and hauled uprights are swallowed by their own sled decks (§2 F2). Weight transfer — the core of this axis — is broken whenever no mechanism is drawn. |
| Readability | 1 | Mechanism-bearing phases (sled, skids, A-frame, crib) are self-explanatory. The support labels `source-ground` / `dressing-bed` name infrastructure the renderer never draws, so a viewer sees a 20-ton lintel hovering 0.42 m over grass with workers around it (`desktop-0.22/desktop.png`, trilithon-00-lintel gap +0.377 at (22.331, 75.117)). |
| **Total** | **8 / 15** | |

---

## 2. Findings (severity-ranked, physical claims)

### F1 — CRITICAL: rough/dressed stones float with no support beneath them (label-vs-geometry violation)

**Claim:** During `rough` and `dressed` phases, every horizontal stone rides at a baked-in carriage height of `min(dim0, dim2)/2 + 0.36` m while the work system draws **no** sled, skid, crib, or trestle under it. Support state says `source-ground` / `dressing-bed`; the geometry says open air.

**Root cause chain:**
- `src/engine/stonehengeConstruction.ts:118-120` — `horizontalY(stone) = min(dim0,dim2) * 0.5 + 0.36`. The +0.36 m is a sled-carriage allowance, but it is applied unconditionally to *all* horizontal poses (callers at lines 152 and 197 cover rough/dressed/hauled/positioned).
- `src/render/three/StonehengeWorkSystem.ts:232` — support geometry (`sledDecks`, `sledRunners`) is gated on `hauling || mechanism === 'skids'`; phases 0 (`rough`) and 1 (`dressed`) draw nothing.
- `src/render/three/StonehengeStoneSystem.ts:193-198` — active stones render at raw `state.position`; nothing removes the +0.36.
- `src/engine/stonehengeConstruction.ts:72,251,280` — a `sledLift` field exists on the state and is set to 0.34 for `hauled`, but no consumer ever adds it to the position or subtracts it from the support height. It is dead state (contrast Giza, F2/F5).

**Measured air gaps (stone bottom minus local turf, phase midpoints, probe):**

| Stone class | rough (ph0.5) | dressed (ph1.5) |
|---|---|---|
| trilithon/upright (n=10) | +0.061..+0.154 | +0.079..+0.170 |
| trilithon/lintel (n=5) | +0.391..+0.442 | +0.416..+0.458 |
| outer-sarsen/upright (n=30) | +0.038..+0.137 | +0.058..+0.153 |
| outer-sarsen/lintel (n=30) | +0.351..+0.402 | +0.376..+0.418 |
| bluestone-circle (n=40) | +0.204..+0.343 | +0.178..+0.312 |
| bluestone-horseshoe (n=19) | +0.202..+0.333 | +0.177..+0.302 |
| heel-stone (n=1) | +0.008 | −0.010 (flush, healthy) |

Lintels float worst because their rolled cross-section (`min(dim0,dim2)`) is smallest, so the flat +0.36 dominates. Worst single measurement: **trilithon-02-lintel, +0.458 m at (20.660, 68.478)**, dressed phase.

**Visible at every review checkpoint** (probe enumeration of active no-mechanism stones):
- t=0.12: 2 floating (trilithon-01-upright-a +0.083 @ (21.451, 68.884); trilithon-01-upright-b +0.107 @ (22.254, 69.279))
- t=0.22: 3 floating, incl. **trilithon-00-lintel +0.377 @ (22.331, 75.117)** — a lintel hovering knee-height over turf
- t=0.40: 3 floating (outer-sarsen-uprights 11/12/13, +0.093..+0.119, dressing yard)
- t=0.66: 2 floating (outer-sarsen-lintel-19 +0.376 @ (24.736, 67.975); outer-sarsen-lintel-20 +0.384 @ (18.429, 77.531))
- t=0.78: 4 floating (lintels +0.376/+0.384 again, plus bluestone-circle-28/29 +0.178/+0.193 @ (−65.956, 30.858) / (−66.754, 31.653))

Captures: `desktop-0.22/desktop.png` (lintel at dressing yard), `desktop-0.40/desktop.png` (dressed upright row), `desktop-0.78/desktop.png`.

**Aggravator:** `tests/stonehenge-construction.test.ts:101` hard-codes `turfHeight = min(dim0,dim2)*0.5 + 0.36` as the *expected* value. The contract suite pins the defect; any fix must migrate that test.

### F2 — MAJOR: hauled phase — stone and drawn sled deck disagree by up to half a metre

**Claim:** When sleds *are* drawn, the deck is not under the stone. The renderer invents its own support height instead of using the engine's `sledLift`, so hauled uprights sink through the deck and hauled lintels hover above it.

**Root cause chain:**
- `src/render/three/StonehengeWorkSystem.ts:227` — `supportY = max(0.15, position.y − min(dim0,dim2)*0.5)`, a hard-coded re-derivation; deck top drawn at `supportY + 0.08`-ish (deck centered `supportY − 0.08`, thickness 0.16 → top = `supportY + 0.08` ≈ 0.44).
- Engine state carries `sledLift = 0.34` (`stonehengeConstruction.ts:251,280`) that nobody consumes — compare Giza below (F5).
- Rolled uprights lie on their long axis, so `min(dim0,dim2)` is their small dimension: the renderer thinks the stone bottom is at 0.36 while the true rotated bottom is at 0.15–0.28.

**Measured (probe, hauled phase, deck top = 0.44):**

| Stone | true bottom | vs deck top |
|---|---|---|
| heel-stone | −0.040 | **−0.480 (buried through deck)** |
| outer-sarsen-upright-00 | 0.155 | −0.285 |
| trilithon-00-upright-a | 0.217 | −0.223 |
| bluestone-circle-00 | 0.281 | −0.159 |
| outer-sarsen-lintel-00 | 0.480 | +0.040 (hovering) |
| trilithon-00-lintel | 0.520 | +0.080 (hovering) |

Uprights sinking 0.16–0.48 m through a deck while 6 workers pull taut ropes from `supportY + 0.18` (`StonehengeWorkSystem.ts:392`) is a different flavor of the same disease: support height is re-derived in the renderer instead of flowing from the engine. Workers also stand on hard-coded `groundY = 0.04` (`StonehengeWorkSystem.ts:223,358`), not on terrain.

### F3 — MINOR: route waypoints sit on real turf relief that poses ignore

**Claim:** All nine route waypoints (source/dressing/queue for sarsen-north, bluestone-west, heel-northeast) lie at radii 41.8–105.3, inside the turf-relief band (relief fades in r 24→96, `StonehengeEnvironment.ts:32-38`), and carry **−0.081..+0.085 m** of actual terrain height. The typed waypoint Y values in `src/data/stonehengeConstruction.ts` (0.36–0.72) are never consumed by the pose code, which places everything on the flat `horizontalY`. Effect: ±0.08 m of unaccounted jitter layered on top of F1 at the dressing yard — large enough to turn a +0.04 m graze into a +0.13 m float, or to bury a stone edge. The monument interior itself (r<24) is relief-free, which is why pits and the heel arc are unaffected.

### F4 — HEALTHY (suspects cleared)

- **Heel arc (tilted/raised):** continuous override keeps center-to-heel at half-height; probe shows heels descending monotonically through turf level to authored embed depths (e.g. trilithon-00-upright-a: +0.515 → −0.009 → −1.150 across ph4.1→5.95; turf@pit = 0.000). No float, no pop.
- **Settled/seated stones:** rendered from authored `finalPosition` (`StonehengeStoneSystem.ts:163`); embed depths in data are honored.
- **Instance hygiene:** all mutable InstancedMeshes set `count` per frame with `frustumCulled = false` (`StonehengeStoneSystem.ts:161`); no ghost slots observed in any capture.
- **Heel-stone horizontal phases:** effectively flush (−0.010..+0.008) — it is the one stone whose `min(dim0,dim2)/2` happens to nearly equal its true rolled radius plus allowance. Proof the failure is dimensional, not universal.

### F5 — COUNTERPART CHECK: Giza is clean (the contract Stonehenge lacks)

- `src/engine/construction.ts:146-158` — Giza's engine adds `sledLift` **into the block position** with load/lower ramps (`loaded` eases up, `raised` eases down over the last 18%), so position continuity holds at every phase boundary.
- `src/render/three/WorkerSystem.ts:119-123` — the renderer derives `supportY` from the state and computes `groundY = supportY − state.sledLift`: the crew stands on the road, the sled fills the gap, and the block sits on the sled. One owner of truth (the engine), one consumer contract.
- `tests/construction.test.ts:173-175` pins `position − sledLift − surface` agreement. Stonehenge has the dead field and the mis-pinned test instead.

---

## 3. Cross-scene transfer list

### Stonehenge → Giza (worth porting back)

1. **Per-operation heel-arc purity.** The tilted/raised override computes heel position analytically per operation and keeps butt-to-ground continuity through the whole raise. Giza's `raised` phase ramps sledLift but has no equivalent articulated pivot for its lever-set finale.
2. **Contact-kind state machine** (`contactKind`, `packingFill`, `contactDustAmount` on state, `stonehengeContact.ts`): fine-grained ground-contact semantics (runners vs heel vs face) that Giza's binary `contactDust` could adopt for its seating phase.
3. **Crib-height contract.** `cribHeight = max(0.04, position.y − dim/2 − 0.015)` (`stonehengeConstruction.ts:279`) keeps crib soffit within ~3 cm of the stone, and the hoisted/cribbed phases read correctly in captures (t=0.66/0.78).
4. **Terrain-relief fade discipline.** Relief-free working floor inside r<24 with relief fading in outside keeps monument physics on a level plane (F3 notwithstanding). Giza's plateau is flat by construction; if it ever adds relief, the fade pattern is the right tool.

### Giza → Stonehenge (ranked by leverage on F1/F2)

1. **Engine-owned lift added to position.** Move the +0.36 (or a per-phase `sledLift`) into `state.position` inside the engine with load/lower ramps at phase boundaries, exactly like `construction.ts:146-158`. Rough/dressed then sit at `min(dim0,dim2)/2` on actual ground; hauled sits at ground + sledLift. Fixes F1 outright and gives F2 a single source of truth.
2. **Renderer consumes, never re-derives.** Replace `StonehengeWorkSystem.ts:227`'s hard-coded `supportY` with `groundY = supportY − state.sledLift` per `WorkerSystem.ts:121-123`; deck top lands exactly under the true bottom.
3. **Support-label/geometry contract test.** Adopt the Giza pattern (`construction.test.ts:173-175`): assert for every phase that `position.y − min-dim/2 − supportHeight(mechanism)` ≈ 0 and that `mechanism === 'none'` implies support height 0. This replaces the defect-pinning `stonehenge-construction.test.ts:101`.
4. **Terrain sampling in the engine (or a shared pure module).** F3 disappears if `horizontalY` adds a pure `terrainHeight(x,z)` instead of assuming 0; the renderer-private function should be exported or duplicated into `src/engine/` with a parity test.
5. **Human-yardstick check.** Giza's worker feet track `groundY`; Stonehenge's hard-coded `groundY = 0.04` should follow the same support chain so crews stand on the same surface the sled runs on.

---

## 4. Would a viewer believe the weight?

Partially, and the split is exactly along the defect line. Anything with a drawn mechanism reads heavy: sleds with taut ropes and leaning crews, A-frames with feet planted at the heel, cribs under hoisted lintels at t=0.66/0.78 all sell mass, and the heel-arc descent into the pit is the most physically convincing motion in the scene. What a viewer catches — and what the owner caught — is the bare population: a 20-ton trilithon lintel hovering 0.38–0.46 m over the dressing-yard turf with workers standing next to it and nothing underneath (t=0.22, t=0.66, t=0.78 captures), plus hauled uprights swallowed to their midline by their own sled decks. Because the assembled monument and its shadows are convincing, the floating rough-stock reads as an error rather than a stylization: the scene has trained the viewer to expect support, then withholds it. Fix the support-height ownership (Giza→Stonehenge items 1–3) and the same shadows and crews that currently indict the float will sell the weight instead.

---

*Evidence index: probe `/tmp/k3-probe.mts` (vite-node, this session); captures `artifacts/review-board/reports/k3-floating-stones/desktop-{0.12,0.22,0.40,0.66,0.78}/desktop.{png,json}`; `artifacts/stonehenge-realism-qa/cinematic-caption-022.png`. No source files modified.*
