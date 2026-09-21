---
name: wonderforge-scene-builder
description: Rebuild a WonderForge catalog fallback as a typed, deterministic physical Three.js construction scene using the Giza reference pipeline. Use when migrating another wonder while preserving its stable ID, catalog content, UI contract, and procedural diorama art direction; never use for isolated UI tweaks or generic Three.js projects.
---

# WonderForge Scene Builder

Turn one legacy wonder into a production scene whose visible motion explains how the monument is built. Giza is the architectural exemplar, never a geometry template. Current typed references: Giza (additive masonry and ramps), Stonehenge (megalith pits and cribs), Petra (subtractive rock), Colosseum (elliptical arcade, cranes, wagons, ground-rooted scaffolds), Sydney Opera House (harbour podium, spherical-section ribs, yellow tower/crawler cranes, bulldozers, dump trucks, tile skins), Eiffel Tower (Champ de Mars, puddled-iron lattice, creeper cranes, Seine water).

## Start from the contract

1. Read `AGENTS.md`, all `specs/`, and `HANDOFF.md`. The specs win over this skill.
2. Read [references/pipeline.md](references/pipeline.md) and [references/labour-camera.md](references/labour-camera.md) before planning or changing a scene.
3. Inspect the target catalog entry, legacy JSON, Giza data/engine/render path, existing tests, and accepted captures. Preserve the target `id` and keep every other deep link functional. Never rename a wonder `id`.
4. State a compact scene brief: historical moment, construction thesis, visible operations, world layers, camera beats, labour thesis, material palette, signature shot, target devices, and numeric render budget.
5. Frontend visual work uses Factory Droid / Devin `kimi-k3-max` (K3). Author a review-board brief, capture debug frames, and keep the report in `artifacts/review-board/`. Do not substitute the in-session coding model for art-direction review or UI visual QA.

## Build outward from pure state

- Change the relevant spec first. Distinguish documented fact from an authored plausible interpretation when construction methods are disputed.
- Put serializable scene, environment, route, operation, and schedule data in `src/data/`. Put deterministic sampling, interpolation, camera, daylight, and labour kinematics in `src/engine/`. Neither layer may import React, DOM, browser globals, or Three.js.
- Give every structural component its final dimensions at source. It may translate and rotate through a continuous supported route, but never scale, teleport, emerge from underground, or appear early at its destination.
- Bind each active component, carrier or rig, workers, ropes/levers, contact effects, and sound metadata to one operation state. Renderers consume that state; they never invent construction logic. Engine-owned `sledLift` / `carrierHeight` must be added into `position`; the renderer derives `supportY` from the transformed bottom and never re-applies a second lift.
- Share one pure terrain/support sampler between engine poses and renderer meshes. A renderer-private `terrainHeight` plus a flat pose plane is how Stonehenge stones floated over turf while grass followed the heightfield.
- Author a full world: atmosphere, far geography, ecology/settlement, site terrain and logistics, monument, work systems, and foreground. Construction footprints and haul corridors are typed once and drive both geometry and keep-out validation.
- Give every outdoor reference scene a target-owned typed sky/light/atmosphere description. A generic renderer clear color or inherited fog is never a sky. Verify visible sky coverage, horizon continuity, cloud/weather identity, and monument-to-sun composition in desktop and portrait captures.
- Transfer Giza water quality onto every outdoor reference that has a water body: shared `materials.water` (playback-phased ripple, chop, Fresnel-weighted analytic sky glitter), per-frame `updateWaterSky` from the target's typed sky, and waterline foam. Never ship a flat tinted plane. The Colosseum lake that stayed "just blue" while the Nile glittered is the failure mode. Tint the shared dielectric for local colour; never dispose it from a scene environment; never clone it onto a material that `updateMaterialDetailTime` / `updateWaterSky` will not tick. Transfer the optical recipe, never Nile meanders, boats, or foam segment counts.
- Civilization VI wonder movies are the presentation bar: dawn-to-night orbit, construction assembly, unique cinematic score, and a dense identifiable place. Study publicly posted wonder-movie footage as lighting/density/score reference. Never import Firaxis meshes or copy Civilization VI audio. A coarse empty blockout (dashed landmarks, CAD-blob roofs, silent movie) is a failed migration even if the final silhouette is recognizable.
- Key soundtrack metadata by stable wonder ID **and** cue role. Never reuse another wonder's cue or silently fall back across cultures. Generate each migrated scene's music through the approved Google Gen AI SDK/Lyria pipeline, retain prompt/model/provenance, and separate documented acoustic evidence from respectful speculation. Reject convenient regional stereotypes and later-period instruments (Stonehenge: no bagpipes; Eiffel: 1889 salon strings and restrained brass, never accordion, can-can, jazz, or Piaf-era chanson). An unscored legacy scene is silent until reviewed.
- Caption beat count is per-wonder. Never copy a five-step template onto a new scene. Caption **voice** is ElevenLabs only: generate clips with `scripts/generate-narration.py`, pin them in `src/data/narration.ts`, and ship a distinct voice (Giza George, Stonehenge Daniel, Colosseum Bill, Sydney Alice, Eiffel Adam). A migrated scene with authored captions but no ElevenLabs track is incomplete. Missing audio is silence. Never use `window.speechSynthesis`, Vertex Gemini TTS (`scripts/probe-narration.py` is forbidden), or another wonder's narrator.
- Register the world in `src/render/three/sceneRegistry.ts`. Add a target-specific compositor under `src/render/three/`. Reuse shared renderer/material infrastructure only where its semantics fit. Three.js modules own and dispose all GPU resources; `ThreeCanvas.tsx` remains the only canvas/DOM owner.
- Instance settled/repeated pieces; pool the small active set. Disable or recompute culling for per-frame instanced batches whose first frame can be empty. Never do full-buffer uploads or plan rescans in frame-hot code where a sorted cursor or cached index suffices.

