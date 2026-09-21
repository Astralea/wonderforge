# Eiffel progress correction — 2026-09-13

Local URL: https://wonderforge.localhost/#/wonder/eiffel-tower
Loopback preview remains PID 39319 on 127.0.0.1:5589 through the existing Portless route.
Served HTML references `main-B9ebrhLe.js`. No public hosting, push, or visibility change.

This finishes the in-progress chronology correction transferred in `NEXT_AGENT_HANDOFF.md`.
It does **not** add a second-floor-to-summit freight animation. That omission is retained.

## What changed

The 180-second short film now uses coordinated mechanical and production clocks
(`sampleEiffelFilmEdit`). Viewer 124s is pinned to the exact receiving-hold source
second so `carrierSupport` is `upper-receiver` at that boundary, not a ULP of
tackle. Four grounded lifting stations share one articulated rig; Detailed keeps
a single station. Source crane meshes are hidden after packing so the four
rotations do not double-draw the original NE asset.

## Checks

- `npm run test -- --maxWorkers=2`: 204 files / 1076 tests
- `npm run typecheck`
- `npm run build` → `dist/assets/main-B9ebrhLe.js`
- Live 5589 HTML matches that bundle hash
- Desktop 1280×720: 20 captured frames, 0 page errors
- Mobile 390×844 smoke: 8 frames, 0 page errors
- Sampled budgets: desktop peak 155 calls / 374,454 triangles (limit 200 / 450k);
  mobile peak 136 calls / 293,968 triangles (limit 150 / 300k)

Logs: `full-test.log`, `typecheck.log`, `build.log`, `qa-report.json`, `qa-summary.json`.
Sequence identity: `sequence-audit.json` (1,801 states, 0 seated removals).

## Requested progress (actual kit + browser)

| Progress | Seconds | Production T | What the frame shows |
|---:|---:|---:|---|
| 5% | 9 | .0903 | Four grounded stations on the lower legs; approach begins |
| 6% | 10.8 | .0903 | Camera moving in; all four cranes still present |
| 10% | 18 | .0903 | Working-leg close; lifting caption |
| 40% | 72 | .3152 | First-floor platform / winch, not a finished tower |
| 66% | 118.8 | .4299 | Two floors complete; second-floor relay admitted |
| 70% | 126 | .4336 | Same two-floor form, production continuing upward |
| 90% | 162 | .8055 | Upper tower / summit schedule |
| 100% | 180 | 1 | Completed tower, flag, closing quote |

At exactly 124s the served film reports `filmChapterSeconds≈454` and relay
`sourceSeconds=348` (received hold). Geometry was already on the cart; the
label now matches.

## Retained omissions

Preparing and removing temporary equipment is still editorial. Freight above the
second-floor receiver, including the 197 m relay and final summit installation,
is **not** shown. Do not read the 90–100% rise as a continuous upper cargo route.

The loading-wave compositor path was not re-edited. Prior paired captures remain
the evidence that the SVG wave can move during a stalled milestone; uninterrupted
compositor motion during synchronous parse is still unproven.

## Limits

Four-station occupancy of every pending-load disposal path and GPU draw-cost of
the hidden source rig allocation were not re-profiled beyond the sampled budgets
above. Native reduced-motion loader animation remains CSS/test-only.
