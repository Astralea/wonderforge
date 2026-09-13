# Eiffel construction continues through camera movement

Owner request: the entire building must keep constructing during the6–7% leg
approach, close views and returns to overview. Final local production bundle:
`main-CIW2oacT.js` / `main-BqeLL_Kj.css` at
https://wonderforge.localhost/#/wonder/eiffel-tower (loopback5589).

## Change

The cinematic structural clock had flat intervals at9–28,29–48,66–82,
104–124 and158–162seconds. These are now strictly increasing while the
existing mechanical source clock continues to own signature cargo.
The wide shot, structure and lighting all read the same edited production time.
Detailed edition remains unchanged. No Blender assets were changed.

A24s production key at.09104 leaves four landing corridors clear until the
four ground loads seat. Ordinary construction then progresses to.0917 by28s.
Without this intermediate key, newly installed m016/m008/m000/m024 c001
neighbors obstructed the final0.4s of lowering by up to0.109893m beyond the
existing final-contact allowance. The safe key removes these obstructions
without a structural hold or a skipped component trajectory.

Joint cargo ownership now covers the full insertion, including preparation.
Ordinary work rigs exclude cargo owned by either featured ground or joint rigs,
so advancing the ordinary clock does not create an extra crane for that cargo.
The existing two-id guard on full joint sampling remains. Renderer diagnostics
expose the kit's existing cached geometry counts; no extra full-manifest pass.

## Verification

- `final-tests.log`:209files /1109tests pass on the final code.

- `final-focused.log`:18 tests pass (film edits, actual kit chronology and
  continuous construction). `rig-reservation-tests.log`:3 renderer tests pass.
- Actual ordinary member poses/seating change in every sliding2s early window
  (9–28s), and every sliding1s later window (30–48,66–88,104–124,158–162s).
  The weakest early candidate window without a newseat still moves an actual
  bounds corner2.888m. Featured cargo is excluded from these activity checks.
- Strict clock advance every.25s, joint support-before-dependent ordering,
  no featured member unseating across180s, dense reverse-seek/camera tests.
-600ground payload samples,9–23.9s at.1s: no excess contact against seated
  ordinary iron and no penetration against moving ordinary iron. Existing
  final-joint allowance and1e-5m tolerance are preserved. Read-only joint audit:
  110active payload samples31–42s, maximum seated excess5.814e-8m, zero
  moving-neighbor penetration. These are sampled payload/iron checks, not a
  continuous swept or complete rig/rope/worker collision certificate.
- `build.log`: typecheck completed successfully before build; production build
  passes with the existing large-chunk warning.
- `final/observations.json`: final served hash verified,20desktop1280×720 and
  7mobile390×844 samples. Images in `final/desktop/` and `final/mobile/`.
  Completed source-member counts:392 at9s,396 at12.6s,404 at18s,432 at28s;
  655 at36s,1167 at42s,1572 at48s. The geometry grows during the close views
  and withdrawal, independently of captions or progress labels.
- Broad sampled maxima: desktop211calls/388183triangles, mobile158/293968.
  Mobile exceeds the150starting draw-call target by8; this pass does not
  claim a render-budget or locked60fps achievement. Desktop remains primary.

`after/` preserves the first visual candidate before the ground clearance
correction; `final/` is the accepted safe schedule. `focused.log` preserves
an initial obsolete assertion requiring no50m rise before the close-up ended;
that old timing assertion is replaced with growth during the close-up while
retaining the long upper-erection interval. No evidence was deleted.

Existing audio recovery, small-worker-action omission and staged66–90s ground
plant retirement are preserved. Upper freight and later plant removal remain
the previously documented editorial omissions. No push or public deployment.

## Continuous real-GPU playback

`live/observations.json` and two CPU profiles use actual Apple M2 Ultra
Chromium. The full regression suite was running concurrently; these are scoped
playback observations, not an isolated comparative benchmark.

- Early leg approach/close view:1044frame intervals over19.5s wall time,
  mean18.68ms (~53.5fps), p9520.2ms, maximum281.5ms,13intervals over50ms.
  Cached completed source geometry increases392→432 while the camera moves.
- Joint close view and pullout:932intervals over15.5s, mean16.65ms (~60fps),
  p9518.7ms, maximum31.9ms, no intervals over50ms. Completed source geometry
  increases591→1656. No production backsteps or completed-source removals
  in either trace. Early one-off stalls remain; this is not a locked60fps claim.
