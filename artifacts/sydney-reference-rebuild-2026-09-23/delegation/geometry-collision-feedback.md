# Geometry collision feedback — actual version 3 export

Export SHA-256: `438a2024e1912c151829a731e04e3e6864abca07ef24261ebcb3eb4bf75344aa`. Tested world XYZ coordinates, metres, raw grids (no runtime offsets) and production lids (.22 normal offset/.18 thickness). Do not flatten the northern nesting to solve choreography: runtime is being changed to erect each lower/northern group completely before the overlying group.

## Concert main/south junction: genuine surface crossing

Shell 0 `concert-main` and shell 1 `concert-south` reverse vertical ordering near their rear edges. This is present in the raw exported surface, not only runtime thickness. Shared apex/ridge endpoint is about `[-19.8618,33.2,7.762]`. Both mirrored sides have the problem.

For shell 0 negative half, v=0 (rear edge), vertical intersections with the authored shell 1 triangles give:

| u | Main XYZ | South Y at same XZ | South minus main Y |
|---|---|---:|---:|
| .59375 | [-30.6160,26.0711,5.9279] | 25.905726 | -.165374 |
| .625 | [-29.8240,26.6524,6.1335] | 26.608147 | -.044253 |
| .640625 | [-29.4255,26.9411,6.2323] | 26.950110 | +.009010 |
| .75 | [-26.5932,28.9252,6.8492] | 29.167790 | +.242590 |
| .8125 | [-24.9423,30.0290,7.1426] | 30.306555 | +.277555 |

The sign change between u=.625 and .640625 proves these surfaces pass through one another along this edge. Positive-half counterpart near crossing: main `[-10.2629,26.9411,6.4707]`, south Y26.950033. At another part of the overlap south lies far below main: shell1 side−1 u=.40625 v=0 is `[-32.9638,22.8096,4.2605]`, main Y26.381379, gap3.571779m.

Production lids reproduce this problem: `tile-0--1-6-0` has a vertex `[-26.6760978165,29.0635499724,7.0072589849]` below shell1 by .442887m, whereas multiple shell1 lids lie 1.5–4.0m below main. A whole-shell erection order cannot satisfy both 0→1 and 1→0. Please trim/adjust the common junction on the 75m spheres so the half-shell surfaces meet or have one consistent stacking order; preserve a single pedestal per half and world sphere centres. Do not hide crossings by changing test tolerance.

## Legitimate projection overlaps needing erection ordering

Sampled panel vertical-projection constraints: shell7→2→0 (concert north→middle→main); shell8→5→3 (opera north→middle→main); shell4→3 (opera south before main); shell1→0 except the crossing above. These are lower-before-upper constraints, not an assertion that separated nested surfaces intersect.

With the old global ribs-then-tiles schedule, 74 panel/neighbor-shell pairs hit already-seated lids. Worst: `tile-2--1-7-0`, vertex `[-21.464744865,42.897984834,-33.282397074]`, passes below `tile-0--1-7-4-split1` by22.308704m. This is a scheduling problem solved by completing group2 before group0, not a request to remove the nested main shell.

Runtime checks also pass exact65×33 grid parity, unit radial normals on radius75 spheres, all20 pedestal contacts on authored podium triangles, and deterministic authored podium/detail geometry. Four representative lift IDs remain unchanged. Two leading lids exceeded15m and were subdivided alongv without changing the roof surface.

## After interleaved-group schedule correction

Runtime now completes west groups7→2→1→0→9→6 and east8→5→4→3, with ribs then lids inside each group. All four hero load identities/durations remain. A strengthened time-aware raycast checks every distinct vertex of every moving rib and lid against actual already-seated neighboring ribs/lids. Only six panel conflicts remain, all at the main/south junction:

| Moving part | Already seated part | Penetration m |
|---|---|---:|
| tile-0--1-5-0 | tile-1--1-5-0 | .358069 |
| tile-0--1-6-0 | tile-1--1-5-0 | .442887 |
| tile-0--1-7-0 | tile-1--1-6-0 | .421474 |
| tile-0-1-5-0 | tile-1-1-5-0 | .358080 |
| tile-0-1-6-0 | tile-1-1-5-0 | .442925 |
| tile-0-1-7-0 | tile-1-1-6-0 | .421472 |

The geometry gate remains failing; 24 other focused tests pass. This isolates the remaining repair to the exported main/south surfaces rather than the legitimate north/middle/main nesting.

## Widened export update (21:04 version)

SHA-256: `faa4cf8d716461c39641864c1fc359f0a421c479077e3ea87e1aaacb177bfd86`. The widened shells introduce additional junction crossings. The same unchanged time-aware geometry gate now detects 84 moving-part/neighbor-shell conflicts (all other24focused tests pass). Counts by moving→seated shell: {('0', '1'): 28, ('3', '4'): 26, ('6', '9'): 30}.

