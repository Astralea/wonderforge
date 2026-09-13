# Eiffel motion and music recovery — 2026-09-13

Local review: https://wonderforge.localhost/#/wonder/eiffel-tower

## Root cause and changes

The 19–26% complaint was a real CPU bottleneck. EiffelWorld's per-piece kit
callback invoked the entire joint-campaign sampler before checking whether the
piece was one of its two payloads. At 22%, 13,847 of 13,852 parts repeated crane,
cart, basket and worker calculations. The callback now checks the two identities
first. Early queued/seated decisions and production-plan fallback are unchanged.
The new regression runs the real constructor callback across the full manifest
and checks forward/seated/reverse cargo poses.

The short-film 34–42s cue now selects campaign 100–114 (slew, lowering, seating),
with physical member travel in every one-second window. Tiny fastening-worker
and wrench rendering/matrix updates are omitted in the short edit. Delivered
splice plates remain and follow their original seating path. The camera now
withdraws at 42s, correcting the previous code's 46.2s despite its handoff saying
23%. Detailed source operation and Blender assets are preserved.

Music previously retained a pending-play marker after successful playback.
Browser pauses could therefore leave it silent. The new media controller clears
settled attempts, follows media/user events, preserves native currentTime and
rate 1, and bounds load recovery to two attempts per active transport session.
Real aborted-first-request testing exposed Chromium reporting a network reset
as code 4 / Format error before metadata; that branch now shares bounded recovery.
Pause/disposal invalidate late promises and remove listeners.

## Evidence

- `before/observations.json`: original production main-igqqwNlC.js, desktop and
  mobile frames across 19–26%, plus 12.6s continuous playback from 19%. Mean
  225.27ms, p95 347.3ms, 56 frames. Apple M2 Ultra hardware GPU. The 100ms film
  delta clamp means slow playback did not traverse the entire segment in 12.6s.
- `profile-before/cpu-profile.json`: independent CPU profile; repeat playback
  mean 226.45ms, p95 305.2ms, 56 frames.
- `pure-payload-dispatch-benchmark.ts/json`: five alternating runs of identical
  inputs; ungated 158.53ms vs gated 0.68ms, calls 13,847 → 1. Output hashes match.
  This isolates dispatch CPU work and is not browser FPS.
- `after/observations.json`: first candidate main-DDXtXfJH.js, seven desktop and
  three mobile captures; mean 20.89ms (~48fps), p95 36.3ms, 604 frames. Shared
  machine with other verification active; 19 intervals >50ms, max441ms. Real
  Apple GPU; desktop peak143 calls /225,614 triangles. Visual review confirms
  the load-scale motion and earlier withdrawal, with no worker-scale hold.
- `profile-final/observations.json` and `cpu-profile.json`: final served
  main-BVT7vDyh.js verified, isolated from our other verification jobs. Mean
  18.87ms (~53fps), p95 31.7ms, 668 frames over12.6s, seven intervals >50ms,
  max284ms; peak143 calls /225,506 triangles. Same Apple M2 Ultra GPU.
  This is a large improvement, not a claim of locked60fps or zero hitches.
- `audio-browser-first-candidate.json`: preserves the discovered code4 failure;
  this candidate is superseded by final audio recovery.
- `audio-browser.json`: final media/network checks (normal, interrupted first
  request, delayed response), actual native playback/currentTime, browser pause
  recovery, user pause and native 2×/4× animation-speed controls. Browser media
  transport verification, not a human speaker/listening test.
- `tests.log`: 205 files /1,090 tests passed in the full two-worker suite.
- `final-focused.log`: final 12 audio regressions +2 full-manifest dispatch tests
  passed after the final error-classification correction and new test addition.
- `final-build.log`: final typecheck/build passed; main-BVT7vDyh.js and
  main-BqeLL_Kj.css. Existing large-chunk warning remains.

## Skill/reference ledger and limits

Loaded `threejs-debug-profiler/SKILL.md` and all required references:
`references/debug-profile-checklists.md`, `references/checklists/scene-debugging.md`,
`references/checklists/performance-profile.md` — yes, no load failures.
Used production reproduction, real GPU identity, continuous frame intervals,
network/media errors, media unlock/readiness/cancellation, deterministic seeks,
resource ownership and desktop/mobile screenshots. No Blender model change was
needed. Scoped review by the project's performance-engineer delegate found no
blocker in the sampler gate. Fixed camera envelopes and static ground-station
matrix updates remain minor performance opportunities. Existing upper-freight
and equipment-removal editorial omissions remain; no new freight route claimed.
Only existing local preview updated; no public publication or push.
