# Production first-floor long-load renderer — 2026-09-08

`EiffelLongLoadFilmSystem` owns only the actual carrier/payload, closed sling,
raised first receiver, bridge/cart and flexible hoist rope. No tower GLB is
loaded. `EiffelWorld` owns it across the long-load insertion, waits for its
assets, updates the pure sampler and disposes it. Transported kit identity is
withheld before kit seating checks and from generic work dispatch.

The four public GLBs under `public/models/eiffel-long-load-first-floor/` are
byte-identical copies of accepted Blender exports. `assets.json` records SHA256
and byte sizes. Source .blend checkpoints remain in their original artifact
folders; no new Blender model or claim of new mechanical validation is made.

- receiver: `eiffel-long-load-main-2026-09-08/model/receiver-driven.glb` (V3 matching24-tooth gear; oldreceiver retained unused)
- bridge: `eiffel-first-floor-transfer-2026-09-08/model/first-floor-bridge.glb`
- carrier: `eiffel-cart-fastening-recovered-2026-09-08/model/long-load-carrier-corrected.glb`
- sling: `eiffel-closed-sling-2026-09-08/model/closed-sling.glb`

All exported triangles/materials are retained in BatchedMesh cohorts. Original
hidden source nodes remain to preserve hierarchy, metadata and articulated
transforms. Each has `userData.longLoadBatch` mapping its current batch/instance.
Flexible 8mm radius hoist rope uses one InstancedMesh; no thin structural parts
are replaced by proxies. The five bridge hatch boards stay rotated90degrees
with their actual hinge geometry. The existing tower opening contains the
carrier's x=-19.75,z=-4 path: no kit part AABB overlaps its .44m cross-section at
y57.5–58.5. Previous exact stage45 carrier/hatch/receiver audit remains relevant;
no arbitrary deck cut was needed.

Three focused tests pass against actual assets: source SHA identity and complete
triangle batching; carrier dimensions, displayed batch matrices and every rope
endpoint across forward/reverse seeks; early-disposal and exactly-once batch
resource release. These tests do not prove production camera visibility or
whole-tower lifecycle correctness. Parent owns actual worker/drive addition,
production desktop/mobile QA and full suite/build.

Entry/exit equipment visibility follows the engine's insertionId across fully
opaque transition cuts. Landing remains attached, not final installation.
Release, later relays and tower installation remain omitted work represented
only by the explicitly labeled later-work cut, not by cargo teleport animation.

## Saved steam drive integration

`EiffelWorld` now also owns `EiffelLongLoadDriveSystem` with the same insertion
visibility, clock, loading promise and disposal. The parent-promoted V3 asset
uses crank journal plane-.51m and matching12:24tooth gears. The renderer uses
`receiver-driven.glb`; the old receiver stays available as evidence. Minimal
drive renderer fixes: typed empty cohort array, disposed-update guard, and
clearing retained node/role references when releasing resources. No drive
geometry or mechanical sampler edits were made by this renderer agent.

Six actual-asset focused tests pass after V3promotion (including newthree-drive
tests). They verify fixed.5m rod eye spacing, crankpin/journal XYalignment and
axial pin coverage, slider contact, world+Zcrank angle=2×sampled drum angle,
unchanged sourcechild quaternions, actual batch world matrices, and early/
repeated disposal. The rod journal is off-center along the pin axis; tests
correctly verify axial coverage rather than requiring pin centroid equality.
Full gate logs are in `artifacts/eiffel-long-load-main-2026-09-08/`.
