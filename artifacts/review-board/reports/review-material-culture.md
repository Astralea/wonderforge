Task ID: a55b2042-15ab-46f9-b08a-c81064e6e459
Subagent Type: Worker
Description: Material culture review of props
Status: completed
Duration: 275.4s

I now have all evidence with line numbers. Let me compile the findings report.

Scale calibration: worker ≈ 1.8 world units tall (WorkerSystem.ts: head center y+1.58, radius 0.22 → top ~1.80; body cylinder 0.95 tall at y+0.92). So 1 world unit ≈ 1 m. Good.

Findings:

1. **Minor — hull sheer inverted vs. period practice.** Environment.ts:505-517. Hull vertices put bow/stern at y=0.1 and midships gunwale at y=0.18 — the ends sit *lower* than midships. Egyptian wooden hulls of the Old Kingdom were crescent/papyriform in sheer, with bow and stern rising above midships (often dramatically on reed craft). At diorama distance this is a readability simplification, but the current profile reads slightly "modern flat-bottom punt" rather than Egyptian. Suggest raising the end vertices (e.g., y 0.35-0.5) or a historicalNote.

2. **Minor — rig detail: single pole mast, no lower boom, no steering oars.** Environment.ts:518-521, 571-578 (updateBoats). For 2560 BCE the characteristic rig is a bipod (A-frame) mast with the square sail laced between an upper yard and a lower boom; steering was by one or more large quarter steering oars at the stern — the single most recognizable silhouette feature of OK craft. None of these appear; the sail is also near-square (2.2 × 1.9) where OK sails were typically tall and narrow. All defensible as readability simplification at scene scale; if kept, worth a historicalNote on the sailing-boat entry. Square-vs-lateen — the critical anachronism — is correctly handled (squareSail flag + exclusion + contract test).

3. **Minor — reed-skiff declared cargo 'reed-bundles' is never rendered; skiff renders as a miniature wooden hull.** gizaEnvironment.ts:530-537 declares cargo: 'reed-bundles'; Environment.ts:588 renders cargo only for 'tura-casing-stones', and the skiff shares the wooden hull geometry/materials.wood at 0.55 scale (Environment.ts:533, 549-553). Either render the reed bundles (or set cargo 'none'), and consider a straw-toned material / raised tied ends for the papyrus skiff. Data/render contract mismatch, small.

4. **Note — papyrus/reed beds read as short generic stalks.** gizaEnvironment.ts ecology.reeds ("Papyrus and reed beds", Cyperus papyrus note) vs Environment.ts:385 — cylinders 1.15 tall × height scale 0.65-1.35 → 0.75-1.55 world units (~0.75-1.55 m at worker scale), no umbel heads. Real papyrus stood 2-5 m with distinctive feathery umbels. Simplified for readability; acceptable, but a small umbel tip or taller stalks would sell the species. historicalNote already present, so note-level.

5. **Note — Tura casing cargo has no destination: Khufu is never cased.** gizaConstruction.ts:100-106 materialFor: casing-limestone only for Khafre's upper ~28% of courses; Khufu (the monument the Tura barges supply, per the Merer diary framing in the barge historicalNote) is core-limestone through t=1. Historically Khufu's pyramid was fully sheathed in white Tura casing. Spec 08 only calls out Khafre's surviving casing layer, so this reads as an authored art-direction choice (hero pyramid shows construction core) — but the data carries no historicalNote saying so, and the four-barge Tura traffic implies a casing destination the scene never shows. Note, not a fix demand.

6. **Note — supply "crates" read as modern wooden boxes.** Environment.ts:759, 763: 72 wooden boxes 0.8×0.75×0.8 as settlement supplies. Period containers would be pottery jars, baskets, and sacks; wooden chests existed but the cube-crate read is modern-leaning. Readability simplification; note only.

