# Eiffel continuous film — UI and edition integration

Scope: floating story captions, the Eiffel version selector and clock wiring,
continuous world/apparatus visibility, and first-use narration preference.
No Blender/model changes or physical route retiming were made by this task.

## Implemented

- Removed the full-screen editorial card. The whole Eiffel world remains visible;
  ground and joint apparatus now use the entire insertion, holding their initial
  and final poses during camera transitions. Physical ownership still comes from
  the original samplers.
- Six short story captions float above the controls. Their deterministic
  0.6-second fades and narration elapsed time use the selected edition clock.
  The old detailed omissions remain documented in the technical film metadata
  and Specs 32–34; this presentation does not implement those missing operations.
- Detailed (829.4267707038563 seconds) remains the initial choice. Cinematic
  (180 seconds) uses Aristotle's independent time/camera edit. The store,
  scrubber, soundtrack, story captions and beat index share the selected clock;
  ThreeCanvas maps it once into detailed source time for construction and light.
  Other wonders keep their existing clocks. Changing edition restarts it while
  retaining playing/paused state, without recreating the scene.
- Cinematic narration uses six story clips; detailed also retains its five
  production fact clips. First-use Eiffel narration defaults on only in the
  absence of an explicit preference. Saved OFF remains OFF, including when
  storage is unavailable after an explicit in-session toggle. Gallery/Play/
  Replay gestures prime local audio. The label alone is not proof of autoplay.

## Verification and limits

`frozen-tests.log`: **58 tests passed**, seven focused files. The tests cover UI
selection, edition switching, render-clock mapping, beat navigation, caption
fades/pause/reverse, visibility, narration preferences and the parent's soundtrack
hook. `final-typecheck.log`: typecheck passed. These tests use media/subsystem
doubles; real browser behavior is recorded separately.

`production-cinematic-editions/report.json`: **28 actual caption frames** across
1440×900 desktop, 390×844 mobile and 844×390 landscape, both editions. No caption
was outside the viewport, overlapped the control group, rendered an old card,
or left a blank scene. Playback advanced through caption/chapter boundaries in
all six edition/device combinations. Runtime/console errors: zero. Actual served
bundle in all three pages:

`/assets/main-DYeo7Fi-.js`, 2,117,239 bytes,
SHA-256 `35b984589b88ac9f4ca1e61ae8f40290fd8e72d1bbaab3bd3a903a724b12c491`.

**This is not an overall renderer-budget pass.** Newly visible preparation views
exceeded the unchanged gates in this DYeo7Fi candidate: mobile cinematic91s
reached361,327 triangles/152calls; detailed253.3297329s reached358,228/152.
Those are the report's requested slider times; the native step=.001 quantizes
them to91.08s and252.9751651s respectively. Desktop at the latter reached457,767
triangles/164calls. The parent/renderer owner received these frames before
admission. UI layout passing does not waive300k/150 mobile or450k/200 desktop.

The new short joint close view is present, but foreground lattice partly crosses
the worker/hands. The screenshots are a bounded visibility record, not complete
mechanical or human-contact certification.

Earlier `dev-v1` was only a failed navigation after the development server stopped.
`dev-v2` exposed mobile/landscape toolbar overlap, which was corrected.
`dev-v3` verified the corrected positions but saw concurrent HMR/UV-merge errors;
it is not a clean application pass. The first audio run captured candidate views
but its network-idle reload wait timed out on streaming media; subsequent audio
QA uses actual canvas readiness instead. All earlier evidence is retained.

`production-audio-v2/audio-report.json` records real media in both desktop and
mobile: the correct separate long/short score and Adam narration advanced with
nonzero volume and muted=false; there was exactly one playing score. First-use
ON, explicit OFF after reload, and local/served audio hashes matched. All retained
media paused. Its uncorrected summary flags also counted an empty-src disposed
ambient element as playing and expected exactly one second after a quantized
native slider seek; those are harness errors, not audible retained playback.

The next probe records actual slider values (detailed t=.001 → .829426771 score
seconds; cinematic t=.006 →1.079871126). `production-audio-v3` was interrupted by
the preview server stopping during the short-score request, then reload returned
ERR_CONNECTION_REFUSED. It is partial evidence, not a clean run.

**Final real-media pass:** `production-audio-h6/audio-report.json`, desktop and
mobile, against actual served `main-H6iCFlUn.js`, SHA-256
`2482bcb77c426df56ac2067b9b0f64c2358ea66fee5adfb06edf40b796a316ce`.
Both pages passed first-use ON, explicit OFF after reload, exactly one advancing
unmuted score for each edition, pausing every retained media element, and reverse
seeking to actual slider time. Adam's local lift-prepared clip advanced after a
trusted Play gesture, at volume1 and muted=false. No console/page/media errors.
Both scores and the exercised narration clip returned HTTP200 and hashes equal
to the actual local public files. Narration tested duration3.761633s; long score
829.426771s, short score179.978521s. All media instances and times are preserved
in the JSON, including harmless disposed empty-src elements.

