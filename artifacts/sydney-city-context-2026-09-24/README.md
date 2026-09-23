# Sydney city context pass and release — 2026-09-24

Owner request: the background was too simplified for Sydney. This pass (Spec 13,
"City context pass") rebuilds the context. Construction refinement is the next,
separate pass.

## What changed
- **Geography**: south-east shore replaced from the OSM Sydney Harbour relation 1252425
  (ODbL). Woolloomooloo Bay now reaches its real head (~1.35 km south). Garden Island
  and Potts Point form its east side. Near-site NSW traces are unchanged. See `osm/coast_compare.png`.
- **Relief**: named smooth sandstone rises plus deterministic noise, zero within 430 m
  of the worksite; Garden Island is level. The CBD climbs gently from the Quay.
- **Streets**: 24 OSM centrelines reduced by `scripts/extract-sydney-osm-streets.ts`
  (raw input `osm/streets.json`), rendered as terrain-conforming roads.
- **Fabric**: 614 street-aligned 1960s offices (CBD and North Sydney), Woolloomooloo
  and Potts Point terraces and flats, 800+ outer-suburb blocks into the haze, and
  ~420 low-detail grove trees in the Botanic Garden, Domain and north shore.
- **Landmarks** (typed, sourced, built ≤1973): Government House, Conservatorium,
  Customs House, Circular Quay station + Cahill Expressway viaduct, AMP Building,
  Gold Fields House, State Office Block, Australia Square, Macquarie St civic
  buildings, Art Gallery, Observatory, OPT with a representative liner, 3 ferries,
  3 Walsh Bay pier sheds, Finger Wharf, Captain Cook Dock, hammerhead crane,
  2 representative destroyers, Fort Denison, Admiralty/Kirribilli House, Luna Park,
  Blues Point Tower. Footprints use OSM ids where mapped; demolished buildings use
  approximate historical sites. Massing is stylised, not a survey.
- **Night**: world-space facade windows plus a per-window night glow (the shader fades
  to average coverage below a few pixels, so there is no shimmer). Terrace panes glow.
  Fixed-pixel lamps line the streets, bridge deck and Cahill; they are hidden by day.
- **Camera/fog**: closing pitch 27° → 23° (complete-house framing test passes on
  all three aspects). Fog is near 1.3r / far 4.0r, still inside the 12 km clip.

## Verification
- `full-tests.log`: 256/257 files passed. The one failure was a timeout in my own
  clearance-test change (46 s under load). I fixed it (one assertion per camera) and
  it passes in isolation. The whole suite was not re-run after that test-only fix.
- `typecheck.log`, `build.log`: pass (existing chunk-size warnings only).
- `production/`: `scripts/verify-sydney-overhaul.mjs` against preview `main-CjKaOd2b.js`:
  12 frames, seek/playback/reduced motion/next-wonder, **zero console errors**.
  Peak draw calls 89 desktop / 75 portrait (ceiling 90). Static environment
  143k shadow-weighted triangles (new ceiling 150k, was 115k).
- Consecutive frames (t=.3200–.3209, .9500–.9506): stable window grid and lit mask.
- `before/`: the accepted 2026-09-23 production frames, for comparison.

## Limits
Headless Chromium/ANGLE Metal only; no physical phone or audio listening. The draw
call margin is 1 — any further Sydney mesh must merge into an existing batch.
Terrain heights, far suburbs and representative ships are interpretation.

## Release (same day, owner request)
Sydney Opera House moved from In production to On site (`READY_IDS`, Spec 01).
Release run: `release-tests.log` **257/257 files, 1,387/1,387 tests pass**;
`release-typecheck.log` and `release-build.log` pass; bundle `main-7_YZi6rd.js`.
The gallery lists it as film V and opens `#/wonder/sydney-opera-house` with no page errors.
