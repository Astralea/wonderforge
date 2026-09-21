# Eiffel icon refinement — 2026-09-20

Owner rejected the new Eiffel icon's summit. This revision redraws only
Eiffel's catalog glyph and matching arrival elevation. The other nine entries
and shared component/CSS contracts compare byte-for-byte with the saved
pre-edit source snapshots in this folder.

The shaft now has a gentle taper, a compact gallery, an open curved campanile,
a domed lantern, and a short centered flagstaff. Two low main platforms and
the splayed feet/open lower arch remain legible. The small drawing retains
ten strokes and bilateral build stages. The arrival keeps its 160 × 246
viewBox and 224/208/0/198 fill measurements. The campanile aperture is a true
even-odd hole shared by the fill and wave clip. Timing, CSS, reduced-motion
rules, and the homepage/film loader distinction are unchanged.

Reference: Rouillard's 1889 summit section, already authoritative in Spec 14.
The original engraving is public domain and is saved as
`rouillard-1889-reference.jpg`; it is a review reference, not a shipped asset.
[Source and attribution](https://commons.wikimedia.org/wiki/File:Le_sommet_de_la_Tour_Eiffel._Coupe_dessin%C3%A9ee_par_M._Rouillard.jpg).
The artwork is an original simplified drawing, not a tracing or survey.

## Verification

- Focused tests: 2 files / 20 tests pass. `focused-tests.log`.
- Existing pen-direction coverage now includes Eiffel's quadratic flanks and
  checks that control points cannot dip downward. Existing fill/clip cutout
  coverage now includes the open Eiffel campanile.
- Six independent librsvg alpha probes pass for the open campanile, open
  lower arch, frame, lantern, gallery and foot. `opening-checks.json`.
- Static visual review: actual 24/32/38.4 px glyphs plus enlarged 128 px
  comparison; 0/50/100 arrival fills; enlarged summit comparison. Generated
  from the source paths by `render-review.py`; inspected all three PNGs.
- Chromium browser verification passes on desktop 1440 × 900 and mobile
  390 × 844 CSS pixels: live catalog hover/focus finishes every pen stroke at
  38.4 px; homepage has no loader; actual arrival component fits the viewport
  at 0/50/100; waterline moves at 0/50 and disappears at 100; reduced motion
  hides the wave; no page errors. See `browser-checks.json` and the desktop/
  mobile PNGs. Loading captures use the isolated actual-component review
  page, so they establish artwork/CSS behavior, not end-to-end asset timing.
- Clean catalog verification was repeated after concurrent Colosseum imports
  resolved. Final full-page and row captures were visually inspected; the
  script rejects Vite overlays before/after capture as well as page errors.
- Root agent owns the final frozen-source test/typecheck/build run.

## Evidence

- `catalog-before-after.png`: true-size small art and enlarged inspection.
- `arrival-before-after.png`: original/revised elevation at 0/50/100.
- `summit-before-after.png`: enlarged tip detail.
- `browser-review.html` mounts the actual WonderArrival component without
  application edits, for controlled 0/50/100 and reduced-motion checks.
- `browser-review.mjs` also checks the real homepage catalog at its 38.4 px
  slot, using desktop hover and mobile keyboard focus. Browser artifacts are
  separate from static SVG inspection.

No deployment, push, or public posting was performed.
