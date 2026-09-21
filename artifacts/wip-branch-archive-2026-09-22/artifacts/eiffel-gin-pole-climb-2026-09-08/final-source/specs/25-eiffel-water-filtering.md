# Eiffel water highlight filtering

The existing Eiffel ripple-octave filter remains enabled. Target the narrow
standard-material GGX highlights and analytic sun halo/disc added to emissive
water reflection. A warmed component-isolated comparison must identify each
contribution: ordinary material roughness controls GGX, but not the added
emissive reflection. Preserve the broad sky reflection,
Fresnel, broad halo, deterministic water motion, geometry and draw calls.

Estimate the screen pixel's reflection-direction variance from the actual
procedural field and world-position footprint. Use derivative-free analytic
noise gradients to propagate the existing finite-difference wave slope; do not
take derivatives of an already derivative-filtered normal. Widen only unresolved
narrow highlight lobes continuously. Propagate normal variance into GGX squared
roughness before standard lighting, with a bounded footprint-dependent kernel;
normalize the extra analytic halo/disc lobes by their integrated energy. Keep
the actual material roughness in the zero-footprint limit, not a globally
roughened water material.
The resolved/zero-footprint limit must equal the current shader. Do not reuse
the rejected four-sample lobe quadrature, add temporal noise, or simply delete
glitter to reduce a temporal score.

Admission requires actual warmed desktop/mobile GPU comparisons at fixed water,
lighting and construction times, explicit CSS canvas sizing and recorded served
source/uniform identities. Compare native-resolution off/on images to a matched
supersampled reference as well as tracked temporal variation. Check the near
surface, broad motion/reflection and integrated brightness; a lower temporal
metric alone is insufficient. Existing source geometry and draw-call counts
must remain equal. If the candidate fails this comparison, preserve its evidence
and retain the current renderer without claiming an improvement.

This is a bounded shading approximation, not a claim that all water sparkle is
aliasing or that whole-scene flicker is eliminated. Final whole-film production
budgets remain a separate parent-owned gate.


Implementation evidence: `artifacts/eiffel-water-filter-2026-09-08/README.md`.
The admitted candidate reduces reference-relative error in all 18 desktop/mobile
samples; larger 8×8 references confirm the ranking. Mobile raw luminance change
is not lower, while a matched-reference temporal residual is lower. Preserve
that distinction when reporting. The known local radiance bias and lack of an
all-view or whole-film gate remain explicit.

## Separate basin-ground correction

After the shader admission, correct the local ground intrusion into the two
existing exposition basins without changing the admitted water shader or its
archived evidence. Preserve the actual GLB coping, floor, fountain shapes and
horizontal water level. Clip the rendered terrain at exact outer coping bounds;
inside those bounds place a level prepared base at the source floor underside,
with retaining faces joining the unchanged exterior terrain. This includes
local fill at the low end and excavation at the high end, not a broader change
to the shared terrain sampler or pedestrian/haul support heights.

Provide mortar/masonry underbeds for the actual coping underside and short
submerged plinths under the two fountain pedestal bottoms. They must contact
existing source geometry without overlapping its solid interior. Check actual
exported triangle surfaces and render geometry, including boundary strips,
not merely the helper's intended dimensions. All ground geometry and support
samples outside the authored footprints must retain their previous height.

The small basin also contains pre-existing GLB promenade paving. This separate
asset/layout conflict must remain explicit if not resolved by the parent; a
terrain-only correction does not certify every pool object or traffic path.
Keep matched full-context desktop/mobile before/after captures and record the
new source identity separately from the earlier shader experiment.

The parent subsequently authorized removal of the intersecting paving within
those same exact coping footprints in the runtime city loader. Apply it only
to the actual GLB `wf_material=paving` source mesh. Keep original source bytes,
all other mesh data and every exterior source triangle; split only boundary
triangles to retain their original exterior surface plane and attributes.
Record fully enclosed source triangles separately from boundary source triangles
and their replacements. Source and runtime triangle totals therefore differ by
an explicit audited amount; do not relax the unrelated Paris preservation gate.


Final basin gate: source pavement offsets35760..35847 step3 comprise exactly30
input triangles;18 enclosed inputs are removed and12 boundary inputs retain
outside area as18 replacements. The excised area is194 m². Runtime city count
is202312, while the unchanged source GLB remains202324. Prepared terrain adds
176 triangles, underbeds add288 and one material draw. Actual source contact,
exterior attribute preservation, active traffic exclusion, and desktop/mobile
captures are recorded in `artifacts/eiffel-water-filter-2026-09-08/pool-ground/`.
