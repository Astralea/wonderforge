# Onward chapter camera and production QA

The main film uses `src/engine/eiffelLongLoadCamera.ts` for the complete
280-second long-load chapter. Fastening and connector release receive closer
framing at the relevant end of the previously established 6.3175 m carrier.
Climbing, descent and cart travel restore its complete height. The camera
continues the global 125-degree film orbit without a reversed or frozen azimuth.

The final candidate camera stays16 m from its target, with12-degree elevation
for ascent/release,40 degrees for fastening/hatch, and20 degrees for cart travel.
The first24 m candidate obscured workers behind receiver columns. The revised
yaw puts upper release near90 degrees and chapter end95 degrees while keeping
the complete -20→105-degree monotone arc.
`radius-probe.json` records the revised half-second complete-tower OBB scan:
16 m clears the near-frustum sphere by at least0.54 m, while18–24 m candidates
cross middle ironwork during the new turn.
Actual receiver/addon triangle rays show upper-release and hatch hands/head/torso
clear at selected work frames. Some bolt-work views remain partly hidden by
the carrier or receiver; neither ray tests nor screenshots prove all four bolts
visibly fastened.

Six camera tests passed on 2026-09-08 after the duration became 280 seconds:

- Actual main-film dispatch uses the camera module throughout the chapter.
- The animated framing boxes remain inside desktop, 390 px and 320 px frusta.
- The full carrier stays readable during ascent, landing, climbing, descent and
  cart travel; detail shots make the lower fastening and upper release readable.
- Framing and mechanical phase joins have continuous target, azimuth and lens.
- The complete near-frustum sphere avoids actual completed-tower solid OBBs.

Command: `npm run test -- tests/eiffel-long-load-film-camera.test.ts --maxWorkers=2`
with Node 24.4.0. Actual worker/model visibility still requires browser images;
the projected-size assertions are not an occlusion or physical-support proof.

## Production browser harness

`qa-production.mjs` is prepared for production port 5589 after the parent freezes
and builds the app. Bundle `sampler.ts` into `sampler.mjs` from that same source
snapshot, then run the harness once with `desktop` and once with `mobile`.
Do not treat an old sampler or old server bundle as the new production build.

It uses the actual Pause button, Seek input and Space keyboard control. It
records 101 full-film frames, all onward phase joins, 21 working screenshots,
reverse-seek pixel comparison, and the actual 125-degree camera orbit. Response
bytes for every requested model and the entry JavaScript are hashed before they
are fulfilled unchanged to the browser. The unchanged local model hashes and
actual response hashes must match.

The actual applied addon role poses exposed by the renderer are compared with
the pure sampler at the working frames. Desktop gates are 450,000 triangles and
200 calls; mobile gates are 300,000 triangles and 150 calls. The report also
checks runtime errors, overflow, playback, and camera/asset identity. None of
these gates by itself certifies realistic hand contact, rigging forces or
obstruction-free worker visibility; the actual images must be reviewed.

The first production pass used main-DuTIkv3x.js and the original full-detail
mobile assets. Its verified report is preserved under production-mobile-baseline/
(report moved before the next production run). It rendered a peak314432
triangles and149calls on mobile, so it failed the300000-triangle gate. There
were no runtime errors or overflow, and model/bundle response identities matched.
The corrected harness uses the actual0.001 slider grid neighbors around each
phase join; requesting ±0.02seconds would collapse to the same real UI value.
Final revised-camera/mobile-LOD production verification passed as recorded below.


## Final production verification — 2026-09-08

Both production harnesses exited successfully against port5589 and the actual
served entry bundle `/assets/main-CwBAhlf1.js`, SHA-256
`e4bab0de2f6b86029b68089e8310c3f7de6f948cd9550516cefd2dda77252d3c`.

| Profile | Viewport | Peak triangles | Peak calls | Result |
| --- | --- | ---: | ---: | --- |
| Desktop | 1440×900, DPR1 | 344937 | 166 | Pass450000/200 gates |
| Mobile | 390×844, DPR1.35 | 295729 | 149 | Pass300000/150 gates |

Each report includes101 full-film samples,7 working preflight frames and43
critical phase frames. The actual0.001 range-input grid was read back and the
nearest available value on each side of each action join was used. These are
real UI samples at roughly0.551-second resolution, not an exact ±0.02-second
browser measurement. The pure camera/rig tests separately sample more densely.

All requested model bytes and the JavaScript response were hashed before being
fulfilled unchanged to the browser. The initial/final local asset hashes and
served hashes matched. Mobile actually loaded `onward-mobile.glb`,
`closed-sling-mobile.glb` and `bridge-mobile.glb`; the final mobile bridge response
was335924bytes, SHA-256
`5f068f7f54e879bdefea023f97e6b517864b2e8908feb8be11cb6f817e40218e`.
The desktop retained its full-detail counterparts.

Actual renderer addon positions/quaternions matched the pure sampler at the
working frames. Both profiles showed a strictly increasing125-degree camera
arc, real Space-key playback, zero page/runtime errors and no horizontal
overflow. The repeated cart frame after a backward seek had exactly zero RGB
channel difference in the measured central crop. This demonstrates deterministic
reproduction; it is not a blanket test of temporal aliasing during motion.

Final reports and screenshots are in `production-desktop/` and
`production-mobile/`. Earlier verified runs remain in
`production-desktop-lod2/`, `production-mobile-lod2/` and
`production-mobile-baseline/`; first interrupted screenshots remain in the
`production-*-attempt-1/` folders.

Visual review confirms improved upper-release worker and hatch views and the
retained complete member/cart crossing. Some bolt-fastening frames substantially
hide the deck rigger behind the receiver or carrier, particularly local150s.
This limitation is preserved in Spec18: the result must not be described as a
clear visual demonstration of all four bolts. No structural capacity, complete
mechanical certification or photorealism claim follows from these checks.
