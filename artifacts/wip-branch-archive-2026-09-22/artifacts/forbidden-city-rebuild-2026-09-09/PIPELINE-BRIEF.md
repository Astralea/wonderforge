# Forbidden City: bounded rebuild brief

Planning only, 2026-09-09. The parent recorded `forbidden-city` as the next
selection after Eiffel passes. This brief does not implement or admit a new
scene. It preserves both Eiffel editions, their source assets, clocks, audio
and saved evidence. Historical references are being collected separately;
proposed apparatus and dimensions below require that research and actual
Blender geometry before they become production data.

## Current defects grounded in the repository

- `src/render/three/sceneRegistry.ts:1` has no Forbidden City reference world;
  `WorldScene.ts:76` constructs `LegacyWorld`. The fallback consumes only
  `compiled.structure` (`LegacyWorld.ts:65`), so the JSON's Beijing background,
  ten carrying workers, scaffolding, dust and birds are not rendered. The
  compiler keeps these as separate fields (`src/render/sceneCompiler.ts:262`).
- `src/data/scenes/forbidden-city.scene.json` builds the terrace from three
  whole slabs, the principal hall from one solid box, roofs from pyramids and
  guardians from spheres. It supplies no transport, material inventory,
  support surfaces, timber joints or real roof construction.
- Both eight-column rows are wholly embedded in the main hall box: columns
  centered at z=±4.1 with radius .25 sit inside its z=±4.5 extent; their x and
  y extents also fit inside it. Consequently, the intended colonnade is hidden
  by solid wall mass. The roofs use `ConeGeometry(...,4)` in
  `LegacyWorld.ts:43`, with no curved eaves or modeled bracket support.
- `entranceState()` (`src/engine/timeline.ts:108`) makes full slabs/roofs
  appear a short distance above their seats and settle. This is the same
  missing material-arrival problem raised by the owner on Eiffel.
- `src/store/playback.ts:57` assigns every non-Eiffel wonder 60 seconds.
  `captionsFor()` supplies generic fact captions, and Forbidden City has no
  entry in the narration or soundtrack registries. The catalog's 1420 date,
  room-count tradition and unlinked quotation need source review; do not
  silently describe all currently standing architecture as original 1420 work.

## Smallest complete product

A 180-second film of a recognizable central palace ensemble: principal hall,
terraces, ordered courts, side galleries, gate/walls and a restrained Beijing
setting. Research fixes the represented date and landmark hierarchy first.
Use photograph/plan-guided original Blender geometry; modern photographs are
form references, not photographs of fifteenth-century construction. Hidden
faces and compressed geography remain labeled interpretation in the docs.

Build three representative operations well. Keep the camera moving smoothly
between a wide view, a useful working detail, and the widened parallel-progress
view. Floating captions fade using film time; narration describes the story.
No fullscreen cards, forced pauses or long equipment-installation digressions.
The camera reveals other crews' compressed progress on return; it must not
show complete roofs or terraces visibly springing into existence.

| Film time | Representative action and resulting view |
|---|---|
| 0–18s | Establish the axis, prepared ground, stockyard and occupied approach. Show materials already arriving at the site. |
| 18–50s | Follow one identified foundation facing stone on its carrier to a supported terrace landing; workers lever it into its seat. Widen to reveal other prepared foundation sections and concurrent crews. |
| 50–98s | Follow one timber column from supported yard stock through hauling and a restrained raising operation to its actual stone base. Show the foot/pivot, rope attachments and temporary bracing. Widen as adjacent column-and-beam bays complete in parallel. |
| 98–150s | Approach one readable bracket/beam connection and a short roof-working sequence: a small member or tile basket arrives on the scaffold, then workers fit material to supported framing. Widen through layered eaves and neighboring roofs. Never lift an entire finished golden roof as one solid. |
| 150–180s | Travel back across the courtyards to the completed ensemble, retain people and water motion, and hold the final composition for at least eight seconds. |

For repeated work, use a bounded schedule of crew lanes and completed bays;
only the featured stone, column and roof delivery need sustained close shots.
Do not turn every tile, joint or temporary fixture into a separate chapter.
Keep their surroundings physically supported while using the owner's approved
time compression. Document compressed preparation and off-camera repetition
without filling product captions with audit disclaimers.

## Pipeline and disjoint ownership

