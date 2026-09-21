# Aqueduct and ten-icon repair — 2026-09-20

Owner requested a better Roman aqueduct using Blender, then expanded the
hover/loading icon redraw to all ten wonders. Both are implemented locally.
The broader historically directed Rome reconstruction remains future work.
No deployment, push or publication was performed.

## Aqueduct

- Corrected the previous 90-degree arch/route mismatch. Local X follows the
  pier chain and each arch bears on both adjacent piers.
- Replaced alternating tops with a continuous gently graded conduit. Piers
  reach shared terrain; terminal half-pier closures support the channel ends.
- Original Blender-authored semicircular arch, pier, springing course and
  covered channel. Clear span 7.75 m, pier 2.30 × 2.10 m; 28 piers across
  271.35 m between terminal centers. Route, grade, heights and cover remain
  authored interpretation of the compressed Caelian setting.
- Vertex-colored fired brick, radial facing, restrained cap and filtered
  straight/radial mortar shading that fades below a pixel. One shared material,
  three instanced batches and one continuous channel; no remote shadow pass.
  Portrait swaps arch detail without changing transforms.
- World readiness includes the kit. Failed delivery retains a grounded
  fallback; navigation disposes late imported geometry.

Editable source: [neronian-aqueduct.blend](neronian-aqueduct.blend).
Reproduce with `scripts/blender_colosseum_aqueduct.py` in a separate background
Blender process. The owner's connected scene was not modified.
[Inspection render](aqueduct-blender-inspection.png) uses Blender lighting,
not the production browser. [Export inventory](blender-export.json).
Historical sources and technical-art decisions: [BRIEF.md](BRIEF.md).
Original GLB: 23,604 bytes, served unchanged by local production preview.

| Geometry inventory | Before | After |
|---|---:|---:|
| Aqueduct desktop triangles | 2,280 | 3,906 |
| Aqueduct portrait triangles | 2,280 | 2,340 |
| Maximum aqueduct main draws | 2 | 4 |
| Aqueduct shadow submissions | 0 | 0 |

3,601 time samples per viewport, including shadow-caster geometry:

| View | Maximum triangle submission upper bound | Film t |
|---|---:|---:|
| Desktop 1440×900 | 179,824 / 180,000 | .8377778 |
| Portrait 390×844 | 119,916 / 120,000 | .6186111 |

These are CPU counts, not actual WebGL draws or frame times.
[Sweep evidence](validation/geometry-sweep.jsonl).

## Ten icons

Both small hover glyphs and larger loading drawings are original SVG redraws.
Architectural cutouts stay transparent during fill/wave clipping. No new
image downloads, SVG filters or JavaScript animation loops. Existing pen
motion, reduced motion, 600 ms cinematic minimum and no-loader home remain.

[Icon report](../colosseum-icon-2026-09-20/ICON-REPORT.md),
[small-size sheet](../colosseum-icon-2026-09-20/catalog-after.png),
[loading states](../colosseum-icon-2026-09-20/arrival-a-0-50-100.png).
The two icon source modules gzip to 7,502 bytes versus 5,078 before; this is
a source comparison, not network transfer. Final combined main bundle is
451.59 kB gzip, about 5.08 kB above the prior homepage correction.

## Verification boundaries

24 focused aqueduct/world/repair tests passed: imported openings, bearing,
grade, grounding, portrait budget, failed delivery and pending-load disposal.
35 focused icon/readiness tests and 24 independent SVG alpha probes passed.
Final combined suite: 227 files / 1,218 tests passed (217.64 s), typecheck and
build passed. Logs are in `validation/`. Production entry: `main-Ag9Y1IzO.js`, preview
http://127.0.0.1:5590/.
[HTTP/model-byte verification](validation/production-http.json).

Read-only performance review found no blocking geometry/lifecycle issue;
the identified end notch was repaired. Shader source review found no concrete
compile defect, but actual GPU compilation remains unverified.

CUA still returned no apps/browsers and a native-pipe startup failure.
Desktop/mobile in-film composition, live hover, shader compilation, orbit
shimmer and GPU counters remain unverified. No premium/release-ready score
is claimed from asset renders or passing tests. Finish browser review before
promoting the updated site on Twitter; the complete Rome rebuild can remain
a later phase.
