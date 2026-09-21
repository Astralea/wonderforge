# Visual Director Review — Sydney Opera House Pass 3 (modern plant, panorama, concert score)

**Reviewer:** Visual Director (Read-Only Review Board, K3)
**Scene:** `#/debug/wonder/sydney-opera-house/<t>` (typed `sydney-opera-house-reference`, Spec 13). ID `sydney-opera-house` unchanged.
**Artifacts Evaluated:** `artifacts/sydney-pass-3/{desktop-012,032,058,078,092,10}` + `{mobile-012,058,10}` on the `index-Dxmzxgk-.js` bundle. Nine JSONs audited for `diagnostics.scene`, console/page errors, budgets. Fresh 2–4× zoom crops regenerated for this pass under `artifacts/sydney-pass-3/zoom/` (`012-site`, `032-site`, `058-hoist`, `058-crews`, `078-shells`, `078-goalpost`, `078-wedge`, `092-shells`, `10-shells`, `m012-site`) plus `full-*` half-scale layout frames; pass-2 zooms were NOT reused. Camera schedule and plant inventory cross-read in `src/engine/sydneyCamera.ts` / `src/engine/sydneyPlant.ts`. Giza comparison: `artifacts/giza-keyframes.png`. Preview bundle verified live (`curl http://127.0.0.1:5589/` → `assets/index-Dxmzxgk-.js` = `dist/assets/` = README = HANDOFF). Sydney cue files verified on disk: `public/audio/sydney-opera-house-cinematic.mp3` (~60.0 s) and `sydney-opera-house-ambient-loop.mp3` (~27.0 s) — content not auditioned, per brief.
**Verdict:** **BLOCK — the three pass-3 questions are answered YES, but the Spec 04 materials gate still fails on the carry-over chevron signature plus a new daylight-water grain defect.**

---

## Executive Summary & Diagnostic Health

Pipeline health is green:

- All 9 JSONs: `result.diagnostics.scene === "sydney-opera-house-reference"`; `consoleErrors: []` and `pageErrors: []` on every capture; `ok: true` / `nonblank`. Hardware GL (Apple M2 Ultra Metal; `softwareRendered: false`).
- Budgets green: desktop 58–84 calls / 39.8k–69.3k tris / 27–28 geometries / 16 textures; mobile 39–66 calls / 39.7k–64.3k tris / 5 textures.
- Strike corroborated numerically: calls drop desktop 74→58 and mobile 66→39 between 0.92→1.0.
- Exposure sane: daylight p95 ≤ 121.9, night p5 2.9 with p95 63.4 — nothing crushed or blown.
- Process item carried: captures remain 1280×720 / 390×664 CSS; Spec 04 acceptance geometry is 1440×900 / 390×844 (third pass at sub-spec size).

**Pass-3 camera, verified from source, not from feel:** `src/engine/sydneyCamera.ts` keys radius 528→698 m, pitch 22.8°→20.0°, azimuth 0.06→1.14 rad (~62° east→south) with linear interpolation between keys, look-at y 8→14 m near harbour/podium height. Exactly the Spec 13 hold. Plant kit verified in `src/engine/sydneyPlant.ts`: two `tower-crane`, one `crawler-crane`, three `dozer`, three `dump-truck`.

---

## The Three Pass-3 Questions

### 1. Modern construction — does 0.12/0.32 read as a 1959–1973 jobsite?
**YES, decisively. This is the pass-3 win.** Evidence: `zoom/012-site.png` (2×), `zoom/032-site.png` (2×), `zoom/m012-site.png`, full frames `desktop-012…058`, `mobile-012`.
- Two yellow **lattice** Favelle-style tower masts with black counterweight boxes and luffed jibs stand on the podium footprint at t=0.12 — never grey stick-gantries; the lattice segments read at full frame and unmistakably at zoom.
- A yellow **crawler crane** with a lowered diagonal **lattice boom** and dark tracks sits in the yard; 3–4 yellow/black **dump trucks / dozers** park by the casting shed and crate rows; white tile-pallet stacks dress the apron.
- Podium-first order holds: t=0.32 shows a fully seated jointed granite podium with ground-rooted falsework posts raising and an orange crew figure on deck — zero sail geometry.
- Nothing on screen could be Giza: no sleds, no ramps, no stick gantries; the site reads as marine civil works on a point. Cranes strike by t=1.0 (clean silhouette + call drop).
- Nit carried from pass 2: both tower jibs still span the **completed** shells at t=0.92 — the strike happens in the final beat only (see M3).

