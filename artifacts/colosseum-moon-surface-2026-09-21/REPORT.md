# Colosseum lunar surface repair — 2026-09-21

The Colosseum Moon now has recognizable dark lunar plains and crater markings, with reflected surface brightness instead of a Sun-like glow. The checked change is deployed at https://wonderforge.pages.dev/#/wonder/colosseum. See [the actual before/after comparison](visual/moon-before-after.png).

## Asset and rendering

The unchanged 2019 native 1024×512 JPEG from the [NASA CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/) is bundled locally: 139,068 bytes, SHA-256 `b246064f217f8d479df78c49c7c8595a8f5fbda008a72fd539978d2e121e0109`. Production path: `/assets/lroc-color-poles-1k-RRPljFYe.jpg`. Colosseum's Info panel credits NASA's Scientific Visualization Studio and links to the source. The original download, usage guidance, independent orientation probes and map conventions are documented in [research/REPORT.md](research/REPORT.md).

The existing projected sphere supplies geometric phase shading. Its new spherical albedo projection uses the NASA map, lowered and bounded lunar radiance, and a surface basis tilted with the observer's view. There is no new Moon model or runtime external service. A Meshy model was not selected; the existing sphere already supplies the geometry needed for this small sky disc.

The existing camera, sky position, angular size, approximately 99.1% illuminated waning phase, construction clock and Moonrise timing remain unchanged. Surface orientation is a mean-nearside approximation, not full date-specific libration. The fixed pole-angle approximation differs from separately queried Horizons probes by at most 0.123° over the sampled closing window, 0.091° at the exact endpoint; this is a comparison with the model, not an ancient observational accuracy claim.

The scene waits for the image before normal playback. Failed image loads settle to a bounded procedural fallback; successful and late-arriving textures have explicit disposal. Specs 00/12 record the authorized photographic-asset exception and acceptance contract. Source files and the exact reviewed asset are fingerprinted in `source-fingerprints.json`; the workspace contains substantial pre-existing work.

## Verification

- **245 files / 1,313 tests pass**, two workers, 224.01 s. Typecheck, production build and `git diff --check` pass. Build retains the existing large-chunk advisory.
- Nine actual film UI comparisons span desktop 1440×900, 1920×1080 and portrait 390×844 at 54, 57 and 60 seconds. All camera/ephemeris diagnostics and projected disc bounds match the previous release exactly. Broad lunar markings remain visible at native size. [Visual review](visual/FINAL-VISUAL-REVIEW.md).
- Opening Sun, morning and midday captures (`t=0`, `.02`, `.4`) are pixel-identical to the previous production build. Desktop and portrait reverse seeking and normal-speed closing playback pass, with no unexpected browser/asset errors. NASA credit fits the portrait Info panel.
- Image-failure browser QA reaches a rendered, playable fallback. Browser hash navigation away while the image is deliberately held also passes, with no later scene error. Unit tests independently check readiness, failure settlement, exactly-once disposal and late-image release. See `lifecycle/results.json`. The failure run intentionally records one aborted-image network error.
- Preliminary lifecycle harness attempts encountered hidden controls, the arrival overlay, browser Escape behavior under an artificially stalled load, and an expired preview process. Those logs are retained. Final route-disposal evidence uses hash navigation; it does not claim that clicking through the arrival overlay or Escape during a stalled document load was verified.

This is host-browser desktop/portrait verification, not physical-phone certification or the full formal Spec 04 art gate.

## Public deployment

Production deployment `a4441d6d-aac3-4670-8f1a-8b81f1e03e04`, immutable URL https://a4441d6d.wonderforge.pages.dev/, stable URL https://wonderforge.pages.dev/. Bundle `main-D06KFf-n.js` is byte-identical to checked dist. Direct upload used the existing production branch `wonders/quality-colosseum-stonehenge-petra`; the Git base displayed by Cloudflare does not represent all dirty-workspace changes. No Git commit or push was made. GitHub remains PRIVATE.

The deployment audit contains 146 files, 117,844,466 bytes, no source maps or sensitive-pattern hits, and no private authoring directories. The largest file is the pre-existing 24,613,451-byte Eiffel manifest. A pre-existing Eiffel GLB contains an authoring path; this task did not add it. `deployment/public-verification.json` confirms public bundle and lunar-image bytes, credit, all 19 selected narration hashes, social metadata/image, a sample model and cache headers.

## Refreshed montage

The new Colosseum shot was captured from this verified public deployment: 54–59 seconds, 150 exact renderer frames, zero camera difference against the original take. The existing three other clips and instrumental AAC packets were reused byte-for-byte. The previous montage remains unchanged, SHA-256 `403ee7f1df242a0b9d83104feb19ed34b9cd1bdebc7d2123056fd029c1339e47`.

New delivery: `social/wonderforge-four-films-20s-moon-v2.mp4`. Export: `social/take-01/export/wonderforge-four-films-20s-moon-v2.mp4`. **20.000 seconds, 600 frames, 1920×1080, 30 fps, H.264/yuv420p, AAC 48 kHz stereo, faststart**; 18,290,183 bytes, SHA-256 `3e9ded3a44efe80b3a78eeaa7f41a91f1cf8f40249f37a9b2450b9ca43b6cc0b`. The 12-frame contact sheet and decoded first/middle/last lunar crops pass visual inspection; lunar markings survive encoding. [Media report](social/REPORT.md).

Browser playback reached its natural 20-second end, decoded all 600 video frames and audio, and reported zero media/browser errors and zero corrupted frames. It reported 2 dropped display frames in the shared-GPU run; this is not a device-performance or subjective-listening certification. Exact results are in `social/take-01/export/browser-playback.json`. No Twitter post was made.
