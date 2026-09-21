# Next concrete geometry correction: gussets on actual beam faces

Update: an actual isolated Blender candidate and exported convex geometry now
exist under `artifacts/eiffel-face-joint-2026-09-07/`. Read that README and
`placement-audit.json` first. Final/self/last-40-cm insertion checks pass, but
the original order is demonstrably invalid: the incoming beam penetrates the
preinstalled candidate by up to 111.460 mm. Production remains unchanged until
ground delivery, supported positioning after the beam and fastening are
authored, followed by the coherent LOD/manifest/cache changes described below.

The two-load chapter is admitted only under the existing final-connection-overlap convention. Do not describe it as a fully nonpenetrating finished joint.

The strongest counterexample is `lower-ne-02-m015-c000`, source member `lower-ne-02/member-015`, stage3. Its center is `[51.31428527832031,19,-43.04999923706055]`; its local size is `[.755999982357,.188999995589,.755999982357]` and quaternion is `[-.707106828690,0,0,.707106828690]`. Consequently its world box is X50.936287–51.692284, Y18.622–19.378, Z−43.144501–−42.955498. The long axis of `m012-c001` crosses this slab at its center. Conservative SAT separating translation at the final pose is0.436049990m; this is not merely a floating-point boundary contact.

The source is `scripts/blender_eiffel_tower.py`, `lattice_bay`, lines143–145: all four square gussets are made with one world-axis box orientation. The face at constantX needs a plate normal nearX (adjusted to the inclined pylon face), rather than the same worldZ slab used for every face. `scripts/blender_eiffel_construction_kit.py` lines48–54 and109 onwards assigns ordinal source-member identities and splits/export bounds. That identity generation must be handled deliberately: inserting objects ahead of member015 can renumber later members and invalidate the current chapter bindings.

Implementable next change:

1. In the Blender source, derive each gusset's plane from the actual three-dimensional face tangents (`lo[k]→hi[k]` and `m0→m1`), then place one or two thin connection plates on the **outer surfaces** of the intersecting members. Start with this one named source member. Measure the actual intersecting diagonal member faces; do not assume all member centerlines lie in one plane or just rotate the existing0.189m-thick cube through the iron. A12–18mm plate thickness is an authored modelling choice requiring explicit labeling.
2. Either use actual face plates with measured offsets, or model a truthful shaped opening/segmented collar around all crossing iron. Export each occupied plate section as its real primitive/convex geometry. A hollow mesh plus an unchanged solid AABB occupancy record would retain the audit bug. Do not hide the old gusset, omit it from collision checks, or merely enlarge contact tolerance.
3. Preserve selected beam IDs and source-member lineage. If source015 becomes paired plates, assign explicit child IDs and extend the manifest/production dependency data rather than silently changing subsequent ordinal names. Capture both construction-piece GLB and seated source LOD so the visible connection does not revert when the film swaps LOD.
4. Change the dependency at the named joint: ground delivery/seat of the connecting iron first, followed by a visible plate-placement/fastening operation or a genuinely preattached plate that does not block arrival. Existing production currently completes source015 before the beam arrives. A face-plate pair cannot be asserted installed at that earlier instant if it depends on an absent beam. The braced joint support must stay until the permanent connection is fastened.
5. Recompute the completed set and route cache under the revised schedule; regenerate the exact manifest/GLB hashes, route station data and the integrity seal only after checks. The selected freeze value cannot be presumed unchanged when dependency timing changes. Re-audit both routes, crew reach and cart payload hardware COM if the delivered assembly gains plates.
6. Require zero solid penetration against this corrected gusset (no original-overlap allowance for it), then inspect the remaining six contacts listed in `final-contacts.json`. Some are intended joints but they must be resolved by actual contact geometry, not assumed acceptable from scalar overlap alone.

This is a focused geometric correction and dependency change. It is independent of the broader remaining high-origin deliveries and crane equipment lifecycle; those remain active work.