### 2. Giza-like panorama — does the hold feel like the plateau ensemble?
**YES on desktop; portrait nits remain.** Evidence: `full-012/032/058/078.png`, `desktop-092/10`, source-verified schedule, `artifacts/giza-keyframes.png` comparison.
- The house occupies ~25–30% of frame width at every desktop beat; water fills ≥50%; the connected bridge, tan far-shore band, and the north-shore tongue all stay in frame — the same composition grammar as Giza's keyframes (monument as jewel inside a layered ensemble), not a mid-shot crop. Pass-2's 300–420 m hold is replaced by 528–698 m, and the move reads correct on screen: the point now sits *in* a harbour.
- The feeling transfers without the geometry being copied: harbour = plateau floor, shores/bridge = horizon layers, sail cluster = pyramid ensemble.
- Portrait: site, both shores, quay, and the full bridge hold at t=0.12; at t=0.58/1.0 the westward orbit crops the bridge to a pylon sliver at the left frame edge (`zoom/half-m058.png`, `zoom/half-m10.png`) — the "Bridge stays in frame" clause is desktop-true, mobile-partial at late beats. Mobile build beats also carry ~45–50% dead water at the bottom of frame.

### 3. Score identity — does the picture support a harbour concert house?
**YES at the reveal.** Evidence: `desktop-10`, `zoom/10-shells.png`, `zoom/half-m10.png`.
- t=1.0 is a lit civic monument on dark royal-blue water: warm glowing nested shells, struck cranes, connected bridge silhouette, moored barges — unambiguously a harbour performing-arts monument, never a quarry. The build beats read as a working harbour civils site *building* that monument, which is the correct prelude. Audio identity per the brief is out of scope; cue files exist on disk (cinematic ~60.0 s, ambient ~27.0 s).
- Detractor: at night the shell surfaces carry sparse lit **window-like slit/dash rows** (three-window column on the right shell) instead of the named tile signature, which pulls the read slightly toward "apartment facade" under magnification (B1).

---

## Carry-Over Re-Check (pass-2 verdicts re-derived from pass-3 frames — not rubber-stamped)

| Pass-2 Item | Pass-3 Verdict | Evidence |
|---|---|---|
| B1/F5 Chevron signature absent | **STILL BLOCKING** | `zoom/078-shells.png`, `zoom/092-shells.png`, `zoom/10-shells.png`, `zoom/078-goalpost.png`: shells remain smooth cream forms; the only surface articulation is faint diagonal striations at the crowns and isolated dark slits/dot rows. No V-chevron field reads at the (now wider) 528–698 m hold, desktop or mobile (`zoom/half-m10.png`). Spec 13: "Tile chevrons are the signature, never a smooth CAD blob." Spec 04 acceptance: "Sails must show chevron tile fields, not smooth CAD blobs." |
| F4/M1 apron half-shell off podium at t=0.78 | **NOT RESOLVED — MODERATE** | `zoom/078-wedge.png`: the cream half-shell still stands at grade on the brown apron at the podium's SW foot among trees, beside a white tile pallet — not on the podium working floor. Still attended-looking and gone by 0.92 (`zoom/092-shells.png`), so no contradiction at reveal; the spec-letter violation stands. |
| F6/N1 goalposts over completed shells | **NOT RESOLVED — MODERATE at dusk beat** | `zoom/092-shells.png`, `zoom/078-goalpost.png`: at t=0.92 both yellow masts with **full opposing jibs** still span the finished shells. Strike occurs 0.92→1.0 (clean `desktop-10`, calls 74→58). Pass-2 action item 4 (strike before 0.92) not executed. |
| F7/M2 capture geometry below spec | **STILL OPEN — PROCESS** | All JSONs: 1280×720 / 390×664 CSS (drawing buffer 526×896). Spec: 1440×900 / 390×844. Third consecutive sub-spec sweep. |
| F1/F2/F3 floating mass, shoal slab, dashed bridge | **RESOLVED, stays resolved** | Every frame: grounded shores, connected arch with hangers into pylons, no floating slabs. Shoal now reads as a shallow sand bar (`zoom/032-site.png`) — see N6 for its dusk/portrait prominence. |
| BUILD causality legible | **HOLDS, improved** | `zoom/058-hoist.png`, `zoom/058-crews.png`: white rib on the deck edge with a visible hoist cable from the jib; grey falsework posts carrying station-bound orange crew pairs on cradles; tag figure beside the staged rib; plant yard working. No chorus rings anywhere. |