Also positive verifications (no findings):
- Craft logistics correct: barges drift north with current, sails lowered (squareSail:false); sailboats run south on northerlies under square sail — matches period practice and the data documents it (gizaEnvironment.ts:500-528).
- Cargo matches period: white Tura casing limestone (attested by the Merer/Wadi el-Jarf papyri for Khufu's reign); granite note (Aswan) correct.
- Settlement: mud-brick, flat reed roofs, domed granary silos (cylinder + hemisphere dome, Environment.ts:618-624 — domed granaries attested in OK tomb models), whitewashed riverfront wall (Ineb-Hedj "White Walls"), pylons, obelisks with bright pyramidions; anachronism exclusions incl. lateen-sails, minarets, mosque domes — enforced by contract tests (tests/giza-sky.test.ts:211-212).
- Flora: date palms with tapered trunks, two frond tiers, dead-frond skirts, lean + breeze sway; palms confined to greenbelt (never on plateau); emmer/barley/flax in peret green — species and season correct, peret choice honestly documented (gizaEnvironment.ts:362-375 productionNote).
- Scale sanity: block dims (width ≈1.03-1.42 via segmentLength×0.965, height ≈0.51-0.59, depth 0.88-1.12 — gizaConstruction.ts:120-144) all inside Spec 08 bounds (0.85-1.8 / 0.42-0.72 / 0.75-1.65) and person-scale against ~1.8-unit workers; Menkaure granite lower courses (gizaConstruction.ts:104) match the archaeology of Menkaure's granite casing; Khafre upper casing matches its surviving cap. Total exterior block count ≈ 5,100-5,300, inside the 4,000-8,000 spec band.
- Determinism: all placement via mulberry32 seeds; no Math.random in scope files.

Severity discipline: no critical, no major. 3 minor, 3 note.

Verdict paragraph.

Let me write the final report. I should double check one thing — the cargo float gap I noticed (cargo bottom 0.41 vs deck 0.18). Should I include? It's a rendering polish nit, not meaning-changing; my scope says renderer consumption "only where it changes the meaning of an object". A floating cargo doesn't change meaning. I'll skip it — no, actually, hmm. It's borderline. The role says guard the objects; a visible air gap under cargo blocks is an object-credibility detail. But from the orbit camera the river is 60+ units away; a 0.23-unit gap is sub-pixel. I'll skip it to keep discipline ("no invented findings" — it's real but immaterial). Actually I'll mention it as a one-line note appended to finding 3? No — keep it clean. Skip.

Final answer structure: findings list with severity, evidence file:line, period basis; then verdict paragraph.
Review complete. All scope files read: `src/data/gizaEnvironment.ts`, `src/data/gizaConstruction.ts`, `src/render/three/Environment.ts`, plus `MaterialLibrary.ts` and `WorkerSystem.ts` for material/scale calibration (worker figure ≈ 1.8 world units tall, so 1 unit ≈ 1 m), and Spec 08 as the contract.

# Material Culture Review — Giza, c. 2560 BCE (peret)

## Findings

**[minor] Hull sheer is inverted relative to period practice** — `src/render/three/Environment.ts:505-517`
The shared hull mesh puts bow/stern vertices at y=0.1 and the midships gunwale at y=0.18, so the ends sit *lower* than midships. Old Kingdom wooden hulls were crescent/papyriform in sheer with bow and stern rising above midships — dramatically so on reed craft. At diorama distance this is a readability simplification, but the current silhouette drifts toward a modern flat punt. Raising the end vertices (or a `historicalNote` on the craft entries) would fix or excuse it.

**[minor] Rig detail: single pole mast, no lower boom, no steering oars** — `src/render/three/Environment.ts:518-521, 571-578`
For 2560 BCE the characteristic rig is a bipod (A-frame) mast with the square sail laced between an upper yard *and* a lower boom; steering was by large quarter steering oars — the single most recognizable Old Kingdom boat silhouette. None appear, and the sail is near-square (2.2×1.9, line 518) where OK sails were typically tall and narrow. Defensible as readability simplification at scene scale; if kept, it deserves a `historicalNote` on the `sailing-boat` entry. The critical anachronism is correctly handled: square sails only, `lateen-sails` in `exclusions` (`gizaEnvironment.ts:101, 519`), enforced by contract test (`tests/giza-sky.test.ts:184-212`).

