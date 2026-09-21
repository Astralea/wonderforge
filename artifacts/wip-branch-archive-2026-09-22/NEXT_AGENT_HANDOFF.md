# WonderForge — Eiffel progress correction handoff

Prepared2026-09-13 at the owner's request to transfer this work to another coding
agent. **This is unfinished implementation, not a verified release.** The owner
asked for a handoff during the correction pass. Continue from the files already
on disk; do not restart from the September12 completion report.

## Owner's request and constraints

Current default:180-second Eiffel cinematic, desktop-first. The owner reported:

1.5–10% barely changes except the camera; start approaching the working leg at
 5–6%, removing the idle wide interval.
2.All four legs need auxiliary lifting facilities; only one had them.
3.40% looked nearly identical to10%.
4.The tower looked finished at66%, then70% returned to first-floor detail.
 Recheck the entire construction progression and make its sequence sensible.
5.Confirm the continuously moving loading wave is present.

Local URL only: https://wonderforge.localhost/#/wonder/eiffel-tower . No public
hosting, push, visibility change, new repository or publication is authorized.
Desktop is the dedicated experience; retain modest mobile accommodations without
making mobile parity the main project. Existing dirty/untracked work and evidence
must be preserved. No Git cleanup/reset or new asset generation is needed for the
identified clock bug. Blender work, if later required, starts with a fresh read-only
bridge probe and stays with the parent agent.

Read `AGENTS.md`, `specs/`, `HANDOFF.md`, especially new Specs45/46 and the physical
plausibility skill at `.agents/skills/scene-physical-plausibility/SKILL.md`.
`src/engine/` and `src/data/` remain pure (no DOM/React/Three). Keep existing IDs,
full-size rigid members, deterministic poses, source assets and ElevenLabs-only
bundled narration. Preparing/removing equipment and upper freight have existing
editorial omissions; do not falsely present those as simulated operations.

## Confirmed root cause

The old cinematic source sampler produced:

| Viewer progress | Seated tower height | Seated parts | Work |
|---|---:|---:|---|
|5–10%|20.08m|1840|Same frozen lower frame; close weight0 until18s|
|40%|22.17m|1902 including explicit campaign deliveries|Lower joint|
|66%|292.01m|13263|Approach to first-floor operation|
|70%|292.01m|13263|First-floor landing|

`eiffelFilm.ts` keys the complete long-load chapter to the selected summit stair's
original operation start `.8054955483449447`. Retiming the one source clock alone
cannot fix the story. The previous September12 monotonicity tests proved no
unbuilding but did not prove logical construction order.

Actual complete deck gates (agent recomputed from the real kit):

-First floor `.3152`, deckY57.940002m, silhouette59.215m.
-Second floor `.4298666666666667`, deckY116.14m, silhouette117.415m.
-Third platform `.6477333333333334`, deckY276.540039m.
-Selected stair `summit-access-stair-m000-c000`: operation start
 `.8054955483449447`, end `.8058784001089487`; final bounds276.54–282.53m.

The second-floor GLB has hardware from57.94m to126.27m. It must not appear with
the first-floor chapter before its116.14m support exists. The old World also
showed its prepared descending rope immediately; both must be gated together.

The admitted long-load chain ends on the SECOND-floor receiver. It does not
include197m freight or final summit transport. The existing source explicitly
omits those; unintegrated candidate files are not proof of production support.

Useful physical holds:

-Long-load280s: carrier bolted to the chocked first-floor cart at
 `[-8.5,58.280002,-4]`; old hoist released; sling on saddle.
-Long-load454–458s: carrier supported by the second-floor receiver at
 `[-15,116.479999,-1.8]`, with second hoist still attached. Stretch this hold
 while the upper structure rises, then retain the original final-installation
 omission. Do not seat the summit stair before its supporting structure exists.

## Current implementation on disk

### Parent: chronology and integration

`specs/46-eiffel-progress-story.md` documents the new intended schedule.
`src/engine/eiffelFilmEdit.ts` now exports `sampleEiffelFilmEdit(edit,t)`, returning
an `EiffelEditedFilmSample` with separate production/mechanical clocks plus
`continuousConstruction` and `relayReady`. Detailed source sampling is retained.

New180s sequence:

