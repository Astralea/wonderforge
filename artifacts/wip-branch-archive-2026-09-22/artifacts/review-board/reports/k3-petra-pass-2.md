# Visual Director Review — Petra First Typed World (Pass 2)

**Reviewer:** Visual Director (Read-Only Review Board)  
**Scene:** `#/debug/wonder/petra/<t>` & `#/wonder/petra` (typed `petra-reference`, Spec 11)  
**Artifacts Evaluated:** `artifacts/petra-pass-2/desktop-012` through `desktop-10`, `mobile-058`, `cinematic`, and comparative reference `artifacts/petra-pass-1/desktop-10`.  
**Verdict:** **BLOCK**

---

## Executive Summary & Diagnostic Health

Pass 2 succeeds at technical plumbing and camera positioning:
- Every JSON (`desktop-012.json` through `desktop-10.json`, `mobile-058.json`, `cinematic/desktop.json`) confirms `diagnostics.scene === "petra-reference"`.
- Zero console errors and zero page errors across all captures.
- Renderer budgets are well within limits: desktop 32–59 draw calls / 21.5k–30.2k triangles / 20 geometries / 16 textures (budget: ≤300 calls / ≤750k tris); mobile 46 calls / 30.2k triangles (budget: ≤150 calls / ≤300k tris).
- The camera fix from Pass 1 is verified: the reveal camera no longer clips inside the east Siq wall (contrast `artifacts/petra-pass-1/desktop-10/desktop.png` with `artifacts/petra-pass-2/desktop-10/desktop.png`).

However, **the visual presentation is completely non-viable as a production scene**. The sky is 100% missing (rendering as a pitch-black void), the surrounding mountain massif into which Petra is supposedly carved does not exist, the facade is an unadorned collection of disconnected toy-like primitive boxes, spoil removal reads as dismantling a stack of giant orange shipping containers, and sleds levitate in mid-air without timber supports.

---

## Core Brief Inquiries

### 1. Does the movie read as carving a cliff, or as stacking orange boxes?
**Finding: It reads as dismantling a giant stack of orange toy boxes.**  
Evidence: `artifacts/petra-pass-2/desktop-012/desktop.png`, `artifacts/petra-pass-2/desktop-032/desktop.png`, `artifacts/petra-pass-2/desktop-058/desktop.png`.  
The initial state is a uniform, monolithic 6×7 grid of identical rectangular orange blocks. There is no surrounding bedrock, mountain crest, or rock face. As `t` advances, the orange cubes simply disappear or translate away. A viewer has no indication that a monument is being *released from living sandstone*—it looks like modular building blocks being disassembled in an empty dark chamber.

### 2. Is a dry blue sky actually visible, or is this a black studio?
**Finding: It is an unlit black studio void.**  
Evidence: `artifacts/petra-pass-2/desktop-012/desktop.png`, `artifacts/petra-pass-2/desktop-032/desktop.png`, `artifacts/petra-pass-2/desktop-058/desktop.png`, `artifacts/petra-pass-2/desktop-078/desktop.png`, `artifacts/petra-pass-2/desktop-092/desktop.png`, `artifacts/petra-pass-2/desktop-10/desktop.png`, `artifacts/petra-pass-2/mobile-058/mobile.png`, `artifacts/petra-pass-2/cinematic/desktop.png`.  
Spec 11 mandates: *"Petra owns a typed Wadi Musa / rift-margin sky: a dry blue zenith, a warm sandstone-bounce horizon, thin high cloud... a readable strip of blue must survive above the massif and in the gorge slot."* In every capture, the entire background and upper frame is pure `#000000` pitch black. The mean luminance is crushed (10.9 to 26.1). There is zero sky dome, zero daylight, and zero ambient environmental bounce.

### 3. Are remaining-rock members (columns, tholos, urn) readable by t=1?
**Finding: They are recognizable only as coarse geometric placeholder primitives, not architectural carving.**  
Evidence: `artifacts/petra-pass-2/desktop-092/desktop.png`, `artifacts/petra-pass-2/desktop-10/desktop.png`.  
At $t=1.0$, the Treasury silhouette is present in wireframe/primitive terms, but:
- The tholos is two thin square posts holding a triangular roof prism over a plain rectangular plinth.
- The broken pediment wings are raw tilted parallelepipeds hovering in space with visible air gaps separating them from adjacent members.
- The side attic aediculae are flat detached slabs.
- The urn at the apex is a tiny raw cone.
- The columns are featureless cylinders without capitals (no Corinthian/Nabataean floral motifs), bases, or entasis.
- Crucially, the entire facade is freestanding in a black void with no parent cliff connecting the sides or top.

