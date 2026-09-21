# Eiffel ending and native-speed BGM — 2026-09-09

Review: https://wonderforge.localhost/#/wonder/eiffel-tower

The globally installed Portless runs `wonderforge` against Vite on loopback port4853. No package/plugin installation or public deployment. The actual HTTPS endpoint returns HTTP200 with the Portless header. The app open request was queued, not confirmed visible in the owner window.

## Changes

The previous100% and99.5% frames were complete, but the last mast assembly continued until823.426771s, leaving only6s for completion. The preceding post-insertion upper montage now supplies6s to the ending. All original construction identities and routes remain; the featured final operation retains its45.766398s internal clock and seats at817.426771s. Total Detailed duration remains829.4267707s; Cinematic remains180s. A4s camera recovery is followed by8s of completed wide view. Closing quotation and Complete label follow actual seating/recovery. No model or audio assets were replaced.

Cinematic BGM now stays at native playbackRate1 between explicit seeks. Speed controls do not seek or restart music. A seek revision separates deliberate scrubbing/replay/edition changes from ordinary animation ticks. Pause, loading and completion pause BGM; mute preserves its clock. Autoplay retries cannot accumulate or reappear after cleanup. Narration behavior is unchanged.

## Verification

- Full final suite:1022/1022 tests across193files; typecheck and production build pass. Build output is main-BVcatfSk.js. Portless serves the current Vite source, not that production bundle.
- `final-verified/report.json`: actual Chromium1440×900 and390×844, four ending frames per viewport, zero page errors; all six1×/2×/4× audio checks pass. Music advanced within0.001s of measured wall time while actual animation state advanced. Both viewports' completed images were inspected. These are bounded samples, not native-device/FPS or full-film listening certification.
- `final-verification.json` records current source and build hashes.
- Earlier evidence is retained: `before/` is original ending captures; `audio-native/` had a false1× animation assertion from the rounded slider; `verified/` used a separate Vite store instance and failed animation-state assertions despite correct media timing. `final/` was interrupted by development hot reload. The final harness imports the exact playback-module URL loaded by the page, and `final-verified/` is the passing run.
- `full-tests.log` is the earlier1018-test pass before the ending/extra lifecycle tests; `full-tests-final.log` is authoritative.

No Blender work was required for these timing/audio fixes. Existing long/short editions, source Blender files and prior captures remain.