| Seconds | Planned action |
|---|---|
|0–9|Foundations/lower20m; approach starts9s (5%)|
|9–28|Ground lifting at four stations|
|29–48|Existing joint work; close narration34–42|
|48–66|Lower frame rises to complete first floor|
|66–82|First-floor arrival/landing; close narration72–80|
|82–104|Secure/cross first floor while building second floor|
|104–124|Second-floor relay|
|124–158|Received load stays supported while upper tower rises|
|158–162|Upper held boundary and chapter exit|
|162 onward|Original remaining summit schedule, then reveal|

Mechanical source keys remain strictly increasing/invertible. Production keys
have intentional flat holds. The first test run exposed floating-point variation
from Hermite interpolation on constant segments, which made endpoint members
alternately appear/disappear. Fixed by returning the exact constant on a flat
segment and bounding other interpolation to its endpoint range. The dense
seated-identity test passes after that fix.

Six existing caption/audio IDs are kept. New windows (seconds):15–23,24–32,
34–42,44–52,72–80,144–152. No new voice generation. The camera's full close windows
are shifted to match early leg, joint and first-floor operation; no low detail
close is selected after88s. Upper relay currently appears from the overview.
Review whether that is visually readable enough before adding another close-up.

Integration already changed:

-`src/render/three/EiffelWorld.ts`: accepts optional edited sample, stores it
 through async readiness, allows ordinary production trajectories during the
 logistics chapter, gates second-floor group/rope by `relayReady`, uses edited
 production for environment/sky/flag support and exposes production diagnostics.
-`src/render/three/WorldScene.ts`: same edited sample drives lighting, shadow
 bounds, fog/overview framing and EiffelWorld.
-`src/ui/TransportBar.tsx`, `CaptionLayer.tsx`, `QuoteOverlay.tsx`: consume edited
 sample rather than resampling global production independently.
-`src/render/three/EiffelLongLoadFilmSystem.ts`: empty prepared rope is valid;
 clamp segment count to0 instead of creating an instance count of-1.
-`tests/eiffel-film-edit.test.ts`: revised timing/clearance windows, actual edited
 seated-identity sweep and height-spread assertions.
-`tests/eiffel-ui-clock.test.tsx`: revised expected navigation windows.

`ThreeCanvas.tsx` already passes `{edit,t}` alongside mapped source time for the
cinematic view; that existing plumbing is reused.

### Delegate: four grounded stations

Owned by the in-session `eiffel_loading_work` agent:

-`specs/45-eiffel-four-leg-stations.md`
-`src/engine/eiffelGroundStations.ts`
-`src/render/three/EiffelGroundLiftSystem.ts`
-`tests/eiffel-ground-stations.test.ts`

Pure API exports `EIFFEL_GROUND_STATIONS`, `sampleEiffelGroundStation(seconds,id)`,
`groundStationQuaternion`, `rotateGroundStationPoint/Pose`. Actual kit mapping:

| Rotation aboutY | Leg | Distinct payload |
|---:|---|---|
|0|NE(+x,-z)|lower-ne-02-m013-c003|
|90°|NW(-x,-z)|lower-nw-02-m005-c003|
|180°|SW(-x,+z)|lower-sw-02-m029-c003|
|270°|SE(+x,+z)|lower-se-02-m021-c003|

Do NOT reuse legacy `eiffelConstruction.EIFFEL_LEGS`; its naming convention
is different. All four counterpart members share operation start/end
`.09025741777108326`→`.09036941977674867`. Rotated final centers agree within
4.3e-6m; bounds match; quaternion residual<=2.4e-7. All24 rotated support feet
and8 haul endpoints sample groundY0. More detailed render/occupancy checks
are in the new tests, subject to the verification snapshot below.

Renderer uses one articulated source hierarchy and shares geometry in material
batches across four rotations rather than four independently loaded rigs.
The tower kit remains sole cargo owner. Parent already added cinematic rotated
payload overrides to EiffelWorld and all four seated IDs to the edited sampler.
Detailed must retain ONE station and ONE payload; the delegate was asked to add
`setFourStations(enabled)` defaulting false. Verify that method is wired before
release. Ground equipment is established in the initial cinematic site view;
it is not shown erecting itself through scale animation.

### Delegate: new whole-progress regression tests

`eiffel_visual_audit` was asked to add `tests/eiffel-progress-story.test.ts` and
`artifacts/eiffel-progress-2026-09-13/sequence-audit.json` using the actual kit:
5/6/10/40/66/70/90/100% heights/counts, active moving silhouette, deck readiness,
monotonicity, and no early crown/late bottom close. Check the final snapshot
below for which artifacts were completed; do not assume an assigned test passed.

