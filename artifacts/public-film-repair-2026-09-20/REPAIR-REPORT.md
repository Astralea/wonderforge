# Four-film repair — 2026-09-20

The accepted audit repairs are implemented locally. Final visual acceptance is
incomplete because browser access disconnected during the Eiffel comparison.
No deployment, GitHub push, visibility change or social post was performed.

Production preview: **http://127.0.0.1:5590/**. Development preview remains on
127.0.0.1:5589. Both bind only to loopback. Current production entry is
`main-Bgtdl_tC.js`.

## Loader addition requested during repair

Every arrival starts at 0%. Displayed preparation is capped by both actual
readiness and a 600 ms fill from the first paint. It cannot report completion
before assets are ready. Once the display reaches 100%, the completed drawing
stays for 100 ms before the scene is revealed and the film clock is released.
Slower loads follow their measured preparation steps. Errors appear immediately.
Reduced-motion stills stop requesting frames after arrival; failed scenes also
stop rendering behind their recovery overlay.

Tests cover fast cached preparation, slower preparation, the visible 100% hold,
playback gating, failure, navigation cancellation and reduced-motion seeking.

## Implemented repairs

| Film | Change | Evidence and limits |
|---|---|---|
| Giza | One actual ramp surface for earth, sleds and individual feet; fixed rigid runner contact; longer high-course approaches; closer low-course shot; cached static cores and instance disposal. | Rendered terminal grades 13.04–14.62°. 270 forward/reverse contact samples and 510 approach samples. New routes and camera still need final browser review. [Giza notes](giza-notes.md). |
| Stonehenge | Correct rigid butt/rope transform and lintel yaw; grounded cribs retained through transfer; closer early camera, brighter materials and neutral skylight. | All 35 lintels cover their two bearings. Revised 390×844 solstice frame visually checked. [Stonehenge notes](stonehenge-notes.md), [phone frame](stonehenge-solstice-portrait.png). |
| Colosseum | Continuous haul position/heading, corrected wagon contact, fixed crane dimensions/support, progressive scaffold strike, matched horizon, uncropped portrait framing, spatial culling and reduced detail/shadow cost. | Horizon and phone framing checked before the final shadow pass. Whole-film CPU cost accounting below; final shadow appearance and GPU counters remain unverified. [Colosseum notes](colosseum-notes.md), [phone frame](colosseum-late-portrait.png). |
| Eiffel | Lossless runtime manifest and compressed city delivery; higher load-view pitch after safe hoisting; darker, rougher iron for wide-shot contrast. | Full authored manifest equality, exact city-byte equality, real HTTP decode check and camera fit/clearance tests. Camera/material A/B remains pending. |

Shared UI now reserves quotes for the reveal, keeps the full attributed quote
in About, and uses compact mobile Chapters for every film. Changing films with
an open chapter drawer resets it correctly. Seeking to 100% gives Replay;
reverse seeking returns to paused. Existing music and narration are preserved.
All postprocessing passes and repaired instance owners release their resources.

## Delivery and performance

- Eiffel manifest: **24,613,451 → 5,559,468 bytes** before HTTP compression.
  All 13,852 part records, fields, floating-point values and identities match
  the authoring source, including negative zero.
- Paris city: **14,298,216 → 5,019,070 transfer bytes**, with identical decoded
  GLB bytes. The loader handles servers that return raw gzip and servers that
  set `Content-Encoding: gzip` and are already decoded by fetch. A real local
  production HTTP check caught and verified this distinction.
- `npm run prepare:assets` reproduces both assets; `prebuild` invokes it.
  Original authoring files remain untouched.
- Unversioned model/audio/brand resources now revalidate. Hashed JS/CSS remain
  immutable. Cloudflare deployment and live cache behavior were not exercised.
- Open Graph/Twitter title, description and image metadata use the existing
  1376×768 illustrated wordmark. The real social crawler preview is unverified.

Colosseum modeled triangle submissions over 3,601 samples per view (60 fps):

| View | Maximum | At movie time |
|---|---:|---:|
| 1440×900 | 178,198 | .8377778 |
| 390×844 | 119,856 | .6186111 |

These counts include every shadow caster and invisible proxy main submissions,
before light-frustum culling; they exclude a few postprocessing triangles.
They are CPU geometry accounting, not frame-rate or physical-phone evidence.
The original public .86 capture submitted about 1.17 million triangles.
Before the last shadow optimization, actual portrait .86 was 125,787; its
matching CPU estimate was 125,784. Do not present that older browser count as
the final repaired count. Stonehenge's actual portrait .82 was 90,878 triangles.

## Verification

- Full suite: **226 files / 1,209 tests passed** on frozen source in 194.07 s;
  [final test log](validation/test-frozen-source.log).
- Typecheck: passed; [log](validation/typecheck-final.log).
- Production build: passed; [log](validation/build-with-assets.log).
- Production root, runtime JSON, gzip city and share image return HTTP 200;
  [HTTP evidence](validation/production-http.json), [decoded-city check](validation/http-decoding.json).
- Original failed full run is retained in `validation/test.log`. Its two stale
  fixtures expected an uncompressed mock and a quote during construction;
  both were updated and the seven affected tests passed. A second concurrent
  run saw a stale module transform while the HTTP decode fix was being added;
  its log is retained as `validation/test-final.log`. The final run uses frozen
  source (`validation/test-frozen-source.log`).
- [Browser observations and interruption](browser-checks.json) distinguish
  accepted captures from missing checks. `git diff --check` passed.

## Remaining acceptance work

The CUA browser session timed out on Eiffel. Reconnection attempts returned no
apps/browsers and a native-pipe startup failure. Browser reconnection was
requested; no alternative automation bypass was used. The last viewport
override was 1440×900; reset it when the connection returns.

1. Inspect the production build at desktop 1440×900 and portrait 390×844,
   plus Eiffel 320×844. The camera/material changes are candidates until this
   comparison is completed.
2. Giza: .14/.20/.24 close haul, .5000923497 repaired high-course haul,
   .5002578037 original audit time, .8444 Menkaure approach, .94/.96/1 reveal.
3. Stonehenge: .075/.083 raising; .20–.24 cribs; .58–.69 lintels; .82/1 solstice.
4. Colosseum: .32/.58/.86/1 horizon and facade; continuous internal haul and
   .98 scaffold strike; final shadow appearance and actual GPU counters.
5. Eiffel: uninterrupted 34–42 s load view, 104–124 s shaft growth, .86/1
   iron contrast, cold-cache preparation time and actual Paris source.
6. Listen to the unchanged narration/score during playback; test a physical
   phone and Twitter's in-app browser. This environment provided viewport
   checks only, not physical-device or auditory certification.

The broader Giza return-traffic graph and exhaustive crest-to-seat masonry
occupancy proof remain outside this bounded repair. Eiffel freight above the
second-floor receiver remains the previously documented scope omission.
No complete historical/structural-capacity simulation is claimed.

## Preserved state and implementation references

The pre-existing dirty narration manifest and prior untracked artifact folders
were preserved. New work is uncommitted. Catalog IDs/gating, illustrated mark,
Giza homepage and Eiffel sunrise ending remain intact. Root plus the scoped
Giza, Stonehenge and Colosseum implementation droids worked in disjoint files.

Spec authority: `specs/48-public-film-repair.md` with Specs 02/05/08/10/12.
Visual references are the accepted current-site captures in
`artifacts/public-release-audit-2026-09-20/`. The graphics skill's implementation,
rendering, technical-art and performance references informed the repairs;
existing authored assets were reused, with no external asset generation.
