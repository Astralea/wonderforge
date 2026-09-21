# Independent material/reflection source review

Scope: read-only review of eiffelReflection.ts, RenderPipeline.ts reflection
lifecycle, eiffelParis.ts PBR propagation/batching, and the three focused test
files. No new test suite or browser session was run; parent owns final runtime QA.

No actionable correctness or resource/batching defect found in this scope.

- eiffelReflection.ts:13–28 uses DataTexture's unflipped rows consistently
  with the installed Three equirectUv mapping (ground at v=0, sky at v=1).
  CSS sky/ground colors are converted by Color to linear values; the float
  texture correctly declares LinearSRGBColorSpace. Longitudinal seam values
  are identical. tests/eiffel-reflection.test.ts checks the actual orientation,
  finite values, seam and bounded deterministic day/night intensity.
- RenderPipeline.ts:287–298 guards duplicate PMREM creation and disposes
  source texture and generator scratch resources in finally. The returned
  PMREM target is separately owned; the installed generator does not dispose
  that returned target when disposing its scratch state. Lines428–437 detach
  scene.environment and dispose the retained target before renderer teardown.
  WorldScene.ts:70–75 enables this only for the Eiffel world; each WorldScene
  constructs its own pipeline at line52, so other wonders do not inherit it.
- eiffelParis.ts:190–192 records source roughness/metalness per corner. All
  three spatial merge/split paths propagate the two-component attribute with
  the same corner indexing; lines385–388 inject it after stock roughness and
  metalness factors are declared. Lines464–469 bind matching vertex attributes.
  No new material group or draw batch is introduced for these PBR roles.
  Source material disposal does not dispose the retained shared facade texture;
  its separate material-owned, once-only texture/bitmap cleanup remains intact.
- tests/paris-facade-materials.test.ts:28–58 compares source positions and PBR
  pairs with the batched output, allowing only existing pool-clipping removals;
  the next test preserves mapped corners and checks once-only texture disposal.
  tests/paris-roof-detail.test.ts:24–28 compares the sorted multiset of existing
  city triangles/UVs and bounds the added kit. Lines30–48 raycast dormer and
  gallery centers onto actual source roofs. These tests do not certify every
  chimney contact or all rooflight edge clearance.

Evidence inspected: candidate-tests.log reports23 passing tests across the
five asset/material/detail files, including the changed PBR test and roof kit.
That log predates final reflection QA. Reflection lifecycle conclusions above
are source ownership review, not an instrumented GPU disposal measurement.
