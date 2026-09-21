# Eiffel Tower — Blender reconstruction, 6 September 2026

**Status: new Blender model and first integrated web animation are available locally. Visual/construction acceptance is still open.** This supersedes pass 149's tower geometry, while preserving its narration and soundtrack. It does not claim that the construction film is already equal to Giza.

## Actual Blender MCP execution

The installed Blender Lab MCP was initialized through its Python MCP client over stdio. `scripts/build-eiffel-via-mcp.py` called its `execute_blender_code` tool against the running Blender 5.2.1 LTS application. That call executed `scripts/blender_eiffel_tower.py`, created a separate scene (preserving the existing scenes), exported the tower and manifest, and saved an editable Blender file.

- Editable scene: `blender/eiffel-tower.blend`.
- Tool response: `blender/mcp-build-result.json`; structured status `ok`, scene `WonderForge Eiffel — Blender reconstruction.002`.
- GLB: `public/models/eiffel/tower-rebuilt.glb`, 1,822,688 bytes.
- Manifest: `public/models/eiffel/tower-rebuilt.manifest.json`.
- 244 erection groups, 5,813 linked members, 69,756 triangles, five shared mesh templates.
- Nominal envelope: 125 m footprint, 312 m summit. Four splayed pylons, open arches, three platform belts, upper lattice and period summit.
- Studio review images: `blender/eiffel-tower-beauty.png`, `blender/eiffel-tower-lower-detail.png`, `blender/eiffel-tower-shaft-detail.png`.

The images were rendered from that saved model in an isolated background Blender process. No new plugin, paid geometry service, downloaded model, or global MCP configuration change was required. The original online workflow research is retained in `artifacts/eiffel-blender-research-2026-09-06/README.md` and is historical, not the current implementation status.

## Web integration

`EiffelBlenderSystem` loads the GLB and its manifest, validates every part mapping, then batches the linked geometry into five Three.js instanced meshes. It transforms the same member geometry during transport and after seating. `src/engine/eiffelAssembly.ts` is a pure, deterministic, absolute-time stage scheduler and pose sampler. `EiffelAssemblyWorks` attaches wagons, rigging, ropes and crews to active cargo events. The old procedural tower renderer is no longer mounted by `EiffelWorld`; its files/tests remain as historical code.

`WorldScene.ready` and `ThreeCanvas` now repaint paused scenes after loading, ignore late readiness after disposal, and show a recovery action for failed assets. Static Palais geometry is batched, the prepared tower footprint is level, the horizon extends beyond the visible ground, sky/fog colors agree, lawn tint is applied once, and the background houses have lower, sloped mansard roofs. The corrected footprint has its own desktop/portrait camera fit.

Local production preview: http://127.0.0.1:5589/#/wonder/eiffel-tower

## Verification and its limits

- 413 tests in 40 files pass; typecheck and production build pass. Logs are beside this file.
- GLB round-trip tests compare every assembly's exported vertices with manifest bounds within 1 mm. These test coordinate conversion and transforms, not historical engineering accuracy.
- Tests cover identical final geometry, stage ordering, phase continuity, reverse sampling, wagon-envelope contact, camera projection, readiness repaint, late completion and load-error recovery.
- `qa/` contains nine desktop and nine mobile time samples, including hoist frames. `qa/report.json` records browser diagnostics and playback checks. These ran in Chromium using the local GPU; phone viewport emulation is not a physical phone performance test.
- The inspected sweep peaks at 109 calls / 289,374 triangles desktop and 91 calls / 287,191 triangles mobile, within the rebuild's stated frame budgets. These are rendered workload counts, not an FPS guarantee.
- Live playback reaches completion at the supported 4× speed, replay restarts, a native pointer seek changes time, reverse seek reproduces identical scene pixels with UI overlays hidden, and reduced-motion loading reaches the completed still. The first strict image comparison included animated UI overlays; the corrected scene-only check passes. This tests controls/render behavior, not one-times-speed artistic pacing or audio quality.
- Current Giza comparison: `comparison/giza-062/desktop.png`.
- Existing bundle-size and browser-external Node module warnings remain in the build output.

## Remaining work before Giza-level acceptance

1. Subdivide the large erection groups into smaller connected shop assemblies. Some current groups are entire lattice tiers or broad platform strips; calling them historically sized prefabricated pieces would be inaccurate. Four large masonry piers also currently travel as groups.
2. Replace the provisional per-operation crane reach with bounded creeper-crane stations and a staged, supported delivery path. The current rig can reach too far; choosing a previous assembly's bounding-box top is not a proof that its mast/worker position rests on a real deck. Validate actual support points, not just vertical envelopes.
3. Add transport corridor occupancy, sling attachment and moving-cargo clearance tests. Existing contact checks establish the cargo-bottom/wagon relationship, not collision-free passage or wagon-wheel contact across uneven ground. Separate source slots enough for the largest cargo.
4. Improve human work detail, rolling wheels, temporary arch support, and removal/parking of plant. The current crews explain the active event but are still a simplified first implementation.
5. Re-score the complete moving film against Giza after those changes. The corrected silhouette, lighter scene and passing budgets do not constitute visual acceptance.

The owner explicitly waived the older K3-only delegation instruction for this session. In-session agents contributed the Blender script, pure assembly engine and camera tests; they subsequently hit usage limits. Parent implementation and browser inspection continued locally. No K3 acceptance is asserted or required by the current session instruction.
