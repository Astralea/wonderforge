# Main Eiffel film camera — 2026-09-08

Main264s film uses a continuous C1, monotone125degree orbit, including inserted
construction chapters. The first205s cover50degrees to keep the real payload,
workers and rig visible; the final wide sequence reaches105degrees. Framing
is recomputed for actual azimuth and aspect, including the82s envelope handoff.
This fixes the main film, not only an isolated camera sampler.

Before evidence: audit-before.json and web-before/. Numeric evidence: audit.json
and29camera-focused tests. Full745tests/126files, typecheck and build passed
before the subsequent terrain-filter addition. mechanical-seal-check.json
verifies all15 unchanged joint-campaign seal entries.

Actual production UI QA on main-CBj4-Uf2.js:
- production/qa-desktop.json:1440x900,11seeks plusSpace playback.
- mobile-production/qa.json:390x844,11seeks plusSpace playback.
- Actual post-render camera matches sampler positions within1e-5; no pageerrors
  or horizontal overflow. Playback advances azimuth.
- Parent visually checked desktop145/200/240 and mobile145; agent checked mobile
 145/200/240/264. Cart/workers, crane and full tower remain framed.

Failed harness artifacts are retained. Direct Vite import of the Zustand store
controls a separate module instance; use the actual UI. Wake chrome beforeSpace
and verify resulting status. render-qa failure is not a product camera failure.

Scope: the complete Eiffel construction/Paris goal is still active. Numeric
cameraContractPass is not a statement that all construction is physical or
that the city is photographically accurate. No new wonder started.