---

## New Findings This Pass

### W1 — MODERATE (new): daylight water renders as full-frame grain, not a glitter path
**Evidence:** `zoom/012-site.png`, `zoom/058-hoist.png`, `zoom/078-shells.png`, `zoom/m012-site.png` (most legible at zoom, present at full frame in `desktop-012…092`, `mobile-012/058`).
The harbour surface at every daylight/dusk beat carries dense, uniform white speckle with no spatial concentration toward a sun path — at 2–3× it is indistinguishable from analog film grain, and it covers ≥50% of daylight frame real estate at the new wider hold. Night frames are clean (`zoom/10-shells.png`), so the defect is the glitter term's range/intensity, not exposure or compositing. Spec 13 demands "a sun-glitter path, never a flat blue card"; pass 3 avoids the card but overshoots into noise. This is the pass's largest material-readability regression-adjacent item (it was present in pass 2 but materially less dominant at the tighter radius).

### N-bridge-crop — MINOR (new): portrait orbit crops the Bridge at late beats
`zoom/half-m058.png`, `zoom/half-m10.png`: t=0.58 and t=1.0 portrait frames cut the bridge to a pylon sliver at the left edge. Desktop keeps the full arch at every beat. The Spec 04 "Bridge stays in shot" clause therefore fails literally on two mobile beats. A slight portrait radius/azimuth compensation (as portraits already widen radius) would hold the west backdrop.

### Carried nits (do not gate)
- **N2' — bridge approach spans:** deck right end terminates at the pylon with the shoal beneath; arch springs from pylon tops (`zoom/032-site.png`).
- **N3 — zipper foam:** shore foam is a regular tooth/dash border at zoom (`zoom/058-hoist.png` bottom edge); fine at the hold.
- **N4 — shrubs on the working deck:** green blobs sit on the podium apron/deck amid pallets at 0.92 and 1.0 (`zoom/092-shells.png`, `zoom/10-shells.png`).
- **N5 — bare night shore:** the north shore is a featureless dark-brown slope at night (`zoom/half-m10.png`).
- **N6 — shoal prominence:** fine at desktop daylight; reads as a hovering tan mass at dusk and is conspicuous in portrait daylight (`zoom/m012-site.png`).
- **N7 — portrait dead water:** bottom ~45–50% open water at mobile build beats (`zoom/half-m058.png`).

---

## Visual Scorecard (Spec 04, Tier-4 P4 amendment: board 0–3, floor 2.4, causality must be 3)

