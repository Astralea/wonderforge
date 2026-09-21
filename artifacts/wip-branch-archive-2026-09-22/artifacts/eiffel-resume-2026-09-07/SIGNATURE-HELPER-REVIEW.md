# Isolated camera-aware signature helper — frozen for parent review

2026-09-07. New source: `src/engine/eiffelSignatureTiming.ts`; tests: `tests/eiffel-signature-timing.test.ts`. Production timing, renderer, route cache and camera were not edited for this subtask. No Blender, application build or server changes.

The helper selects near-facing human-scale box payloads, prioritizing existing `sampled-clear` route evidence and then projected silhouette quality. It measures six actual current-route poses (.04,.20,.40,.60,.80,.98 of the operation) against the camera at corresponding positions inside each proposed2.4s window. Projection uses the existing cinematic camera at1440×900 and390×844. Convex-hull area avoids falsely rewarding thin diagonal beams for their large screen-aligned bounding boxes. Projection is checked independently against Three.js PerspectiveCamera in tests.

## Proposed selections

The values below are worst sampled long dimension/effective silhouette width, in pixels. Width is convex-hull area divided by long dimension, not a claim of uniformly opaque coverage.

| Window | Exact part | Stage | Desktop pixels | Mobile pixels | Current route evidence |
|---|---|---:|---:|---:|---|
|.090–.130|`lower-ne-08-m008-c000`|9|22.56 /4.02|8.04 /1.42|Needs route validation|
|.265–.305|`platform-1-0-05-m000-c014`|23|26.90 /5.56|10.90 /2.29|Sampled-clear under current schedule/model|
|.540–.580|`shaft-15-m008-c001`|50|15.00 /.76|10.40 /.52|Needs route validation; subpixel width|
|.780–.820|`summit-apartment-roof-m001-c002`|57|12.24 /.45|8.89 /.33|Needs route validation; subpixel width|

**The last two choices are not visually accepted signature loads.** No eligible shaft/summit candidate met the one-pixel minimum effective width at every sampled pose while preserving the current camera and other candidate requirements. The helper returns `silhouette:'subpixel-width-review'` explicitly. Longer duration alone will not make those thin silhouettes clear. After the parent replaces the crane/campaign model, consider a better presented payload attitude or supported bounded bundle whose actual source members form one connected shop assembly, then remeasure; do not enlarge structural members or silently claim the projection threshold proves readability. Occlusion by completed iron, contrast, crew readability and browser antialiasing remain visual gates.

`projectionScope:'route-samples'` and `routeSampleCount:6` distinguish these measurements from the helper's explicit installed-envelope-only fallback if a caller provides no preview poses. Route-sample inputs should be required for integration review.

## Timing behavior and limitations

`allocateEiffelSignatureTiming` returns a NEW map. All13,814 parts retain positive operation intervals in topological stage order. It isolates each chosen signature in its own2.4-second wave, leaving the other three rig slots available to park. Other waves hold at most four parts. Dependencies cannot share a wave or finish after a dependent starts. Camera height milestones remain exactly .1546666667, .3152, .4298666667, .6477333333 and .9. Internal stage spans are redistributed; the first-floor stage must begin earlier to contain its2.4s interval.

Computed result:3,579 waves; ordinary median8.993ms;11,503 ordinary operations remain shorter than one60fps frame. These are explicit time-lapse costs, not an assertion that the full work becomes readable. The helper does not yet assign stable physical rig identities, station campaigns or relocation capacity. A four-operation cap is not proof that a particular persistent rig layout can serve every operation. Those campaign constraints must be added/reviewed before parent integration.

Retiming invalidates baked upper routes because their fingerprints include start/end, and the changed completed-neighbor order must be checked again. The first-floor `sampled-clear` label describes current evidence only; it does not certify that route after retiming.

## Parent research update

The parent has reported new CNAM1889 primary-source crane measurements and is building a reference-based climbing mechanism. This helper encodes no historical crane reach, load capacity or climbing dimensions. The earlier timing proposal's8.4m references describe the old implementation constraint, not historical authority. Keep this helper isolated until the new campaigns/model are ready; regenerate route evidence and preview poses afterward.

## Verification

Four focused tests pass: candidate bounds/front-facing projection and deterministic selection; independent Three.js pixel projection; complete schedule/dependency/barrier/cap/milestone checks; rejection of invalid reservations or missing dependencies. Typecheck passes. No integrated browser acceptance or app build is claimed.

Reproducible artifacts: `signature-selection.ts`, compiled `signature-selection.mjs`, `signature-selection.json`, and `signature-selection.log`. JSON includes source hashes, chosen parts, projection measurements and timing capacity; `productionIntegrated:false` and `routeRevalidationRequired:true` are intentional.
