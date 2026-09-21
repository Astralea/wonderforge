# Eiffel scaffold retirement — 2026-09-13

Local review: https://wonderforge.localhost/#/wonder/eiffel-tower
Final served build: main-D5yxU2Uw.js / main-BqeLL_Kj.css, loopback5589.

## Behavior

The26–27% complaint came from two lifetime switches: ground stations were tied
to a frozen production boundary and the NE joint plant to its insertion chapter.
At~48s they were hidden together. Short-film plant now survives until the actual
first-floor bearing deck is complete at66s. NE/NW/SW/SE retire in staggered
12s windows starting66/70/74/78s, finishing by90s. The NE ground copy stays
suppressed while joint plant occupies that pad, including after the old48s edge.

Each unloaded crane retires in reverse assembly order before its support is
removed, then complete rigid support members are omitted highest-contact first.
The NE source's misleading “guides” role contained219merged falsework cuboids.
Those exact cuboids are split into existing material batches and join26 extra
support sources in one world-height retirement order. All245remain while a crane
assembly remains; then at most1member/frame at60Hz,0.408%ofpeak, second
difference<=1member/frame. Guides' world heights and all vertices/indices are
checked against the actual Blender asset. Other stations reuse the accepted
opening full-size member representation in reverse, independently per station.
Permanent tower iron and delivered splice hardware remain. Reverse seeks
restore exact support membership and renderer matrices.

This is a compressed per-member dismantling edit. It does not animate workers
carrying timbers or their haul-away routes. It adds no fade, scale-down, sinking,
new transport route, Blender-file modification, or changed construction clock.
Later first/second-floor equipment removal and upper-freight omissions remain.
The previously repaired per-payload CPU gate and music controller are preserved.

## Verification

- Full208files /1103tests passed (`npm run test -- --maxWorkers=2`): tests.log.
- Typecheck and final build passed: final-build.log. Existing large-chunk warning.
- New pure/actual-renderer contracts: eiffel-ground-plant-retirement.test.ts and
  eiffel-joint-plant-retirement.test.ts; source/pose and reverse-seek checks.
- Before/after production captures:12desktop1280×720 and4mobile390×844 frames
  per candidate. Actual48.6s/27%capture retains all four sites; partial removal
  recorded70–86s, all ground plant absent by90s. UI slider quantizes to.001t,
  so captured exact seconds can differ by up to.09s; exact boundaries use tests.
- live/observations.json:181continuous real-GPU samples (180frame intervals) from46.8s through the
  reported boundary, every frame retains three ground stations+245NEsupport
  members. Mean22.31ms(~45fps),p9544.2ms,max120.8ms;4intervals>50ms. Apple
  M2 Ultra GPU, not a locked60fps claim. CPU profile retained beside observations.
- Desktop capture peak180drawcalls/350557triangles; mobile159/194568. Desktop
  stays under the recent200call target. Mobile exceeds the starting150call
  target by9; it remains a smoke check, not mobile performance parity.
- A first focused test incorrectly counted hidden original crane batches as
  rendered. Corrected it to inspect visible render batches; original failed
  focused.log retained and ground-focused.log passes.

Skill used: scene-physical-plausibility/SKILL.md (read), especially support,
continuity, deterministic membership, transformed renderer matrices, sorted
prefixes and real-browser verification. The initial26support-only retirement
candidate was corrected during review to include all219guide members and their
actual transformed world heights; this prevents a delayed whole-scaffold pop.
Only the existing local preview was updated; no publication or push.
