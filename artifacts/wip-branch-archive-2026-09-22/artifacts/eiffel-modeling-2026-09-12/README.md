# Eiffel loading, sequence and modeling pass — 2026-09-12

Local review URL: https://wonderforge.localhost/#/wonder/eiffel-tower.
The existing Portless route serves the production build on loopback5589.
The owner selected **Local URL only**. No public hosting, repository publication,
push or visibility change was performed.

Latest owner clarification: this is a desktop experience. The completed mobile
checks and modest responsive accommodations are retained; future work should
prioritize desktop quality rather than pursue mobile parity.

## Loading

The original tower-outline loader now has a moving wave at its actual filled
edge. Progress remains tied to asset-system readiness. At0% the outline pulses;
at100% it is entirely filled. The central arch remains hollow. Reduced-motion
CSS uses a straight static edge while still reflecting progress changes.

Real delayed-request browser checks show different visible wave edges at the
same80% and film time0:8.122seconds apart on desktop1440×900,33.543seconds on
mobile390×844. Both then reach the ready scene. See loader-review.md,
loader-verification.json and loader-*-fixed-stall-*.jpg. The first failed SVG
clip build remains as evidence; corrected browser captures use a direct path
child in clipPath. Native reduced-motion emulation was unavailable; that branch
has CSS/test evidence only. This proves animation during stalled network waits,
not compositor-only animation during synchronous main-thread work.

Successful Paris loading now avoids allocating13 hidden procedural fallback
meshes and846,976bytes of instance matrices, removing19,748 identity/placement
matrix writes. Terrain and quay trees remain eager; exact original fallback
poses/colors are retained on failure in either completion order. See
startup-review.md and startup-measurements.json. These are resource counts,
not a measured download-time or total-loading-time speedup.

## Actual sequence evidence and corrections

The before audit captured57 actual frames per desktop/mobile profile. The first
after audit captured63 per profile, with full source-time, seated-height and
render-count metadata. Those240 images and their contact sheets are retained
under before-* and after-*. They include chapter transitions, intermediate
growth and receiver arrival/landing; they are browser captures, not generated
illustrations. The later focused corrections are recorded separately below.

The audit found the tower jumping through most structural growth and then
lingering near completion. Structural rise now occupies82–112seconds. Highest
seated-member height50–280m takes25.3seconds rather than4.8. The actual first-floor
receiver/landing close-up is122–130seconds; caption and existing ElevenLabs
narration windows share that clock. The full edit remains180seconds. The
near-complete period still includes stairs, relay and crown work; tower height
alone does not measure all construction activity.

A separate exact-boundary defect briefly removed four seated members at50s.
Pinning the inverse production clock to the last completed insertion coordinate
removes that floating-point underflow. Dense0.1-second sampling (1,801 states)
now finds zero source/production reversals and zero seated-ID removals. See
edit-chronology-report.md, edit-chronology-{before,after}.json and reproduction
script. Physical geometry, source poses, assembly attachment order and audio
files are preserved. Detailed edit keys remain unchanged.

The first after-image audit also exposed mobile caption/control overlap and
wide-view triangle overruns. These failures are retained in after-visual-audit.md
and after-settled-diagnostics.json; they are not passing release evidence.
The final-* directories retain an intermediate candidate with one remaining
120-second mobile overrun. The accepted138 frames are under verified-desktop/
and verified-mobile/:69 frames each, including extra approach/withdrawal samples.

During active short-film story captions, mobile navigation collapses behind an
accessible Chapters toggle, the caption moves above the work and the transport
uses the lower letterbox. At126seconds the mobile caption now occupies y67–183
and the seek target y673–721, leaving payload and receiving contact visible.
Desktop also clears the work area. Chapter expansion, selection, collapse and
focus restoration passed real browser checks; see ui-closeup-review.md.

The joint close-up keeps its checked eye position, pitch and azimuth but uses
a26° lens fitted to the splice/worker/bearing-deck envelope instead of42°.
Final images show the worker's hands, splice line and supporting deck more
clearly. Side views and pitch changes failed clearance or occlusion checks and
were rejected. Some foreground beam overlap and simple worker anatomy remain;
see joint-framing-report.md. No structural solid was removed to clear the view.

Per-mesh measurements traced the wide-view cost to equipment shadow submissions.
The accepted build omits only entirely fine-equipment shadow batches at least
180m from the tower center in the short film. Mixed support batches, decks and
actual payloads retain their shadows. Full equipment shadows return in the
122–130s close-up (about90m) and in every Detailed view. The tower separately
uses its existing major-iron shadow tier at400m in both mobile and desktop
short-film overviews. Every visible source triangle and transform remains.
At mobile149.94s this removes34,728 shadow triangles:328,380→293,652. A first400m
equipment threshold restored fine shadows too early during the120-second
approach; tests and dense browser samples cover the corrected transition.