### 4. Do moving spoil cells look supported (bench/chute/sled) or floating?
**Finding: Spoil cells and sleds visibly float in mid-air.**  
Evidence: `artifacts/petra-pass-2/desktop-058/desktop.png`, `artifacts/petra-pass-2/mobile-058/mobile.png`.  
At $t=0.58$, two loaded sleds (rectangular blocks on thin wood plates with runner skids) hover high in mid-air on the left and right flanks with no ground, timber scaffolding, trestles, or chutes beneath them. No descending timber benches, ropes, or spoil baskets exist. Cells translate in free space.

### 5. Human yardstick: do crews read as people?
**Finding: Crews read as abstract peg dolls / board game pawns, completely decoupled from the scale of the work.**  
Evidence: `artifacts/petra-pass-2/desktop-058/desktop.png`, `artifacts/petra-pass-2/mobile-058/mobile.png`.  
Workers are white conical/cylindrical shapes with brown spherical heads. They possess no limbs, tools, picks, or ropes. Two stand motionless on top of a 5m cube at $t=0.58$, and others stand beside floating sleds. Because the spoil cells are massive monolithic blocks, the tiny peg dolls make the excavation look physically impossible rather than conveying authentic Nabataean rock-carving craftsmanship.

---

## Visual Scorecard (Spec 04 Standard)

Scored on the 0–3 board scale (0 = failing/absent, 1 = severely deficient, 2 = acceptable/borderline, 3 = production quality). Mapped to Spec 04 release gate (0–5 scale: requires $\ge 4$ on all axes, causality must be 5).

| Axis | Board (0–3) | Mapped (0–5) | Scorecard Notes & Evidence |
|---|---|---|---|
| **Composition** | 1 | 1.7 | Camera stays in the Siq corridor without clipping walls (`desktop-10.png`), but framing looks straight into an unlit black box. Flank walls are flat black bars (`desktop-012.png`). Mobile framing (`mobile-058.png`) is similarly an empty black chamber. |
| **Silhouette** | 1 | 1.7 | Coarse outline of Al-Khazneh exists by $t=1.0$ (`desktop-10.png`), but reads as disconnected toy blocks in space. Early/mid silhouette is a solid wall of shipping containers (`desktop-012.png`, `desktop-032.png`). |
| **Construction Causality** | 0 | 0.0 | Fails Spec 11 subtractive contract. No rock face is carved; giant orange cubes simply vanish. Sleds levitate in air at $t=0.58$ (`desktop-058.png`, `mobile-058.png`). No timber benches, chutes, or lowering rigs exist. |
| **Material Readability** | 0 | 0.0 | Uniform matte orange across all members (`desktop-10.png`). No sandstone strata, dressed vs quarry contrast, or timber grain. |
| **Lighting** | 0 | 0.0 | 100% black sky background (`desktop-012.png` to `desktop-10.png`). No dawn-to-dusk sun arc, no rift sky dome, no ambient gorge bounce. Mean luminance crushed (10.9–26.1). |
| **Environment Depth** | 0 | 0.0 | Total void. No massif crown, no canyon depth, no wadi floor, no distant landscape (`desktop-10.png`). |
| **Motion Clarity** | 1 | 1.7 | Spoil cells progress top-down across capture timestamps, but mid-air levitation and lack of physical support mechanisms break motion plausibility. |
| **UI Restraint** | 3 | 5.0 | Title overlay in `artifacts/petra-pass-2/cinematic/desktop.png` ("PETRA / MA'AN, JORDAN · CLASSICAL ERA · C. 100 BC") is cleanly styled and compliant with Spec 05. Debug frames remain full-bleed. |
| **Total** | **6 / 24** | **15.1 / 40** | **Fails all visual quality gates.** |

---

## Detailed Findings (Severity-Ranked)

