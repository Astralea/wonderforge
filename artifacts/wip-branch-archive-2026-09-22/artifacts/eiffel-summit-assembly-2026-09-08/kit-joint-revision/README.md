# Independent mast joint export gate

The final candidate shortens only `summit-crown-m072-c000`, starting it at the
actual crown floor hub top near 300.670013m and keeping its upper contact with
`summit-crown-m072-c001` near 302.666667m. The completed compact member has the
same new bottom and retains its original 312m top.

`tests/eiffel-mast-joint.test.ts` passes seven checks against the actual candidate
and preserved `before/` exports. Entire binary chunks, primitive descriptions,
all unrelated nodes and every unrelated manifest record are identical. Only the
intended node's Y translation and Y scale differ in each GLB. Counts remain
13,852 nodes / 166,320 triangles in the construction kit and 7,172 nodes /
86,436 triangles in the compact kit. The manifest changes c000 plus explicit
revision provenance. Its end anchors and lifting points match the shortened
member; stale anchors discovered in the first source draft were corrected by
the parent before this passing candidate.

Contact checks decode actual GLB accessors and complete node transforms. The
lower support comprises twelve radial floor members, m049, m051, …, m071. Their
24 actual top-face triangles are subtracted from the entire 0.18m-square mast
footprint; remaining uncovered area must be below 1e-9 square metres. This tests
continuous area coverage, including spaces between ray samples, without counting
overlapping floor triangles twice. Signed solid separation and actual triangle
rays on a 7×7 grid also pass at both floor/c000 and c000/c001 contacts within
0.1mm. Every radial floor member remains below the mast within that tolerance,
and the central stair remains below it. The compact asset passes the same full
footprint and ray tests. No arbitrary final-phase intersection exemption is
introduced. This verifies geometric contact, not bearing capacity or a
historically surveyed connection detail.

`floor-hub-audit.json` records final before/candidate SHA-256 identities, changed
node indices and source-file identity. The actual 33,654,819-byte Blender file
has a valid BLENDER header. This independent subtask did not open Blender or
claim a Blender reload verification. No older proof seals were changed.

The existing summit-shape test now identifies the three mast parts by their
source member and compares the foot to the actual crown floor hub top. Its prior
`height > 4m` selector and `foot = 298m` expectation described the superseded
overlapping geometry. All other shape/opening assertions are unchanged.

`floor-hub-test.log` records the final candidate seven-test pass.
`floor-hub-public-tests.log` records the final joint gate plus eight actual
public summit-shape checks after adoption. This bounded gate does not certify
the construction route or the whole animation's physical completeness.

The earlier stair-top candidate is rejected: it passed its narrower stair/mast
contact test but still penetrated the radial floor joists by approximately
0.16m. Prior test sources, audit, README and logs are preserved under
`independent-stair-joint-v1/`; parent-preserved candidate assets retain their
separate evidence. The earlier `independent-audit.json`, `test.log` and
`public-shape-tests.log` describe that superseded candidate, not this final one.