Mobile uses Chromium viewport/touch emulation; native iOS audio policy was not
tested. Browser media advancement does not prove the sound was heard on a human
speaker. The renderer-budget failure above belongs to the older DYeo7Fi candidate;
the renderer owner separately measures the H6 culling revision. It is not waived
by this audio pass.

## Final documentation readback and build binding

This documentation-only pass reread the saved reports and current source. No
browser/GPU jobs, tests, builds or model operations were run. The last complete
UI layout grid is still the **28-frame DYeo7Fi report** above; the latest clean
real-media proof is still the **H6 report**, with its own served bundle identity.
Neither report reviews either film end to end or approves the music/voice by
listening. The opacity envelope was checked by focused deterministic UI tests;
the 28 screenshots sample readable caption holds. Native iOS and human listening
remain outside this evidence.

The eight UI/render-boundary files below were individually hashed in the DYeo7Fi
layout report and remain byte-identical at this readback. The two engine camera/
clock files and WorldScene also match that report, listed separately afterward.
This preserves the recorded UI evidence without assigning the older GPU budget
result to a newer renderer build.

```text
6cf6185e07876e98b4d4fdee74c97dea7e64873423f572a493f8671583e29393  src/ui/CaptionLayer.tsx
e7451854b7445a3151acc574ea71dec399610b335141b460c99fc0d89aafe4ff  src/ui/eiffelChapterCaptions.ts
dbf86fc0d2c8f0263f4f200de7bfaa6d16c6f9733bf69c3e3d9f28f7b9362e76  src/ui/TransportBar.tsx
3145296c8e7394fa543a6bcfeba20ef6b15c60100bcfb334dc17491f0d980b2d  src/ui/CaptionBeatIndex.tsx
436459f1baead362224c3543067c2a43e6fb0ba6c7b053e5c8983ac52d34a686  src/ui/QuoteOverlay.tsx
754133b91030b2301ecca015aaf717e071edfbd70167bf92723f9e53c5c57520  src/store/playback.ts
55e96553788bba8a5b6dfe1a79e5162e31417c3433925c11d4ec40174a45f44c  src/render/three/ThreeCanvas.tsx
2a26025b1e2dff62320f92d47b7db10a6cd1e941f485f86d48dcd2d90d12654e  src/index.css
```

Additional UI/audio files below are the current frozen source readback for
binding the next build. They were not individually included in the original
layout report's source list; this list is not a retroactive per-file H6 seal.
H6's media behavior remains tied to its actual served bundle and audio hashes.

```text
3f731290fd220f66488d1c66d470dc15f71507b24a221f7c7fcae81422877fe6  src/ui/CinematicView.tsx
5a560dd5b148aa42ffb2ba534327752e686b32b2f6815cc5400d5d49d341b278  src/store/audio.ts
04dd2d091adac71215c63ce275fcec019377b633ff70c658ce0405f0a0e9b933  src/store/ui.ts
599590838f4848b4cff1bb8b7c41f58326a251b799d3585bbaca856868c9c328  src/ui/useCaptionVoice.ts
1b223ad5c64dfdf6e7e5a496c9f6d9662b4790a3baf9263ae1b14bec56b0780f  src/ui/narrationAudio.ts
8ce7b5c7de9fae5477f3616e5f65a3c8b8fcbea6d1079130ebb01592e76690e4  src/ui/CaptionVoiceToggle.tsx
3cafadacd5f26568f0250dba17f348ad5e6cea5018da7f64e68d8db54a9bb792  src/ui/useSoundtrack.ts
e5a4e5e0267c404b9eeedc822b2db27acc32e580759bf257fb1305221bde01ab  src/data/narration.ts
53b29237cc12483712cf2e36e398261cee16eac4b6da490a62ac9d2ac8a63d89  src/data/soundtrack.ts
```

Unchanged source-clock/camera dependencies from the layout capture:

```text
7a344c704de8ddf8742e86e73a6f4bd5f155ea09d82893b67c43060e919a1753  src/engine/eiffelFilm.ts
4dd9e8f815f7da9ab71b9d2e382da58cf805a1e63838fbce17fbdb1fb758ec63  src/engine/eiffelFilmEdit.ts
aa98b39ef2b88f3361297bba3c87d5fd02b4bf07f376d4ab39e02d4eb78f36c0  src/render/three/WorldScene.ts
```

**EiffelWorld is not byte-identical to the earlier layout capture.** Its current
readback is below; the older recorded SHA remains
`f9529c42c8eab5a408bf9ae27c63c73f8766a4390b8db184858999080a754e81`.
The current source still keeps the whole world visible and uses insertionId for
ground/joint apparatus visibility, but the parent owns the later renderer changes
and their verification. Do not label the complete renderer unchanged.

```text
dc39e4d9128dea1b7d5d6eb0704873232bead66308235c1b2e1c15d5e6aa6ea0  src/render/three/EiffelWorld.ts
```
