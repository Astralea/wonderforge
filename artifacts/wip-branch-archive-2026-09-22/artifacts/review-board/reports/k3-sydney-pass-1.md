# Visual Director Review — Sydney Opera House First Typed World (Pass 1)

**Reviewer:** Visual Director (Read-Only Review Board, K3)
**Scene:** `#/debug/wonder/sydney-opera-house/<t>` (typed `sydney-opera-house-reference`, Spec 13). ID `sydney-opera-house` preserved unchanged.
**Artifacts Evaluated:** `artifacts/sydney-pass-1/desktop-012` … `desktop-10` (t = 0.12, 0.32, 0.58, 0.78, 0.92, 1.0) plus `mobile-058` and `mobile-10`. PNGs viewed first, without implementation rationale; matching JSONs then skimmed for `diagnostics.scene`, errors, and budgets. Specs crossed: 04, 13.
**Verdict:** **BLOCK — pass 2 required** (five fixable visual/physical defects; construction core is sound).

---

## Executive Summary & Diagnostic Health

The pipeline plumbing is healthy on this pass:

- All 8 JSONs confirm `result.diagnostics.scene === "sydney-opera-house-reference"`; a nonblank legacy fallback would have failed the migration per Spec 04.
- Zero console errors and zero page errors across all 8 captures; every result `ok: true`, reason `nonblank`.
- Render budgets green: desktop 65–86 calls / 35.4k–51.1k triangles / 25 geometries / 16 textures (limits ≤300 calls / ≤750k tris); mobile 33–57 calls / 41.2k–47.9k triangles / 24–25 geometries / 5 textures (limits ≤150 / ≤300k). No software rendering (Apple M2 Ultra Metal).
- The construction spine reads correctly in stills: bare point at t=0.12 → granite/tan podium deck at t=0.32 with no sails → rib posts and a hoisting sail section on a visible crane rope at t=0.58 → nested shell groups on the podium at t=0.78 — consistent with Spec 13's "podium seats before any sail skin" and the `cast → … → seated` graph.
- Night reveal lands: lit cream shells and a warm glowing podium on cobalt (not black) water at t=1.0. Dawn → dusk → night arc reads; warm low sun at 0.78, pink horizon band behind the bridge at 0.92.
- Mobile portrait keeps the podium plus one crane in frame with no visible sky-dome or terrain-grid edge.

However, **the physical world around the monument fails plausibility**: a massive unlit black landmass floats above the water on the east/right of frame in every capture, a second tan shore slab floats mid-harbour, the Harbour Bridge is a row of disconnected floating dashes, and one half-shell sits sunk into the terrain off the podium among the fig trees. The mature sails carry no chevron tile identity — smooth mounds with brown smudge patches — which Spec 13 forbids by name ("never a smooth CAD blob"). Both crane goalposts remain standing in the t=1.0 reveal.

---

## Core Brief Inquiries

### 1. Does the movie read as Utzon sails assembling on Bennelong Point, or as boxes on a brown table?
**Finding: Mixed — the build reads, the ground does not.**
Evidence: `artifacts/sydney-pass-1/desktop-012/desktop.png`, `desktop-032/desktop.png`, `desktop-058/desktop.png`, `desktop-078/desktop.png`, `desktop-10/desktop.png`.
From t=0.32 onward the podium, rib posts, hoisting sail, and orange crews read as purposeful assembly on a point. But the peninsula is a flat brown plate with chamfered diorama edges, the offshore black slab and floating tan slab make the setting read as a model tabletop, and at night the lit site is a warm island cut off from any credible shore. Fix the land/water and this fully flips to "sails on Bennelong Point".

### 2. Is the Harbour Bridge western backdrop, Farm Cove water, and Circular Quay readable, or is the monument stranded?
**Finding: Anchors are present, backdrop is broken — the monument is partially stranded, worst at night.**
Evidence: `desktop-012`, `desktop-032`, `desktop-058`, `desktop-078`, `desktop-092`, `desktop-10` (all desktop PNGs); `mobile-058/mobile.png`, `mobile-10/mobile.png`.
The bridge sits west per spec and never blocks frame one — placement correct — but its arch is a row of separated floating dark cubes with air beneath each segment, and its deck slab floats above the waterline at the far shore. Water fills the harbour. Crate rows and sheds-like boxes sit south/on the point. But the eastern offshore mass renders as a floating pure-black void in every frame, replacing the "distant north shore" layer with a hole. At t=1.0 the bridge drops to black dashes and the black slab cuts directly behind the hero shells, so the night backdrop collapses.

