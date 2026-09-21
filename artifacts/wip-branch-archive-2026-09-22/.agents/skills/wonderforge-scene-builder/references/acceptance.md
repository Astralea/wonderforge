# Reference-scene acceptance

Apply the relevant rows to the target scene and record evidence. A row is never satisfied by prose alone when it can be asserted or measured.

## Pure data and engine

- Repeated plan expansion is deeply equal; runtime `Math.random()` is absent.
- Stable part IDs and final transforms are unique and finite.
- Every structural part keeps `[1,1,1]` animation scale and its authored dimensions.
- Dependencies seat in order; support exists before an upright, lintel, course, roof, or deck uses it.
- Adjacent samples and all phase boundaries are position/rotation continuous within documented tolerances.
- No part first appears at or under its destination; seated parts never move.
- Routes stay on their declared road, ramp, pit, scaffold, crib, or working surface and clear unrelated footprints.
- Transformed stone/block bottoms stay within ~0.03 m of the shared terrain sampler plus engine-owned carrier height. Never assert a baked sled offset as "turf height".
- Active operations, lanes, crews, dust, and moving meshes remain within typed caps.
- Contact effects occur only at declared contacts.
- Camera/light/environment samplers clamp and reproduce exact debug times. If the spec promises motion from the first frame, an early `t` (for example 0.12) has already left the opening azimuth. Never duplicate consecutive azimuth keys to fake a hold.
- Labour poses are engine-owned, bound to operations, unique per id, and never a chorus-line orbit or a planted bob. Climbers never ride a rising deck; Y is capped by the visible stack.
- Outdoor targets expose deterministic typed zenith, horizon, cloud/haze, and
  sun states; checkpoint samples preserve the target's declared sky identity.
- Outdoor water bodies use the shared Giza water recipe. Harbour, lake, and
  river glints must receive `updateWaterSky` from the target's typed sky and
  must not be a cloned, unticked tinted plane. Waterline foam is authored
  geometry with a playback-phased pulse.
- Soundtrack lookup is keyed by stable wonder ID and role. Migrated wonders
  use unique cue IDs and files; an unavailable cue returns silence rather than
  another wonder's music.

## Renderer and lifecycle

- The target uses its typed world, not `LegacyWorld`, without breaking other IDs.
- Browser diagnostics identify the intended target world; a stale production
  preview or nonblank legacy fallback never counts as evidence.
- Settled/repeated geometry is instanced; active geometry uses bounded reusable objects.
- Workers, carriers, ropes, tools, and effects read the same operation state as their structural part.
- Mutable instanced batches never disappear because of stale bounds.
- No unsupported slab, floating rig, ground intersection, z-fighting road, horizon edge, or camera/cloud intersection is visible.
- Desktop/mobile DPR, shadow, draw-call, triangle, geometry, texture, and material figures are measured against the scene brief.
- Project-specific limits override the inspector's generic pass/fail badge;
  measure the worst construction and reveal frames, including shadow passes.
- Every owned GPU resource and observer/listener is disposed on scene switch/unmount.

## Browser sweep

Capture at least four meaningful normalized times, including one active lift/raise and `t=1`. Use both a desktop viewport near 1440×900 and a portrait mobile viewport near 390×844.

For every capture confirm:

- nonblank, compositionally varied pixels;
- near/site/far depth layers;
- a readable human scale reference;
- causally supported construction during BUILD, with crews doing mixed jobs rather than a synchronized ring;
- stable framing with no near/far crop;
- material detail under the current light without crushed blacks or blown highlights;
- restrained, adjacent UI controls with no scene-critical overlap;
- no console, page, asset-load, WebGL, or audio-unlock errors.
- target sky/weather identity is plainly visible after fog, grade, and crop;
- outdoor water shows ripple and a sun-glitter path from the target sky,
  never a plastic blue fill;
- newly generated cues decode locally, hit their declared duration/loop
  contract, and pass a human cultural-fit/anachronism/vocal/seam audition.

Record renderer diagnostics with the image. If a budget is exceeded, fix it or document the measured tradeoff rather than hiding the number.

## Review and handoff

- A fresh reviewer receives images first, without the intended score or implementation rationale.
- Historical review identifies documented facts, inferences, authored interpretations, and anachronisms.
- Visual review checks silhouette, causality, materials, light, environment depth, mobile framing, and UI restraint.
- `npm run test && npm run typecheck && npm run build` pass after the final edit.
- Confirm the production preview HTML hash matches the new bundle before trusting a capture.
- `HANDOFF.md` names the new reference route, architecture, tests, captures, budgets, sources, assumptions, known defects, and next action.
