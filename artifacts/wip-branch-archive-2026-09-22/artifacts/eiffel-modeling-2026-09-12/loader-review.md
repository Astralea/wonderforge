# Eiffel loading wave — real browser verification

Verified 2026-09-12 against production `main-D3yVpM5l.js`, using actual
dist/model bytes through a temporary loopback-only preview on port 5590.
The second-floor relay request was delayed 65 seconds and Eiffel kit GLB
requests 8 seconds. No page DOM, percentage, playback store, or hidden app
state was modified.

## Result

The first browser check caught an actual SVG bug: putting a `g` inside
`clipPath` made Chrome render no warm fill, even though the path's computed
animation transform advanced. `loader-desktop-stall-a/b.jpg` retain that failed
build (`main-EVuU43h7.js`).

The corrected wave is a direct child of `clipPath`. The measured-height
translation belongs to the clipPath; only the path moves horizontally.
Ten focused readiness/loader tests pass after this correction. The parent
rebuilt production before the final browser check.

- Desktop 1440 × 900: captures 8.122 seconds apart both show 80% and film `t=0`.
  Wave translation changes from −75.6 to −16.3511 SVG units. A third capture
  remains at 80%/`t=0`, and the DOM clip height remains 57.6 SVG units.
- Mobile 390 × 844: captures 33.543 seconds apart both show 80%, `t=0`, and
  clip translation `translate(0 57.599999999999994)`. Wave translation changes
  from −32.9956 to −58.5933 units.
- I inspected both actual screenshots and enlarged edge crops. The warm edge
  visibly shifts while staying within the tower. The central arch stays hollow.
- After the delayed requests complete, desktop and mobile both report
  `data-assets=ready`, the loading layer disappears, and the film advances.
  Ready screenshots are included.

## Evidence and limits

`loader-records.json` contains timestamped DOM observations and served bundle
URLs; `loader-verification.json` records comparisons and source/build hashes.
`loader-*-fixed-stall-*.jpg` are actual browser captures.
`loader-*-wave-edge-*.png` are nearest-neighbor enlarged extracts only;
they are not replacement or synthesized browser frames.

The available browser capability supports viewport testing but not reduced-motion
emulation. Reduced-motion CSS rules and static-fill semantics are tested; the
native media preference was not visually emulated. No claim is made that SVG
clip animation runs entirely on the compositor during synchronous CPU work.
The verified behavior is continuous visible activity during stalled real asset
requests.

Initial/final heavy scene preparation caused transient browser inspection
timeouts; the same live tab recovered without a restart. Anonymous `jw is not
defined` messages appeared in the browser console without app source URLs.
They are retained in `loader-console.json`; this is not a clean-console claim.
No scene-loading error alert appeared.

The browser viewport was reset, the owned test tab closed, and the temporary
5590 server stopped (process exit 130; subsequent listener check empty).
Portless and port 5589 were left untouched.
