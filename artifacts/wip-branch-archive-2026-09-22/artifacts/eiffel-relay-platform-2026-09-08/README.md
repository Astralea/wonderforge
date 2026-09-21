# 197m intermediate relay platform — 2026-09-08

The preceding Watson report establishes a winch relay at the197m Edoux
intermediate floor. This platform is an authored supporting-geometry proposal
for the current kit, not a measured reconstruction of that historical floor.
The production Paris v15/264s film remains unchanged.

## Geometry and actual Blender pipeline

scripts/plan-eiffel-relay-platform.py emits144 source prisms plus named main-column
attachments. Four fitted collars contact stage45 uprights shaft-10/m000,m008,m016,
m024 at about196.1m; inward brackets carry I-section girders,44 joists and80mm
decking whose top is197.0m. The thin perimeter lacing carries no platform bearing.
Aperture at deck surface is±3.1m; true clearance past girder flanges is±2.99m.
The central stair/guide exclusion |x|<1.15,|z|<.9 remains occupied. It is not a
clear cargo shaft. A separate operational freight opening is still needed.

Parent used actual installed Blender Lab MCP, with fresh read-only probes,
via scripts/build-eiffel-relay-platform-via-mcp.py and
scripts/blender_eiffel_relay_platform.py. Source JSON and hidden source meshes
support reconstruction. Outputs are model/platform.glb, the saved
blender/eiffel-relay-platform.blend and renders/platform.png.

The first root blocks penetrated their columns by108.5mm. They were replaced by
blocks oriented to each column face. Full144×11,386 completed-kit SAT now has
zero unintended penetrations, including owners. The initial6.2m nominal opening
was corrected to the actual5.98m opening between flange faces.

Two export defects were caught and corrected:
- Mutable role grouping incorrectly combined the timber deck into the iron
  structure. Immutable source roles now produce two distinct exported meshes.
- Repeated Exact unions silently lost joists. Rebasing to the197m local origin
  improved precision but did not alone fix every member. Blender's built-in
  Manifold union solver preserves all tested joists/flanges. Rejected GLBs,
  images and logs remain in this directory. No extra plugin was installed.
  API reference: https://docs.blender.org/api/5.3/bpy.types.BooleanModifier.html

## Verification scope

The independent test reconstructs source convex solids and compares all144
against11,386 actual kit envelopes through stage45, with no owner exemption.
Contact corners lie inside the actual transformed column face bounds. It also
checks the exported GLB, rather than accepting source metadata as sufficient:
- Four deck-top rays at197.0m.
- Three samples on every joist and upper girder flange (156 rays).
- Eight isolated frame-top/deck-underside pairs meeting at196.92m.
- Sixteen collar-face rays from inside the corresponding main-column surface.
- Separate deck and frame meshes/material roles.
- Central platform aperture exclusion and positive existing stair occupancy.
All247 previously recorded4cm-expanded shaft sweeps also clear the new platform.
That compatibility test does not admit the real rigging or the historical relay.

## Local Web review

http://127.0.0.1:5590/artifacts/eiffel-relay-platform-2026-09-08/review.html

Two separate views show this platform with the actual stage45 kit bay and the
previous paired crane asset. They are not shown as an installed combined machine.
Desktop1440×1000 and mobile390×844 QA cover both views, real button switching,
1.2s auto-orbit intervals, page/console errors and horizontal overflow. Final
platform view:40draw calls/5,972triangles; crane view79/19,352. Captures and exact
records are in web/. This is not new QA of the main Paris construction film.

## Remaining work before production

The collars are authored fixed connections, not rated bolt/clamp capacity.
Platform erection, bounded delivery units, winch anchorage, continuous central
guide supports, freight gates, ropes, workers and same-cargo relay handoffs remain
unadmitted. Do not put the entire paired crane system on these temporary brackets
or make full12.3m girders/whole deck panels appear as single delivered loads.
Segment real construction units and show their supported erection. Keep the
original full goal active; no other wonder is selected yet.

Final whole suite:625 tests /90 files pass, typecheck/build pass. Main bundle
remains main-Dcd_FVbt.js. Logs: tests-complete.log, typecheck-complete.log,
build-complete.log, web-qa-final.log. Source/asset hashes: verification.json.

## Independent transport units

`platform-units.json` and `model/platform-units.glb` contain296 separately
addressable rigid loads; actual MCP session evidence is in `mcp-units/`.
Saved Blender: `blender/eiffel-relay-units.blend`. Reproduce with
`scripts/plan-eiffel-relay-units.py` then
`scripts/build-eiffel-relay-units-via-mcp.py` using the installed MCP SDK Python.
The largest estimated load is772.317kg using authored iron7800kg/m3 and
timber600kg/m3 densities; primitive joint overlap makes summed mass an estimate.
Each original prism volume is preserved. No structural capacity or erection
sequence is implied. Girder cuts require splices and continuous temporary
support. Board interior joints coincide with joists; perimeter140mm overhang
is inherited. Independent solids retain original joint overlaps.

Browser review uses `review.html?units=1`; desktop/mobile captures and automatic
orbit/control checks are in `web-units/`. This is a model study, not the main film.

Verification:628 tests across91 files passed; typecheck and production build
passed. Logs: `tests-units.log`, `typecheck-units.log`, `build-units.log`.

## Drilled web splice model

New actual Blender MCP scene and saved `blender/eiffel-relay-spliced.blend`;
`model/platform-spliced.glb` has14 interpreted web joints:28 fishplates,56
through shafts,112 hex heads. Both plates and girder webs contain real bores.
Planner `scripts/plan-eiffel-relay-splices.py`; Blender source
`scripts/blender_eiffel_relay_splices.py`; MCP wrapper
`scripts/build-eiffel-relay-splices-via-mcp.py`. MCP logs `mcp-splices/`.

Independent SAT checks every plate against144 source platform prisms and11386
completed kit envelopes; no penetrations. Every plate spans its two segments.
Actual GLB ray tests all56 open bores and solid shoulders. No capacity or
fastening/temporary suspension sequence inferred. Existing joist/girder joins
in independent pieces remain intersecting primitives needing seats/notches.

`review.html?splices=1` adds the close-joint inspection button. Desktop/mobile
three-view controls/orbit and console/overflow checks passed (`web-splices/`).
Main production remains v15. Initial full suite had one5s timeout in existing
foundation-crew test,632passed; reduced-concurrency recheck recorded separately.

Final verification:633/633 tests passed with maxWorkers=4. Parent fixed two
TypeScript-only errors in child test (explicit tuple, removed excess shape
property); focused4tests passed again, typecheck/build passed. Main v15 is
unchanged. Final viewer fill light targets the197m joint, not world origin.
