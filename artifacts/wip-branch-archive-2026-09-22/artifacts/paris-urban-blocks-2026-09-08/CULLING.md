# Polygonal city culling adjustment

The polygonal north bank increased 26 m child batches from the earlier test bound to
2,188, although the source remains one `BatchedMesh`. Before adjustment, the actual
distribution was 143 cells below 16 triangles, 305 below 32, 878 below 64, 1,639 below
100, and 2,014 below 200; total source geometry was 210,235 triangles.

The runtime now merges sub-100-triangle children only into the nearest child of the same
104 m parent. A merge is rejected when the union's horizontal bounding-circle radius
would exceed 40 m. Positions, normals, colors, surface tags and UVs are appended as one
unit, so no source triangle or material coordinate is removed. The purpose is to bound
per-cell bookkeeping while retaining local portrait-camera rejection; it is not a new
geometry or visibility claim.

After merging, the same 210,235 triangles occupy 1,177 cells. The existing portrait
frustum tests still keep every sampled late-film view below 110,000 submitted city
triangles and admit fewer than 70% of all cells. Focused site/asset tests pass six of
six, and the application typecheck passes under Node 24.

The counts above describe the initial210,235triangle candidate. Final V9 ground
union/dust cleanup retains202,324triangles; the same exact attribute-preservation
and culling contracts pass. Final production mobile evidence is production-mobile/.