## Loading wave answer and verification boundary

Yes, the wave is already installed. Current served `main-CarPen2B.js` and CSS
retain its3.6-second infinite movement. The loader TSX/CSS hashes match the
September12 paired captures at unchanged80% progress. A new real delayed-asset
capture again shows80% and film time0. A fresh second paired sample could not be
captured because Chrome's tab became unresponsive during setup.

New evidence: `artifacts/eiffel-loader-current-2026-09-13/README.md`,
`observations.json`, `current-stall-a.jpg`.

Important nuance: wave motion does not depend on percentage changes, but SVG
clip-path animation may pause during synchronous main-thread model parsing.
Uninterrupted compositor motion has NOT been proven. Do not promise it never
freezes. No loader source edits were made in this correction pass. The delegate's
temporary delayed server5590 was stopped; its disposable tab close timed out.

## Verification so far (before final snapshot)

-`npm run typecheck` passed after initial parent clock/world/UI changes, before
 all delegate edits landed. Rerun on final source.
-`initial-focused.log`: UI clock tests passed, but dense identity failed on
 numerical drift within flat production intervals. Preserve this failed evidence.
-`clock-focused.log`: after exact-flat interpolation fix, all7 tests in
 `eiffel-film-edit.test.ts` passed, including source inverse/continuity, camera
 near-frustum clearance (desktop and portrait), narration focus envelopes,
 detailed behavior and dense edited seated identities.
-No full test suite, production build or actual browser QA of THIS new sequence
 had been completed when the owner requested handoff.
-The local preview still served September12 `main-CarPen2B.js` during the loader
 check. Do not confuse that live build with these new source edits.

Previous accepted release is historical context only:202files/1068tests,
typecheck/build and69captures each desktop/mobile. Its evidence is under
`artifacts/eiffel-modeling-2026-09-12/`, and its timing is exactly what the owner
has now challenged. Preserve that model/material/shadow/loader work; do not
claim those old passes validate the new chronology.

## Final handoff snapshot — read this before continuing

All in-session delegates have stopped. Parent wired
`this.groundLift.setFourStations(film.continuousConstruction)` before its update.
The method defaults false; the four-station switch is no longer an outstanding
wiring task. Final parent `npm run typecheck` passed with this integration;
log:`artifacts/eiffel-progress-2026-09-13/handoff-typecheck.log`.

Delegate station result:7 focused tests passed across
`eiffel-ground-stations.test.ts`, `eiffel-ground-lift-renderer.test.ts` and
`eiffel-ground-lift-rig-clearance.test.ts`. The latter two were also modified.
They cover sampled transformed ground/payload/rope contacts, actual builder
clearance and rendering matrices/mode switching. Exhaustive all-four occupancy,
new pending-load disposal paths and browser draw costs remain unverified. The
original hidden NE Rig still owns one packed batch allocation; it creates no
extra visible draws but remains a possible CPU/memory cleanup opportunity.

**Known failing test to fix first:** the new5-test progress suite has4passes and
1failure at `tests/eiffel-progress-story.test.ts:69`. At exactly124viewer seconds,
source arithmetic returns `longLoadSeconds=453.99999999999994`; derived relay
seconds are347.9999999999999. The geometry is already on the receiving cart,
but the sampler still reports `carrierSupport='tackle'` instead of
`'upper-receiver'`. At124+1e-8 it is correct. Add an exact semantic boundary
mapping/pin (like the earlier production-boundary fix); do not weaken the
support test or apply a broad early-admission epsilon.

Failure log:`artifacts/eiffel-progress-2026-09-13/story-focused-failed.log`.
Reproduce and regenerate audit:

```sh
WONDERFORGE_WRITE_STORY_AUDIT=1 npm run test -- --maxWorkers=2 tests/eiffel-progress-story.test.ts
```

`sequence-audit.json` was emitted and includes1801states with0seated removals.
Actual new sampler heights (not yet browser-verified):

| Progress | Seated height | Visible moving/structural height |
|---|---:|---:|
|5%|20.08m|20.08m|
|6%|20.08m|20.08m|
|10%|20.08m|20.08m|
|40%|59.22m|61.63m|
|66%|117.42m|117.42m|
|70%|119.63m|119.63m|
|90%|292.01m|292.01m|
|100%|312m|312m|

