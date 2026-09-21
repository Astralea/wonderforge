# Four-film release review — 2026-09-21

Reviewed production candidate `main-D8RR7sSY.js` on local port 5590, plus the
actual public Cloudflare HTML, JavaScript and browser homepage/catalog. This is
a read-only application review. No application changes, deployment, repository
visibility change or social post were performed.

## Recommendation

The current work is suitable for a **first public preview after one small
Stonehenge framing correction and deployment of the reviewed build**. Hold the
announcement until those steps and the public-link smoke check are complete.
A broad city/geometry rebuild is not needed to share the project and collect
feedback. The stricter Spec 04 visual scorecard is not fully passed; do not
represent this as completed acceptance against every internal quality target.

| Film | First-preview judgment | Remaining issue |
| --- | --- | --- |
| Pyramids of Giza | Ready for a preview | Early beige haze and broad smooth ramp surfaces remain art polish; portrait handoff briefly crops completed pyramids before the final ensemble fits. |
| Stonehenge | Correct the desktop ending first | The top black bar clips the solar disc during the signature solstice ending. Preserve the solstice direction and adjust camera framing to the visible picture area. |
| Colosseum | Ready for a preview | The sunset/moonrise gives a strong ending, but the broad bare worksite and simple ground still separate the city into islands in early/midfilm. |
| Eiffel Tower | Ready for a desktop-first preview | Some iron foreground members compete with the carried load in closeups; first-load payload remains substantial on phone connections. |

### Before the announcement

1. **Keep Stonehenge's Sun inside the desktop picture area.** The header ends at
   y=54 px in 1440×900. The actual Sun disc starts around y=10 px at t=.8,
   21 px at .867 and 37 px at=1, so the crop affects the body, not just its halo.
   This is a camera/letterbox contract issue, not a reason to change the solar
   alignment. The final review recommends one narrowly scoped camera correction
   and fresh desktop/portrait ending captures.
2. **Deploy the current candidate and verify the live URL.**
   `https://wonderforge.pages.dev/` still serves `main-DJwnCTGh.js`; none of the
   selected Charles/Oliver/Andrea voice IDs is present in that bundle. Live HTML
   also lacks the share metadata present locally. Sharing that link now would
   announce an older version of the films. Deployment has not been performed.
3. **Make one real-phone visit through Twitter/X before the post.** Check first
   entry, Eiffel load, a narration toggle and return to the gallery. Browser
   viewport emulation passes but does not establish physical-phone or X embedded
   browser behavior. Desktop remains the intended primary platform.

## Private repository and public site

GitHub's read-only API confirms `Astralea/wonderforge` is **PRIVATE**. Cloudflare
is configured to deploy only `dist`, not the repository root. Scanning that
build found no configured credentials, common secret patterns, source maps,
TypeScript sources, `.git`, `.env`, research/spec/test directories, Blender
project files or symlinks. This is a bounded audit, not a universal proof.

Keeping the repository private is compatible with the public site. Delivered
JavaScript, models and audio are still accessible to visitors. The deploy folder
also contains old audio, an unused authoring manifest, a Paris fallback model,
development routes and a small model authoring-path breadcrumb. These do not
expose the private repository or a credential. I recommend a curated production
export that leaves the originals in the workspace and excludes unused authoring
files/development views if the intent is to show only the four selected films.
See [delivery audit](delivery/REPORT.md) for exact files and byte counts.

## Nonblocking follow-ups

- Eiffel's fresh portrait load measured about **21.34 MB encoded resources** on
  the local production server. Actual Cloudflare transfer/timing remains to be
  checked after deployment. Mobile geometry reduction does little to reduce the
  shared models downloaded. Avoid promising universal fast phone loading.
- The information-panel close target is 34×34 px rather than the project's
  44 px convention. Focus stays on About, and Escape leaves the film. A small
  accessibility pass should enlarge the close control and dismiss the active
  panel before returning to the gallery.
