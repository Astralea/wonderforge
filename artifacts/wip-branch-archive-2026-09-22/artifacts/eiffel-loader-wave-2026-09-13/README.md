# Eiffel loading waterline and 20% close-up — 2026-09-13

Local URL: https://wonderforge.localhost/#/wonder/eiffel-tower
Loopback preview on 127.0.0.1:5589. Served HTML references `main-1A9PC1h7.js`
and `main-BqeLL_Kj.css`. No public hosting, push, or visibility change.

Owner asked why the loader still had no visible wave (was it stuck?) and why
the film around 20% felt frozen.

## Loading

The CSS transform was already moving. The crest was invisible: a 1.2rem gold
ribbon, masked as a stretched overlay that missed the letterboxed elevation,
sitting on the empty sole at 0%. The opening stall is often 0%, so the tower
looked like a hollow outline.

The crest is now a viewBox-aligned SVG graphics group (not a `clipPath` child,
not under `backdrop-filter`) with compositor `translate3d`, a short gold band
on the lower legs at 0%, and a 16-unit sine. Mean fill height still follows
measured progress. CSS only; no rAF timer. 100% stays still; reduced motion
hides the crest.

Stalled desktop captures at unchanged 0% and 50%: wave `translateX` −9 → −50
(0%) and −10 → −52 (50%) over 0.7s. Cropped tower frames show the crest
sliding on the feet (0%) and on the first-platform fill (50%).

## 20% close-up

Not a GPU hitch. The camera was punched to a 26° lattice hold on a wrench that
only rocked ±9° (~1.4 cm). After 126s campaign time the handle stopped while
the caption kept talking until 42s.

The wrench now turns about the bolt through campaign 122–130 (handle radius
0.12 m). The close-up floor is 34° with a looser fit so the worker reads
against the iron. Caption window stays 8 seconds. Live 35/36/38s frames:
wider deck, changing lean, still the same spoken cue.

## Checks

- `npm run test -- --maxWorkers=2`: 205 files / 1,082 tests
- `npm run typecheck`
- `npm run build` → `dist/assets/main-1A9PC1h7.js`, `main-BqeLL_Kj.css`
- Live 5589/HTTPS HTML matches those hashes

Logs: `observations.json`. Screenshots: `desktop/zero-a.png`, `zero-b.png`,
`zero-tower-a.png`, `zero-tower-b.png`, `half-a.png`, `half-b.png`,
`half-tower-a.png`, `half-tower-b.png`, `film-s35.png`, `film-s36.png`,
`film-s38.png`.