### F1 — BLOCKING: Complete Absence of Sky Dome and Environment (Black Void)
- **Citations:** `artifacts/petra-pass-2/desktop-012/desktop.png`, `artifacts/petra-pass-2/desktop-032/desktop.png`, `artifacts/petra-pass-2/desktop-058/desktop.png`, `artifacts/petra-pass-2/desktop-078/desktop.png`, `artifacts/petra-pass-2/desktop-092/desktop.png`, `artifacts/petra-pass-2/desktop-10/desktop.png`, `artifacts/petra-pass-2/mobile-058/mobile.png`, `artifacts/petra-pass-2/cinematic/desktop.png`.
- **Analysis:** Spec 11 explicitly designates the sky as a primary subject ("dry rift sky `#6fa3c8`" with zenith gradient, warm horizon bounce, and thin cloud). In Pass 2, no sky dome is instantiated or illuminated. The background is `#000000`, making the scene look like a broken prototype running inside a black void.

### F2 — BLOCKING: Missing Sandstone Massif / Cliff Context (Freestanding Primitives)
- **Citations:** `artifacts/petra-pass-2/desktop-092/desktop.png`, `artifacts/petra-pass-2/desktop-10/desktop.png`.
- **Analysis:** Al-Khazneh is a rock-cut facade carved *into* the sandstone mountain of Jabal al-Khubtha. In Pass 2, there is no cliff geometry surrounding or behind the monument. The facade stands completely freestanding in empty space. The fundamental subtractive storytelling—that the monument is emerging from living rock—is completely lost.

### F3 — BLOCKING: Facade Geometry Consists of Raw Disconnected Toy Blocks
- **Citations:** `artifacts/petra-pass-2/desktop-058/desktop.png`, `artifacts/petra-pass-2/desktop-078/desktop.png`, `artifacts/petra-pass-2/desktop-092/desktop.png`, `artifacts/petra-pass-2/desktop-10/desktop.png`, `artifacts/petra-pass-2/mobile-058/mobile.png`.
- **Analysis:** The remaining-rock members are uncarved primitive boxes:
  - Broken pediment wings are tilted rectangular blocks with open air gaps behind and around them (`desktop-078.png`).
  - The tholos is two vertical square sticks holding a triangle on a box (`desktop-092.png`).
  - Columns are bare cylinders with no capitals or bases (`desktop-10.png`).
  - The urn is a raw cone (`desktop-10.png`).

### F4 — BLOCKING: Spoil Cells and Sleds Levitate Without Support Geometry
- **Citations:** `artifacts/petra-pass-2/desktop-058/desktop.png`, `artifacts/petra-pass-2/mobile-058/mobile.png`.
- **Analysis:** At $t=0.58$, spoil blocks loaded on sleds float in the air at $y \approx 10\text{--}15\,\text{m}$ on either flank. No timber scaffolds, inclined chutes, or lowering ropes connect them to the ground or working face. This violates Spec 11 §Subtractive physical contract.

### F5 — MAJOR: Monochromatic Dark Palette and Flat Materials
- **Citations:** `artifacts/petra-pass-2/desktop-012/desktop.png` through `desktop-10/desktop.png`.
- **Analysis:** The scene uses a flat, muddy orange/brown tone with zero texture detail, zero rock stratification, zero tool-mark variation, and no warm sunlit vs shaded contrast. Luminance is crushed to near-black levels (mean 10.9 at $t=1.0$).

---

## Action Items for Pass 3

1. **Implement and light the Rift Sky Dome:** Bind a true sky dome with the Spec 11 palette (`#6fa3c8` dry rift zenith, warm sandstone horizon gradient, raking sun).
2. **Surround Facade with Sandstone Massif & Siq Gorge:** Model the cliff face of Jabal al-Khubtha into which the facade is inset, with flanking canyon walls and upper mountain crown.
3. **Refine Architectural Carvings:** Replace raw box primitives with proper Hellenistic/Nabataean architectural profiles (fluted/detailed columns, floral capitals, moulded pediment cornices, sculpted tholos, properly shaped urn).
4. **Build the Timber Work Systems:** Draw hanging timber benches, vertical guide ropes, side spoil chutes, and ground sled tracks so traveling spoil cells never float in open air.
5. **Enrich Materials and Strata:** Apply stratified rock textures, chisel marks on freshly cut surfaces, and distinct timber materials.

---

## Final Verdict

**BLOCK.**  
While renderer performance and runtime diagnostics are healthy and Pass 1's wall-clipping bug was eliminated, Pass 2 is an untextured, unlit collection of block primitives in a pitch-black void. It cannot be shipped in this state.
