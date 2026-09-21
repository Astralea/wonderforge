# Eiffel summit revision — 8 September 2026

Parent used the installed Blender Lab MCP on the isolated port 9877 to generate
the revised tower. The successful read-only probe and complete build response
are retained under `mcp/`. This is actual Blender geometry exported to glTF,
authored against historical references; it is not single-image photogrammetry.

The public gallery now has four 12 m main sides and four 2 m diagonal faces.
The two surrounding decks share a clipped perimeter and retain their central
openings. Above the private rooms, shorter curved trusses lead to a lower
balcony, octagonal lodge, upper balcony, narrow lantern and cupola. The upper
meteorological balcony now has a nominal 0.70 m radius, correcting the old
1.45 m radius against Watson's 1.40 m diameter description.

Rouillard's 1889 section guided the stepped silhouette. The minor elevations
and radii in Spec 17 are an authored proportional interpretation, not dimensions
recovered from surveyed shop drawings. Service access is divided into a lower
spiral and smaller ladder sections. No worker-access or structural capacity
certificate is claimed for these summit details.

Editable files:

- `blender/source-generation/eiffel-tower.blend`: linked source members and
  original whole-tower review camera.
- `blender/eiffel-tower-summit-review.blend`: the source scene with an additional
  close summit camera.
- `blender/eiffel-tower.blend`: bounded erection kit used for export.

The historical reference is packed into the saved source and kit as a named
reference image, outside the exported construction geometry. Close actual
Blender renders are under `renders/`; source reload evidence is under `mcp/`.
Final MCP reload succeeds for the exact source scene (7,078 objects) and exact
kit scene (13,858 objects), both with the packed 2310 × 3535 reference. These
counts include presentation objects outside the GLB. The initial candidate's
verification completed its actions but returned a list instead of the MCP's
required dictionary; that protocol error and subsequent successful readback
are retained. The final candidate's complete reload/render call returns `ok`.
The three temporary parent-owned Blender processes were stopped only after their
jobs completed. The original desktop Blender process was left untouched.

Final V3 export: 13,852 bounded parts, 166,320 triangles; the completed-member
asset has 86,436 triangles. Maximum canonical cargo dimensions are approximately
2.34 × 2.05 × 6 m. A bounded transport envelope alone does not prove a route or
support. See `partition-audit.json` for original-box volume and cupola-face
partition checks. The final candidate also adds the apartment's interior floor
and widens its roof opening to 2.1 m, clearing the approximately 1.925 m spiral
handrail envelope. The first candidate, including its actual source, kit,
renders and MCP responses, is preserved under `candidate-v1/`. V2 and its failed
mobile budget report are preserved under `candidate-v2/`. V3 coalesces straight
floor bands, removing 3,744 redundant seated triangles. The five floor unions
remain equivalent within the 0.2 mm export tolerance; the comparison retains two
sub-tolerance snapped cracks from V2 instead of silently dropping them. Actual
original crack width was approximately 0.48 micrometres. See
`floor-union-comparison.json` and the independent actual-GLB shape tests.

The initial public kit is preserved in `before-kit/`. The adoption domain is
every stage below 54 plus the exact delivered `summit-access-stair-m000-c000`:
11,939 parts. Web adoption must compare actual transformed GLB vertices and
topology as well as manifest records. Historical evidence seals remain intact;
new compatibility evidence must be recorded separately. Existing summit stock,
rack and handling studies tied to the old geometry remain historical.

The complete suite passes: 770 tests across 134 files with four workers;
app typecheck and production build pass. The initial unbounded-concurrency run
passed 767 tests but timed out one 30-second initialization hook, leaving its
three tests unexecuted. The complete four-worker rerun passes all three without
changing their assertions or increasing that hook timeout. All logs are kept.
An intermediate V3 run captured the obsolete deck-count precondition before its
fixture update finished; the final frozen suite passes all 770 tests in 63.87 s.
Final bundle: `main-3-ssOnL1.js`, SHA-256
`8ac40a36890c04f703cd5f7377642efbfb11fac2aa62ef00da58857bbbf41c13`.
The updated 399-second film's first-floor chapter starts at255.32973290069668s.

Actual final Chromium QA passes at desktop 1440 × 900 and mobile 390 × 844.
Each runs 101 film seeks, nine hoist samples, complete-summit capture, actual
Space playback and reverse seeking. Desktop peak: 348,763 triangles / 166 calls;
mobile peak: 295,502 / 149, within their existing 450k/200 and 300k/150 limits.
Served JS and all six tracked model/manifest hashes match the final local files.
There are no recorded browser errors or horizontal overflow. The measured
reverse crop is pixel-identical. These checks do not establish whole-scene
temporal stability or photorealism. Parent inspected final Blender, completed
desktop and mobile hoist captures; normal bracing occlusion remains.

Review: http://127.0.0.1:5589/?review=summit-1889-v20#/wonder/eiffel-tower
The wider goal remains active: onward unloading, upper material delivery,
crowd readability and remaining scene shimmer still need work. No other wonder
has been selected while Eiffel remains incomplete.

References:

- [Rouillard, 1889 summit section, Brown University scan](https://commons.wikimedia.org/wiki/File:Le_sommet_de_la_Tour_Eiffel._Coupe_dessin%C3%A9ee_par_M._Rouillard.jpg),
  public-domain engraving, local original in `references/rouillard-1889.jpg`.
- [Watson, Civil engineering, 1889 exposition report](https://archive.org/details/civilengineering00wats/page/825/mode/2up),
  sections 348 and 352; local source under `../eiffel-summit-rigging-2026-09-08/`.
