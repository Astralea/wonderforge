# Eiffel reference adaptation — 2026-09-12

Local production preview: https://wonderforge.localhost/#/wonder/eiffel-tower
Build: `main-Da18Ym2y.js`, served by the existing loopback Vite preview on 5589
through Portless. No public hosting or source publication.

Read [reference-review.md](reference-review.md) for the nine-scene survey,
served-code stack evidence, loading mechanism and prioritized modeling work.

## Implemented scope

- Eiffel defaults to the existing 180-second cinematic edit; the long edition
  selector is hidden. Internal detailed timing, source assets and poses remain.
- Original Eiffel SVG silhouette fills with actual prepared-system milestones.
  Accessible pending category and percentage; two animation-frame boundaries
  allow the lightweight overlay to paint before synchronous Three.js setup.
  Existing failed-load recovery, cancellation and first-ready-frame gate remain.
- Only short Eiffel opts into a fitted directional shadow camera. Tiered bounds
  follow the actual tower kit and current operation; target snaps to map texels.
  Same light/map sizes/material settings. The original rig is restored otherwise.
- The small saved steam-drive assembly omits its caster when its estimated
  projected diameter is at most 12 CSS pixels in the short film. Closer and
  detailed views restore it; source triangles, batch poses and reception remain.
- The short film's portrait chapter scrollbar now has a warm thumb and
  transparent track.

## Verification

- Focused shadow/readiness/edit tests passed, including actual Three light-camera
  projections of kit bounds, 277m/300m upper-tower points, both shadow resolutions,
  close/support envelopes, and old-rig restoration.
- Actual saved steam-drive tests check close/wide/detailed restoration while
  preserving batch geometry, visibility, receiveShadow and all instance matrices.
- `browser-final.json`: eight production frames each at 1280x720 desktop and
  390x844 mobile. Reloaded at each viewport to select the correct asset profile.
  Final sample peaks: desktop **162 calls / 444,807 triangles**;
  mobile **147 calls / 293,222 triangles**. Existing sampled limits are
  200/450,000 and 150/300,000 respectively. These are renderer submission counts,
  including shadows, not frame-rate measurements or a full-frame sweep.
- `release-desktop-*.png` and `release-mobile-*.png` show the final build.
  `release-loader-outline.png` captures the final hollow-loader start.
  Earlier `loading-desktop.png` and `loading-mobile.png` show real delayed-asset
  readiness (the final outline is brighter). The temporary loopback server
  delayed actual model requests; loading kept the film clock at zero and
  advanced through 0/60/80 before readiness removed the overlay.
- Production HTTPS returns the current bundle with the local trusted certificate.
- Build passes with an existing large-chunk warning. Browser console contains
  the existing Three.js PCFSoftShadowMap deprecation warning; no page errors
  were observed in the readiness/seek checks.

Full suite: **196 files / 1,041 tests passed** (`npm run test -- --maxWorkers=2`).
Typecheck and build both passed. Full result is recorded in `tests-final.log`; typecheck and build
outputs are `typecheck-final.log` and `build-final.log`. The first unrestricted
worker run exhausted CPU during simultaneous browser work, causing test
timeouts; its log is retained as `tests-unbounded-workers.log`. The final run
uses two workers, without increasing assertion timeouts.

## Limits and next work

No new city/landmark model was authored in this pass. Repetitive Paris roofs,
plain ground, distant iron contrast and some tightly cropped intermediate
compositions remain visible. The reference review proposes bounded authored
Palais/exhibition and foreground-block work before a renderer migration.
No reference art, models, textures, music or source implementation was copied.
No phone hardware/FPS benchmark, universal shadow coverage claim, historical
asset approval or reference-quality parity is asserted.

## Bounded independent review

The visual-audit delegate reviewed the final shadow integration read-only and
reported no blocking issue. Its actual-asset probe found zero bound escapes
across 513 crank poses; quarter-second short-film sampling measured omitted
assemblies at no more than 8.46 CSS pixels desktop / 8.59 mobile. The distance
formula is an estimate rather than a universal off-axis projection guarantee;
future camera changes must recheck projected size.
