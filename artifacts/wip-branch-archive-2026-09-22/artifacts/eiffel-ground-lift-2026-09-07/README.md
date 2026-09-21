# Eiffel main-film ground delivery — 2026-09-07

The existing Eiffel movie now includes one visible ground-origin delivery.
A cart carries the actual selected tower member into the worksite, followed by
rigging, lifting, turning, seating, unrigging and empty-hook recovery. The 55s
passage is integrated into the main route, extending the film from 60s to 122s
including two explicit editorial cuts. Those cards acknowledge omitted crane
installation and dismantling. This is not a complete construction simulation.

## Editable Blender and runtime assets

- `blender-final/eiffel-guyenet-ne.blend`: final installed crane and falsework.
- `blender-final/installed-crane.png`: inspected studio render including feet.
- `mcp-save-final.log`, `blender-final/mcp-save-result.json`: actual MCP saves.
- `blender/` and `blender-clearance/`: retained intermediate evidence.
- `../../public/models/eiffel-guyenet-ne/crane.glb`: actual integrated export.
- `../paris-photo-study-2026-09-07/blender-final/paris-1889.blend`: retained
  photo-informed Paris source with original reference images packed separately.

The parent operated the installed Blender Lab MCP after a read-only connection
probe. No additional plugin was needed. Recessed crane crossbars, narrowed
lower bearings and dogleg falsework correct the tested NE station's contacts.
The generic component and prior assets remain intact.

## Implementation and verification

`src/engine/eiffelFilm.ts` maps the longer film onto the unchanged production
schedule. `src/engine/eiffelGroundLiftPilot.ts` provides the rigid payload,
carrier, hook and sling poses. `src/render/three/EiffelGroundLiftSystem.ts`
loads the Blender asset and renders the cart, crew and rigging. Repeated parts
use instancing; tests compare actual batch transforms to articulated sources.
The tower kit owns one payload, with an explicit seated handoff. Loading holds
the playback clock. Captions, quote timing and the existing local soundtrack
follow the longer movie without changing other wonders' durations.

- `full-tests-final-batched.txt`: 539 passing tests in 69 files, maxWorkers=4.
- `typecheck-final.txt`, `build-final.txt`: passed; main bundle CDFZ77ur.
- `natural-completion.json`: full natural 4× playback to completion and replay
  through mounted DOM controls, with no endpoint seek or browser errors.
- `qa-mobile-full/report.json`: 245 production-route positions, peak 293,420
  triangles and 123 draw calls, no browser errors.
- `../eiffel-integration-2026-09-07/final-batched-qa.json`: desktop/mobile
  forward/reverse/end seeking and live hoist playback; desktop peak 138 calls.
- `../eiffel-integration-2026-09-07/final-batched-cart-giza/`: cart playback
  and Giza render smoke check, no browser errors.
- `../eiffel-integration-2026-09-07/HOOKED-CRANE-CLEARANCE.md`: 2,751 sampled
  external-clearance states across the passage. Actual GLB equivalence covers
  774 beam/box primitives and 551 articulated tip poses.

Earlier failed test/QA logs are retained. An unrestricted concurrent full-suite
run hit a foundation-crew timeout during heavy Blender/browser work; the final
bounded-worker full suite passed. Earlier browser captures with stale HMR store
instances and pre-batching draw-call failures are superseded by the final files.

## Limits and next work

Only member `lower-ne-02-m013-c003` uses this complete ground-delivery passage.
Other legacy upper receiving origins and collision findings remain unresolved.
The clearance evidence excludes full crane self-collision, concurrent lifts,
and equipment assembly/removal. Workers do not yet perform detailed knotting,
steam control or bolt work. The narrow member remains difficult to distinguish
against the lattice on mobile. Full-film frame rate has not been certified.
Desktop complete-end geometry reaches 346,172 triangles; 300k is the mobile
limit, not a claim about all viewports.

Paris remains original, stylized modeling informed by historical images, not
automatic single-photo reconstruction or photorealism. The prior demonstrated
glass depth-precision and fountain-noise fixes remain integrated. Denser city
variation and further visual refinement remain part of the active goal.

Local review: http://127.0.0.1:5589/?review=eiffel-ground-delivery-v10#/wonder/eiffel-tower
