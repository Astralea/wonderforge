# Camera-selected Paris pedestrian detail

Production source is frozen pending parent composed-film gates.

The existing 648 pedestrian identities now share exactly the original 48
articulated slots (18 men, 30 women) and 600 silhouettes. No new GLBs, actor
routes, geometry cohorts or capacities. The stateless selector ranks visible
people >=12 CSS px tall first, offscreen fillers next, then unresolved visible
people; projected height and stable IDs resolve ties. One representation per
actor is assigned before rendering. Actor-bound silhouette colors remain stable
when slots are reassigned. Whole-batch stale bounds are disabled while per-object
frustum culling remains enabled. The final camera setter also handles paused
orbit controls. Parent owns EiffelWorld/WorldScene camera and diagnostics plumbing.

Owned files: specs/19-eiffel-crowd-detail.md,
src/engine/eiffelCrowdDetail.ts, src/render/three/EiffelEnvironment.ts,
tests/eiffel-crowd-detail.test.ts, tests/eiffel-crowd-renderer.test.ts.

Final focused tests: 14/14 across pure selection, actual renderer slots/contact/
reverse and the unchanged existing environment suite. See focused-tests.log.
Typecheck at this snapshot is blocked only by concurrent physical-clock test
fixtures (quaternion tuple inference and missing stage), preserved in typecheck.log;
parent owns the final composed typecheck/build after engine stabilization.

Parent actual WorldScene GPU harness and captures are in near/. Independent
inspection of desktop baseline/dynamic near images confirms the target changes
from a cone to the authored man with hat, torso, arms and separate legs.
Both desktop and mobile show target selection false -> true at matched camera,
respectively 130.50 and 122.38 CSS px projected height. Both have no errors and
pixel-exact reverse captures. These are near-view checks, not final full-film
budget proof. Parent owns full desktop/mobile timeline QA after pace integration.

Limits: the GLBs remain deliberately low-poly; this improves representation
selection, not photorealism. Threshold/rank changes use a discrete mesh replacement
without fades or temporal hysteresis. Occlusion by actual buildings is not ray
queried; frustum-visible ranking can spend a slot behind architecture. Geometry
allocation is unchanged, but submitted triangles can rise when formerly culled
slots are reassigned on screen, requiring the full mobile 300k/150 gate.
