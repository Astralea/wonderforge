# Colosseum Moon surface — preserved baseline

Source: local production `http://127.0.0.1:5590/#/wonder/colosseum`, bundle `main-BR6Phg3M.js`. Nine actual UI captures at film `.90`, `.95`, `1` and 1440×900, 1920×1080, 390×844. All captured with device scale 1; no browser errors. This is an appearance review, not a device performance result.

At native viewing size the desktop Moon reads as a nearly uniform white light with a broad glow. Portrait has little visible halo, but is still a plain pale disc. The current illustrative high-frequency noise does not provide recognizable lunar maria at the actual rendered diameters: about 30–31 px desktop, 36–38 px 1080p, and 23–24 px portrait. At `.95`, the 1080p disc interior's sRGB luma Q90−Q10 is only 4.14/255; that is tonal compression/uniformity, not literal clipped-white pixels. The sky annulus outside the disc is visibly brightened by desktop bloom.

The requested correction should use broad recognizable lunar albedo structure and reduce radiance enough to preserve that structure through the production tone mapping/bloom. Fine crater noise alone will not resolve at these sizes. Preserve the actual near-full waning gibbous phase (~99.1% illuminated), Moon position, common 2.4× angular enlargement, camera, and night scene lighting. An invented crescent would contradict the selected evening and phase contract (Spec 12, celestial coordinate and presentation contract).

Primary proof:

- `before/desktop-t1.png` and `before/desktop-t1-moon-crop.png`
- `before/1080p-t0.95.png` and `before/1080p-t0.95-moon-crop.png`
- `before/portrait-t1.png` and `before/portrait-t1-moon-crop.png`
- `before/results.json`: every frame, script identity, ephemeris, camera, projected complete limb, UI bounds, and errors.
- `before/pixel-measurements.json`: rendered luma diagnostics, with method and limitations.

The full disc clears the top letterbox at the end: desktop limb y70.78 vs bar bottom54; 1080p y84.94 vs64.8; portrait y129.90 vs50.64. No camera correction is needed for this task.
