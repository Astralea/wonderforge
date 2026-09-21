# Multi-chapter movie integration preparation

The film mapper now uses ordered, typed production-coordinate insertions. Only the previously validated ground-lift entry is currently admitted. The movie remains exactly122s; the existing55s operation, its absolute timing, and its working camera remain unchanged. No proposed route is visible merely because the mapper supports another chapter.

The new sample fields are `insertionId`, `chapterSeconds`, `campaignSeconds`, and `seatedPartIds`. Existing `pilotSeconds` and `selectedSeated` remain for compatibility. Every seating handoff derives from the absolute movie clock, so earlier delivered iron remains seated during a later chapter and reverse seeking restores the prior state independently. `eiffelFilmTimeForProduction` adds all admitted insertions preceding an original caption/stage coordinate.

The proposed joint campaign must wait for the mechanics sampler, total duration, per-part seating timestamps, and verified support/routes. Its original freeze coordinate is0.09193744785606445. It must retain kit IDs lower-ne-02-m012-c001 and lower-ne-02-m012-c002. Do not populate the registry with placeholder timing or replay the old pilot twice.

Parent renderer integration must:

- Let the existing tower kit own each cargo's only mesh copy. Honor `seatedPartIds` before sampling active campaign payload poses. Other original operations remain frozen at the campaign's exact production coordinate.
- Suppress each delivered part's legacy moving crane after its own handoff; do not use one campaign-wide boolean that seats both parts together.
- Keep actual temporary joint supports/equipment persistent through both loads and their empty-hook/cart transitions. Any equipment installation or removal omitted via a temporal cut must be explicitly disclosed; no continuous-shot disappearance.
- Drive the campaign system and captions with `campaignSeconds`, original captions/narration/light with `productionT`, traffic/water with elapsed film clock. Caption voice remains silent where no reviewed bundled clip exists.
- Add a joint-campaign label in TransportBar and phase captions in CaptionLayer. Store duration and soundtrack elapsed clock already derive total film duration; caption index inverse already uses the general map.
- Verify forward/reverse seeks across both individual seating instants, campaign boundaries and editorial cuts; replay must restore both queued parts and initial campaign equipment state. Validate actual main playback, not an isolated scene.

Current refactor validation:9film tests and typecheck pass. New test checks seated ID persistence and reverse seeking while preserving the original single-entry122s registry. Campaign-specific timing, geometry, camera and live browser validation remain pending the valid physical sampler.

## Conditional implementation and worker audit —21:36

The registry now conditionally admits the actual sampler only when `EIFFEL_JOINT_CAMPAIGN_ADMITTED` is true. It imports duration, seating and permanent-connection timestamps directly. The current sampler specifies135s, seated46/114, permanent connection126; with3s preparation and4s removal the main movie would be264s. Admission remains false, so the real preview is still122s. No second delivery has been advertised as integrated/validated yet.

`eiffelJointCampaignShotAt` is ready behind that gate. It establishes both ground-stock carts and real support, follows each load independently, returns wide for the empty-hook transfer, frames the actual fastening platform/joint after second seating, and recovers wide before the final temporal cut. It retains the5m near plane. Pure camera tests check desktop/mobile phase framing, stock-handoff continuity, useful projected load/worker size and proximity to all final tower solids plus old/new support geometry. Actual main-page campaign camera QA remains pending admission and the final renderer/sampler.

The independent actual-renderer worker audit found a29.15mm hat/iron crossing and6.65–9.87mm hand/forearm crossings; preserved in `fastening-worker-before.json`. Corrections in `eiffelJointFastening.ts` lower the head6cm, lean the fixed shoulders forward10cm, and route the far hand up/across/down before gripping the plate. Both arms retain .38m/.4m segments. Slide grips retain physical top/side plate contact. The wrench now pivots on the actual rivet face, with a rigid connecting jaw and the hand following its handle; it no longer waves outside the plate.

Current `fastening-worker-audit.json`:2,701times,48,618 actual renderer body/tool states,1,900 completed tower solids,245 old/new support solids and both moving load poses; zero external crossings. Feet remain exactly on the platform; maximum limb-length error7.4e−15m; sampled instance/source-matrix error1.91e−6. This does not certify moving plate/crane/rope clearance, worker self-contact, or load capacity. Re-run the audit after final cargo-route changes; the sampler remains under mechanics review.

Current focused validation:23tests across film/camera/fastening pass; typecheck passes. New fastening tests prove actual hand/plate contact throughout each slide and wrench/bolt contact throughout the fully engaged tightening phase. No Blender/server/build actions were performed by this subagent.

## Final positive-basket sampler recheck —21:48

Re-ran the actual fastening-worker/handle/jaw matrix audit against the final COM-balanced positive-basket cargo routes:2,701times,48,618 states, zero crossings; exact platform foot contact and rigid limb lengths unchanged. `fastening-worker-audit.json` now records the exact sampler, routes, support, renderer, worker and actual splice-GLB SHA256 hashes. Route hash:0e18ba7485e0112a4cf70b5dcb23e6430c114eb2ad8d483c6336f7acd4176c7c.

All4 joint-camera contract tests pass on these routes (the3 unchanged original-camera tests were intentionally skipped). These checks cover phase framing, camera continuity, projected cargo/worker size and foreground near-plane clearance. Actual main-page GPU/playback review remains the parent's post-admission gate; this recheck does not claim the currently gated-off chapter was viewed in the production movie. No source changes were needed.

## Admission received —21:49

Mechanics enabled `EIFFEL_JOINT_CAMPAIGN_ADMITTED` after its dense route/sweep review. The conditional registry now admits the real campaign automatically; total film duration264s. All10 film tests pass with admission enabled, including independent seating handoffs, reverse seeking, both chapter boundaries and the original125° orbit mapping. Typecheck passes. Parent owns the ensuing production build and actual desktop/mobile main-movie review. The worker audit sampler hash precedes only this admission-flag change; physical route/support/worker/renderer hashes and geometry are unchanged.
