# Sydney black-frame causal diagnostic

Direct `WorldScene.update(t,t,t)` followed synchronously by 25 distributed 4×4 default-framebuffer reads. Each A/B uses the same 900 samples, `t = index / 3600` (first 15 seconds of a 60-second film), 1440×900, DPR 1, Chromium/ANGLE Metal on Apple M2 Ultra. Suspect grids trigger full-frame verification. No application source changed during these probes.

| Runtime variant | Black center | At least 24/25 black grid patches | More than 99% black full frame |
| --- | ---: | ---: | ---: |
| Baseline, MSAA 4 | 45 | 28 | 11 |
| Fresh composer targets, MSAA 0 | 45 | 28 | 11 |
| Bloom bypass, godrays retained | 0 | 0 | 0 |
| Godrays pass disabled | 45 | 28 | 11 |
| Safe sky denominator, all normal passes retained | 0 | 0 | 0 |

Baseline, MSAA 0 and godrays-disabled failures have identical sample indices. Every variant has zero GL errors, context losses, and unexpected framebuffer bindings. Bloom is the amplifier, not the original source.

Half-float target reads at frame 14 identify one NaN RGB pixel entering bloom at `(1175,397)` in bottom-origin framebuffer coordinates. Bloom spreads it from 3 nonfinite RGB components into 3,761,100 components after blending: 96.736% of the frame. Frame 13 is finite. Frame 17 has the same one-pixel source problem. Finite HDR peaks remain about 1.0488; no infinities or overflow are observed.

The runtime material replacement `(dir.y + 0.38)` → `(max(dir.y, 0.0) + 0.38)` in SydneySkyDome removes the lower-hemisphere division singularity. It removes all observed black frames and all NaNs in the input, bright, blur, composite and blended target checks at samples 13,14,17. The normal MSAA, bloom and godrays settings remain enabled.

Evidence: `summary.json`, each variant's `report.json` and PNGs, `hdr/hdr-inspect/report.json`, `sky-fix/summary.json`, and `sky-fix/sky-denominator-safe/report.json`.

Scope: this is a 15-second matched diagnostic on one desktop GPU/browser. Full-film desktop/mobile verification of the eventual application change remains necessary.
