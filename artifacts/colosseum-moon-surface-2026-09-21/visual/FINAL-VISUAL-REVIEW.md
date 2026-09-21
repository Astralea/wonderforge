# Colosseum lunar appearance — visual acceptance

**PASS for the requested Moon repair.** Candidate production `main-D06KFf-n.js` on local preview 5590 replaces the featureless luminous disc with a recognizably lunar surface. The dark maria survive at native desktop, 1080p and portrait sizes. Reduced radiance removes the Sun-like halo without losing the Moon against the sky. No further visual correction is requested within this task.

Baseline: production `main-BR6Phg3M.js`, preserved before the build. Candidate and baseline were captured in the actual film UI at `.90`, `.95`, `1` (54, 57, 60 seconds), at 1440×900, 1920×1080, 390×844, device scale 1. All nine candidate full frames and representative disc crops were inspected. Additional runtime checks used desktop/portrait UI and three deterministic daytime frames. This is scoped appearance/runtime acceptance, not a complete Spec 04 score or hardware performance claim.

## Evidence and verdict

| Check | Result and evidence |
|---|---|
| Native Moon recognition | Pass. Clear broad lunar markings at actual disc diameters ~30–31 px desktop, 36–38 px 1080p, 23–24 px portrait. `candidate/desktop-t1.png`, `candidate/1080p-t0.95.png`, `candidate/portrait-t1.png`. |
| Low evening / late night | Pass. The low `.90` Moon is softened by the brighter atmosphere; it becomes more contrasty as the sky darkens at `.95` and `1`. No conspicuous black disc, artificial crescent or bright solar halo. `candidate/*-t0.9.png`, `candidate/*-t0.95.png`, `candidate/*-t1.png`. |
| Preserved astronomy and framing | Pass. All nine camera and Moon-ephemeris diagnostics are identical to baseline; every projected limb bound has exactly zero delta. Phase remains ~99.1% illuminated, waning. Disc/header clearances are unchanged. `candidate/comparison.json`. |
| Surface and glow through production rendering | Pass. At 1080p `.95`, interior sRGB luma Q90−Q10 increases 4.14→65.19/255. At 1080p `1`, halo-annulus excess over local sky falls 51.13→0.21/255. These are supporting pixel diagnostics, not calibrated photometry. `candidate/pixel-measurements.json`, `candidate/comparison.json`. |
| Loaded asset | Pass. Both UI runtimes received `/assets/lroc-color-poles-1k-RRPljFYe.jpg` with HTTP 200, 139,068 bytes. Observed sky mesh `lunarSurfaceStatus=ready`, uniform readiness 1, texture 1024×512. `runtime/results.json`. |
| Daytime Sun and scene | Pass. Visible opening Sun at `t=0`, morning `t=.02` and midday `t=.4` screenshots are pixel-identical to the still-public BR6 baseline: zero changed RGBA channels. `runtime/visible-sun-comparison.json`, `runtime/sun-image-comparison.json`; inspect `runtime/candidate-sun-t0.png`. |
| Reverse seek / playback | Pass. `.90→1→.90` restores identical complete recorded diagnostics and texture state on desktop and portrait. `.4` restores the Sun key and construction progress. Both actual 1× `.86→1` runs reached completion with monotonically increasing film time and ready surface, 33 recorded samples each. Zero console/page errors. `runtime/results.json`, `runtime/*-playback-end.png`. |
| Portrait image credit | Pass. The full NASA imagery credit and link fit in the 390×844 information panel, with no horizontal overflow or overlap. `runtime/portrait-info.png`. |

## Owner-facing comparison

`moon-before-after.png` pairs the actual 1080p `.95` crops at native size and 3× enlargement. Both full original captures are retained. This is an evidence collage; the source screenshots have not been retouched.

## Limits and scope

The requested near-full phase must remain near-full; an invented crescent would conflict with Spec 12/49. The map improves visual recognition without establishing exact ancient lunar libration or surface orientation. That approximation belongs to the implementation/provenance contract and is separate from verified sky position and phase. Failure-to-load and leave-while-loading cases are owned by the root reviewer and are not claimed here. No source edits, deployment, or posting were performed by this reviewer.

An initial runtime harness attempt tried to click controls after their hover state expired; it timed out because the canvas intercepted the click. The harness was corrected to move the pointer into the transport area, and both final runtime runs passed. The partial initial evidence is retained as `runtime/initial-partial-results.json`.

## Public deployment verification — 2026-09-21

**PASS on the stable public URL** `https://wonderforge.pages.dev/#/wonder/colosseum`. After the root deployed the accepted candidate, this reviewer loaded fresh desktop 1440×900 and portrait 390×844 browser pages and captured the completed film UI. Both loaded exactly `main-D06KFf-n.js`, returned HTTP 200 for `lroc-color-poles-1k-RRPljFYe.jpg`, and exposed the ready 1024×512 texture with readiness uniform 1. Both had zero console/page errors.

The public endpoint screenshots were visually inspected. Lunar surface recognition, subdued brightness, phase and header clearance match the accepted candidate. Camera and Moon ephemeris are identical; both padded Moon crops are **pixel-identical** to candidate captures, with zero changed RGBA channels.

Evidence: `public/desktop-t1.png`, `public/portrait-t1.png`, their `*-moon-crop.png` crops, and `public/results.json`. Harness: `verify-public.mjs`. This was a narrow deployment check of the changed Colosseum ending; broad film QA was not repeated. The root independently owns deployment identity and HTTP byte verification.