The unchanged early silhouette is deliberate actual member work: the camera
now enters it at5%, and four separate grounded operations replace the prior
wide idle interval. Actual early rendered motion/readability still needs QA.
The passed new tests cover requested progress separation, real deck readiness,
four reserved deliveries/dense identity retention, camera joins and no late
low close-up. Overall suite is still **failing** until the exact receiving
boundary is repaired. No production build or new-sequence browser QA was run.

A file hash snapshot of this pass is in
`artifacts/eiffel-progress-2026-09-13/handoff-source-hashes.json` for provenance;
it does not replace tests. User's latest request was this handoff, so finish
here rather than silently releasing or claiming completion.

## Required finish sequence

1.Read this file and inspect current diffs/files. Fix the exact124s receiving
 boundary failure above and verify single payload ownership in both cinematic
 and Detailed.
 Check that new preparation visibility does not leave empty animated slings,
 cause intersections with foundations/roads, or duplicate original source draws.
2.Review new pure regression results. Ensure platform bearing geometry exists
 before each machine/rope is shown, no reserved payload seats early, and ordinary
 construction during the long chapter has matching production works/crews.
3.Run focused tests, then required full checks:

```sh
cd /Users/hina/Documents/Experience-Intelligence-Domain/wonderforge
npm run test -- --maxWorkers=2
npm run typecheck
npm run build
```

Use existing Node24 (`/Users/hina/.nvm/versions/node/v24.4.0/bin/node` at handoff).
Two workers avoid the previously observed CPU overload/timeouts. Do not raise
all timeouts to conceal failures. Once checks pass, rerun only what new changes
or unresolved concerns justify.

4.Verify port5589 before starting anything. Last read-only `lsof` showed node
 PID39319 listening on127.0.0.1:5589. This is ephemeral state: recheck. Existing
 Portless route supplies HTTPS at wonderforge.localhost. Keep local only; no
 public deploy or external publishing. Confirm the HTML actually references the
 new bundle hash after successful build; a failed `tsc -b` leaves old dist intact.
5.Real browser QA from t=0, not only direct debug-route frames. Inspect5%,6%,10%,
40%,66%,70%,90%,100%, plus entry/exit transitions and at least several interior
samples per growth section. Save screenshots with actual slider time, edited
production and render diagnostics. Watch continuous playback across close/hold
boundaries. Confirm4stations in a wide view and each distinct cargo on its rig.
 Check40%really reads as first-floor work and66%as second-floor work;70%must
 continue upward. Check whole tower framing, camera speed and new shadow cost.
6.Desktop1280×720 is primary. Existing sampled budget200calls/450k triangles;
4stations may increase early costs. Keep modest mobile smoke390×844 (historical
budget150calls/300k); do not undertake unrelated redesign. All geometry should
remain present even if existing distance-based shadow detail is adjusted.
7.Save final report/measurements under `artifacts/eiffel-progress-2026-09-13/`,
 update the top of HANDOFF.md with actual checks/hash/limits, and report local URL.
 Explicitly distinguish completed progress correction from the retained omitted
 second-floor-to-summit freight animation.

## Browser tooling details

Use CUA for UI actions, fresh state/docs in your own session. Latest discovery:
Chrome browser1, normal Eiffel tab1736589612; browser2 was Codex in-app with no
tabs. IDs and claims may change. No new-sequence browser interaction occurred in
this pass; only inventory and the delegate's current-loader check.

For the React seek range, CUA `setValue` on the fresh AX slider index updates
React state. A prior Playwright `fill` changed the DOM value without reliably
changing playback state: do not trust that as a seek. Read `input[aria-label=Seek]`
and canvas `data-renderer-diagnostics` after each action. New diagnostics include
`eiffelLongLoad.productionT`, `continuousConstruction`, `relayReady`.
Cold startup can temporarily time out CDP; let the same page finish before
repeated reloads. Use screenshots clipped to the actual viewport. Native Mac
capture may be unavailable/locked; browser extension control is separate.

## Suggested prompt for the receiving agent

“Continue the Eiffel progress correction in
`/Users/hina/Documents/Experience-Intelligence-Domain/wonderforge`.
Read `NEXT_AGENT_HANDOFF.md`, then specs45/46 and the top of HANDOFF.md. Finish
and verify the existing edits: early5–6% leg approach,4real grounded lifting
stations, logical first-floor→second-floor→upper-tower chronology, then summit.
Preserve current assets and dirty work. Desktop-first; localURLonly. Do not
claim completion from the previous build. Complete focused/full tests, production
build, actual desktop playback/captures and modest mobile smoke; report retained
physical omissions honestly.”