### 3. During BUILD (t=0.32, 0.58, 0.78): podium first, then ribs, then tile skins on a crane rope — supported or floating? Orange crews working?
**Finding: Sequencing correct and mostly supported; hoist rope visible; one staging violation.**
Evidence: `desktop-032/desktop.png`, `desktop-058/desktop.png`, `mobile-058/mobile.png`, `desktop-078/desktop.png`.
- t=0.32: podium deck seated, zero sail geometry — correct.
- t=0.58: blue-grey ground-rooted falsework posts on the podium, red-topped, and a white rib/sail assembly rising beside the right mast with a visible hoist cable descending from the jib toward the part — Spec 13's "a visible cable joins jib tip to the part" reads in frame. Nothing structural observed floating.
- t=0.78: two large nested shells stand on the podium with posts at their feet.
- **Violation:** a separate half-shell bowl rests on the bare terrain front-left of the podium among the fig trees at t=0.78 and t=1.0, its rim intersecting grade (reads as buried) rather than staged on the podium working floor as Spec 13 requires of `staged` parts.
- Orange crews: visible orange figures on the ground near the trees (t=0.32, 0.58) and red/orange cradles atop posts (t=0.58) — present and dispersed, never a chorus ring around a sail. Gait/job binding cannot be verified from stills.

### 4. Do the sails read as nested spherical sections, or as random white wedges?
**Finding: Nesting reads by t=0.78; the chevron signature is missing at every frame.**
Evidence: `desktop-058/desktop.png`, `desktop-078/desktop.png`, `desktop-092/desktop.png`, `desktop-10/desktop.png`.
At t=0.58 the partial sail is a white shard with a spiky rib fringe — acceptable mid-build. By t=0.78–1.0 the big-plus-small nested group is legible as the Opera House shell cluster. But the mature shells are smooth cream mounds decorated with irregular brown smudge patches and small grey rectangles that at t=0.78/0.92 read as grime and face-like marks, not Höganäs chevron fields. Spec 13 names the risk explicitly: "Tile chevrons are the signature, never a smooth CAD blob." Currently: smooth blobs.

### 5. Night reveal (t=0.92, 1.0): lit house on dark water, or a black void?
**Finding: The reveal itself works — lit house on readable dark water — but is framed by a standing building site and a floating black void behind.**
Evidence: `desktop-092/desktop.png`, `desktop-10/desktop.png`, `mobile-10/mobile.png`.
At t=1.0 the shells glow warm cream, the podium emits warm light, sky is deep navy, water is cobalt — never crushed to black. Luminance p5/p95 of 2.0/63.5 is night-appropriate. Two problems: (a) the floating black landmass sits directly behind the shells as a void shelf with blue water visible beneath it (especially `mobile-10`); (b) both tower-crane masts plus crossbar and cables remain standing, framing the finished house like goalposts. Spec 04 expects falsework to strike after tiles seat; the completion frame still shows a site.

### 6. Portrait: does mobile keep the podium and one crane without a sky-dome edge?
**Finding: Yes — framing contract met.**
Evidence: `mobile-058/mobile.png`, `mobile-10/mobile.png`.
Podium centered, right crane fully in frame, hero shells inside the upper two-thirds, far-shore band and sky gradient reach the frame edges without exposing a dome or terrain-grid boundary. Minor: at t=1.0 roughly the bottom 40% is dead water/terrain space, and the floating black slab behind the shells is *more* conspicuous in portrait than on desktop.

---

## Visual Scorecard (Spec 04 Standard)

Scored on the 0–3 board scale per the Tier 4 P4 amendment; mapped ×5/3 onto the Spec 04 0–5 gate (floor 2.4 on all axes, causality must be 3).

