# Eiffel wrench ratchet — 2026-09-13

Local URL: https://wonderforge.localhost/#/wonder/eiffel-tower
Loopback preview on 127.0.0.1:5589. Served HTML references `main-BtnawkGY.js`
and `main-BqeLL_Kj.css`. No public hosting, push, or visibility change.

Owner asked whether the 19–26% bolt-tightening was dropped frames or a
low-rate animation. It was the animation. Playback is still 1× on rAF; the
old handle spun ~0.75 rev/s on a 12 cm stick, which reads as wagon-wheel
stutter. After 23% the source camera also pulls through the lattice.

## What changed

The worker now uses slow ratchet strokes (about 2.2s, ~106° power turn, hold,
lift, return). The spoken 8s cue maps onto campaign 122–126, while the source
camera is still on the joint. A longer L-shaped spanner follows the hand.
Hardware vertex batches skip while plates are still. Caption windows stay 8s.

24–26% leaves the joint toward the four pylons (second spoken cue). That
pull is required so the close lens does not clip later iron.

## Checks

- `npm run test -- --maxWorkers=2`: 205 files / 1,083 tests
- `npm run typecheck`
- `npm run build` → `dist/assets/main-BtnawkGY.js`, `main-BqeLL_Kj.css`
- Live 5589/HTTPS HTML matches those hashes

Screenshots: `desktop/film-s34p2.png` (19%), `film-s36.png` (20%),
`film-s38.png` (21%), `film-s40.png` (22%), `film-s43.png` (24%),
`film-s46p8.png` (26%).
