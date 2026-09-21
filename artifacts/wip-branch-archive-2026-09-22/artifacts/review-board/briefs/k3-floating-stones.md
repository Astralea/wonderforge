# K3 brief — floating stones + cross-scene quality (read-only)

You are Factory Droid **kimi-k3** acting as the WonderForge review board
**construction-archaeologist** and **visual-director**. Read-only except writing
this report under `artifacts/review-board/reports/`.

Repo: `/Users/hina/Documents/Experience-Intelligence-Domain/wonderforge`
Preview: `http://127.0.0.1:5589/#/wonder/stonehenge`
Debug stills: `#/debug/wonder/stonehenge/<t>`

The owner reports **some stones seem to be floating**. Treat that as a physical
claim, not an aesthetic note.

## Must read

- `AGENTS.md`, `HANDOFF.md`
- `specs/02-animation-engine.md`, `specs/08-scene-realism.md`, `specs/10-stonehenge-reference-scene.md`
- `.claude/skills/scene-physical-plausibility/SKILL.md`
- `src/engine/stonehengeConstruction.ts`, `src/engine/stonehengeContact.ts`
- `src/render/three/StonehengeStoneSystem.ts`, `src/render/three/StonehengeEnvironment.ts` (`terrainHeight`)
- Giza counterparts: `src/engine/construction.ts`, Giza contact/support tests
- Latest cinematic capture if present: `artifacts/stonehenge-realism-qa/cinematic-caption-022.png`

## Suspects to measure (do not guess)

1. `horizontalY` adds `+ 0.36` even on `source-ground`; haul also sets `sledLift: 0.34`. Check whether the renderer applies both.
2. Stones live on a plane; turf uses `terrainHeight` with relief starting at r≈24 m. Measure stone bottoms vs local turf.
3. Heel-arc vs chord lerp remaining gaps (positioned / lintel hoist).
4. InstancedMesh identity slots at origin.
5. Giza blocks with the same class of defect (support label vs geometry).

Capture or inspect at t = 0.12, 0.22, 0.40, 0.66, 0.78 if the preview is up.
Confirm `diagnostics.scene === "stonehenge-reference"` and that you are not
reviewing a stale `LegacyWorld`.

## Output

Write `artifacts/review-board/reports/k3-floating-stones.md` with:

1. Spec 04 scorecard (0–3) citing capture paths.
2. Findings as physical claims with coordinates or file:line. Severity: critical / major / minor / note.
3. Ranked transfer list:
   - Stonehenge lessons that should raise Giza (support interpolation, contact, camera/landscape, sky ownership).
   - Giza lessons that should raise Stonehenge (course support, living site, material recipes, keep-outs, human yardstick).
4. One paragraph: would a viewer believe these stones have weight?

Do not implement. Do not commit. Cite evidence.
