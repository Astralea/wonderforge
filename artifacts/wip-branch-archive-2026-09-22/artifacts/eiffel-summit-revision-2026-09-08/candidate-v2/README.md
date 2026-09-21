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
Final MCP reload succeeds for the exact source scene (7,390 objects) and exact
kit scene (14,304 objects), both with the packed 2310 × 3535 reference. These
counts include presentation objects outside the GLB. The initial candidate's
verification completed its actions but returned a list instead of the MCP's
required dictionary; that protocol error and subsequent successful readback
are retained. The final candidate's complete reload/render call returns `ok`.
The two temporary parent-owned Blender processes were stopped only after their
jobs completed. The original desktop Blender process was left untouched.

Final candidate export: 14,298 bounded parts, 171,672 triangles; the completed-member
asset has 90,180 triangles. Maximum canonical cargo dimensions are approximately
2.34 × 2.05 × 6 m. A bounded transport envelope alone does not prove a route or
support. See `partition-audit.json` for original-box volume and cupola-face
partition checks. The final candidate also adds the apartment's interior floor
and widens its roof opening to 2.1 m, clearing the approximately 1.925 m spiral
handrail envelope. The first candidate, including its actual source, kit,
renders and MCP responses, is preserved under `candidate-v1/`.

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
changing their assertions or increasing that hook timeout. Both logs are kept.
Final bundle: `main-CjCxQsss.js`, SHA-256
`5afb2415f2b6d5330df792ff1c8362be5d957fa9f9841217df5c750f60787c4c`.
The updated 399-second film's first-floor chapter starts at255.47612306830035s.
Final desktop/mobile browser QA results will be recorded here when available.
The wider goal remains active: onward unloading, upper material delivery,
crowd readability and remaining scene shimmer still need work. No other wonder
has been selected while Eiffel remains incomplete.

References:

- [Rouillard, 1889 summit section, Brown University scan](https://commons.wikimedia.org/wiki/File:Le_sommet_de_la_Tour_Eiffel._Coupe_dessin%C3%A9ee_par_M._Rouillard.jpg),
  public-domain engraving, local original in `references/rouillard-1889.jpg`.
- [Watson, Civil engineering, 1889 exposition report](https://archive.org/details/civilengineering00wats/page/825/mode/2up),
  sections 348 and 352; local source under `../eiffel-summit-rigging-2026-09-08/`.
