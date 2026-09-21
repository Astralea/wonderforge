# Merged culling mobile budget check

Successful rerun on development server5590 after the parent froze the coarser culling change. The same101 main-film samples,390×844/DPR1.35 mobile emulation, actual UI Pause/Seek and camera-pose waiting as the preceding sweep were retained.

- Peak rendered triangles: **299,438** at t=.97 (256.08s).
- Peak draw calls: **149** at t=.48 (126.72s).
- Sampled300,000triangle/150call gates pass, leaving562triangles/1call.
- No console/page errors or horizontal overflow.
- Two actual routed city responses,15,483,432bytes each, were hashed and fulfilled unchanged to the browser; both matched the public file before/after the sweep.
- CitySHA256: `90b16eaf72b63ac6c2da74ada94889de972fd8b2cbe5d0e6227873b4fc835115`.

`report.json` retains every sample and response; `comparison.json` compares the preceding sweep; peak screenshots are retained. The prior folder was untouched. This sampled resource gate does not prove every film instant or physical-phoneFPS. No production build, source or Blender edits were made by this QA pass.
