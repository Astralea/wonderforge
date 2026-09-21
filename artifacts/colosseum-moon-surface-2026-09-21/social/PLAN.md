# Moon v2 montage plan

Await root's accepted production deployment and exact bundle. No final capture before that signal. No application edits, deployment or social upload by this worker.

Capture **only Colosseum54–59s**,150 exact1920×1080 original renderer frames at30fps, using the stable public site's existing deterministic route. Verify the exact public bundle and loaded NASA texture bytes. Compare all150 actual rendered camera samples to the accepted original montage; retain the same label PNG.

Reuse the original encoded Giza27–32s, Eiffel18–23s and Stonehenge55–60s clips byte-for-byte from `artifacts/stonehenge-release-2026-09-21/social/take-01/export/`. Reuse the accepted20s AAC score packets from the original final MP4, preserving its instrumental excerpt and fades without another audio encode. Retain the original montage and all originals.

Encode only the new Colosseum clip using the previous H264/yuv420p/BT709/30fps settings, then concatenate/copy and mux. Output name: **wonderforge-four-films-20s-moon-v2.mp4**. Validate20.000s,600frames,1920×1080,H264/AAC,faststart, unchanged reused clip hashes and identical AAC stream hash. Review all12 first/middle/last keyframes plus original-v2 encoded Moon crops; run browser playback through natural end.

Lunar imagery credit: **NASA's Scientific Visualization Studio — [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/)**. Selected2019 LROC color map: [lroc_color_poles_1k.jpg](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_1k.jpg),1024×512,139,068bytes, SHA-256 `b246064f217f8d479df78c49c7c8595a8f5fbda008a72fd539978d2e121e0109`. Official page checked2026-09-21; this is an aesthetic color map, not raw photometry or date-exact lunar libration. Site information panel credit is handled by root.

```sh
node artifacts/colosseum-moon-surface-2026-09-21/social/capture-colosseum.mjs PUBLIC_BASE --deployed-ready --bundle EXACT_BUNDLE --take take-01
node artifacts/colosseum-moon-surface-2026-09-21/social/assemble-v2.mjs take-01
/opt/homebrew/bin/python3.12 artifacts/colosseum-moon-surface-2026-09-21/social/contact-sheet.py take-01
/opt/homebrew/bin/python3.12 artifacts/colosseum-moon-surface-2026-09-21/social/moon-comparison.py take-01
node artifacts/colosseum-moon-surface-2026-09-21/social/check-playback.mjs take-01
```
