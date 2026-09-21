# Static foliage culling source gate

Executed with direct Node24.4.0 after source readback on2026-09-08:

- `eiffel-static-scatter.test.ts`:1/1 pass. Actual populated source count is60 per crown/trunk mesh;540 is capacity. All source geometry arrays,60 matrices/colors, shared materials and shadow flags match the packed batches. Originals are hidden; two packed batches have individual culling enabled. Independent packed disposal fires exactly once.
- `eiffel-rebuilt-environment.test.ts`:10/10 pass, including asynchronous disposal and existing crowd/source contact checks.
- `paris-detail-filter.test.ts`:5/5 pass; exact202312-triangle source corner/metadata multiset retained.
- `paris-assets.test.ts`:4/4 pass after restoring40m sliver merging, including unchanged1600-cell bound and one city material batch.
- Typecheck:exit0.

Final source hashes:

`EiffelEnvironment.ts`:d558833343da1a2a341ed406e7d8512f31d5640bc00c156196ec4c65b3ff82cd

`eiffelStaticScatter.ts`:84b44085ce15d538a0ec770e73a38325332359d4b8ef5d89416020accd49342f

`eiffelParis.ts`:0222b7432a0f1caccaadeeba702cd829502ecb3e410e7e59d3456fe4f6a0df64

The13m grid /20m merge trial was rejected because it created4229 cells; the1600-cell bound was not relaxed. The foliage snapshot above used13m /40m. No tree, city or crowd density is reduced.

## Subsequent13m /35m partition candidate

Current `eiffelParis.ts` SHA256:81c435dbfc10619b540fb9928ba3791f0a533ed4b778770726fad42ff469530b. Foliage source hashes above remain unchanged.

Measured1558 cells pass the unchanged1600 bound. Paris-assets4/4 and detail-filter5/5 pass on this source, preserving all202312 triangles and the exact source-corner/facade-metadata multiset. The latest detailed test output is `paris-13m-35m-filter-tests.log` beside this note. Actual mobile GPU acceptance is owned by the parent and must be recorded separately; these source checks do not establish a triangle-budget improvement.

## Final terrain partition and composed source gate

Final `EiffelEnvironment.ts` SHA256:21b345c112b9cecd8895dfa87c08b5891ec92c540233cd0e7b46f8333888f2f7.

New `eiffelTerrainChunks.ts` SHA256:5299a8f92e7ef0d527c017ad1d4df12951ff6c953eb3e428471c2d9997575947.

StaticScatter84b44085… and Paris81c435db… above remain unchanged. The original basin-excavated terrain is partitioned into at most64 complete-triangle cells with identity instances and the same material. Its original grid coordinates are recovered only for classification because the existing excavation output has no UV attribute. No geometry/shader attribute is added or removed.

Final focused run:21/21 tests in5 files pass (`final-culling-tests.log`), including exact ordered terrain-triangle/all-attribute multisets, exact union bounds,42 source/packed support rays, actual tree arrays/matrices/colors and packed/source disposal. Typecheck exits0 (`final-culling-typecheck.log`, empty because no diagnostics).

Read-only final helper review found no actionable lifecycle/geometry regression: Environment484–486 retains the already prepared source geometry;492 creates its independent packed copy;1977 releases packed terrain resources, while the existing geometry list subsequently releases original prepared geometry. Static batches similarly release their own packed resources and preserve original instance/material ownership. Geometry copy tests execute after temporary chunk buffers are disposed.

Parent-reported targeted actual dev mobile probe on this source: landing250377 triangles/101 calls; final wide293212/55,6788 below the unchanged300000 limit, zero browser errors. Production build/served identity and final screenshots are a separate parent-owned gate; this note does not claim they were repeated here.