Exact first offending production vertex for each pair follows. Runtime lids offset +.22m/depth .18m; ribs depth .72m; compare raw sphere surfaces before deciding whether to trim a patch or revise a corner.

| Moving part | Seated part | XYZ | Above moving vertex m |
|---|---|---|---:|
| rib-0--1-0-0 | tile-1--1-0-2 | [-42.7866, 14.2, 1.5764] | 0.382379 |
| rib-0--1-1-0 | tile-1--1-0-2 | [-42.7866, 14.2, 1.5764] | 0.382379 |
| rib-0--1-2-0 | tile-1--1-0-2 | [-42.7866, 14.2, 1.5764] | 0.382379 |
| rib-0--1-3-0 | tile-1--1-0-2 | [-42.7866, 14.2, 1.5764] | 0.382379 |
| rib-0--1-4-0 | tile-1--1-0-2 | [-42.7866, 14.2, 1.5764] | 0.382379 |
| rib-0-1-0-0 | tile-1-1-0-2 | [3.2098, 14.2, 2.1486] | 0.382391 |
| rib-0-1-1-0 | tile-1-1-0-2 | [3.2098, 14.2, 2.1486] | 0.382391 |
| rib-0-1-2-0 | tile-1-1-0-2 | [3.2098, 14.2, 2.1486] | 0.382391 |
| rib-0-1-3-0 | tile-1-1-0-2 | [3.2098, 14.2, 2.1486] | 0.382391 |
| rib-0-1-4-0 | tile-1-1-0-2 | [3.2098, 14.2, 2.1486] | 0.382391 |
| rib-3--1-0-0 | tile-4--1-0-1 | [6.6878, 14.2, -5.061] | 0.317124 |
| rib-3--1-1-0 | tile-4--1-0-1 | [6.6878, 14.2, -5.061] | 0.317124 |
| rib-3--1-2-0 | tile-4--1-0-1 | [6.6878, 14.2, -5.061] | 0.317124 |
| rib-3--1-3-0 | tile-4--1-0-1 | [6.6878, 14.2, -5.061] | 0.317124 |
| rib-3--1-4-0 | tile-4--1-0-1 | [6.6878, 14.2, -5.061] | 0.317124 |
| rib-3-1-0-0 | tile-4-1-0-1 | [42.5568, 14.2, 10.2498] | 0.317127 |
| rib-3-1-1-0 | tile-4-1-0-1 | [42.5568, 14.2, 10.2498] | 0.317127 |
| rib-3-1-2-0 | tile-4-1-0-1 | [42.5568, 14.2, 10.2498] | 0.317127 |
| rib-3-1-3-0 | tile-4-1-0-1 | [42.5568, 14.2, 10.2498] | 0.317127 |
| rib-3-1-4-0 | tile-4-1-0-1 | [42.5568, 14.2, 10.2498] | 0.317127 |
| rib-6--1-0-0 | tile-9--1-0-1 | [-57.5452, 14.2, 49.988] | 0.353526 |
| rib-6--1-1-0 | tile-9--1-0-1 | [-57.5452, 14.2, 49.988] | 0.353526 |
| rib-6--1-2-0 | tile-9--1-0-1 | [-57.5452, 14.2, 49.988] | 0.353526 |
| rib-6--1-3-0 | tile-9--1-0-1 | [-57.5452, 14.2, 49.988] | 0.353526 |
| rib-6--1-4-0 | tile-9--1-0-1 | [-57.5452, 14.2, 49.988] | 0.353526 |
| rib-6-1-0-0 | tile-9-1-0-1 | [-33.9305, 14.2, 54.2715] | 0.353489 |
| rib-6-1-1-0 | tile-9-1-0-1 | [-33.9305, 14.2, 54.2715] | 0.353489 |
| rib-6-1-2-0 | tile-9-1-0-1 | [-33.9305, 14.2, 54.2715] | 0.353489 |
| rib-6-1-3-0 | tile-9-1-0-1 | [-33.9305, 14.2, 54.2715] | 0.353489 |
| rib-6-1-4-0 | tile-9-1-0-1 | [-33.9305, 14.2, 54.2715] | 0.353489 |
| tile-0--1-0-0 | tile-1--1-0-1 | [-41.855098, 15.789589, 2.195301] | 0.349905 |
| tile-0--1-0-1 | tile-1--1-0-3 | [-42.804106, 14.225537, 1.607951] | 0.370699 |
| tile-0--1-0-2 | tile-1--1-0-3 | [-42.804874, 14.230206, 1.605857] | 0.363168 |
| tile-0--1-0-3 | tile-1--1-0-3 | [-42.806274, 14.234904, 1.603181] | 0.354389 |
| tile-0--1-0-4 | tile-1--1-0-3 | [-42.808254, 14.239473, 1.600017] | 0.344665 |
| tile-0--1-1-0 | tile-1--1-0-0 | [-40.716348, 17.305222, 2.649455] | 0.334122 |
| tile-0--1-2-0 | tile-1--1-1-0 | [-38.293987, 20.189038, 3.526838] | 0.306056 |
| tile-0--1-3-0 | tile-1--1-2-0 | [-35.665412, 22.896978, 4.369177] | 0.280598 |
| tile-0--1-4-0 | tile-1--1-3-0 | [-32.843802, 25.415501, 5.172108] | 0.257164 |
| tile-0-1-0-0 | tile-1-1-0-1 | [2.26323, 15.789589, 2.744105] | 0.349866 |
| tile-0-1-0-1 | tile-1-1-0-3 | [3.226516, 14.225537, 2.180577] | 0.370701 |
| tile-0-1-0-2 | tile-1-1-0-3 | [3.227336, 14.230206, 2.178501] | 0.363168 |
| tile-0-1-0-3 | tile-1-1-0-3 | [3.228801, 14.234904, 2.175862] | 0.354392 |
| tile-0-1-0-4 | tile-1-1-0-3 | [3.230861, 14.239473, 2.172748] | 0.344665 |
| tile-0-1-1-0 | tile-1-1-0-0 | [1.113488, 17.305221, 3.169835] | 0.334205 |
| tile-0-1-2-0 | tile-1-1-1-0 | [-1.329882, 20.189038, 3.986713] | 0.306074 |
| tile-0-1-3-0 | tile-1-1-2-0 | [-3.978628, 22.896978, 4.76334] | 0.280606 |
| tile-0-1-4-0 | tile-1-1-3-0 | [-6.819306, 25.415501, 5.495845] | 0.257137 |
| tile-3--1-0-0 | tile-4--1-0-1 | [7.27068, 15.355348, -4.172979] | 0.261665 |
| tile-3--1-0-1 | tile-4--1-0-2 | [6.660433, 14.222437, -5.036917] | 0.302088 |
| tile-3--1-0-2 | tile-4--1-0-2 | [6.660592, 14.226739, -5.038792] | 0.296191 |
| tile-3--1-0-3 | tile-4--1-0-2 | [6.660492, 14.231073, -5.041151] | 0.289692 |
| tile-3--1-0-4 | tile-4--1-0-2 | [6.660146, 14.235351, -5.043939] | 0.282735 |
| tile-3--1-1-0 | tile-4--1-0-0 | [8.078987, 16.441195, -3.380488] | 0.253386 |
| tile-3--1-2-0 | tile-4--1-2-0 | [9.9235, 18.460762, -1.893124] | 0.272557 |
| tile-3--1-3-0 | tile-4--1-3-0 | [11.743175, 20.413089, -0.307888] | 0.255937 |
| tile-3-1-0-0 | tile-4-1-0-1 | [41.512329, 15.355348, 10.443254] | 0.261678 |
| tile-3-1-0-1 | tile-4-1-0-2 | [42.558339, 14.222437, 10.286222] | 0.302093 |
| tile-3-1-0-2 | tile-4-1-0-2 | [42.559585, 14.226739, 10.284813] | 0.296194 |
| tile-3-1-0-3 | tile-4-1-0-2 | [42.561356, 14.231073, 10.283252] | 0.289695 |
| tile-3-1-0-4 | tile-4-1-0-2 | [42.563612, 14.235351, 10.281572] | 0.282735 |
| tile-3-1-1-0 | tile-4-1-0-0 | [40.380861, 16.441195, 10.407724] | 0.253449 |
| tile-3-1-2-0 | tile-4-1-2-0 | [38.030912, 18.460762, 10.104646] | 0.272555 |
| tile-3-1-3-0 | tile-4-1-3-0 | [35.627391, 20.413089, 9.887118] | 0.255935 |
| tile-6--1-0-0 | tile-9--1-0-2 | [-57.564961, 14.230429, 49.969314] | 0.304977 |
| tile-6--1-0-1 | tile-9--1-0-1 | [-57.565344, 14.23138, 49.970983] | 0.30303 |
| tile-6--1-0-2 | tile-9--1-0-1 | [-57.56582, 14.232287, 49.972724] | 0.300989 |
| tile-6--1-0-3 | tile-9--1-0-1 | [-57.566387, 14.233146, 49.974517] | 0.298871 |
| tile-6--1-0-4 | tile-9--1-0-1 | [-57.567034, 14.233946, 49.976346] | 0.296706 |
| tile-6--1-1-0 | tile-9--1-1-0 | [-56.229996, 15.755889, 50.209655] | 0.293341 |
| tile-6--1-2-0 | tile-9--1-2-0 | [-54.852117, 17.241301, 50.458974] | 0.281867 |
| tile-6--1-3-0 | tile-9--1-3-0 | [-53.432617, 18.685282, 50.717068] | 0.271443 |
| tile-6--1-4-0 | tile-9--1-4-0 | [-51.972695, 20.086805, 50.983639] | 0.261754 |
| tile-6--1-5-0 | tile-9--1-5-0 | [-50.473555, 21.444588, 51.258583] | 0.252718 |
| tile-6-1-0-0 | tile-9-1-0-2 | [-33.905438, 14.230429, 54.260943] | 0.304969 |
| tile-6-1-0-1 | tile-9-1-0-1 | [-33.905665, 14.23138, 54.262641] | 0.303017 |
| tile-6-1-0-2 | tile-9-1-0-1 | [-33.90583, 14.232287, 54.26444] | 0.300974 |
| tile-6-1-0-3 | tile-9-1-0-1 | [-33.905928, 14.233147, 54.266316] | 0.298857 |
| tile-6-1-0-4 | tile-9-1-0-1 | [-33.905965, 14.233946, 54.268256] | 0.296689 |
| tile-6-1-1-0 | tile-9-1-1-0 | [-35.239855, 15.755888, 54.01708] | 0.293356 |
| tile-6-1-2-0 | tile-9-1-2-0 | [-36.61742, 17.241301, 53.766584] | 0.281855 |
| tile-6-1-3-0 | tile-9-1-3-0 | [-38.037134, 18.685282, 53.509649] | 0.271441 |
| tile-6-1-4-0 | tile-9-1-4-0 | [-39.497689, 20.086805, 53.246481] | 0.261752 |
| tile-6-1-5-0 | tile-9-1-5-0 | [-40.99798, 21.444589, 52.977371] | 0.252726 |

