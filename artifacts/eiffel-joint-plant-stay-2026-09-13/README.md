# Eiffel joint close-up: keep the plant, show the wrench — 2026-09-13

Local URL: https://wonderforge.localhost/#/wonder/eiffel-tower
Loopback preview on 127.0.0.1:5589 through the existing Portless route.
Served HTML references `main-BcvVkS_p.js`. No public hosting, push, or visibility change.

Owner asked why 15–17% struck four scaffolds and then showed one, and whether
the ~20% close-up hitch was a GPU stall or a slow/idle animation.

## What was wrong

At 28s the production clock left the ground-lift freeze. The four-station
system hid as soon as `productionT` passed that freeze, then the joint chapter
drew one Guyenet on the same NE pad. That reads as demolish-four / rebuild-one.

The 8-second joint caption (34–42 viewer seconds) was mapped onto campaign
~116–126. Around 20% (36s) that is ~118.5, inside a static grip hold. The
camera is already a tight 26° lens, so a still worker looks like a freeze.
Draw cost at that shot is ~109 calls / 64k triangles — not a stall.

## What changed

Ground stations stay through the joint production freeze. During the joint
chapter the renderer hides only the four-station NE copy; the joint system
owns that crane. NW, SW and SE remain. The caption now covers campaign
122–126 (the wrench), not the idle grip. Four source seconds of tightening
fill eight spoken seconds, so the wrench is slower than 1:1, but it is no
longer a held plate.

## Checks

- `npm run test -- --maxWorkers=2`: 205 files / 1,082 tests
- `npm run typecheck`
- `npm run build` → `dist/assets/main-BcvVkS_p.js`
- Live 5589/HTTPS HTML matches that bundle hash
- Desktop 1280×720: 7 frames, 0 page errors, peak 145 calls / 223,643 triangles
- Mobile 390×844 smoke: 3 frames, 0 page errors, peak 127 / 185,302 triangles

Logs: `qa-report.json`, `qa-summary.json`.

## Chronology (browser)

| Seconds | Progress | What the frame shows |
|---:|---:|---|
| 27 | 15% | Four ground stations still standing |
| 28.8 | 16% | Same four stations; none struck |
| 30.6 | 17% | Four plants still on the Champ (NE is the joint copy) |
| 34 | 19% | Joint close-up; wrench work begins |
| 36 | 20% | Tight joint shot; worker on the platform with the tool |
| 40 | 22% | Same close-up, still in the spoken cue |
| 48 | 27% | Pull back; four plants still present |

## Limits

Four stations share one kinematic source, so NE cannot be posed differently
inside that batch — hence the NE suppress. Detailed still uses one station
and original insertion visibility. Removal of plant after the first-floor
jump, and later floor equipment, remain editorial omissions. Second-floor-to-
summit freight is unchanged. The wrench is half-speed relative to source
because the 8s cue cannot shrink.
