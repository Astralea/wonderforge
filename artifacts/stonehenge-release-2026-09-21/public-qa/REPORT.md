# Public post-deployment smoke — 2026-09-21

**PASS: all eight film/viewport runs.** Public site:
https://wonderforge.pages.dev/. Expected bundle `main-BR6Phg3M.js` was observed
before testing each viewport. The release owner supplied deployment ID
`72a758be-1b8c-4c2a-a875-3373786bb6db` and the ready signal before any public check.

Authoritative evidence: [`confirmed/results.json`](confirmed/results.json),
[`confirmed/browser-environment.json`](confirmed/browser-environment.json), and
the screenshots in `confirmed/`. Actual run: 2026-09-20 18:46:41–18:47:38 UTC
(2026-09-21 03:46:41–03:47:38 Asia/Tokyo).

| Film | Desktop 1440×900 | Portrait 390×844 |
| --- | --- | --- |
| Pyramids of Giza | Pass | Pass |
| Stonehenge | Pass | Pass |
| Colosseum | Pass | Pass |
| Eiffel Tower | Pass | Pass |

## Verified behavior

- Home has exactly four released choices and six disabled in-production entries.
  The homepage shows no loading/progress overlay.
- Every film launches through an ordinary catalog click, reaches its stable
  `#/wonder/<id>` URL, completes arrival, reports ready assets, and renders a
  nonempty scene. Returning through the visible wordmark restores the catalog.
- Clicking Pause freezes the film. A real pointer scrub reaches approximately
  `.418` desktop / `.415` portrait. Clicking Play advances it; pausing works again.
- A keyboard End operation on the focused range reaches exactly `t=1` and offers
  Replay. ArrowLeft then moves backward to `.999`, offers paused Play, and does
  not navigate to a different wonder. The `.999` value is intentional endpoint
  reversal; the separate pointer scrub covers a larger position change.
- **Zero page errors, console errors, HTTP failures, request failures, aborted
  requests, narration media errors, or rejected narration play calls** were
  recorded in the confirmed eight runs.
- All **19 selected historical narration URLs** were actually requested in each
  viewport. For each historical film, an ordinary narration-enable click and
  first-chapter click started the matching clip with progressing media time and
  the matching visible caption. Browser-decoded first-clip durations exactly
  matched accepted metadata: Charles/Giza **4.318912 s**, Oliver/Stonehenge
  **5.108390 s**, Andrea Williams/Colosseum **4.504671 s**. No all-clip natural-end
  claim is made here; the prior full narration review covers that.

## Deployed Stonehenge final frame

Captured at exactly `t=1` with the real UI:

- [Desktop final frame](confirmed/desktop-stonehenge-final-ui.png)
- [Portrait final frame](confirmed/portrait-stonehenge-final-ui.png)

Visual inspection confirms the complete Sun disc is visible at both sizes, with
the monument and transport remaining in frame. This supplements the separate
five-viewport composition acceptance of the same bundle; it does not replace it.

## Harness correction and limits

The original root-level `results.json` and `*-failure.png` files are preserved.
They record three desktop test failures caused by trying to open a “Chapters”
toggle that is not visible at desktop width. Desktop exposes the chapter rows
directly; portrait uses the toggle. The corrected harness opens that toggle only
when present. It then repeated all eight checks into `confirmed/`, with zero
failures. No application change was needed for this correction.

Browser: **headless Chromium 151.0.7922.34**, normal-motion desktop and portrait
viewports, device scale factor 1; one page at a time. Browser output was muted.
This is a launch/controls/media-decode smoke test, not subjective listening, a
physical-phone test, frame-rate acceptance, a GPU memory soak, a full three-minute
Eiffel playback, or a cold direct-link autoplay assessment. Films were launched
with normal gallery clicks. The root reviewer separately verified exact served
audio/model/social-image hashes, cache behavior, and private-repository status.

No application edits, deployment, push, public post, or repository visibility
change was performed by this task.
