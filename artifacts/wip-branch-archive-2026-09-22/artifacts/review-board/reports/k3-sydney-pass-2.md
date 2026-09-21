# Visual Director Review — Sydney Opera House Pass 2 (Civ VI density + score)

**Reviewer:** Visual Director (Read-Only Review Board, K3)
**Scene:** `#/debug/wonder/sydney-opera-house/<t>` (typed `sydney-opera-house-reference`, Spec 13). ID `sydney-opera-house` preserved unchanged.
**Artifacts Evaluated:** `artifacts/sydney-pass-2/desktop-012` … `desktop-10` (t = 0.12, 0.32, 0.58, 0.78, 0.92, 1.0) plus `mobile-012`, `mobile-058`, `mobile-10`. PNGs viewed first, without implementation rationale; then magnified zoom crops (preserved under `artifacts/sydney-pass-2/zoom/`) were made for the hoist rope, crews, chevron fields, bridge connection, and shore contact; matching JSONs audited for `diagnostics.scene`, errors, and budgets. Civ VI presentation reference `artifacts/civ6-sydney-ref/sydney-opera-house-ingame-converted.png` used for density/dressing reading only. Specs crossed: 04, 13. Pass-1 blockers re-checked from `k3-sydney-pass-1.md`, not rubber-stamped.
**Verdict:** **BLOCK — narrow, single signature item.** Five of six pass-1 visual findings are resolved or downgraded; the Höganäs chevron signature (F5) is still not on screen, and the acceptance sweep is not at spec geometry (F7).

---

## Executive Summary & Diagnostic Health

Pipeline health is green again, and richer than pass 1:

