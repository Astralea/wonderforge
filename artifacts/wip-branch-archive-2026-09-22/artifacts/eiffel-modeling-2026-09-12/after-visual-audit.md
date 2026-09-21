# Eiffel actual production after-build audit

Captured63 frames each at1280×720 and390×844, including all57 original times
plus116,120,122,126,134,138. Every frame reports ready assets and production
main-BhPrdSB1.js. Each frames.json stores UI-normalized time, exact mapped source
clock, construction phase, seated count/height, camera shot, visible DOM text,
renderer diagnostics, screenshot name and timestamp. Twelve contact sheets
were inspected, plus full-size operation and same-time before/after images.

## Priority findings

1. **Triangle budgets fail the dense sample.** Desktop peak469878tri at118.08s
   versus450000; mobile peak328380tri at149.94s versus300000. Calls staywithin
   limits: desktop169, mobile149. Screenshot then diagnostic remeasurement
   reproduces every reported overrun (after-settled-diagnostics.json).
   Wide150s causes the mobile peak. The full handoffclose at122/126/130s is only
   about149565–157556tri mobile, so the close view itself is not the culprit.
   Parent owns performance follow-up. Old dense capture contains no renderer
   counters; no same-source pre-change budget comparison can be claimed.

2. **Mobile caption and controls obscure the operation being narrated.**
   after-mobile/frame-46-s126.0.png shows the caption atapproximately425–550px
   over the carrier/payload; seekrail610–660px covers receiver bed/contact.
   Desktop sameframe has the caption to the right, but the bottom controls
   still cross the cart's lower support. At129.96s the sentence fades away
   and the camera pitches toward the actual landing, improving visibility.
   Use the upper navigation area for a transient caption during close work,
   and provide an actual UI-safe camera composition for the receiver bed.
   Parent delegated the UI fix; this audit made no UI/source changes.

3. **Joint close remains visually crowded.** Existing orange staging beams
   cross the worker/joint at64–74s. The enlarged clock does not fix that
   pre-existing geometric occlusion (after-desktop/frame-22-s68.0.png and
   corresponding mobile). Numerical near-plane clearance is not proof of
   an unobstructed operation sightline.

## Observed improvements and limits

The new82–112s passage shows separate lower-frame, first-platform, upper-frame
then shaft growth (desktop/mobile contacts3–4). Compare old86.04s frame28
(already well above second platform) against new86.04s frame28 (fourlegs
approaching first platform). Dense physical evidence reports50–280m growth
in25.3s, previously4.8s; no dense source reversal or seated-ID removal remains.
The near-complete wide stall is shorter. The122–130s shot now presents the
actual receiver, hanging member, rope and platform; geometry support remains
consistent, subject to UI obstruction above. No tower unbuilding or rendered
structural disappearance was seen in the63-frame ordered sample.

At matching source/time0, new rectangular roof glazing is clearly visible
on the exhibition wings, with dome/ridge detail retained. Roofs remain dark
zinc/blue while limestone remains warm and pale. The broad environment
reflection is restrained, not mirror-like; these images do not isolate its
contribution from the simultaneously corrected source PBR values. City
frontages/roofs still repeat strongly and tiny chimney/dormer additions do not
fundamentally change that pattern at movie distance. No new gross reflective
artifact or missing material was observed in these paused frames; shimmer
during continuous motion was not established by this screenshot-only audit.

## Diagnostics and reproduction

Anonymous `jw is not defined` entries and one chrome-extension content.js
NoListener error were recorded during initial browser-tool setup. None names
the app bundle as its source. Startup briefly blocked CDP/AX controls, then
recovered with real ready canvas; no app-source exception was observed in the
returned log sample. Do not call this a completely error-free console.

The read-only CUA scope could not access the existing window diagnostic export
(returned undefined), so after-camera-budget-analysis.json labels positions
and fov as source-derived. Renderer counts are live canvas data. All requested
114/118/150s mobile camera distances are584–597m from shadow center; the400m
fine-shadow omission is already active.

Capture follows capture-workflow.js with the six added times, after- directories
and canvas rendererDiagnostics JSON. enrich-after-frames.ts joins exact UI t
with pure source state; contact-sheets-after.py asserts image dimensions before
assembling sheets. after-source-hashes.json records source/bundle checksums.
Temporary browser viewport was reset; tab1736589612 retained for parent follow-up.

## Sampled budget violations

### desktop

|Requested seconds|Actual seconds|Calls|Triangles|
|---|---|---|---|
|114|113.94|163|456815|
|116|115.92|163|451475|
|118|118.08|163|469878|
|136|136.08|163|456592|
|148|147.96|163|462843|
|150|149.94|159|469592|
### mobile

|Requested seconds|Actual seconds|Calls|Triangles|
|---|---|---|---|
|114|113.94|147|307162|
|116|115.92|149|305947|
|118|118.08|147|304243|
|120|120.06|141|302065|
|148|147.96|145|304408|
|150|149.94|149|328380|