## Final runtime resolution and source freeze

The Blender export remains `d08faa0fb85c993987cf8775243f34071dc0e18a45e259653f8d1e4e72113a2d`. No generator, JSON, `.blend` or `.glb` edit was needed for the runtime fixes below.

- Shared back-to-back seams: miter the added skin thickness at the exact sphere-pair radical plane. Raw grid points remain unchanged. This removes the 84 derived-thickness conflicts.
- Flank seams: bevel derived cladding/rib depth into the raw shared edge over a 0.75 m joint band. Full depth is retained outside that band. This prevents normal extrusion from occupying the authored flank join.
- Full-height white infills: the eight authored meshes now become 282 rigid loads bounded to8m. Their union is exactly the original5120 triangles; none remain in the instant finish-detail reveal.
- Group order remains west7→2→1→0→9→6 and east8→5→4→3. Every lid retains own-rib dependencies; infills depend on their host and northern neighbor's structural parts. All structural work completes by t=.8155930471.
- Most infills lower6m outside the surface, then insert horizontally.42 load-specific approaches use audited directions/distances within1–16m. No vertical offset, scaling or rotation is introduced. A finer5-degree direction search resolved four difficult openings; raw-surface and derived-skin edge intersection probes found no final overlap, so no speculative source clipping was applied.
- The production-pose collision gate traces every distinct load vertex along actual lowering and insertion segments against already seated neighboring ribs/lids/infills, including an infill's own host roof and earlier panels. It retains the original0.25m seating-joint tolerance. This is a vertex-path geometry audit, not a continuous whole-volume structural engineering validation.
- The two cranes now stand on supported deck points `[56,14.2,26]` and `[-38,14.2,18.2]`; fixed120m jib and70m mast remain.

Focused verification:40/40 tests pass across `sydney-construction`, `sydney-blender-model`, `sydney-shell-geometry`, `sydney-crane-choreography` and `sydney-authored-worksite`. The unmodified-export model tests check exact authored grid samples, spherical normals, all20 supported pedestals, exact podium/detail triangles, infill triangle parity and reverse reveals. Foyer grounding is independently verified by140 outward raycasts against the actual production FrontSide granite batch (35 wings × y3.2/5/8/12). Every wing is a closed prism reaching y2.2 and is fully drawn at t1; the dark areas in the north-west render are shadows, not missing walls or floating slab geometry.

Final construction plan:2133 parts. Final StoneSystem:85048 drawn triangles in six nonempty static draws, plus two empty reusable active buffers. Final hero starts (durations remain .07 ribs/.05 tiles):

| ID | Start |
|---|---:|
| rib-0--1-4-4 | .4590347648261813 |
| rib-3--1-4-4 | .5491296296296418 |
| tile-0--1-7-0 | .581453646898434 |
| tile-3--1-5-4 | .6829501028806721 |

Background jobs remain compressed time-lapse; no claim of literal historical crane speed or day-by-day erection order is made. Root owns the final full-suite/build and browser acceptance after this freeze.