- All 9 JSONs confirm `result.diagnostics.scene === "sydney-opera-house-reference"`; zero console errors and zero page errors on every capture; all `ok: true`, reason `nonblank`.
- Render budgets green: desktop 58–82 calls / 37.0k–69.0k triangles / 28 geometries / 16 textures; mobile 32–61 calls / 37.0k–63.1k triangles. No software rendering (Apple M2 Ultra Metal).
- Density is measurably up over pass 1: color buckets 137–186 and entropy 5.25–5.71 bits across daylight frames (pass 1 reported 52 buckets / 3.4 bits at night; this pass's night frames sit at 76–82 buckets / 3.19–3.4 bits with the same night exposure discipline).
- Draw calls and triangle counts drop between t=0.92 and t=1.0 on both viewports (desktop 74→58 calls; mobile 61→32 calls), corroborating the crane strike seen in the frames.
- Night frames are dark but not crushed: t=1.0 desktop luminance mean/p5/p95 = 38.9/2.7/64.2; water stays readable royal blue.

The pass-1 environment blockers (floating black landmass, floating shore slab, dashed bridge) are gone: the world now grounds itself. What remains broken is the one thing Spec 13 itself names as the scene's signature — the chevron tile fields on the mature sails.

---

## Pass-1 Blocker Re-Check

| Pass-1 Finding | Verdict | Evidence |
|---|---|---|
| F1 Floating unlit black landmass east | **RESOLVED** | North shore now meets the water along a continuous grounded coastline with tree cover, at every t and both viewports (`desktop-012`, `desktop-058`, `desktop-10`, `mobile-10`; zoom `zoom/012-shore.png`). Shores read dark brown at night, never the pure-black void of pass 1; blue water never shows through beneath the landmass. |
| F2 Mid-harbour tan slab floating | **RESOLVED (minor note)** | The floating trapezoid is gone. A low tan shoal sits *on* the water plane between the point and the bridge (`zoom/012-bridge3.png`); at dusk its shading makes it hover slightly (`zoom/092-bridge.png`) — acceptable, worth a shading nudge only. The far-shore band meets the water at the horizon line. |
| F3 Harbour Bridge disconnected dashes | **RESOLVED** | The bridge is now a continuous steel arch with vertical hanger rods, sprung between two grounded rectangular pylons, carrying a continuous deck; all members touch (`zoom/012-bridge3.png`, daylight; `zoom/092-bridge.png`, dusk silhouette). At night it remains a connected silhouette. Nits: arch springs from pylon *tops* (stylized), and the deck overhangs past the pylon ends over water with no approach span (`zoom/012-bridge3.png` right pylon). |
| F4 Half-shell sunk in terrain off podium | **PARTIAL — downgraded to MODERATE** | At t=0.78 a cream half-shell wedge still stands *off* the podium working floor, tucked against the podium's front-left corner among the fig trees at grade (`zoom/078-shells.png`). It no longer reads as buried/dropped: a red-clad crew figure and a white tile-pallet stack stand beside it, so the screen read is an attended apron staging patch, and by t=1.0 it is gone — no contradiction at the reveal (`desktop-10`). But Spec 13's letter is unmet: "`staged` rests on the **podium working floor**, never inside a sail volume." The wedge crowds the fig cluster (occupancy nit). |
| F5 Chevron signature absent | **NOT RESOLVED — still BLOCKING** | Mature sails at t=0.78/0.92/1.0 remain smooth cream shells carrying sparse dark dashes and slits (`zoom/078-shells.png`, `zoom/092-shells.png`, `zoom/092-cranes.png`, `zoom/10-shells.png`). Improvement over pass 1: the brown grime smudge patches are gone. But no V-chevron tile field reads from the 300–420 m hold at any frame; at dusk/night, clusters of 2–4 small dashes on one shell still read faintly window/face-like (`zoom/092-cranes.png` right shell; `zoom/10-shells.png` right shell three-dash row). Spec 13: "Tile chevrons are the signature, never a smooth CAD blob." Spec 04 acceptance: "Sails must show chevron tile fields, not smooth CAD blobs." At readable scale the sails are still materially smooth shells with isolated marks. |
| F6 Crane goalposts at completion | **MOSTLY RESOLVED — MINOR residual** | Both masts, crossbar, and cables are gone at t=1.0 on desktop and mobile (`desktop-10`, `mobile-10`; corroborated by the 74→58 / 61→32 call drop). However, at t=0.92 both tower masts and the full crossbar still stand as goalposts over the completed shells (`zoom/092-cranes.png`). Spec 04 has falsework strike after the tiles seat; the shells are visually complete at 0.92, so the strike happens in the last beat only. Tighten the strike window to before 0.92 so the dusk reveal frame is clean too. |
| F7 Capture geometry below spec | **STILL OPEN — PROCESS** | Desktops remain 1280×720 and mobiles 390×664 (spec acceptance: 1440×900 / 390×844). The README/brief bundle-hash chain (`index-Cxwvwe4-.js`) is consistent this pass; the Spec 04 audio clause (Sydney-owned cues) remains non-verifiable from PNG/JSON. Acceptance sweep must be recaptured at spec sizes after the chevron fix. |

---

## Core Brief Inquiries

### 1. Coarse blockout vs Civ VI harbour density: empty boxes on a table, or a place?
**Finding: A place.** Evidence: `desktop-012`, `desktop-032`, `desktop-058`, `zoom/012-bridge2.png`, `zoom/012-shore.png`.
The harbour now reads: glittering blue water with a brightened sun-path region; a grounded north shore with fig trees; a connected Harbour Bridge west; quay sheds, crate stacks and white foam/lap dashes along the point's waterline; multiple barges/boats with cabins and cargo on the water; a far-shore horizon band. Against the Civ VI reference the vignette is still materially sparser — no city fabric behind the quay, thin boat traffic, and a bare brown north-shore field at dusk/night (`desktop-078`, `desktop-092`) — but the reference is not a mesh to copy, and the tabletop reading from pass 1 is gone.

### 2. Höganäs chevrons: tiled V-fields, or smooth CAD blobs?
**Finding: Still smooth shells with isolated marks — the signature is not on screen.** Evidence: `desktop-078`, `desktop-092`, `desktop-10`, `mobile-058`, `mobile-10`; zooms `zoom/078-shells.png`, `zoom/092-shells.png`, `zoom/092-cranes.png`, `zoom/10-shells.png`.
At the 300–420 m hold the mature shells present as clean cream forms carrying a handful of sparse dark dashes/vertical slits — not a field of cream/white V-chevrons. The pass-1 grime smudges are removed and the strongest face-like rectangle pair is gone, so the direction is right; but the named signature (Spec 13 lines 40, 82–83; Spec 04 acceptance line 188) is unmet. This is the single remaining gate failure.

### 3. Harbour Bridge: connected arch?
**Finding: Yes.** Evidence: `zoom/012-bridge3.png` (daylight), `zoom/092-bridge.png` (dusk), `desktop-10` (night silhouette).
Continuous arch, hanger rods, continuous deck, grounded pylons; lands at its shores; never blocks frame one; connected silhouette at night. Two small nits: the arch springs from the pylon tops rather than rising through them, and the deck ends project past each pylon over open water with no approach span (most visible right pylon, daylight).

### 4. North shore / land-water contact: terrain meeting water?
**Finding: Meeting water; grounded at every frame.** Evidence: `zoom/012-shore.png`, `zoom/058-hoist.png` (background), `zoom/092-bridge.png`, `mobile-10`.
No floating slabs remain; shore faces receive light (tan crowns, shaded flanks) and at night read dark brown rather than crushed black against royal-blue water. Contact edges carry white sawtooth lap/foam marks that read well at full frame and only look stair-stepped under 2× magnification. Minor: the dusk/night north shore is a large featureless brown field (N5).

### 5. BUILD causality (0.32, 0.58, 0.78): podium first, ribs, tile skins on a crane rope, orange crews?
**Finding: Yes — the causal chain is now fully legible on screen.**
Evidence: `desktop-032`, `desktop-058`, `zoom/058-hoist.png`, `zoom/058-crews.png`, `desktop-078`.
- t=0.32: podium deck fully seated with slab joints; zero sail geometry; falsework posts beginning.
- t=0.58: a white rib/sail section stands rising beside the red-topped mast with a visible hoist line descending to it from the mast/jib; ground-rooted blue-grey falsework posts of authored lengths with brown caps surround the work (`zoom/058-hoist.png`).
- Orange crews verified under magnification: two helmeted orange figures paired on a post-top cradle, two more on a lower cradle, a ground hand with a trolley by the tile pallets, one at the mast base (`zoom/058-crews.png`). Bound to stations; no chorus ring around any sail.
- t=0.78: nested shells seated on the podium with posts at their feet; crews reduced as the site winds down; the moderate F4 apron wedge is the only staging-letter violation left.
- Stills still cannot prove slew-path/kinematic claims; that remains a contract-test matter, not a screen defect.

### 6. Night reveal (0.92, 1.0): lit house on dark water with cranes struck?
**Finding: t=1.0 yes, fully; t=0.92 lit-house yes, cranes not yet struck.**
Evidence: `desktop-092`, `desktop-10`, `mobile-10`, `zoom/092-cranes.png`, `zoom/10-shells.png`.
t=1.0 is a clean reveal: warm lit cream shells on a glowing podium, navy sky with faint cloud, royal-blue readable water, moored barges, connected dark bridge silhouette — the best frame this scene has produced. At t=0.92 the same dusk reveal still carries both goalpost masts and crossbar. And per F5, the reveal shells are lit *smooth* shells — the night lighting amplifies, rather than hides, the missing chevron field.

### 7. Portrait: podium + one crane, no sky-dome edge?
**Finding: Yes.** Evidence: `mobile-012`, `mobile-058`, `mobile-10`.
Podium centered with mast/crane in frame during build beats, hero shells in the upper two-thirds, sky gradient and shores reaching all frame edges — no dome or terrain-grid boundary exposed at any t. Nit: bottom dead-water share runs ~35–40% at t=0.12/0.58 (less bothersome at 1.0 where the lit podium anchors the middle).

---

## Visual Scorecard (Spec 04 Standard)

Board 0–3 per the Tier 4 P4 amendment; mapped ×5/3 onto the Spec 04 0–5 gate (floor 2.4 board; causality must be 3).

| Axis | Board (0–3) | Mapped (0–5) | Scorecard Notes & Evidence |
|---|---|---|---|
| **Composition** | 3 | 5.0 | Layered boats/quay → podium → bridge/far-shore → sky on both viewports (`desktop-058`, `mobile-058`); reveal frame balanced with shore masses now grounding the right side. Nit: portrait bottom dead water at build beats (`mobile-012`). |
| **Silhouette** | 3 | 5.0 | Nested shell cluster + arch + pylons unmistakable from t=0.78; clean struck reveal (`desktop-10`). Nits: goalposts still cut the 0.92 dusk silhouette; sparse face-ish dash clusters slightly noise the sail outline at dusk. |
| **Construction Causality** | 3 | 5.0 | Podium-first order, ground-rooted falsework, hoisted part on a visible rope, station-bound orange crews, strike by completion — all visible (`desktop-032…10`, `zoom/058-hoist.png`, `zoom/058-crews.png`). Held at 3 with the F4 apron-wedge spec-letter violation recorded as moderate, not a visible contradiction. |
| **Material Readability** | 2 | 3.3 | Water glitter + sun path, grounded lit terrain, jointed podium granite, quay dressing — all improved. But the hero material: mature sails are still smooth shells with sparse dark dashes, no chevron field at the hold (`zoom/078-shells.png`, `zoom/10-shells.png`). Spec 13 names this signature by name; below the 2.4 floor. **Fails gate.** |
| **Lighting** | 3 | 5.0 | Dawn bright (p95 125.2 at 0.32), warm dusk 0.78, pink band 0.92, lit night 1.0 with readable water; nothing globally crushed or blown (day p95 ≤ 128.7, night p5 2.7 with p95 64.2). |
| **Environment Depth** | 3 | 5.0 | Grounded, consistent layers: glitter water, foam-edged point, quay, boats, tree-covered shore, far-shore band, connected bridge, sky (`desktop-012`, `desktop-078`, `mobile-10`). Nits: deck-end overhangs, dusk shoal hover, bare night shore field. |
| **Motion Clarity** | 3 | 5.0 | Beats progress legibly frame-to-frame, including the hoisted-part beat at 0.58 and the crane strike between 0.92→1.0; camera azimuth visibly advances along the east-to-south arc across the sweep. Kinematics unprovable from stills — unchanged caveat. |
| **UI Restraint** | 3 | 5.0 | Chrome-free debug frames throughout; deterministic route; no overlays. |
| **Total** | **23 / 24** | **38.3 / 40** | Gate fails on one item: materials 2 < 2.4 floor (mapped 3.3 < 4). Causality gate met (3). |

---

## Detailed Findings (Severity-Ranked)

### B1 — BLOCKING: Mature sails still ship without the chevron field
- **Citations:** `desktop-078`, `desktop-092`, `desktop-10`, `mobile-058`, `mobile-10`; zooms `zoom/078-shells.png`, `zoom/092-shells.png`, `zoom/092-cranes.png`, `zoom/10-shells.png`.
- **Analysis:** Surface marks are now sparse dark dashes/vertical slits (improvement: pass-1 brown grime removed), but they never aggregate into cream/white V-fields, and at dusk/night one shell's 2–4 dash cluster still reads faintly window/face-like. This is the only named material signature Spec 13 calls out ("Tile chevrons are the signature, never a smooth CAD blob") and the only named sail clause in the Spec 04 Sydney acceptance ("Sails must show chevron tile fields, not smooth CAD blobs"). Everything else on the gate passes; this item alone holds the block.

### M1 — MODERATE: Apron-staged half-shell at t=0.78 off the podium working floor
- **Citations:** `desktop-078`, `zoom/078-shells.png`; resolution visible at `desktop-10`.
- **Analysis:** Not buried anymore and attended by a crew figure + tile pallet, so the visual read is "staging patch at the podium foot," and it clears by reveal. But Spec 13's staging letter is unmet (staged = on the podium working floor) and it crowds the fig cluster. Either seat it up on the apron deck or record intent in the spec.

### M2 — PROCESS: Acceptance sweep still below spec geometry
- **Citations:** `desktop-*/desktop.json` (1280×720), `mobile-*/mobile.json` (390×664).
- **Analysis:** Unchanged from pass 1 (F7). Must be recaptured at 1440×900 / 390×844 for acceptance after B1 lands; keep the bundle-hash chain (this pass: `index-Cxwvwe4-.js`) and add an artifact trail for the Sydney-owned audio cue.

### Minor nits (do not gate; fix opportunistically)
- **N1 — Goalposts at dusk:** both masts + crossbar stand at t=0.92; strike before the dusk reveal (`zoom/092-cranes.png`, calls 74→58 corroborate strike by 1.0).
- **N2 — Bridge deck overhangs:** deck ends project past pylons over open water, no approach span (`zoom/012-bridge3.png`).
- **N3 — Sawtooth waterline:** stair-stepped shore contact with regular foam dashes visible at zoom on the point and shore edges (`zoom/058-hoist.png` background).
- **N4 — Foliage encroaches the deck:** shrubs sit on the podium front apron/deck among work areas (`zoom/058-crews.png`, `zoom/092-cranes.png` front-left).
- **N5 — Bare night shore field:** the north shore reads as a large featureless brown slope at dusk/night; one lit-structure or texture variation would carry it (`desktop-092`, `zoom/10-shells.png` background).
- **N6 — Shoal hover at dusk:** the mid-water tan shoal shades as if hovering at dusk (`zoom/092-bridge.png`).
- **N7 — Portrait dead water:** ~35–40% bottom dead water at mobile build beats (`mobile-012`, `mobile-058`).

---

## Action Items for Pass 3

1. **Deliver the chevron fields (B1):** procedural cream/white Höganäs V-chevron tile pattern at final radius, readable from the 300–420 m hold; eliminate the sparse dash clusters on shell faces at dusk/night. This is the only visual gate between this scene and PASS.
2. **Resolve the apron wedge (M1):** stage it on the podium working floor or amend spec intent; keep clear of the fig cluster.
3. **Recapture at 1440×900 / 390×844 (M2)** with bundle hash and audio-cue evidence recorded in the artifacts README.
4. **Strike goalposts before t=0.92 (N1)** so the dusk reveal frame is as clean as the night one.

Preserve from this pass: the grounded harbour world (shore, shoal, far band), the connected bridge, the glitter water with sun path, the quay/boat dressing density, the podium-first causal chain with visible hoist rope and station-bound crews, the crane strike, the lit-reveal lighting values, and the portrait framing discipline.

---

## Final Verdict

**BLOCK — narrow.** One named signature (chevron tile fields, B1) plus one process item (capture geometry, M2) stand between this scene and the gate; causality clears 3 and all other categories are at the board maximum on this evidence. The pass-2 environment work is real and verified — no floating masses, no dashed bridge, no crushed voids — and should not regress while pass 3 works on the sail surface. Do not commit as acceptance-complete until B1 lands and the spec-geometry sweep is recaptured.
