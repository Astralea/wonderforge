# Eiffel sky refinement — 2026-09-08

The current isolated GPU sky view shows broad blurred pale cloud patches with
little thickness variation. Refine only the Eiffel dome shader: modestly smaller
broken cloud formations, denser shaded cores and edge lighting coherent with the
existing scene sun. This remains a low-cost authored cloud field, not volumetric
weather simulation or evidence of a particular1889day.

Preserve the current neutral blue-grey horizon, blue sky above approximately
three degrees, fog-color join, mean apparent solar radius and existing day clock.
No camera, tower, city, shared postprocessing or other wonder changes. Preserve
one dome draw and existing geometry budget. Capture actual desktop/mobile GPU
before/after at dawn, morning, noon, dusk and night, multiple headings; verify
shader compile, deterministic reverse clock and unchanged below-horizon pixels.
