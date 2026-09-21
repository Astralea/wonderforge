# New Paris city mobile render-budget check

Completed 2026-09-08 against development server `http://127.0.0.1:5590`.
Harness: `../qa-mobile-budget-dev.mjs`; command log: `../mobile-budget-dev.log`.

- Chromium, 390 × 844 viewport, DPR 1.35, mobile/touch emulation.
- Actual main Eiffel 264-second film, 101 evenly spaced seek positions.
- Paused through the actual UI button’s DOM click; native Seek input events.
  Each sample waited for actual renderer camera azimuth to match the verified
  film sampler, followed by three animation frames.
- Maximum 298,900 rendered triangles at `t = .97` (256.08 seconds).
- Maximum 149 draw calls at `t = .48` (126.72 seconds).
- Limits: 300,000 triangles and 150 calls. Both sampled gates pass.
- No console/page errors or horizontal overflow. Peak screenshots retained.

The network route fetched the city response, hashed its bytes, and fulfilled
that browser request with those same bytes. Both StrictMode requests delivered
15,483,432 bytes with SHA-256:

`90b16eaf72b63ac6c2da74ada94889de972fd8b2cbe5d0e6227873b4fc835115`

The public city file had this same hash before and after the sweep. Asset
identity therefore reflects the bytes given to the browser, not an HTML label.
`report.json` contains all samples, camera poses, response identities and gates.

The first sweep passed the numeric budget, but Chromium evicted response bytes
before the inspector body read completed. It was not accepted as complete:
its report, screenshots, harness and log remain in `inspector-cache-incomplete/`.
The successful rerun changed only QA response instrumentation.

This is a sampled renderer-resource check, not a proof over every film instant,
an FPS benchmark on a physical phone, or whole-scene artistic acceptance. The
sampled remaining budget is only 1,100 triangles and one draw call.
