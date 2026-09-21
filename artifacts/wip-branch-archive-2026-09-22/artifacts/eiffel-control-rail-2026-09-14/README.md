# Eiffel control rail position — 2026-09-14

Owner reported the controller against the bottom edge at 11%, but above the black letterbox at 31%.

## Root cause

There is one TransportBar component. CinematicView adds `eiffel-story-focus` only while an Eiffel chapter caption is active at 1x speed in playing/paused state. The old CSS used that caption-state ancestor to override the transport wrapper's bottom from `calc(6vh + 0.5rem)` to zero and change its padding. Caption gaps, speed changes and completion therefore moved the same controls. The letterbox and full-viewport canvas did not move.

Before measurements, 11% to 31% (CSS pixels):

| Viewport | Control bottom at 11% | Control bottom at 31% | Vertical jump |
|---|---:|---:|---:|
| Desktop 1280x720 | 712 | 656.8125 | -55.1875 |
| Portrait 390x844 | 836 | 773.375 | -62.625 |
| Landscape 844x390 | 382 | 346.609375 | -35.390625 |

## Change

TransportBar now owns an explicit `data-layout="eiffel-film"` for the cinematic Eiffel edition throughout playback. The existing compact footer positioning and safe-area padding are selected by that stable layout, independently of caption state, progress, speed or completion. Caption placement and chapter navigation can still respond to caption windows. Detailed and other wonders retain the standard placement.

Files: `src/ui/TransportBar.tsx`, `src/ui/eiffelCinematicLayout.css`, `specs/05-ui.md`, `tests/ui.test.tsx`.

## Evidence

- `red.log`: new UI regression failed before implementation (1 failed / 29 passed).
- `tests.log`: all 213 test files / 1123 tests passed (217.17s).
- `build.log`: production build passed; typecheck also passed separately. The existing bundle-size warning remains.
- `qa.mjs`: actual rendered bounding-box assertions at 0%, 6%, 11%, 19%, 26%, 31%, 58%, 68%, 90%, 100%, reverse seek to 11%, then 2x/4x/1x changes and playing chrome hide/show.
- `before/`, `after/` and `final/`: desktop, portrait and landscape screenshots and recorded DOM geometry. Final verification waits for opacity to reach fully hidden/visible states, instead of assuming a fixed wall-clock delay under load. The after/final runs assert constant rail bottom and control bounds within 0.25px, including auto-hide, and no button outside the viewport. Pause and completion retain the same group; the unit contract also checks Detailed and next-wonder placement.
- Served before: main-_B1o6cqn.js. Served after: main-DGaRJ8M1.js / main-DnBJ2EJl.css. Browser QA checks its document against the built bundle.

Measured fixed control bounds (all sampled progress values and speeds): desktop y577–712, portrait y654–836, landscape y247–382. Each rail ends at its viewport bottom; measured position drift is zero. Final browser console/page error list is empty. Hidden opacity is below0.001 and shown opacity is above0.999 on all three viewports, with zero position drift throughout.

## Reference ledger

Loaded: threejs-debug-profiler/SKILL.md; references/debug-profile-checklists.md; references/checklists/scene-debugging.md; references/checklists/mobile-input.md. No skipped required reference or load failure.

Applied checks: reproduce exact progress positions; verify served build; collect console/page errors; compare canvas, letterbox, controls and viewport bounds; isolate CSS ownership; preserve one renderer/control group; verify safe-area rule, touch target dimensions, portrait/landscape bounds, speed/reverse seeks and chrome input behavior. This is a DOM layout fix, so no GPU performance claim. Mobile verification is browser emulation, not a physical iPhone safe-area test.

The existing loopback preview remains running at https://wonderforge.localhost/#/wonder/eiffel-tower . No server restart or Blender changes were needed.
