# K3 review — Sydney Opera House first typed world

Read-only visual review. Do not edit code.

Scene: `#/debug/wonder/sydney-opera-house/<t>` typed `sydney-opera-house-reference` (Spec 13).
Preview: `http://127.0.0.1:5589/` serving `dist/assets/index-BwEX9X92.js`.
Captures: `artifacts/sydney-pass-1/desktop-012` through `desktop-10`
(t = 0.12, 0.32, 0.58, 0.78, 0.92, 1.0) and matching `mobile-*` folders.
JSON next to each PNG.

Confirm every JSON `result.diagnostics.scene === "sydney-opera-house-reference"`
and empty console/page errors.

Look at the PNGs first, without the implementation rationale. Score Spec 04
categories (composition, silhouette, construction causality, materials,
light, environment depth, motion clarity, UI restraint). Flag:

1. Does the movie read as Utzon sails assembling on Bennelong Point, or as
   boxes on a brown table?
2. Is the Harbour Bridge western backdrop, Farm Cove water, and Circular
   Quay readable, or is the monument stranded?
3. During BUILD (t=0.32, 0.58, 0.78): podium first, then ribs, then tile
   skins on a crane rope — supported or floating? Orange crews working?
4. Do the sails read as nested spherical sections, or as random white
   wedges?
5. Night reveal (t=0.92, 1.0): lit house on dark water, or a black void?
6. Portrait: does mobile keep the podium and one crane without a sky-dome
   edge?

Write `artifacts/review-board/reports/k3-sydney-pass-1.md` with
evidence-cited findings and a verdict. Do not commit.