## Modeling and material changes

Original Blender-authored additions comprise20 exhibition rooflight panels,
36 roof-supported dormers and9 chimney groups on the two nearest selected
street blocks. They add3,376 triangles. Every previous193,620 city triangle
and its UVs is retained; the new city has196,996 triangles and occupies
14,298,216bytes. Ray tests verify dormer/roof intersections and rooflight support.
The original city and manifest are preserved under before-assets/.

Editable source: blender/paris-1889.blend and scripts/paris_roof_detail_geometry.py
in the project. The candidate city GLB and manifest were promoted only after
asset contracts passed. The separate life GLB was retained. New Blender scenes
and isolated output paths preserved the user's existing scene/file; each
operation restored the scene that was active immediately before it ran.

The single batched city material now receives the source roughness and metalness
per vertex, alongside the unchanged position/normal/color/UV data. One small
filtered sky/ground environment supplies broad reflections for Eiffel materials.
It is baked once from the typed sky palette and dims at dusk; it is not a
reflection of nearby geometry. Other wonders keep their environment settings.
See material-reflection-review.md and tests/paris-facade-materials.test.ts.

Historical input is the existing Carnavalet exhibition print and Liébert1889
balloon photograph, checked against primary collection records and the official
Eiffel Tower exhibition history. References inform authored details; no archive
image is copied into runtime scenery. The facade atlas is the existing original
generated art asset. Useful primary references:

- [Official Eiffel Tower: the1889 exhibition](https://www.toureiffel.paris/en/news/130-years/tower-highlight-1889-world-exhibition)
- [Paris Musées: central exhibition palace dome](https://parismuseescollections.paris.fr/fr/musee-carnavalet/oeuvres/le-dome-central-du-palais-du-champ-de-mars-exposition-universelle-de-1889)
- [Library of Congress:1889 Paris view](https://www.loc.gov/item/92514593/)

The saved Blender gallery/mansard views and actual time0 browser comparison show
the additions. Paused-frame review finds readable limestone/zinc separation and
restrained reflections. Repeated frontage motifs and distant generic building
forms remain; this is a bounded modeling improvement, not photogrammetry or a
claim of reference-quality parity.

## Accepted verification

Production bundle: **main-CarPen2B.js**, served by the local URL and recorded in
every accepted frame. `npm run test -- --maxWorkers=2` passes all1,068 tests in
202files; typecheck and build pass. Logs: tests-accepted-corrected.log,
typecheck-accepted.log and build-accepted.log. Source/asset checksums are in
accepted-verification.json. The initial stale navigation expectation and later
stale400m test expectation are retained in their earlier logs; both were updated
to the reviewed behavior before the complete passing reruns.

| Actual profile | Accepted frames | Peak calls | Peak triangles | Sampled limit |
| --- | ---: | ---: | ---: | --- |
| Desktop1280×720 |69|170|363,918|200calls /450,000tri |
| Mobile390×844 |69|140|293,652|150calls /300,000tri |

All accepted frames report ready assets and fit both limits. The69 times include
the previous63 plus119.88,120.24,120.42,131,132 and133seconds around the detail
transition. Full-size images, six contact sheets per profile and source-state
metadata accompany the final visual verification report. These are sampled
browser/render-count results, not native phone GPU/FPS certification or a
claim that every continuous frame is shimmer-free.

A separate actual1× playback smoke check advanced from118.98seconds through the
handoff to the180-second ending without another seek and retained ready assets.
See playback-smoke.json and playback-start/end.png. The final observation was
after completion; its wall-clock interval is not an FPS or precise speed measure.

Normal URLs disable the optional ?renderCosts=1 per-mesh accounting. The
diagnostic records actual main/shadow submissions and restores original mesh
callbacks; counters include postprocessing through an explicit untracked total.
It does not alter culling or geometry. mobile-cost-114.json and mobile-cost-150.json
identify exported equipment shadow submissions in the wide-view peaks.

Anonymous browser-tool `jw` errors and one extension NoListener entry are
retained in console evidence. No app-bundle exception was observed in the
returned samples; this is not a completely clean-console claim. Browser startup
briefly blocks inspection before recovering. The temporary delayed-asset server
5590 was stopped; the owner-facing local preview remains on5589.
