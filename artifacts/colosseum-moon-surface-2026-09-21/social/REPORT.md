# Moon v2 montage — delivered

The Colosseum shot now shows recognizable lunar surface markings in the final H.264 video. The other three shots, labels, closing title and instrumental bed retain the accepted original edit. The original montage and its evidence remain untouched.

- [Final 20-second MP4](wonderforge-four-films-20s-moon-v2.mp4)
- [Thumbnail](wonderforge-thumbnail-moon-v2.jpg)
- [First / middle / last of all four shots](contact-sheet.jpg)
- [Decoded original / revised Moon comparison](moon-comparison.jpg)
- [Local playback page](take-01/export/preview.html)

## Public capture and preservation

After root's public-ready signal, captured only Colosseum **54–59 seconds** from **https://wonderforge.pages.dev**, bundle **main-D06KFf-n.js**, deployment **a4441d6d-aac3-4670-8f1a-8b81f1e03e04**. Capture ran **2026-09-21 05:23:54–05:25:21 UTC** using real Apple M2 Ultra GPU rendering at 1920×1080.

The 150 source frames follow the existing renderer's deterministic timeline at exact 1/30-second steps, from 54.000000 through 58.966667 seconds. All 150 hashes are distinct; all camera samples match the accepted original shot exactly, with maximum delta **0**. No scene poses, camera data or application code were modified by the export harness. Capture recorded **0 browser errors / 0 HTTP failures** and one existing Three.js shadow-map deprecation warning. [Capture, bundle and asset proofs](take-01/capture-report.json).

| Montage interval | Film interval | Treatment |
|---|---|---|
| 0–5 seconds | Giza 27–32 seconds | Original encoded clip copied byte-for-byte |
| 5–10 seconds | Eiffel Cinematic 18–23 seconds | Original encoded clip copied byte-for-byte |
| 10–15 seconds | Colosseum 54–59 seconds | New public Moon-surface footage; original label retained |
| 15–20 seconds | Stonehenge 55–60 seconds | Original encoded clip, final title and URL copied byte-for-byte |

The three reused clips originated from accepted public bundle **main-BR6Phg3M.js**. Their SHA-256 hashes match the originals. AAC packets were copied directly from the original final MP4: the continuous Stonehenge cinematic score excerpt at 40–60 seconds, with the existing 0.6-second fade-in and 0.9-second fade-out. Original and new AAC stream SHA-256 both equal `6955e34cf8eac6d9c1e0405cd493c88bcc56e0f2fbbdf2c1b40ed747fc769f8f`. No narration or new audio generation was introduced.

## Visual and media verification

Inspected the decoded first, middle and last frame of every shot. The Colosseum Moon retains visible dark and light surface regions after encoding; its first/middle/last comparison uses identical screen crops, enlarged 5× with nearest-neighbor sampling and no added detail. Wonder labels and the final project mark remain clear of the Moon, Sun and monuments. The full Stonehenge Sun remains in frame.

- **20.000000 seconds / 600 frames / 1920×1080 / 30 fps**.
- **H.264 High, yuv420p, BT.709; AAC stereo, 48 kHz**.
- **18,290,183 bytes**, SHA-256 `3e9ded3a44efe80b3a78eeaa7f41a91f1cf8f40249f37a9b2450b9ca43b6cc0b`.
- All 12 encoding, duration and preservation checks pass. [ffprobe, commands and hashes](take-01/export/validation.json).
- Faststart confirmed: `moov` at byte 32 precedes `mdat` at byte 23,768. [Container evidence](take-01/export/container-validation.json).
- Chromium playback reached natural **ended=true at 20 seconds**, decoded all **600 video frames** and AAC, with **0 browser/media errors / 0 corrupted frames**. It reported **2 dropped display frames** during the shared-machine check; this is not a device-performance acceptance claim. [Playback evidence](take-01/export/browser-playback.json).
- Delivery copies are byte-identical to the verified exports. [Delivery hashes](DELIVERY.json).

The browser was muted. Audio packet preservation and successful decoding are verified; no new subjective listening approval is claimed. This worker made no application edits, deployment or social upload.

## Lunar imagery attribution

**NASA's Scientific Visualization Studio — [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/)**. The selected [2019 LROC color map](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_1k.jpg) is 1024×512, 139,068 bytes, SHA-256 `b246064f217f8d479df78c49c7c8595a8f5fbda008a72fd539978d2e121e0109`. The browser loaded `/assets/lroc-color-poles-1k-RRPljFYe.jpg`; a separate public fetch returned HTTP 200 and identical bytes. The source is an aesthetic color map, not raw photometry; the authored near-side presentation does not claim date-exact lunar libration. Site information-panel credit was handled by root.
