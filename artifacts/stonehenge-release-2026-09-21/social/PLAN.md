# Four-film montage — approved plan

Final capture waits for root's deployment-ready signal and exact public bundle. No social post or deployment by this worker.

| Montage | Actual film | Authored film seconds |
|---|---|---|
| 0–5s | Pyramids of Giza | 27–32 |
| 5–10s | Eiffel Tower, default Cinematic | 18–23 |
| 10–15s | Colosseum | 54–59 |
| 15–20s | Stonehenge, corrected Sun framing | 55–60 |

Each five-second clip uses 150 exact samples at 30fps. No altered poses, motion interpolation, invented footage, replacement sky, camera changes or app edits. Existing deployed `#/debug/wonder/:id/:t` route uses the same ThreeCanvas/WorldScene renderer and default Eiffel cinematic mapping while omitting DOM chrome. Same 1920×1080 viewport and real Apple M2 Ultra GPU throughout. Per-frame hash, normalized/source time, route, actual camera and bundle proof retained.

A permitted local ~2s canvas.captureStream probe produced clean1920×1080 VP9 at29.98 averagefps, but17–58ms timestamp spacing. Exact frame capture was chosen to remove capture cadence jitter. Four local deterministic-frame probes also completed with zero errors; local probes are not final footage.

Small wonder names remain in the lower-left with a restrained dark edge gradient. Final two seconds add WonderForge and the verified public hostname at lower-right, away from the Sun and monument. Hard cuts preserve four full5s clips; only the final branding fades in.

Audio: existing original `stonehenge-cinematic.mp3`, source40–60s, downloaded from the verified public site; no narration. Fade in0.6s, out0.9s. No new audio generation. Preserve original source file/hash; measure final loudness and true peak. Source metadata identifies the project-created Lyria3Pro instrumental score; no Civilization assets. No subjective listening claim without listening.

Delivery: exactly20.000s,600frames,1920×1080,30fps,H.264 High/yuv420p,AAC stereo48kHz,faststartMP4; JPEG thumbnail, visual contact sheet, original PNG frames and technical validation report. No publication.

Commands after the root signal:

```sh
node artifacts/stonehenge-release-2026-09-21/social/capture-frames.mjs PUBLIC_BASE --deployed-ready --bundle EXACT_BUNDLE --take take-01
node artifacts/stonehenge-release-2026-09-21/social/assemble.mjs take-01
```
