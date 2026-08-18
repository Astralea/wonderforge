# Giza visual QA

## Result

`passed`

No open P0, P1, or P2 findings remain for the Giza construction movie or the reusable renderer path it exercises.

## Comparison contract

- Source of visual truth: `artifacts/reference-giza-aerial.jpg` (1,800 × 1,350), an aerial photograph of the Giza pyramid complex.
- Source use: real-site hierarchy, relative monument scale, diagonal three-pyramid arrangement, smaller queen pyramids, necropolis density, and the desert-to-city edge. The photograph is not a UI mock and is therefore not treated as a pixel-identical target.
- Implementation state: `#/debug/wonder/pyramids-of-giza/1`, fixed completion frame.
- Implementation capture: `artifacts/final-giza-reveal-clean.png` (1,505 × 1,541).
- Browser viewport: 1,505 × 1,541 CSS pixels at DPR 1.
- Normalized full-view comparison: `artifacts/giza-reference-vs-final.png`; both inputs are aspect-fitted into equal 768 × 768 evidence panels.
- Animation-state evidence: `artifacts/giza-keyframes.png`, combining fixed frames at t=0.34, t=0.82, and t=1. Focused crops are not substituted for these full-frame states because the important evidence is temporal: ramp use, staggered masonry placement, settlement, and the completed composition.
- Before/after evidence: `artifacts/giza-baseline-vs-final.png`.

## Fidelity surfaces

- Geometry and hierarchy: the three royal pyramids now read as separate monuments with reference-grounded relative scale. Khufu is largest, Khafre remains dominant but smaller, Menkaure is materially smaller, and the queen pyramids form a subordinate cluster.
- Construction semantics: seventy-plus thin masonry courses replace three monolithic stepped solids. Courses arrive from above, make contact, and settle; the active ramp carries loaded outbound workers and empty returning workers.
- Site composition: causeways, temples, mastabas, quarry, Sphinx, roads, green/city horizon, workers, dust, and birds build a layered background → monument → foreground scene.
- Color and lighting: the sky follows a controlled dawn → blue → mauve → orange path. Hue-preserving face shading and a golden direct-light term retain limestone readability through the reveal.
- Depth and shadows: the former viewport-sized black blob is replaced by a localized soft shadow. The island edge, site scatter, and ground shading no longer compete with the monument.
- Framing: scene-authored orbit turns and framing keep the complex uncropped on the tested desktop and 390 × 844 portrait viewports.
- Typography and chrome: no typographic target was supplied; existing cinematic chrome remains unchanged, legible, and subordinate to the diorama. Quote and facts content remains authentic and attributed.
- Asset fidelity: the deliverable remains procedural Canvas 2D vector art by design. The reference photograph is evidence only and is not shipped or rasterized into the scene.

## Iteration log

### Pass 1 — baseline

- P1: pyramids read as dark tiered cakes instead of monumental masonry.
- P1: the completion frame was obscured by an oversized near-black shadow.
- P2: a gray sky transition, repetitive mountain triangles, and generic foreground scatter flattened the scene.
- P2: construction lacked a plausible ramp/worker relationship and the camera framed all scenes with one fixed orbit.

Resolution: introduced the masonry-pyramid generator, ramp primitive, authored camera, stage-weighted construction, contact-timed dust, localized shadows, hue-preserving material shading, and a Giza-specific scene document.

### Pass 2 — authored Giza review

- P2: generic scatter still obscured the deliberate necropolis layout.
- P2: the Sphinx/bedrock mass read as one large block wall from some orbit angles.
- P3: the quarry depression was too dark and circular.

Resolution: disabled generic scatter for Giza, split and repositioned the Sphinx bedrock accents, and changed the quarry to a shallow ground-colored cut.

### Pass 3 — acceptance

- No P0, P1, or P2 findings in the reference comparison, keyframe montage, or portrait capture.
- Residual P3: the Sphinx is intentionally small at a few azimuths because the full complex is the hero, not a single monument.

## Functional and accessibility QA

- Play/pause: passed; seek value remained stable while paused (`0.731106…` before and after 700 ms).
- Facts drawer: passed; opens with a complementary landmark and a named `Close facts` control.
- Previous/next navigation: passed; Giza → Stonehenge → Giza routes resolved correctly.
- Fixed-time authoring route: passed for t=0.34, t=0.82, and t=1.
- Application console: zero localhost warnings/errors. Forty-three historical entries were browser-extension noise and excluded from the application finding set.
- Automated gates: 134 tests passed; TypeScript check passed; production build passed.