## Labour and camera (non-negotiable)

Read [references/labour-camera.md](references/labour-camera.md). Short form:

- Crews are labour bound to operations, never spectators or a planted bob.
- Every visible person has a distinct job, occupancy, gait, and lean from a seeded per-id salt (`mulberry32`). Never `Math.random()` at runtime. Never a chorus-line orbit, identical `sin(t * k + i * phase)` around a ring, or slingers circling a stone in lockstep.
- Never glue workers to a rising deck. They climb onto a deck that already exists; height is capped by the visible stack.
- Scaffold poles are ground-rooted segments of authored length. Never fake raise/strike by scaling Y.
- Camera paths are target-owned and pure. If the shot must turn from frame one, azimuth lerps linearly from the first key. Never freeze the intro with duplicate azimuth keys. Never easeInOutQuad azimuth when that ease zeros the derivative at t=0.
- Crews must read at the cinematic hold distance (diorama scale and contrasting tunics when the camera sits hundreds of metres out).
- Wagon wheels roll with haul travel. A treadwheel spins from hook *vertical* travel and holds still during a pure slew.

## Prove the migration

Read [references/acceptance.md](references/acceptance.md) before the verification pass.

- Add contract tests for deterministic expansion, stable/unique IDs, final-size invariance, continuous phase boundaries, monotone scheduling, support/occupancy/right-of-way, settled immobility, active-operation caps, labour uniqueness, camera motion from the first promised frame, and disposal/renderer adapters. Contact tests must compare the transformed geometry bottom (or heel/soffit) to the support surface, never the object origin. A test that hard-codes a carriage offset as "expected turf height" pins a float.
- Transfer quality, never mechanics: Stonehenge's surface-matched interpolation, contact-kind state, and target-owned sky/horizon into Giza; Giza's engine-owned lift, keep-outs, material recipes, occupancy tests, and water optics (ripple, chop, analytic sky glitter, foam) into later outdoor scenes. Never copy ramps onto Stonehenge or Colosseum, pits onto Giza, subtractive spoil cells onto an additive arcade, or a flat tinted water plane onto a harbour or lake.
- Add target-identity contracts for deterministic sky checkpoints and soundtrack lookup. Assert unique cue IDs/files across wonders, exact cinematic duration, decodable local assets, and no cross-wonder fallback.
- Run `npm run test && npm run typecheck && npm run build`.
- Confirm the production preview HTML hash matches the new bundle before trusting a screenshot. A type error leaves the previous `dist/` in place.
- Run the production renderer at the target debug route on desktop and mobile. Capture early, middle, late, and reveal frames; inspect console/page errors, nonblank pixels, framing, causality, and renderer diagnostics. Reproduce presentation bugs under live playback from t=0, never only by loading a debug time.
- Treat sky as visually accepted only when the target weather/light identity is readable in the pixels; a nonblank background or hidden dome edge is never evidence. Audition every newly generated cue before accepting it, including cultural fit, unwanted vocals, modern/anachronistic timbres, pacing, seam, duration, and loudness.
- Give the resulting frames a fresh-eyes visual review, using K3 when requested, and fix evidence-backed blocking defects before handoff.
- Update `HANDOFF.md` with architecture, sources and authored assumptions, changed files, tests, captures, measured budgets, known risks, local URL, and the next priority.

Never call the migration complete merely because the final monument looks correct. The movie must keep construction logistics legible throughout scrubbing.
