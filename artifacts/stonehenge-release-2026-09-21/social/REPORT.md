# Twenty-second WonderForge montage — delivered

- [Final MP4](wonderforge-four-films-20s.mp4)
- [Thumbnail](wonderforge-thumbnail.jpg)
- [Contact sheet: first / middle / last of every shot](contact-sheet.jpg)
- [Local preview page](take-01/export/preview.html)

Captured after the deployment-ready signal from **https://wonderforge.pages.dev**, verified bundle **main-BR6Phg3M.js** on each film. Public capture ran **2026-09-20 18:44:18–18:49:10 UTC** (Sep21 JST), with zero browser or HTTP errors. Original images, source audio, hashes, rendered-camera diagnostics and public bundle proofs remain in [take-01/capture-report.json](take-01/capture-report.json) and its four scene directories.

| Montage interval | Actual film interval |
|---|---|
| 0–5s — Pyramids of Giza | 27–32s |
| 5–10s — Eiffel Tower Cinematic | 18–23s |
| 10–15s — Colosseum | 54–59s |
| 15–20s — Stonehenge | 55–60s |

Every shot uses **150 original frames at exact1/30-second steps** through the existing deployed renderer's deterministic route. All600 captured frames have distinct hashes. Authored poses, cameras, lighting and progression are preserved. Small wonder labels and the final two-second WonderForge/URL mark are editorial overlays; the full Sun and monument remain unobstructed. No control chrome or cursor appears. The12-image contact sheet and full-resolution last frame were inspected.

One continuous instrumental bed uses the existing project-created **Stonehenge cinematic score40–60s**, with0.6s fade-in and0.9s fade-out. Source was downloaded from the public deployment and retained. No narration. Encoded audio measures **−16.77LUFS integrated / −4.95dBTP**. The browser was externally muted; this is technical playback/loudness verification, **not subjective listening approval**.

## Validation

- **20.000000 seconds**, **600 frames**, **1920×1080**, **30fps**.
- H.264 High, yuv420p, BT.709; AAC stereo,48kHz; **18,285,094 bytes** (~18.3MB).
- MP4 faststart independently checked: `moov` at byte32 precedes `mdat` at byte23658.
- Local Chromium MP4 playback reached natural **ended=true at20s**, with600 decoded video frames, **0 dropped /0 corrupted frames**, decoded AAC bytes, and **0 browser/media errors**. [Browser evidence](take-01/export/browser-playback.json).
- [ffprobe and encoding evidence](take-01/export/validation.json), [container/frame checks](take-01/export/container-validation.json), [audio measurement](take-01/export/audio-measurement.txt).
- Final video SHA-256: `403ee7f1df242a0b9d83104feb19ed34b9cd1bdebc7d2123056fd029c1339e47`.

The first local captureStream method probe was clean1080p but had variable frame spacing; it is retained separately. Final footage uses exact original frames to produce consistent30fps. This worker did not deploy, upload or post the montage, and made no application edits.
