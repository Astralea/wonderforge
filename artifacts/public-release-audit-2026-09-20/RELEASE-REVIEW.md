# WonderForge: four-film review before Twitter

Reviewed 2026-09-20. **The site is already publicly accessible at https://wonderforge.pages.dev/.** Its On site list is Pyramids of Giza, Stonehenge, Colosseum and Eiffel Tower. Sydney and the other five entries remain In production. Current browser observations and sampled HTTP asset comparisons confirm this; the report does not rely on an old deployment note.

**Recommendation: do a focused repair pass before promoting this as a polished release.** The four films load and their monuments are recognizable. The immediate work is construction credibility, a few conspicuous presentation defects, and loading/rendering cost—not expanding the catalog or adding more background detail. An explicitly work-in-progress announcement is a separate editorial choice.

This was a review, with application code, specs and deployed content unchanged. Existing user changes and artifacts were preserved. Audit output is confined to this folder.

[Open the full screenshot gallery in flow order](CAPTURE-GALLERY.md).

## Reviewed journey

| Step | Surface | Health and evidence |
|---|---|---|
| 1 | Homepage | Working. Illustrated mark and Giza backdrop render. Small CTA has subdued contrast. [Screenshot 01](01-home-desktop.png). |
| 2 | Choose a site / catalog | Working. Four playable films, six noninteractive production entries; returning from a film lands on the catalog. [Screenshot 02](02-catalog-desktop.png). |
| 3 | Giza | Working playback and recognizable ensemble; construction support, operation framing and portrait overlays need repair. [Screenshots 03–06](visual-review.md#pyramids-of-giza). |
| 4 | Stonehenge | Working film; signature lifting support, dark stone exposure and confirmed portrait text collision need repair. [Screenshots 07–11](visual-review.md#stonehenge). |
| 5 | Colosseum | Working film and readable stadium interior; discontinuous construction, hard sky boundary and excessive geometry need repair. [Screenshots 12–16](visual-review.md#colosseum). |
| 6 | Eiffel Tower | Working loading/film/reveal; improve payload sightlines, upper-iron contrast and cold loading. No new construction-geometry failure demonstrated in this bounded review. [Screenshots 17–23](visual-review.md#eiffel-tower). |

Shared interactions exercised: catalog entry; next-film navigation through all four, including Eiffel → Giza wrap; pause/play; forward/reverse seeks; 4× completion with Replay visible; chapter jump resuming play; Giza information panel open/close; return to catalog. Normal completion was observed for Eiffel and Giza. A paused seek to 100% shows the Complete phase but retains Play until playback reaches its completed state; this is a minor transport consistency improvement.

## Prioritized work by wonder

### Giza — make the depicted road and actual traffic agree

1. **P1: use one support surface for ramp geometry, sleds and feet.** A CPU raycast against the actual rendered terrace meshes finds a sled ground level about **4.02 scene units below its visible terrace**, with the leading worker about **5.99 below his terrace**, at `t=0.5002578`. This is a demonstrated source/geometry defect, not a claim inferred from a distant screenshot. The engine's straight ramp interpolation and renderer's stepped ramp are different surfaces. Ground workers at their own X/Z; verify front/rear sled contacts. [Reproduction and source lines](construction-review.md#giza).
2. **P1 presentation: let viewers see a complete hauling/raising operation.** At 35% and 62%, the crew, load and destination are too small to read quickly. Add a closer held composition while preserving human-scale stones and the wide three-pyramid reveal. The portrait quote crosses the working face; protect that area.
3. **P2: improve material separation and avoid redundant static updates.** Keep limestone distinct from brown earth/haze; give ramps an earthen surface. Cache unchanged core-fill matrices, especially on the homepage, and close the explicit instanced-resource disposal gaps. Do not add more geometry first.

Acceptance: actual mesh/support contact within the spec's 3 cm tolerance at low/high courses and route transitions; no worker/stone burial in continuous playback; one clear phone-size operation; unobscured active work at 390×844.

![Giza construction, desktop 62%](04-giza-raising-desktop.png)

### Stonehenge — repair the signature mechanism, then expose it clearly

1. **P1: unify the upright's rigid transform and grounded crib.** At `t=.083`, the transformed stone butt is **6.63 m from its declared heel/pit**. At `t=.21055`, actual crib matrices put the bottom logs **2.39 m above the ground**; at `.2135`, the entire crib disappears, leaving two guide beams. Derive heel, body, rope anchor and pit from one transform; build/retain a continuous support stack through lintel alignment. [Reproduction and source lines](construction-review.md#stonehenge).
2. **P1: remove the portrait caption/quote collision.** At 82%, the solstice sentence physically intersects the long quotation and both obscure the monument. Keep the full quote accessible, but give prose and the working scene separate space. If changing when quotes appear, amend Spec 05 first.
3. **P1 visual: raise stone midtones while retaining the solstice lighting.** The sun and long shadows communicate the idea; the stones themselves become a dark mass. Balance fill/material response and give the early mechanism a closer view. Tree variety and distant scenery are lower priorities.

Acceptance: transformed heel and rope contacts remain fixed through raising; crib reaches ground and remains through transfer; no text intersection at 390×844; recognizable uprights/lintels at the solstice hold.

![Stonehenge portrait at 82%: visible caption/quote collision](10-stonehenge-solstice-portrait.png)

### Colosseum — highest combined repair and performance priority

1. **P1: fix haul continuity, fixed crane geometry and scaffold removal.** One internal haul boundary jumps **12.16 m**. A sampled crane's mast changes from **7.5 to 13.875 m**, with boom length changing from zero to about **10.12 m**. Remaining scaffolds drop from **37.375 m to zero at 98%**. Add the missing route connection, solve movement from a fixed timber rig and remove scaffold members in bounded stages. The wagon deck also intersects its load. [Reproduction and source lines](construction-review.md#colosseum).
2. **P1 visual: remove the hard beige/blue horizon seam.** It is visible at every sampled desktop stage and in portrait. Diagnose the rendered terrain/fog/sky relationship; preserve the recently added Rome neighbourhoods. Then give one crane/load/receiving-deck operation an unobstructed shot.
3. **P1 performance: simplify distant city geometry and shadows.** The live 86% view submits **1,166,258 triangles desktop and 1,166,221 portrait**. Portrait barely reduces cost, at **9.72×** its 120k target. Introduce distance-based detail and spatial culling while retaining the city's density and silhouette. These counts establish budget debt, not a measured phone frame rate.

Acceptance: all route subsegment boundaries continuous; crane timbers retain length; no whole-scaffold disappearance; no horizon seam at 32/58/86/100%; current draw/triangle budgets reconciled and continuous playback measured on a physical phone.

![Colosseum at 58%: hard horizon boundary and competing scaffold towers](13-colosseum-vaults-desktop.png)

### Eiffel Tower — preserve the stronger construction baseline and improve readability/loading

1. **P1 delivery: reduce the initial asset cost.** The published Paris GLB transfers **14.30 MB uncompressed**. The tower manifest transfers about **1.25 MB gzip**, then expands to **24.61 MB** before object creation. Optimize the city and runtime manifest; keep the honest loading/error UI and asset-readiness contracts. [HTTP/source evidence](performance-review.md).
2. **P1 visual: clear the camera's view of the load and receiving joint.** At 12% and 22%, large foreground braces compete with the carried iron. Adjust the existing closeups so hook, payload and destination remain separable. Preserve rigid geometry and the full-member operation; do not return to the tiny fastening-worker idea.
3. **P2: strengthen the upper lattice and protect its silhouette in portrait.** The upper shaft loses contrast against the bright sky while repeated solid city blocks dominate. Tune material/atmospheric contrast and mobile text placement, preserving the accepted sunrise ending. The gold vertical bar in the portrait chapter list is a scrollbar, not a rendering artifact.

Acceptance: continuous 34–42 s shot communicates the full iron movement; 104–124 s visibly advances the exterior shaft; final tower reads at social-feed size and 390/320 px widths; cold-load bytes, ready time and long tasks measured with an empty cache. Upper freight above the second-floor receiver remains an explicitly documented scope omission, not a quick pre-posting fix.

![Eiffel at 22%: lifting equipment visible through competing braces](18-eiffel-aligning-desktop.png)

## Live rendering measurements

Read from the published canvas's `data-renderer-diagnostics` after a confirmed rendered seek, with `data-assets=ready`. Actual Chrome browser; desktop 1440×900 and portrait 390×844. These include internal renderer passes and are **not FPS, GPU-memory usage, or physical-phone results**. Full data: [renderer-metrics.json](renderer-metrics.json).

| Film / checkpoint | Desktop calls / triangles | Portrait calls / triangles |
|---|---:|---:|
| Giza, 62% | 165 / 262,100 | 143 / 252,083 |
| Stonehenge, 82% | 76 / 142,258 | 58 / 133,830 |
| Colosseum, 86% | 103 / 1,166,258 | 88 / 1,166,221 |
| Eiffel, 86% | 186 / 358,587 | 176 / 309,759 |

Eiffel's sampled desktop peak was 198 calls at 58%. Stonehenge has the lowest measured scene cost; its portrait triangle count is still 11.5% above target. Giza exceeds the 90-call desktop target. Full budget interpretation, loading evidence, lifecycle findings and cache-versioning recommendations: [performance-review.md](performance-review.md).

## Recommended order before the post

1. Repair the proven construction defects in Giza, Stonehenge and Colosseum; extend tests against actual transformed geometry and every internal route boundary. Existing formula-against-formula tests missed these failures.
2. Fix Stonehenge's text collision and dark reveal, Colosseum's horizon, and the shared portrait text/work-area conflict. Retain the desktop-first product direction; this is basic readability, not a mobile redesign.
3. Bring Colosseum rendering cost down and reduce Eiffel startup payloads. Add asset versioning so returning visitors cannot mix newly deployed JS with old cached models/manifests/audio.
4. Re-record the exact operation windows at normal speed with captions and sound, including a physical-phone and Twitter in-app-browser visit. Then choose a short clip around a clear operation and finished reveal. No export or post was performed in this review.
5. Prepare an intentional share image/title. The current HTML has a title/description but no explicit Open Graph or Twitter card metadata. Verify the actual draft link preview before posting; this audit did not test X's crawler or predict its fallback result.

Supplementary chrome-free Stonehenge frame at `t=.21055`: [26-stonehenge-crib-debug.png](26-stonehenge-crib-debug.png), showing the central crib gap; the numerical support measurements come from actual instance geometry.

## Verification and limits

- **Passed:** full `npm run test -- --maxWorkers=2` — **219 files / 1,174 tests**; `npm run typecheck`. Logs are in [validation/](validation/). Existing construction-only tests also passed 40/40 despite the new geometric findings.
- **Reproduced:** [construction-probe.ts](construction-probe.ts), independently rerun by the primary reviewer. Output: [construction-probe-root-verification.json](construction-probe-root-verification.json). Actual Giza triangle raycasts and Stonehenge instance transforms support the failure measurements.
- **Captured:** 23 primary current screenshots, inspected from saved files by the visual reviewer; supplementary measurement/information-panel captures remain in this directory. Rejected transition, resize and noncommitted range-input captures are explicitly named `rejected-*` and excluded. No prior screenshot was used as current visual evidence.
- **Verified live:** the public route, four-film list, sampled controls, twelve render-cost observations and seven deployed asset bodies matching local `dist`.
- **Not certified:** uninterrupted complete playback for all four films, auditory quality or narration/BGM sync, hardware FPS, physical iPhone/Android behaviour, 320 px Eiffel, reduced-motion runtime, screen-reader navigation, numerical contrast compliance, historical quote/fact attribution, or the actual Twitter link preview. Main film captures are paused/seeked states; they do not prove chrome remains visible during ordinary playback.
- **Console limit:** the browser log contains repeated anonymous-evaluation `ReferenceError: jw is not defined` entries without an application source URL. Attribution is unresolved; no clean-console claim is made. Saved in [browser-console-unattributed.json](browser-console-unattributed.json).
- **No new build:** this was a read-only application review; the existing production build was preserved for deployed-asset comparison. A post-fix build and full browser acceptance are still required.

Detailed role reports: [visual review](visual-review.md), [construction review](construction-review.md), [performance review](performance-review.md). Source boundaries remain pure engine/data, deterministic construction, stable IDs and Three.js rendering. Preserve the illustrated title mark, four-film publication gate, Giza home scene and Eiffel sunrise ending.