| Axis | Board (0–3) | Mapped (0–5) | Scorecard Notes & Evidence |
|---|---|---|---|
| **Composition** | 2 | 3.3 | Layered foreground/midground/background and centered hero on both viewports (`desktop-058`, `mobile-058`); but the floating black slab dominates the upper-right of four desktop frames, and `mobile-10` parks the hero over ~40% dead space. |
| **Silhouette** | 2 | 3.3 | Nested shell cluster is identifiable as the Opera House from t=0.78 and reads well lit at t=1.0 (`desktop-10`); spiky rib fringe during build is honest partial state. Silhouette is cut by the black void shelf behind it and by crane goalposts at completion. |
| **Construction Causality** | 2 | 3.3 | Podium-first sequencing, ground-rooted falsework, visible hoist rope at t=0.58, dispersed crews — all read correctly. But the off-podium half-shell sunk in terrain among figure trees (`desktop-078`, `desktop-10`) violates the staging contract, and stills cannot verify the `staged`/`hoisted` probe claims. Causality gate requires 3. |
| **Material Readability** | 1 | 1.7 | No chevron tile fields at any frame — smooth shells with brown smudge patches (`desktop-092`, `desktop-10`); flat uniform water; an unlit pure-black material on the offshore mass; podium granite/tile distinction weak. Spec 13 forbids the CAD-blob outcome by name. |
| **Lighting** | 2 | 3.3 | Dawn→dusk→night arc, warm t=0.78, pink horizon at t=0.92, lit shells at t=1.0 all work; nothing globally crushed or blown (p95 ≤ 112.2). One localized crushed-black mass (the floating landmass) in every frame. |
| **Environment Depth** | 1 | 1.7 | All layers exist on paper — water, point, quay boxes, far shore, bridge, sky — but two shore masses float above the water and the bridge is disconnected dashes, so depth cues contradict each other (`desktop-012`, `desktop-058`, `mobile-10`). |
| **Motion Clarity** | 2 | 3.3 | Frame-to-frame progression of podium → ribs → shells is legible, and the hoisting part + rope at t=0.58 reads as an active operation. Kinematics (vertical climb at staging xz, slew, no chord through masonry) and crew gait cannot be proven from stills. |
| **UI Restraint** | 3 | 5.0 | Chrome-free debug frames on all captures; no overlays, no transport clutter. JSONs confirm the debug route and deterministic seed. |
| **Total** | **15 / 24** | **25.1 / 40** | Fails gate: causality 2 < 3; materials and environment depth 1 < 2.4 floor. |

---

## Detailed Findings (Severity-Ranked)

### F1 — BLOCKING: Floating unlit black landmass east of the point
- **Citations:** every capture — `desktop-012` … `desktop-10`, `mobile-058`, `mobile-10`. Largest and most damaging at `desktop-058`, `desktop-078`, `desktop-092`, `desktop-10`, `mobile-10`.
- **Analysis:** A solid black angular mass (plainly a shore/terrain class object) hovers above the harbour surface with a visible water gap beneath it, spanning the upper-right of frame. It renders pure crushed black under every light state, so it also fails "no crushed blacks". Physically: a shoreline that has no contact with the ground/water plane — a support failure and a lighting failure in one object. At t=1.0 it sits directly behind the lit hero shells, so the single most valuable frame of the movie carries it.

### F2 — BLOCKING: Mid-harbour tan slab floating above the water
- **Citations:** `desktop-012/desktop.png`, `desktop-032/desktop.png`, `desktop-058/desktop.png`.
- **Analysis:** A tan trapezoid slab left-of-centre over the water shows a visible air gap at its edge — it reads as a floating platform, not a shore. Same defect class as F1 (support contact), smaller footprint.

### F3 — MAJOR: Harbour Bridge reads as disconnected floating blocks
- **Citations:** `desktop-012`, `desktop-032`, `desktop-058`, `desktop-078`, `desktop-092` (silhouette dashes against the pink band).
- **Analysis:** The arch is a row of separated dark cubes with air between and beneath them; the deck slab floats above its shore landing. As a completed 1932 structure in the backdrop it should be a continuous iron arch. Placement (west, never a first-frame blocker) is correct — execution is broken.

