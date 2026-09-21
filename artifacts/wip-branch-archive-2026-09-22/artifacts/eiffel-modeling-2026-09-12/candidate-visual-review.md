# Pre-final candidate visual review

Capture bundle: `main-epSbw3iS.js`. The `final-desktop` and `final-mobile`
directories are preserved candidate evidence, despite their original names.
A later accepted capture must be distinguished as `verified-*`.

All 126 captures report assets ready. Each profile has 63 frames, source-time,
height and seated-part metadata, recorded diagnostics and six contact sheets.
Desktop is 1280 × 720; mobile is 390 × 844. These are actual paused browser
captures. Mapped camera/part data is computed from the pure source sampler,
not read back from a live renderer camera.

| Profile | Peak calls | Peak triangles | Sample gate failures |
| --- | ---: | ---: | --- |
| Desktop | 169 | 377,069 | None against 200 / 450,000 |
| Mobile | 141 | 302,065 | 120.06 s exceeds 300,000 by 2,065 |

The mobile approach overrun is why this candidate is not accepted as the final
budget pass. No FPS or whole-film performance claim follows from these frames.

## Observed sequence and visual changes

The 82–112 s samples now show several distinct stages of tower rise, from the
lower pylons through the first and second platforms to the upper shaft. This
corroborates the dense pure-source audit: 50–280 m of seated structure takes
25.3 viewer seconds instead of 4.8. The longer period at nearly complete height
still represents internal stairs and relay work; it is not further tower rise.
The exact insertion-boundary regression fixes the prior four-member removal
at 50 s. The 1,801-sample post-edit audit records no source/production reversal
or seated-ID removal; discrete browser frames alone would not prove that.

At 64, 68 and 72 s, the tighter joint lens visibly enlarges the worker's hands,
splice plates and bearing deck. During the active cue, the top caption and
lower controls leave the contact area readable on both profiles. The orange
horizontal member at hand level is partly the worked joint itself; it should
not all be described as unrelated foreground obstruction. An upper beam remains
near the hat and black crane members remain behind the worker. This change
improves legibility without eliminating every overlapping silhouette.

At 122, 124, 126 and 130 s, the platform rig, suspended member, deck worker and
receiver bed are readable together. On mobile, the caption now stays above
the load, and the support bed is above the seek controls during the spoken cue.
The approach at 120 s remains a broad view of the existing tower; the camera
then reveals the smaller operation. The montage compresses preparation and
later relay work but does not reverse the source event order.

The city roofs now show small glazing/ridge details and variation between
warm walls and dark roof surfaces. Broad reflections remain restrained. These
combined renders cannot isolate how much of that appearance comes from the
new roof geometry, preserved material values or outdoor reflection bake.

## Remaining limits

- Workers remain blocky and close shots expose simple hands, faces and tools.
- The joint background remains dense, although the actual contact is clearer.
- City rows and roof forms remain visibly repetitive; this is a diorama, not a
  measured reconstruction of every Paris building.
- The nearly full-height interval is shorter but still contains a long period
  without major height change while platform and internal work proceeds.
- Paused screenshots do not validate continuous playback FPS, fine lattice
  shimmer, every intervening pose, or all historical construction details.

Key pixels: `final-mobile/frame-22-s68.0.png`,
`final-mobile/frame-46-s126.0.png`, `final-mobile/frame-47-s130.0.png`, and the
matching desktop images. Earlier before/after evidence remains unchanged.