| Owner | New files and narrowly shared integration |
|---|---|
| Parent: source, admission, audio | Write the next available numbered Forbidden City spec first. Own `scripts/blender_forbidden_city.py`, Blender MCP probes/build/save/reload, dated `blender/` and `model/` candidates, reviewed media generation and final adoption. Preserve existing sources. |
| Pure scene/film agent | New `src/data/forbiddenCityTypes.ts`, `forbiddenCityConstruction.ts`, `forbiddenCityEnvironment.ts`, `forbiddenCitySky.ts`; new `src/engine/forbiddenCityConstruction.ts` and `forbiddenCityCamera.ts`; focused pure tests. No renderer imports and no invented contact coordinates. |
| Renderer agent | New `src/render/three/ForbiddenCityWorld.ts`, `forbiddenCityAssets.ts`, `ForbiddenCityConstructionSystem.ts`, `ForbiddenCityEnvironment.ts`; actual-asset/lifecycle tests. Own and dispose all imported resources, batch settled parts, apply pure active poses and worker contacts. |
| UI/QA agent, shared edits serialized by parent | Narrow registration/lifecycle branches in `sceneRegistry.ts` and `WorldScene.ts`; Forbidden-only duration in `playback.ts`; captions/voice/score registration, catalog metadata and browser harness. Preserve all Eiffel branches and other fallback IDs. |

Minimum local asset set: `public/models/forbidden-city/palace-kit.glb`,
`site.glb`, `construction.glb`, plus `palace.manifest.json`. The kit contains
stable rigid part IDs and material roles; site contains shared support surfaces,
urban courtyard blocks, water bounds and circulation; construction contains
the original crew/carrier/scaffold/raising-rig hierarchy. No runtime upload or
model-generation service is required. Existing Blender MCP is sufficient.

The manifest must export **actual mesh** bounds, units/axes, final poses,
contact anchors, support/seat IDs, representative transport IDs, roof/bay
membership, dependency order and mesh/material mapping. Bake dimensional scale
in Blender; runtime structural poses remain rigid. Write this contract from
saved source geometry, then let the engine reference those anchors.

Suggested pure API: `sampleForbiddenCityConstruction(plan, seconds)` returns
featured rigid part poses, owner (`stock/carrier/rig/seated`), support/contact
points, crew targets, apparatus poses and completed-bay membership;
`forbiddenCityCameraAt(seconds, aspect)` returns the matching shot. Keep
`durationSeconds=180` with the plan. Use Giza's separation of active operations
and settled batches (`GizaWorld.ts`, `BlockSystem.ts`), not its pyramid-specific
stone graph, ramp layout, monument types or atmosphere.

Two integration traps matter early:

1. `WorldScene.ready` currently awaits only Eiffel. Add Forbidden City's
   loading promise and disposal path so the existing `ThreeCanvas` asset gate
   prevents the new 180-second clock running before its models arrive.
2. `useCaptionVoice.ts:37` calculates elapsed voice time with `*60`. Merely
   changing playback duration would give wrong resumed/seeked narration time.
   Supply actual seconds divided by 60 for Forbidden's voice arguments, as
   Eiffel story cues already do, or add a backward-compatible clock parameter.
   Leave existing Eiffel behavior unchanged. Assign a distinct verified
   ElevenLabs voice; add a separate local reviewed score rather than borrowing
   another wonder's audio. Use actual cue durations and existing audio unlock,
   persisted-off and cleanup behavior.

## Admission gates

- **Geometry/history:** inspect the saved Blender source and actual exported
  meshes together. Verify hall/terrace/gate silhouettes, open colonnades,
  roof support, shared ground elevations and clear circulation; separate
  researched dimensions from authored interpretation. Preserve reference IDs,
  candidate hashes and before/after captures.
- **Featured physical actions:** same part identity and dimensions from stock
  to seat; no active/settled duplicate. Check full transformed cargo/carrier
  bounds and contact points against exported surfaces through each phase join.
  Test column foot/pivot and its restraint before/after bracing; rope endpoints
  attach to actual apparatus; roof materials land on existing framing.
  Worker hands reach their tasks and at least one foot has real support during
  stepping. Use dense samples only where moving geometry approaches an obstacle.
- **Film:** deterministic forward/reverse seeks, continuous shot joins,
  completed parts remain fixed, bounded parallel crews and stable full-size
  structure. Detail shots must reveal the relevant contact on both portrait
  and desktop; frustum fitting alone does not establish visibility.
- **Rendering/browser:** use actual production slider/play/pause on desktop,
  portrait and landscape. Review the three actions, every shot join and the
  final hold; run a 101-position whole-film budget sweep with served GLB/bundle
  identity and console errors. Adopt Giza's 450k desktop triangle / 90
  steady-state draw-call target; specify the mobile cap before authoring
  (proposed 300k triangles / 90 calls). Do not relax Eiffel's existing caps.
  Check moving-camera roof-tile, railing and paving aliasing; avoid coplanar
  overlays and unfiltered distant detail. Keep the scene visually inhabited.
- **Integration:** run the full test/typecheck/build chain, then verify both
  unchanged Eiffel editions, caption/audio clocks, all ten deep links,
  reduced-motion stills, late asset readiness and resource cleanup on switching.
  Test actual media advancement after a user gesture; preserve explicit audio
  preferences. Browser captures do not establish historical certainty,
  structural load capacity or a full human listening review.

No production, spec, test, model or GPU changes were made for this brief.
