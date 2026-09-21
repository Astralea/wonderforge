# K3 review — Sydney Opera House pass 2 (Civ VI density + score)

You are Factory Droid Visual Director on **kimi-k3-max**. Read-only visual
review. Do not edit source. Do not commit.

Scene: `#/debug/wonder/sydney-opera-house/<t>` typed
`sydney-opera-house-reference` (Spec 13). ID `sydney-opera-house` unchanged.
Preview: `http://127.0.0.1:5589/` serving `dist/assets/index-Cxwvwe4-.js`.
Captures: `artifacts/sydney-pass-2/`
- desktop t = 0.12, 0.32, 0.58, 0.78, 0.92, 1.0
- mobile t = 0.12, 0.58, 1.0
JSON next to each PNG.

Civ VI presentation reference (do not treat as a mesh to copy):
`artifacts/civ6-sydney-ref/sydney-opera-house-ingame-converted.png`

Pass 1 report (blockers to re-check, not to rubber-stamp):
`artifacts/review-board/reports/k3-sydney-pass-1.md`

Confirm every JSON `result.diagnostics.scene === "sydney-opera-house-reference"`
and empty console/page errors.

Look at the PNGs first, without the implementation rationale. Score Spec 04
categories (composition, silhouette, construction causality, materials,
light, environment depth, motion clarity, UI restraint) on the 0–3 board
scale. Flag:

1. Coarse blockout vs Civ VI harbour density: does this still read as empty
   boxes on a table, or as a place with water, shore, bridge, boats, quay?
2. Höganäs chevrons: do the sails read as tiled V-fields from the hold, or
   still as smooth CAD blobs?
3. Harbour Bridge: connected arch, or still dashed/floating?
4. North shore / land-water contact: terrain meeting water, or floating
   slabs / crushed blacks?
5. BUILD causality (0.32, 0.58, 0.78): podium first, ribs, tile skins on a
   crane rope, orange crews?
6. Night reveal (0.92, 1.0): lit house on dark water with cranes struck?
7. Portrait: podium + one crane, no sky-dome edge?

Write `artifacts/review-board/reports/k3-sydney-pass-2.md` with
evidence-cited findings and a verdict (PASS / BLOCK). Do not commit.