**[minor] Reed-skiff declared cargo `reed-bundles` is never rendered; skiff is a scaled-down wooden hull** — `src/data/gizaEnvironment.ts:530-537` vs `src/render/three/Environment.ts:533, 549-553, 588`
The data declares `cargo: 'reed-bundles'` for the papyrus skiff, but `updateBoats` instantiates cargo only for `tura-casing-stones`, and the skiff shares the wooden hull geometry in `materials.wood` at 0.55 scale. A bundled-papyrus craft should read straw-toned with tied, upturned ends. Either render the declared cargo or set it to `'none'` — a small data/render contract mismatch.

**[note] Papyrus/reed beds render as short generic stalks** — `src/data/gizaEnvironment.ts` (`ecology.reeds`, Cyperus papyrus note) vs `src/render/three/Environment.ts:385, 413-417`
Stalks are 0.75–1.55 units tall with no umbel heads; real papyrus stood 2–5 m with distinctive feathery umbels. Simplified for readability and already carrying a `historicalNote`; a small umbel tip or taller stalks would sell the species. Note only.

**[note] Tura casing cargo has no visible destination — Khufu is never cased** — `src/data/gizaConstruction.ts:100-106`
`materialFor` assigns `casing-limestone` only to Khafre's upper ~28% of courses; the Great Pyramid is `core-limestone` through t=1, while four barges of white Tura casing stone (correctly framed by the Merer-diary practice in the barge `historicalNote`, `gizaEnvironment.ts:500-514`) arrive for it. Historically Khufu was fully sheathed in Tura white. Spec 08 only calls out Khafre's surviving casing, so this reads as authored art direction (hero pyramid shows its construction core) — but the data says so nowhere. Note, not a fix demand.

**[note] Settlement supply "crates" read as modern wooden boxes** — `src/render/three/Environment.ts:759, 763`
72 wooden cubes (0.8×0.75×0.8) as camp supplies. Period containers would be pottery jars, baskets, and sacks; the cube-crate read is modern-leaning. Readability simplification; note only.

## Verified correct (no findings)

- **Craft logistics**: barges drift north with the current, sails lowered (`squareSail: false`); sailboats run south on the prevailing northerlies under square sail — exactly period practice (`gizaEnvironment.ts:500-528`). Cargo matches the era: white Tura casing limestone downstream, Aswan granite correctly attributed to the south.
- **Settlement**: mud-brick massing kept low, flat reed roofs, domed granary silos (cylinder + hemisphere, `Environment.ts:618-624` — domed granaries attested in OK tomb models), whitewashed riverfront wall honoring Ineb-Hedj "White Walls", pylons, 4-sided obelisks with bright pyramidions; anachronism exclusions (minarets, mosque domes, modern skyline, lateen sails) test-enforced.
- **Flora**: date palms with tapered trunks, two frond tiers, dead-frond skirts, lean and breeze sway, confined to the greenbelt; emmer/barley/flax in peret green — right species, right season, with the peret-vs-akhet choice honestly documented in `era.productionNote` (`gizaEnvironment.ts:362-375`).
- **Scale sanity**: block dimensions (width ≈1.03–1.42, height ≈0.51–0.59, depth 0.88–1.12 — `gizaConstruction.ts:120-144`) sit inside Spec 08 bounds and read person-scale against ~1.8-unit workers; Menkaure's granite lower courses (line 104) match its Aswan granite casing archaeology; Khafre's light upper casing matches its surviving cap; total exterior count ≈ 5,100–5,300 blocks, inside the 4,000–8,000 band. All placement deterministic via `mulberry32`.

## Verdict

Material credibility is high. The load-bearing claims — square sails only, current-down/wind-up river logistics, Tura casing cargo, mud-brick Memphis with whitewashed walls and domed granaries, date palms and peret cereals, person-scale masonry with monument-correct material assignments (Khafre's casing cap, Menkaure's granite base) — are all period-correct for 2560 BCE and honestly annotated where the scene compresses or simplifies. Nothing anachronistic appears, and the exclusion list is contract-tested. The three minor findings are silhouette-level refinements (hull sheer, bipod mast/boom/steering oars, the reed skiff's unrendered cargo and wooden disguise) that would strengthen an already sound craft layer; the notes are readability simplifications that need at most a `historicalNote`, not rework.