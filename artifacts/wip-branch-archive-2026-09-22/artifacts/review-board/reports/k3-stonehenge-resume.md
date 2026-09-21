# K3 Stonehenge Resume-QA — Implement + Verify

Model: `kimi-k3` (Factory Droid, fresh session). Implements the three blocking/named
fixes judged by the prior kimi-k3 pass (session `e8fe9f10-accd-44d3-862e-d44765c68d73`)
against `artifacts/stonehenge-resume-qa/`, then recaptures and re-scores.

Verification: `npm run test` (29 files / 308 tests pass) && `npm run typecheck` &&
`npm run build` — all green. Recaptures all report
`diagnostics.scene === "stonehenge-reference"`, zero console/page errors, and sit
within Spec 04 budgets (desktop ≤78 calls / ≤112k tris vs ≤120/≤180k; mobile
33 calls / 69.5k tris vs ≤95/≤120k).

## 1. Spec 04 scorecard

Board scale 0–3; mapped 0–5 as board × 5/3 (gate: nothing below 4 ⇒ board ≥ 2.4;
causality must be 5 ⇒ board 3). Scores reflect the after state.

| Category | Board | Mapped | Evidence |
|---|---|---|---|
| Composition | 2 | 3.3 | `desktop-078-after/desktop.png` (trilithon + A-frame layered against downland ridges), `desktop-090-after/desktop.png`. Docked: dead grass foreground at late beats (`desktop-092-after/desktop.png`). |
| Silhouette | 2 | 3.3 | Trilithon and circle silhouettes crisp against the sky at t=0.78/0.90/0.92 (`*-after`). Docked: dawn haze still flattens form early (pre-existing, see review-visual-scorecard). |
| Construction causality | 3 | 5.0 | `desktop-0665-after/desktop.png` — lintel aloft on a now-readable timber crib; `desktop-078-after` — A-frame + ropes coupled to the raising upright; pits, sleds, crews all bound to operations. No scaling, teleporting, or ground-emergence. |
| Material readability | 2 | 3.3 | Timber now separates from sarsen (`desktop-0665-after` crib, `desktop-092-after` crib remnants read warm vs blue-grey stone). Docked: dusk grade still compresses materials into one dark family (`desktop-092-after` lower half). |
| Lighting | 2 | 3.3 | Vertical blue streaks eliminated at all affected beats (compare `desktop-090/desktop.png` → `desktop-090-after/desktop.png`); dawn→dusk arc intact. Docked: dawn wash remains over-milky (pre-existing). |
| Environment depth | 3 | 5.0 | All beats retain bank/ditch, open chalk grassland, worker camp/tents, sled stage, distant ridges, and a blue upper sky with a readable broken-cloud layer (`desktop-078-after`, `desktop-090-after`). |
| Motion clarity | 2 | 3.3 | Stills show crews/mechanisms re-staged between beats (crib at 0.665 → seated lintels + A-frame at 0.78 → near-complete circle at 0.92); engine tests enforce shared event references. Motion itself not certifiable from stills. |
| UI restraint | 3 | 5.0 | `player-mobile-after/mobile.png` — title/subtitle/meta now sit fully above the phase label and gold progress course; quote/title keeps permanent lower-left ownership per Spec 05. Chrome-free debug frames remain full-bleed. |

Gate translation: causality 5, depth 5, UI 5 pass; composition/silhouette/
materials/lighting/motion at ~3.3 remain below the 4.0 floor — all five are
pre-existing art-direction debts (dawn grade, dead foregrounds, dusk
compression), none introduced or worsened by this pass.

## 2. Findings

- **Critical — UI title/progress overlap (FIXED).** `src/ui/QuoteOverlay.tsx:14`
  used `bottom-24`/`md:bottom-28`; with the transport's wrapped two-row button
  cluster on mobile the gold course top reaches ~203 px from the viewport
  bottom, so the title and subtitle were struck through by the scrubber
  (before: `artifacts/stonehenge-resume-qa/player-mobile/mobile.png`).
  After: `player-mobile-after/mobile.png` — clear separation. Spec 05 lower-left
  ownership preserved; captions never used that corner (unchanged).
- **Major — vertical blue streaks at the top of frame (FIXED).**
  `src/render/three/StonehengeSkyDome.ts:77` sampled cloud UV as `dir.xz * 3.35`,
  which pinches at high elevation and painted saturated vertical bands
  (before: `desktop-078/desktop.png`, `desktop-090/desktop.png`,
  `desktop-092/desktop.png`). After: `desktop-090-after/desktop.png`,
  `desktop-078-after/desktop.png`, `desktop-092-after/desktop.png` — streaks
  gone, clouds read as a coherent broken deck, mid-band cloud size preserved.
- **Minor — crib stack read thin/dark at t≈0.665 (FIXED).**
  `src/render/three/StonehengeWorkSystem.ts:219` (log scale) and `:79` (timber
  color). After: `desktop-0665-after/desktop.png` — the crib under the rising
  lintel reads as a solid timber stack against the sarsens;
  `desktop-092-after` shows the same benefit on crib remnants. `cribHeight`,
  layer pitch (0.36), and the lintel coupling in
  `src/engine/stonehengeConstruction.ts:264` are untouched; no new meshes.
- **Note — cloud deck frequency toward the horizon rises slightly** under the
  gnomonic projection (~4.5 vs 3.35 effective at dir.y≈0.06). Reads as natural
  perspective compression in the captures; no action.
- **Note — pre-existing debts carried, not addressed (out of scope):** dawn fog
  wash at early beats, dead grass foregrounds at late beats, dusk material
  compression. Same family as the Giza board's open items.

## 3. Code changes

1. `src/ui/QuoteOverlay.tsx:14` — `bottom-24 … md:bottom-28` →
   `bottom-56 … md:bottom-44`. Clears the gold progress course on mobile
   (wrapped transport, course top ≈203 px) and desktop (course top ≈128 px)
   with margin for the track's glow. `src/ui/**` only, per brief.
2. `src/render/three/StonehengeSkyDome.ts:71-77` — cloud UV switched to a
   gnomonic-style projection, `dir.xz * (1.85 / (dir.y + 0.35))`, keeping the
   world-space drift offset. Scale 1.85 matches the old 3.35 frequency at the
   mid cloud band (dir.y≈0.2). Deterministic; no `Math.random()`; visual-only.
3. `src/render/three/StonehengeWorkSystem.ts:219` — crib log scale
   `(1.65, 0.22, 0.22)` → `(1.85, 0.28, 0.28)`; `:79` — timber color
   `#916b43` → `#a67c4f`. Layer pitch, base offset, `cribHeight`, the
   construction graph, and mesh counts unchanged.

`src/data/stonehengeConstruction.ts` and `src/engine/stonehengeConstruction.ts`
untouched, per brief. No commits made.

## 4. Verdict

All three blocking/named items from the prior kimi-k3 pass are resolved and
verified on fresh captures: the mobile title block no longer crosses the gold
progress course (critical, fixed in both aspects), the zenith-pinch blue
streaks are gone from every affected desktop beat with cloud character
preserved (major, fixed), and the t≈0.665 crib now reads as a substantial
timber stack against the sarsens without decoupling from the lintel height
(named polish, fixed). Tests, typecheck, and build are green; every recapture
confirms the `stonehenge-reference` scene with clean consoles and in-budget
renderer diagnostics. The remaining sub-4 scorecard categories are the
carried art-direction debts (dawn wash, dead late-beat foregrounds, dusk
compression) — this pass neither introduced nor worsened them, and they are
the right targets for the next polish brief.