| Axis | Board (0–3) | Mapped (0–5) | Notes & Evidence |
|---|---|---|---|
| **Composition** | 3 | 5.0 | Jewel-on-the-point ensemble at every desktop beat; layered water → quay/yard → podium/shells → shores/bridge → sky (`desktop-012…10`). Nits: portrait bridge crop at late beats, mobile dead-water bottom half. |
| **Silhouette** | 3 | 5.0 | Nested shell cluster unmistakable from 0.78; clean struck night reveal (`desktop-10`). Nit: crane goalposts cut the completed-house silhouette at the 0.92 dusk beat (`zoom/092-shells.png`). |
| **Construction Causality** | 3 | 5.0 | Podium→falsework→rib-on-rope→skins→strike fully on screen; modern plant is the causal actor (`zoom/058-hoist.png`, `zoom/058-crews.png`, source-verified strike window). Held at 3 with M1's apron-wedge spec-letter violation recorded. |
| **Material Readability** | 2 | 3.3 | **Gate fail (< 2.4 floor).** The named signature (Höganäs chevron fields) is still absent at the hold — smooth shells with isolated slit/dot marks (B1) — and daylight water reads as uniform grain, not a glitter path (W1). Podium joints, yard dress, warm dusk/night values all read well; the two failures sit on the scene's two named surfaces. |
| **Lighting** | 3 | 5.0 | Dawn→day→dusk→night progression clean; day p95 ≤ 121.9, night p5 2.9 / p95 63.4; warm lit reveal; nothing crushed or blown. |
| **Environment Depth** | 3 | 5.0 | Harbour world layers hold at the wider radius: both shores grounded, connected bridge backdrop, far band, boats, shoal, foam-edged point. Nits N2'/N4/N5/N6 carried. |
| **Motion Clarity** | 3 | 5.0 | Beats advance legibly; hoist beat reads on both viewports; strike corroborated by the 74→58 / 66→39 call drop; azimuth demonstrably stays linear from frame one (source: `sydneyCamera.ts`). Kinematics beyond stills remain a contract-test matter. |
| **UI Restraint** | 3 | 5.0 | Chrome-free debug frames throughout; zero console/page errors on all 9 captures. |
| **Total** | **22 / 24** | **36.7 / 40** | Gate fails on one category: materials 2 < 2.4 (mapped 3.3 < 4). Causality gate met (3/3). |

---

## Action Items for Pass 4 (ranked)

1. **Bake the chevron V-field at diorama scale (single highest-leverage fix).** At the new 528–698 m hold, tile-scale marks cannot survive; the sails need bold cream/white V-chevron banding across each shell's field — large-step procedural chevrons plus joint-line relief strong enough to read as *pattern*, replacing today's isolated slit/dot rows that drift window/face-like at night. One well-executed field simultaneously resolves B1, kills the facade-window read, and lifts the material gate above the floor. This is the same named Spec 13 / Spec 04 clause that has now blocked two consecutive passes.
2. **Tame the daylight glitter (W1):** concentrate the sparkle into a sun-path lobe and thin it elsewhere; the night water proves the base shader is fine.
3. **Strike the tower jibs before t=0.92 (M3)** and seat the apron wedge on the podium working floor (M1).
4. **Recapture the acceptance sweep at 1440×900 / 390×844 (M2)** once items 1–2 land; keep the bundle-hash and audio-evidence trail (already good this pass).
5. Portrait nits (bridge crop, dead-water share, shoal prominence): one camera-compensation pass on the portrait schedule.

Preserve from this pass: the yellow modern plant kit exactly as authored (tower lattice, crawler boom, trucks, casting yard), the verified 528–698 m / 20–23° east-opening camera, the podium→rope→skins causal chain with station-bound crews, the crane strike by t=1.0, the lit reveal lighting values, and the grounded shore/bridge ensemble.

---

## Final Verdict

**BLOCK — but only on the carried materials gate.** All three pass-3 brief questions are answered affirmatively and verifiably: the early frames are unambiguously a modern jobsite, the hold is a true harbour panorama in the Giza-ensemble sense (source-checked at 528–698 m / 22.8–20.0°), and the night picture supports the harbour concert-house score. The visual gate still fails because the scene's two named surfaces remain wrong: sails without their chevron signature (second blocked pass on the same clause) and daylight water as grain rather than glitter. Fix the chevron field first — it is the single highest-leverage change; the water calm-down is its fast follower. Do not declare acceptance until B1 lands and the sweep is recaptured at spec geometry.
