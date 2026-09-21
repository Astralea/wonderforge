# Independent mast joint export gate

The candidate shortens only `summit-crown-m072-c000`, starting it at the actual
central stair column top near 300.510014m and keeping its upper contact with
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

Contact checks decode actual GLB accessors and complete node transforms. They
compare signed solid separation and cast rays against the actual end-face
triangles on a 7×7 grid throughout each shared footprint. Both stair/c000 and
c000/c001 contacts are within 0.1mm, including numerical solid overlap below
that tolerance. The shared stair contact footprint is approximately 0.15m square;
the mast is 0.18m square. This verifies geometric contact, not bearing capacity
or a historically surveyed connection detail.

`independent-audit.json` records new before/candidate SHA-256 identities, changed
node indices and source-file identity. The actual 33,654,819-byte Blender file
has a valid BLENDER header. This independent subtask did not open Blender or
claim a Blender reload verification. No older proof seals were changed.

The existing summit-shape test now identifies the three mast parts by their
source member and compares the foot to the actual central stair top. Its prior
`height > 4m` selector and `foot = 298m` expectation described the superseded
overlapping geometry. All other shape/opening assertions are unchanged.

`test.log` records the candidate seven-test pass. `public-shape-tests.log`
records the joint gate plus eight actual public summit-shape checks after
adoption. This bounded gate does not certify the construction route or the
whole animation's physical completeness.
