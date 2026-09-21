# Live deployment and shared UI review — 2026-09-21

Read-only application review; no deployment or account change.

## Actual public site

https://wonderforge.pages.dev/ responds HTTP 200. The real Chromium homepage
and catalog render; the live catalog contains exactly four playable films
(Giza, Stonehenge, Colosseum, Eiffel), with six entries in production.

**The public deployment is stale.** It serves `/assets/main-DJwnCTGh.js`, while
the reviewed local production build serves `/assets/main-D8RR7sSY.js`. None of
the three selected ElevenLabs voice IDs occurs in the live bundle. Live HTML
also lacks Open Graph/Twitter card metadata present in the new local build.
The update must be deployed and checked on the actual public URL before the
announcement can claim the current films. The new build was not published.

Evidence: [deployment-comparison.json](deployment-comparison.json),
[live HTML](live-index.html), [live gallery](live-gallery.png), [live home](live-home.png).
`curl` and real Chromium both reached the site; Python urllib and the web text
fetcher were denied, so those clients were not used as availability evidence.

## Shared local flow

Actual production build on 5590, reduced-motion mode, desktop 1440×900,
portrait 390×844 and narrow portrait 320×844:

- All four scenes reach ready state and show usable transport controls.
- No homepage loading animation was observed.
- Film position remains unchanged while reduced motion is idle.
- Seeking to .5 works; controls and document have no horizontal overflow.
- No page errors were recorded.
- Narrow-screen information panels open, their close button closes just the
  panel, and the film remains open. This final corrected run has zero failures.

The initial harness incorrectly expected `role=dialog`, although this is a
nonmodal `<aside>`. Its twelve “info dialog missing” failures are harness
assumptions, not missing panels. Preserve that raw run in `smoke-results.json`
and `smoke-initial.mjs`; the corrected harness checks the actual information
panel/close control and final narrow results are in `narrow-final-results.json`.
Escape's current behavior is to leave the film; the delivery review evaluates
that usability issue separately. Do not report the invalid role assertion as
an application regression or as a passed modal accessibility check.

The current wordmark share image was visually inspected. It is suitable as a
brand card, but actual construction footage is a better lead for the first
post. The live site's social preview must be rechecked after deployment;
no X draft was submitted and no actual X crawler preview is certified.

These are browser viewport checks, not physical-phone or X in-app-browser
acceptance. See the other review-board reports for film visuals, payload and
privacy findings. No shared-GPU FPS inference is made.