### F4 — MAJOR: Half-shell seated on terrain off the podium, rim below grade
- **Citations:** `desktop-078/desktop.png`, `desktop-10/desktop.png` (also partially occluded by trees in `mobile-058` era composition).
- **Analysis:** A bowl-shaped shell section rests on the bare point terrain front-left of the podium among the fig trees, tilted, with its rim intersecting the ground plane. Spec 13: "`staged` rests on the podium working floor, never inside a sail volume" — and nothing may be buried. Either this is a staged part in a forbidden location, or scene dressing that reads as a dropped/buried shell. It also crowds the fig-tree cluster (occupancy).

### F5 — MAJOR: Shell tile identity absent — smooth blobs with smudge patches
- **Citations:** `desktop-078/desktop.png`, `desktop-092/desktop.png`, `desktop-10/desktop.png`, `mobile-10/mobile.png`.
- **Analysis:** Mature shells carry no chevron field; instead irregular brown/tan patches and small grey rectangles sit on the shell faces, reading as grime smudges (and at t=0.78/0.92 two grey rectangles give a shell an unintended face-like look). Spec 13's signature — cream/white Höganäs chevron fields readable from the hold — is missing; the forbidden "smooth CAD blob" outcome is what ships at reveal.

### F6 — MODERATE: Crane goalposts still standing in the t=1.0 reveal
- **Citations:** `desktop-10/desktop.png`, `mobile-10/mobile.png`.
- **Analysis:** Both tower masts, crossbar, and cables survive to completion, framing the finished house like a site fence. Spec 04 requires falsework to strike after tiles seat; crane disposition at completion needs the same treatment or a documented intent. As captured, the last frame still says "under construction".

### F7 — MINOR / PROCESS: Capture geometry deviates from Spec 04 acceptance
- **Citations:** `desktop-*/desktop.json` (rect 1280×720), `mobile-*/mobile.json` (rect 390×664, drawingBuffer 526×896).
- **Analysis:** Sydney acceptance requires desktop 1440×900 and mobile 390×844. The pass-1 evidence set is smaller on both axes; acceptable for an interim review, but the acceptance sweep must be recaptured at spec sizes. The brief/README asset-hash chain (`index-BwEX9X92.js`) and the Spec 04 audio-silence clause are not independently verifiable from the PNG/JSON artifacts.

---

## Action Items for Pass 2

1. **Ground and light the eastern offshore landmass (F1).** It must meet the water/ground plane as a continuous shore mesh and respond to the sun — never floating, never crushed black. This is the first thing to fix; it contaminates all eight frames including the reveal.
2. **Ground or remove the mid-harbour tan slab (F2)** using the same shared terrain sampler; no air gap at the waterline.
3. **Rebuild the Harbour Bridge as a connected structure (F3):** continuous arch into the pylons, deck landed at the shore. Keep it western backdrop; consider a lamp-dot or dark-steel silhouette story for the night frames.
4. **Resolve the off-podium half-shell (F4):** stage it on the podium working floor per Spec 13, or delete it; eliminate rim-burial and the fig-tree overlap.
5. **Give the shells their chevron fields (F5):** procedural cream/white tile chevron pattern at final radius, readable from the 300–420 m hold; remove the brown smudge patches and face-like grey rectangles from shell faces.
6. **Strike or justify the cranes at t=1.0 (F6):** completion frame should read as a finished house.
7. **Recapture the acceptance sweep at 1440×900 / 390×844 (F7)** and keep the bundle-hash chain recorded in the artifacts README.

Preserve what works: the podium-first build order, the visible hoist rope at t=0.58, ground-rooted falsework, dispersed orange crews, the dawn-to-night light arc, the lit-house reveal on cobalt water, and the portrait framing discipline. Budgets and determinism evidence are green — pass 2 should spend its effort entirely on environment geometry, materials, and the completion frame.

---

## Final Verdict

**BLOCK — pass 2 required.**
The typed-world migration mechanics are proven (correct `diagnostics.scene`, zero errors, budgets green, construction spine visible and ordered), but the gate fails on construction causality (2 < 3) and the 2.4 floor fails on material readability and environment depth. The floating black landmass, floating shore slab, dashed bridge, buried off-podium shell, and chevron-less smooth shells are all individually fixable; none requires re-architecting the scene graph. Do not commit until pass 2 captures clear the gate.
