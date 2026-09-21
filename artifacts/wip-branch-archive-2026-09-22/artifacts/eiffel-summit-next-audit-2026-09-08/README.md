# Eiffel 1889 summit: bounded next-pass audit

**Status:** read-only priority preparation. This compares the current authored
summit with two period sources; it does not admit a replacement model or claim
historical completeness. The current close render is
[`summit-blender-review.png`](../eiffel-refinement-2026-09-06/summit-blender-review.png).

## Sources and scope

- M. Rouillard, *Le sommet de la Tour Eiffel*, 1889 section engraving
  ([Brown University scan via Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Le_sommet_de_la_Tour_Eiffel._Coupe_dessin%C3%A9ee_par_M._Rouillard.jpg)).
  This is the same visual authority already cited by Spec 14, so no replacement
  reference was introduced.
- W. C. Watson, *Report on the Universal Exposition of 1889 at Paris*, pp.
  824–825, sections 348 and 352
  ([Internet Archive scan](https://archive.org/details/civilengineering00wats/page/825/mode/2up)); the local OCR is
  [`watson-1889.txt`](../eiffel-summit-rigging-2026-09-08/watson-1889.txt#L14704).
  It specifies the 16 m covered glazed gallery, an octagonal third story with
  four 12 m and four 2 m sides, four diagonal lattice arches, a separate iron
  cylinder, octagonal lodge and lantern, and a 1.40 m upper terrace.
- The Eiffel Tower's official 1889 inauguration image provides a useful human
  scale check for the small meteorological platform
  ([official Eiffel site](https://www.toureiffel.paris/en/news/130-years/1889-2019-130-years-amazement)).

Actual source inspected: [`scripts/blender_eiffel_tower.py`](../../scripts/blender_eiffel_tower.py#L246)
and [`tower-kit.manifest.json`](../../public/models/eiffel-construction-kit/tower-kit.manifest.json).

## Three smallest useful corrections

1. **Replace the square stage-55 gallery perimeter with the documented
   octagonal plan.** The current generator lays four uninterrupted 14.90 m
   glazed faces at `x/z = ±7.45` (`summit-gallery-{0..3}-{0..5}`, source lines
   251–263). In the saved render this reads as a modern square glass box.
   Watson instead gives four 12 m sides and four small 2 m sides; Rouillard's
   section/elevation shows the clipped-corner silhouette. Preserve the current
   overall ~14.9 m footprint and 276.54–280.10 m window band, shorten each main
   face to 12 m, and insert four approximately 2 m diagonal corner bays. This
   changes only stage-55 perimeter posts/transoms/glazing and the matching edge
   of `platform-3`/`summit-terrace`; it need not disturb the shaft below.

2. **Separate the octagonal lodge from the lighthouse lantern.** The current
   four `campanile-rib-{0..3}-{00..11}` arches end at about 294.1 m and feed
   directly into `beacon-lower-balcony` at 294.2 m, followed by one 16-sided,
   4.05 m-tall glazed drum (`beacon-window-00..15`, source lines 291–337).
   Watson's access sequence is materially different: arches → iron cylinder
   and ladder → **octagonal lodge with balcony** → trapdoor/stairs → lantern.
   Rouillard likewise shows a visibly stepped, inhabited head rather than one
   uninterrupted glass cylinder. Within the existing 294.2–298.25 m envelope,
   make the lower portion an eight-sided lodge with opaque sill/parapet and its
   balcony, then set back a shorter glazed lantern above it; retain the current
   stage-62 cupola. This is a local replacement of stage 60–61 geometry, not a
   new tall crown or a change to final height.

3. **Reduce the stage-63 meteorological terrace to its recorded diameter.**
   The generator uses radius `1.45` for both `upper-platform` and
   `upper-handrail` (source lines 359–365), making a **2.90 m diameter** ring.
   Watson gives **1.40 m diameter**, and the official inauguration view confirms
   a tight platform around the mast at human scale. Change the ring/post/floor
   radius to about `0.70` m (allow only explicitly modeled rail thickness
   outside that diameter), keep its 300.51 m floor and the 312 m flagstaff, and
   shorten the radial floor members accordingly. Representative manifest IDs
   affected are `summit-crown-m000-c000` onward; the flagstaff is the three
   chunks `summit-crown-m072-c000..c002` and can remain unchanged.

## Limits

This audit uses the authored Python, exported manifest, saved close render, and
period section/report. It did not open the `.blend`, invoke Blender/MCP, inspect
shop drawings, validate member strength, or test a rebuilt silhouette in the
browser. The proposed dimensions therefore form the next modeling brief and
must be followed by an actual Blender close render against Rouillard plus the
normal manifest/contact and desktop/mobile framing checks.