- Colosseum ground/worksite transitions, Giza ramp materials and Eiffel closeup
  separation are useful next visual work. They do not require postponing the
  first preview for a broad redesign.

## Evidence and scope

- Existing exact-candidate validation: **241 files / 1,299 tests passed**,
  typecheck and production build passed. Source/build remained unchanged during
  this review. The delivery reviewer additionally ran 31 focused tests, all pass.
- All 19 new historical narration assets were independently decoded, hashed,
  measured for duration/loudness and tested across 38 desktop/portrait plays;
  each ended naturally before its chapter boundary. The current review extends
  the film and Eiffel checks; see each role report for its exact coverage.
- Live Cloudflare homepage/catalog render with four playable and six production
  entries, but serve the old build. [Deployment evidence](public-site/REPORT.md).
- Current local reduced-motion, no-home-loader, seek and control-width checks
  pass at=1440×900,390×844 and320×844; no page errors. Settled reduced-motion
  rendering recorded zero RAF callbacks in the delivery audit.
- Full 1× desktop playback completed for all four films; Colosseum (60 s) and
  Eiffel (180 s) also completed full portrait runs. Giza/Stonehenge add 18 portrait
  checkpoints. All six observed Eiffel narration clips ended naturally on both
  viewports. Replay/home and post-interaction audio controls passed. Full role
  reports: [Giza/Stonehenge](giza-stonehenge/REPORT.md) and
  [Colosseum/Eiffel](colosseum-eiffel/REPORT.md). Shared-GPU recording establishes
  composition/behavior, not physical-device FPS.
- A direct-link Eiffel audio probe observed standard `NotAllowedError` responses
  for autoplay attempts before interaction. The app catches those responses;
  narration and music controls work after interaction. This is recorded separately
  from the error-free full-play runs, not hidden as a passed autoplay assertion.
- Audio output was muted for automated checks. These prove decoding/transport
  and timing, not subjective narration/music listening quality. The user can
  review all 19 selected-voice recordings in the existing local listening page.
- The initial root UI harness incorrectly expected a modal dialog instead of
  the implemented nonmodal information aside. Those twelve assertion failures
  are retained and explained in the public-site report; the corrected narrow
  run passes. They are not application failures or modal accessibility signoff.

## Announcement suggestions

Use a 20–30 second clip of the actual films. Begin with visible construction and
finish on Stonehenge's Sun or the Colosseum Moon. Keep enough of each movement
uncut to communicate what is happening; make the clip readable with sound off.
Say that four films are available and that desktop is the intended experience.
The `pages.dev` address is adequate for this first preview; a custom domain can
come later. No expansion of the catalog is needed before gathering feedback.

A short first-person [post draft](ANNOUNCEMENT-DRAFT.md) is provided. It has not
been posted, scheduled or submitted to Twitter/X. Actual social-link rendering
must be checked after the new Open Graph/Twitter metadata is live.


## Documentation references

Cloudflare publishes the configured build output directory: see its
[static-site deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/).
The private repository status above is independently verified by the GitHub API,
not inferred from this guide.

Narration history checks are in the prior
[historical chapter source review](../../chapters-history-2026-09-20/review/).
This release pass is not a new edition-by-edition authentication of all inherited
literary quotations. A spot check found the Eiffel quote on the
[official Eiffel Tower site](https://www.toureiffel.paris/en/news/history-and-culture/eiffel-tower-quotes-poems);
the Bede saying has a debated original referent and attribution history discussed
in the [University of Chicago classical-text archive](https://penelope.uchicago.edu/Thayer/E/Gazetteer/Places/Europe/Italy/Lazio/Roma/Rome/_Texts/PLATOP%2A/Amphitheatrum_Flavium.html).
Adding precise source references or “traditionally attributed to” where appropriate
is a curatorial follow-up, separate from the tested new spoken scripts.
