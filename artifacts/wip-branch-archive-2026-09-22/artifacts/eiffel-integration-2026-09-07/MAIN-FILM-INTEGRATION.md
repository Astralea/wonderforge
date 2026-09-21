# Main movie chapter integration — 2026-09-07

The Eiffel movie uses a122s clock: the original60s production plan, a3s explicit preparation cut, the55s ground-arrival/hoist/seat/recovery passage, and a4s explicit later-work/dismantling omission. Original plan timings are unchanged; the mapper pauses production at selected operation start0.09025741777108326 and resumes that exact coordinate afterward. Original camera orbit endpoints and125-degree sweep remain intact outside the local working shot.

The selected member is `lower-ne-02-m013-c003`. The tower kit owns its single rendered copy. The chapter sampler places it on the incoming cart, follows the pilot's rigid poses, and marks it seated from46s onward. After the passage it stays seated; the old operation's crane is excluded. Other members in its four-part wave remain queued throughout the chapter, then run their unchanged operations. All prior waves are seated exactly at the boundary, so the55s hold does not leave old loads hanging without rigs.

One stable `EiffelGroundLiftSystem` is visible throughout the continuous passage. It is introduced and removed behind explicit opaque editorial time cuts, with the omission stated on screen. **No physical installation or dismantling/transfer is claimed.** Equipment is absent before old production resumes; this avoids known stage10 falsework conflicts and simultaneous fifth-crane overlap. This is one actual main-movie passage, not verification of all later crane lifecycles.

Camera points include every falsework endpoint and foot, the cart corridor/crew padding, sampled hook/jib endpoints and transformed payload bounds. A slow6-degree working arc keeps those points inside88% horizontal /84% vertical NDC bounds on desktop and mobile. The atmosphere keeps the original wide-shot fog distance; moving the camera closer does not create new fog. Traffic and water use elapsed time while construction/light progress holds. Traffic's optional elapsed-clock argument preserves speed beyond the old60s limit; default callers retain clamped behavior.

Source ownership:
- `src/engine/eiffelFilm.ts`: pure clock, inverse time mapping, chapter text/state and working camera.
- `src/render/three/EiffelWorld.ts`: kit sampler override, one persistent ground-lift system, chapter work exclusion.
- `src/render/three/WorldScene.ts`: consistent cinematic camera/light mapping and separate water clock.
- `src/render/three/EiffelEnvironment.ts` and `src/engine/eiffelTraffic.ts`: narrow elapsed traffic/foam support.
- `src/store/playback.ts`: Eiffel-only duration; parent separately owns loading readiness.
- Parent owns the real Blender rig asset, ground-lift renderer, captions/opaque cuts, quote suppression and soundtrack.

Focused verification:30 tests passed across `eiffel-film.test.ts`, `playback.test.ts`, `eiffel-traffic.test.ts`; typecheck passed. Main integration tests cover time inverse, cuts, selected seat handoff, unchanged orbit, full annotated camera envelope at1440×900/390×844/320×844, duration reset and elapsed traffic after60s.

Browser evidence status: early `main-film-*` and `live-film-*` captures are superseded and not acceptable final evidence. Direct dynamic store imports during Vite HMR created a second store disconnected from mounted UI; subsequent UI capture attempts were interrupted by source changes. Final verification must use a source-stable page and real DOM controls, and confirm recorded slider progress actually advances. See final report update below when available.

## Verified main-route browser pass

`main-dom-qa.mjs` drives the mounted main-page DOM controls, not a separately imported Zustand store. It dispatches range input/change and play/pause events directly; this tests the actual UI handlers but is **not a physical pointer hit-target test**. It asserts visible chapter/cut DOM state, finite matching timeline values and increasing real playback values.

`final-main-qa.json` and `final-main-desktop/`, `final-main-mobile/` are the accepted source-stable capture. Each viewport passed11 forward/reverse seeks, including both fully opaque editorial cuts, repeated re-entry to the lift and return to normal construction. True playback advanced23.668→29.158s desktop and23.668→27.816s mobile. No page/console errors. Videos in the same directories record that actual playback. The final10m cart approach replaces the superseded27m approach; mean speed is1m/s, peak1.5m/s over10s.

**Budget finding handed to parent:** this capture peaks at195 calls/225898 triangles desktop and180 calls/164815 triangles mobile. Triangle budget passes;150-call budget fails. Parent owns the rig renderer's batching correction. Do not call this snapshot fully budget-cleared. Parent also owns the remaining TransportBar phase label remap (the label must use production time rather than film progress).

Remaining readability limitation: the105mm payload stays thin against the pylon lattice on mobile. The closer supported shot exposes the actual action and retains falsework feet/cart/crane/seat in frame, but this does not claim final cinematic polish or verification of later erection operations.

## Final batching recapture (supersedes the call-budget finding above)

After parent's renderer batching, `final-batched-qa.json` and `final-batched-desktop/` / `final-batched-mobile/` are the final accepted capture. Both devices pass12 forward/reverse/end seeks, explicit opaque entry and exit cuts, and continuous hoist playback. Cart arrival is independently played from9.638 to12.078s in `final-batched-cart-giza/`.

- Desktop: maximum138 calls across the sampled chapter, cuts, later scene and complete end. Chapter geometry remains about225898 triangles; complete end is346172 triangles.
- Mobile390×844: maximum123 calls and279742 triangles, including the complete end. This passes the stated mobile150-call/300000-triangle budget at these samples.
- No page or console errors in either main-film run or the extra cart/Giza check.
- The normal complete tower scene returns at122s with chapter equipment absent. `seek-122.png` is captured for both viewports.
- Giza debug0.58 renders the existing stone/worksite scene normally; screenshot and diagnostics in `final-batched-cart-giza/giza-058.png` / `report.json`. This is a functional render smoke check, not a new Giza physics audit.
- TransportBar now reports ground delivery during the inserted passage and uses mapped production progress for later phase labels.

No whole-film frame-rate claim is made. Desktop complete-end geometry exceeds300000 if that mobile limit were also applied to desktop; retain the measured346172 figure rather than asserting every viewport is under300k.
