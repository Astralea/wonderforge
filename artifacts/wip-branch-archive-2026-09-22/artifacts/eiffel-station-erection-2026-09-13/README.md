# Eiffel ground stations built from empty pads — 2026-09-13

Local URL: https://wonderforge.localhost/#/wonder/eiffel-tower
Loopback preview on 127.0.0.1:5589 through the existing Portless route.
Served HTML references `main-BnZnDmLd.js`. No public hosting, push, or visibility change.

Owner asked why four complete lifting machines were already standing at the
four corners when the film starts. They should be built from scratch.

## What changed

Specs 45 and 46 no longer treat the opening as a prepared worksite. The
cinematic 0–9s now seats the 219-member braced falsework plus pickup deck as
full-size members from the ground up, then reveals Guyenet subassemblies in
supported order, then starts the existing four-station deliveries at 9s.

The combined GLB falsework mesh stays hidden until those members have all
seated; carts, crews and ropes stay hidden until the stations are operational.
Detailed still omits installation behind its existing cards.

## Checks

- `npm run test -- --maxWorkers=2`: 205 files / 1,080 tests
- `npm run typecheck`
- `npm run build` → `dist/assets/main-BnZnDmLd.js`
- Live 5589/HTTPS HTML matches that bundle hash
- Desktop 1280×720: 9 frames, 0 page errors, peak 119 calls / 221,737 triangles
- Mobile 390×844 smoke: 4 frames, 0 page errors, peak 74 calls / 185,713 triangles

Logs: `qa-report.json`, `qa-summary.json`.

## Opening chronology (browser)

| Seconds | Progress | What the frame shows |
|---:|---:|---|
| 0 | 0% | Empty Champ de Mars; no cranes |
| 2 | 1% | Four low timber falsework towers starting |
| 4 | 2% | Same four towers growing |
| 6 | 3% | Frames nearly complete; crane still assembling |
| 8 | 4% | Guyenet machines on the four frames |
| 9 | 5% | Stations complete; deliveries can begin |
| 10.8 | 6% | Approach into a working leg; all four plants visible |
| 18 | 10% | Working-leg close; caption on the lifting frames |

## Limits

Falsework pieces appear at their final full size when seated, not each hauled
on its own cart. Crane parts appear by supported role after the pads exist.
Once every falsework member is seated, the authored GLB falsework replaces the
temporary box stand-ins. Dismantling, and later first/second-floor plant
erection, remain omitted. Second-floor-to-summit freight is unchanged.
