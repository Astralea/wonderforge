# Eiffel short-film caption safe area

## Implemented behavior

The existing 122–130-second relay caption covered the mobile payload at
approximately y425–550; the original seek rail occupied approximately y610–660.
The before evidence remains in `after-mobile/frame-46-s126.0.png` and the
corresponding `after-desktop` frame.

`CinematicView` now applies a scoped story-focus class only while an existing
Eiffel Cinematic story caption is eligible to display. Caption timing, narration,
film and camera clocks are unchanged. The caption occupies the upper right on
desktop and the area immediately below the letterbox on mobile.

Mobile chapter navigation collapses behind a Chapters button beside the
wordmark. Its `aria-expanded` and `aria-controls` expose the state and target.
All chapter actions remain available when expanded; the caption is temporarily
hidden to avoid overlapping the open list. A chapter selection closes the list
and restores focus to the toggle. Desktop retains its visible chapter list.

During the same caption windows, the transport uses the bottom letterbox space
while retaining the original seek input and all 44px controls. Safe-area bottom
padding remains respected. Detailed and every other wonder retain the existing
layout. No TransportBar, engine, camera, or renderer file was changed.

## Verification

41 focused tests passed across UI, Eiffel UI clock, and chapter captions.
Typecheck passed after removing an unsupported test-library option.
Tests exercise caption-window gating, preserved Detailed/other-wonder layout,
chapter expansion, navigation, focus restoration, and retained controls.

Actual combined-build verification passed on `main-jB6_G9B6.js`, served from
the existing loopback production preview. The parent's diagnostic tab was
already claimed by its runtime, so QA used an independent tab without changing
the parent's page. Native accessibility slider `setValue` triggered real React
seek updates; no DOM or playback-state injection was used.

At 126 seconds, mobile (390 × 844) caption bounds are y66.63–182.91 instead of
approximately y425–550. The 48px seek target is y673–721 instead of y610–658.
Actual screenshot inspection shows the payload, workers, and receiving contact
above the scrubber; the central work area is no longer covered by the caption.
Desktop (1280 × 720) caption bounds are y59.20–194.27, with seek y597–645.
The desktop chapter list remains available on the left.

Captured both profiles at requested seconds 22, 64, 122, 126, and 130. Slider
step 0.001 quantizes 22 to 21.96 seconds, just before its caption, so mobile
22.14 and both profiles at 24 seconds additionally verify that active caption.
The 64-second sample is near its fade edge; both profiles at 66 seconds verify
the fully visible joint caption. Mobile 131 verifies restoration after the relay
caption. Requested time, actual normalized t, served bundle, caption rectangles,
seek rectangles, and navigation state are stored in each profile's `frames.json`.

The actual mobile Chapters button exposes expanded/collapsed state. Opening it
shows all six chapter actions and hides the caption. Choosing An iron joint
closes navigation, restores caption visibility and focus to Chapters, and resumes
playback. `final-ui-mobile/navigation.json` and `chapters-open.jpg` record this.

Evidence is in new `final-ui-mobile/` and `final-ui-desktop/` directories; previous
`after-*` captures remain untouched. The viewport was reset and the independent
QA tab closed afterward. This pass verifies the UI safe area on the named build;
forthcoming camera/equipment changes, native safe-area behavior, and whole-film
mechanical/readability coverage require their separate final QA.
