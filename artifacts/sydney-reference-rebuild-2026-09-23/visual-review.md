# Reference and film review

## Completed geometry and geography

The owner supplied the comparison photographs. Reviewed the actual runtime in northwest aerial, low west, north, east, south and roof-plan views, rather than accepting the Blender viewport alone. The first Blender delivery was rejected internally and retained in `model-first-delivery/`; its open flank holes, oversized dark louvre planes and grandstand-like northern terraces were corrected.

The present roof plan has two unequal splayed hall envelopes and staggered northern ends. The concert hall is west and taller; the restaurant is a separate southwest group. Nested north-facing shells rise toward the large central tips, with opposing southern tails. Curved northern foyer volumes now sit under the glass mouths. The podium has banded vertical sides and southern stairs. All twenty shell pedestals have authored deck support. Production FrontSide raycasts confirm the foyer walls exist down to their foundations: the dark areas under their fronts are shadows, not missing supports.

The rounded northern site connects to land only at the south. Nearby water is continuous west, north and east. The map-derived distant shores and bridge are contextual approximations; they are no longer wrapped tightly around the house. The quay wall is continuous and road surfaces follow the actual terrain triangles. Connected garden canopy groups preserve the open work yard.

## Remaining visual approximations

This is a recognizable stylized reconstruction, not a close photographic rendering or as-built model. Glazing is dark and shallow, without the photographed warm lobby depth. Podium relief is simplified, roof facets/shading bands remain more prominent than real fine tiles, background vegetation is simplified, and the water glitter is stronger than in the supplied photographs. The modern western colonnade visible in the aerial is not a required feature of a 1973 reconstruction.

These qualifications come from both root inspection and an independent read-only in-session review. Do not label numeric tests as photographic likeness evidence.

## Film acceptance

Final production playback inspection and build identity are recorded in README.md after the construction-joint pass. The reference captures use completed geometry with fixed daylight; they do not establish natural playback or dawn-to-dusk behavior by themselves.


## Consecutive-frame correction

Still-frame acceptance was insufficient. Natural playback, canvas recordings and
immediate framebuffer reads all exposed black flashes. The cause was a singular
lower-hemisphere cloud projection in SydneySkyDome: a single NaN pixel spread
through bloom. A matched 900-frame A/B and direct HDR readbacks established the
cause, then verified the bounded-denominator fix with bloom/MSAA retained.
The GPU regression in `tests/sydney-sky-finite.browser.mjs` fails before and passes
after the fix. Final complete-film evidence uses bundle `main-B7n23WDI.js` under
`final/sky-fixed/`; earlier black-frame videos are retained as rejected evidence.
