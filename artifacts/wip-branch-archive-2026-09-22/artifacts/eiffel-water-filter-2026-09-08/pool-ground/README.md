# Exposition basin ground and paving correction

The large basin's far fountain is now surrounded by water inside the complete
coping. The smaller basin no longer contains the crossing promenade surface.
This is a separate geometry correction after the admitted water shader; no
water shader, Blender source, source GLB, camera, crowd or route was changed.

## Exact change

| Basin center z | Outer coping footprint x / z | Ground and floor underside | GLB floor top | Coping underside | Retained water level |
|---:|---|---:|---:|---:|---:|
|230|[-10.7,10.7] / [195.3,264.7]|5.416863|5.556863|5.606863|5.776863|
|310|[-9.7,9.7] / [297.3,322.7]|6.067779|6.207779|6.257779|6.427779|

`eiffel-champ-floor` was a 15 m indexed grid whose triangles rose through the
level source basin. `excavateEiffelExpoBasins` clips those triangles at the
exact outer coping rectangles, prepares a level base at the unchanged GLB
floor underside and joins the original exterior with retaining faces. The low
end requires local fill; the high end requires excavation. Exterior triangle
planes and all fully unaffected source triangles remain unchanged. The shared
`eiffelTerrainHeightAt` file is byte-identical to its preserved copy, so outside
navigation and erection support are unchanged.

`eiffel-expo-pool-underbeds` fills the actual 0.05 m coping gap above the floor,
adds support under the outer edge of the coping and fills the 0.30 m gap below
each twelve-sided fountain pedestal. These are separate bounded masonry solids;
the tests verify their contacts against exported source triangles and avoid
putting the new beds inside the retained floor slab. The existing basin/fountain
shapes and water height are unchanged. The locally raised front base is visible;
this does not claim a surveyed historical foundation or soil-capacity model.

The GLB source mesh tagged `wf_paris=true, wf_material=paving`, loaded as
`Paris_Exposition_architecture_and_streets-paving009`, contained the small-basin
promenade intrusion. `clipEiffelPoolPaving` changes only this tag inside the same
rectangles before ordinary Paris batching. Source primitive corner offsets
35760 through 35847, step 3, identify exactly 30 affected source triangles:

- 18 enclosed triangles removed;
- 12 boundary triangles split into18 retained exterior triangles;
- 194 m² of enclosed paving removed;
- 25858 remaining paving triangles retain their exact position/normal attribute
 bytes; all other source mesh index/attribute buffers remain unchanged.

The runtime city has 202312 triangles; the saved source GLB still has 202324.
Only the explicit twelve-triangle difference is admitted by the previous Paris
preservation tests. Architectural filter recognition, every filtered feature's
metadata and actual non-paving source corners remain checked.

## Verification and actual browser evidence

`focused-tests.log`: 19 tests pass across basin geometry, Paris asset preservation,
architectural filtering and the unchanged water shader. After strengthening the
actual attribute-byte check, `byte-preservation-tests.log` records all 7 basin
tests passing; `typecheck.log` passes. They check actual source floor/coping/
pedestal triangle heights, dense basin and exterior boundary rays, finite
prepared faces, exterior attribute bytes and 101 sampled active-traffic frames
keeping sole footprints outside the basins. They do not certify every imaginable
route or structural capacity.

`browser/` contains desktop 1440×900/DPR1 and mobile 390×844/DPR1.35 before/after
captures from actual WorldScene programs on 5590. Baseline modules are the saved
pre-grading environment plus the city loader with only the three new paving-hook
lines removed, served through an explicit module interception. This is not a
production-bundle override. The harness asserts baseline 18432 terrain/0 bed/
202324 city triangles and after 18608/288/202312, preventing an accidentally
unintercepted baseline from passing. The first failed interception attempt is
preserved in `browser-unintercepted-v0/` and is not evidence for before/after.

The final run has zero browser errors. Full context observed exactly +452
triangles and +1 draw in every matched pair. Mobile fountain after is 251102
triangles/78 calls, small basin243340/75; these are bounded camera captures,
not a whole-film budget sweep. Both large/small desktop and mobile captures were
visually inspected. The complete far fountain and coping are visible, with no
terrain tongue crossing the water. The smaller basin's pavement cut is also
verified by actual geometry, even where reflection obscures the former paving.

`browser/report-qualified.json` preserves the measured rows and distinguishes
geometry before/after from water uniform variant 1; its derivation from the
harness-asserted counters is documented, and original `report.json` is preserved.
Actual response hashes are retained. The served water module SHA256 stays
`3415a519e89e8c7143129cb163d52df6299af3a1bba476a2030e8aac15b6a732`
on all four page loads. The water shader file still matches its earlier seal.

The paired `*-motion-start/later.png` captures advance only water phase by 0.4 s
with fixed geometry/camera/lighting; `water-motion-check.json` confirms both
program variants advance, all other water uniforms match and image bytes change.

No app build or broad suite was run here. Parent owns final production build and
full-film desktop/mobile verification.
