# Spec 49 — Scene authoring pipeline

Owner correction, 2026-09-20: a well-modelled aqueduct standing alone is not
a convincing Rome. This is the executable authoring contract for the layered
world in Spec 07. Earlier references to `wonderforge-scene-builder` pointed to
a skill absent from this checkout; this document replaces that broken entry.

## 1. Evidence and place, before assets

Read the target scene spec and HANDOFF. Fix the date range and compass first.
Record primary/official sources, exclusions and explicitly authored compression.
Draw a plan of the settlement, terrain, approach roads, worksite and utilities.
For every prominent background structure answer: where does it come from,
what does it serve, and how does it meet neighbouring terrain and structures?
Do not infer archaeological certainty from a plausible-looking model.

Deliverable: target-owned typed context data with named districts, routes,
endpoints, footprints, sources and interpretation notes. Renderers and
clearance checks consume those same values. An anonymous prop count is not a
city plan. Leave actual construction routes open, rather than clearing a
uniform empty ring around the monument.

## 2. Whole-scene blockout, before decorative detail

Establish landforms, streets and recognisable district masses first. Inspect
opening, middle and reveal with the production camera at desktop and portrait.
The image must read as monument in a place even without tiny windows or trees.
Infrastructure endpoints must enter a documented precinct, continue into the
settlement, or have an honestly declared out-of-frame continuation. A severed
arcade on empty terrain fails this gate. Fog cannot replace missing city fabric.

Design the light and camera as part of this blockout. When a sun-led ending is
intended, project the actual world-space sun through the production desktop and
portrait cameras before adding glow. Compass, visible disc, key light and
shadows must agree. Check the complete closing beat, not just its final frame. A celestial sequence
must share one physical clock: lunar phase, bright-limb orientation, rise/set
and Sun/Moon positions cannot be authored independently. Select and disclose a
representative date and place; validate astronomical interpolation against an
external ephemeris. Keep any cinematic angular enlargement/exposure separate
from coordinate accuracy and never infer a monument alignment from framing.
Choose the phase/date for the requested event: an evening moonrise requires
an appropriate near-full or waning Moon. Coordinate the workday with the sky;
finish visible labour before a quiet nighttime completion reveal. Review
caption/narration timing alongside any construction-clock retiming.

Narration must explain the monument's siting, design, materials, construction
methods, structural function or a construction milestone. Verify relevance as
well as factual accuracy. Weather and celestial motion may compose the shot
without becoming spoken chapters; discuss an alignment only when evidence
connects it to the monument's design. Remove filler beats and let chapter count
follow the construction story. Generate voice from the final caption bodies
and verify their timing against the actual construction clock (Spec 50).

A residential kit needs different footprints/roof masses/storey heights, then
street- and district-aware distribution. Colour jitter on one scaled model is
not sufficient. Review near streets, inhabited hills and farther terrain as
three overlapping depth layers; do not leave a repeated slab of equal-height
roofs or use a uniform empty exclusion ring as the city plan.

## 3. Author and integrate the kit

Use original Blender assets for shapes that need authored geometry; reuse
existing compatible kits before adding downloads or generation dependencies.
Save the reproducible script, versioned `.blend`, GLB and inspection evidence.
Record axes/metres, named parts, bounds, material roles, triangle counts,
provenance and expected placement in the asset/context manifest. One asset's
studio render does not validate its placement in the film.

Keep typed data and deterministic expansion pure. Three.js owns GLB delivery,
fallbacks, readiness, batching, LOD and disposal. Shared footprints govern
roads, buildings, trees and utility clearance; test transformed extents, not
only centres. Ground samples, contact and support use the production sampler.
Use `.claude/skills/scene-physical-plausibility/SKILL.md` for these checks.

## 4. Bind construction and presentation

Construction uses rigid final-size parts, supported routes, named operations
and reversible deterministic time. Existing context is present from the start;
new period landmarks need their own justified chronology and build behaviour.
Preserve IDs, catalogue availability, captions/audio, arrival and reduced motion
unless the owner changes those requirements. This pass does not add a loading
animation to the homepage.

## 5. Verify relationships, then review the film

Run meaningful contracts for date/compass, endpoint continuity, support,
footprint exclusion, route access, async delivery/disposal and geometry budget.
Run `npm run test && npm run typecheck && npm run build` after source freezes.
Capture the rebuilt production version at opening/middle/reveal on desktop
and portrait; exercise playback and navigation. Record the bundle, GPU backend,
console errors and renderer counts. Colosseum retains 180k desktop / 120k
portrait submitted-triangle budgets, including shadows.

Use the read-only historian and visual-director roles in `.factory/droids/`
for evidence-cited review. Reject disconnected utilities, isolated identical
houses, anachronistic landmarks, hidden support failures or a context that
disappears from the actual camera. Asset, CPU, browser/GPU and physical-device
verification are separate evidence. If one is unavailable, report that gap.

Deliverable: dated report, before/after full frames, numeric evidence, remaining
limitations and HANDOFF update. Publication is a separate owner-authorized step.

## Colosseum application

AD 70–80 city context: Palatine to the west/southwest, Velia to the northwest,
Oppian/Esquiline to the northeast and Caelian to the south. The Neronian branch
approaches the Temple of Claudius precinct from the east across the Caelian.
Its receiving context is the precinct's eastern retaining wall and former
Neronian waterworks, not a fictional direct water supply to the amphitheatre.
Show adjoining streets, terraces and roof fabric; keep later Domitianic
Palatine extensions, Trajan's baths and Constantine's arch absent.
Exact plots, precinct elevation and compressed route are authored interpretation.

Sources and target acceptance remain in Spec 12. Runtime relationships live in
`src/data/colosseumUrbanContext.ts`; the exported context manifest and film
captures live under `artifacts/rome-context-2026-09-20/`.
