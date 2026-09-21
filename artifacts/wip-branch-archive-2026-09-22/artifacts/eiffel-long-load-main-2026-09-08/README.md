# Actual ground-to-first-floor delivery in the main film

The main film now includes the saved 128-second delivery of
`summit-access-stair-m000-c000` from ground level to the first-floor receiving
cart. It retains the same corrected .44 × 6.3175 × .44 m carrier, actual member,
closed sling and master ring. The receiver and opened bridge are the reviewed
Blender assets, without a second copy of the tower. The payload's kit identity
is withheld during the entire chapter and its opaque exit cut. Cart landing
does not count as final tower installation.

The chapter occupies 255.9747806–383.9747806 seconds of the 399-second film.
The camera follows the load, then frames the receiver, drive and operator.
The whole film retains a monotone 125-degree orbit. Its insertion clock is
generated from the actual production operation; a manifest hash and an
independent plan test guard the small runtime record against drift. The 24 MB
kit manifest is not duplicated in the JavaScript bundle.

## Blender source and drive

Parent used the installed Blender Lab MCP against an isolated Blender 5.2.1
instance on port 9877, with a read-only probe before edits. The final editable
source is `blender/eiffel-first-floor-steam-drive.blend`. A separate MCP reload
confirmed one saved scene, 154 objects and 139 meshes; the file includes the
receiver/bridge context, a marked review-only support plane, and a review camera.
That review plane is excluded from the exported drive and the web scene.

The new model supplies a boiler, connected steam pipe and control wheel,
horizontal cylinder/rod, crosshead guides, fixed-length .5 m connecting rod,
crank, flywheel, bored bearings, and a deck-supported operator. A matched
24:12 involute gear pair replaces the receiver's prototype solid gear disk and
block teeth. The gear, crank and slider derive motion from the same rope payout
as the existing drum. Solids do not scale. Material/attribute batches submit the
drive's actual mesh geometry; the film renderer similarly batches its assets.

Steam-powered construction cranes are documented by the
[official Eiffel Tower construction account](https://www.toureiffel.paris/en/news/130-years/construction-eiffel-tower-exemplary-project).
This compact arrangement is an interpretation, not a measured replica of an
1889 crane. `candidate-v1/` through `candidate-v3/` preserve rejected geometry;
the final V4 widens the bed to support every cylinder-foot corner. The separate
original desktop Blender process was not modified or terminated. The temporary
9877 instance was stopped only after its build, save and verification completed.

## Evidence and limits

- `support-audit/`: actual exported geometry checked against 11,856 existing
  tower/bridge/receiver obstacles; final support contacts, bored bearings,
  journal alignment and rod/web separation pass. The 1,441-angle actual gear
  profile sweep is clear. Its deliberate backlash leaves a minimum sampled
  2.721 mm tooth gap; this is clearance, not proof of loaded tooth contact.
- `saved-file-check.json`, `mcp/`, `renders/`: actual MCP build, saved-file reload
  and two Blender views. `source/` and `source-asset-sha256.json` preserve the
  final implementation and asset identities.
- The complete pre-final suite passed 757 tests in 130 files. The final small
  schedule-record change and V4 exports receive separate focused verification;
  final gate logs and production browser reports identify what was executed.
- `dev-desktop/` captures are preliminary visual evidence. The development
  harness completed its seeks/playback but then rejected multiple Vite module
  scripts at a production-only bundle selector. It is not a production pass.

The initial rig erection and sling attachment are omitted behind the entry
cut. The closed sling remains attached after landing. The exit explicitly
omits unrigging, cart fastening, onward relays, final installation and rig
removal. No brake, load capacity, steam power or boiler-internal simulation is
claimed. The full goal remains active: these omitted operations, remaining
generic upper pickups, Paris/crowd readability, sky/summit and residual shimmer
still need work. No next wonder has been started.

## Final local release validation

Local preview: http://127.0.0.1:5589/?review=ground-to-first-floor-v19#/wonder/eiffel-tower

Final bundle `main-SiNzKaoE.js`, SHA256
`83aaad4e6345c31ae102796e8c2571cf461597419828a20316986e7ae7d84ab6`.
Final affected integration22/22, renderer culling6/6 and world-cut visibility1/1
tests pass; typecheck and build pass. The earlier complete suite was757/130
before the final bounded culling/visibility changes, not a later full rerun.

Production desktop17 seeks plus actual Space playback pass. Rendered camera
poses match the independent sampler and reverse seeks restore them; no page
errors/overflow. Production mobile101 full-film plus9 chapter samples pass,
peak298410triangles/149calls. Served bundle and city/drive/receiver asset hashes
match the frozen files. Mobile reverse crop is pixel-exact. All9 active chapter
crops are also pixel-identical before and after the culling optimization.
Parent inspected final desktop and portrait captures. The initial mobile budget
failure and desktop captures are retained under before-culling folders.

Opaque cuts now suppress world drawing while all sampled state keeps updating.
The two new asset systems use per-object camera/shadow culling with their current
rigid transforms. No source triangles were removed. The15 previous mechanical
seal entries and13 Paris source/asset identities remain unchanged, verified in
`mechanical-seal-check.json` and `paris-preservation-check.json`.

Remaining visual issue: tower bracing partially occludes the receiving machinery
in portrait. Next summit research is available in
`../eiffel-summit-next-audit-2026-09-08/README.md`; its three discrepancies have
not yet been implemented. The goal remains active.
