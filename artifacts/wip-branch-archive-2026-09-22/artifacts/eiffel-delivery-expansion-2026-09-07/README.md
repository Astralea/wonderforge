# Ground rigging and readable delivery camera — 2026-09-07

This checkpoint improves the actual main Eiffel movie. It does not add another
isolated demo in place of the movie, and it does not claim the unfinished
whole-tower material supply problem is solved.

## Main-route changes

Two ground slingers are present throughout the existing delivery passage.
They wait clear of the cart, lean and reach when the lowered loose sling ends
become accessible, touch those actual endpoints and the pickup lugs, then
withdraw continuously. Their feet remain planted at the pickup station; their
0.38m upper arms and 0.40m forearms never stretch. The renderer follows the
pure sampler's elbows and knees, with connected pelvis and neck geometry.
A real crossbar now supports all four hands of the two cart pushers.

The working camera first establishes the complete supported crane, then moves
into a clear low outboard view of cart and crew, follows the suspended member
to its joints, and returns wide during hook recovery. Phase-specific framing
replaces the requirement to squeeze the entire falsework into every close shot.
The actual member spans 216–221px desktop and 123–126px mobile at the reviewed
close poses. The original 125-degree outer orbit, 122s movie clock, payload
geometry and 5m near plane remain unchanged. Mobile mid-hoist color contrast
against the lattice still needs refinement.

## Blender source

`blender/eiffel-ground-rigging.blend` is an editable static assembly at13.7s,
saved through the installed Blender Lab MCP after a fresh read-only probe.
It includes the actual installed crane geometry, cart, four workers, ropes and
the selected member:111 objects /12,592 triangles. The source uses actual web
world transforms; it is not a newly authored Blender timeline animation.
Existing scenes and the original articulated crane source were preserved.

- `blender/assembly-overview.png` and `blender/rigging-contact.png` were inspected.
- `blender/assembly.json`, `export-assembly.ts` preserve geometry provenance.
- `blender/mcp-readonly-probe.json`, `blender/mcp-save-result.json` record MCP.
- `../eiffel-ground-lift-2026-09-07/blender-final/eiffel-guyenet-ne.blend`
  remains the original articulated crane source.
- The prior `../paris-photo-study-2026-09-07/blender-final/paris-1889.blend`
  remains the historical-image Paris source. No city model changed in this pass.

## Evidence

- `full-tests.txt`:549 passing tests /71 files, maxWorkers4.
- `typecheck-final.txt`, `build-final.txt`:pass; bundle main-CJjlyOUU.js.
- `mobile-full/report.json`:245 production-route positions,293,420 maximum
  triangles,123 maximum calls, no browser errors.
- `natural-completion.json`:natural4× playback completes and Replay resets to0,
  using mounted DOM controls without an endpoint seek; no browser errors.
- `camera/final-qa.json` and `camera/REVIEW.md`:desktop/mobile forward/reverse
  seeks and true arrival/dolly/hoist playback. Chapter maximum139desktop calls.
- `crew/external-clearance.json`:37,434 actual renderer mesh states at1,101
  timestamps; zero OBB intersections against1,840 completed tower boxes and
  219 installed falsework members. Separate tests cover cart and hand contacts.
- `verification.json`, `source-sha256.json`:checkpoint results and source hashes.

The first renderer regression correctly rejected the draft's1.24m arm reach;
that draft was corrected to fixed human-scale limbs. A build caught unsafe test
tuple casts before the final build passed. Early view grids and the initial
custom close camera are diagnostic experiments, superseded by final main-route
captures. The custom crew page is a geometry review, not the production camera.

## Whole-tower delivery findings and next work

`REPORT.md` is the mechanical census only; its “runtime unchanged” statement
applies to that audit, not to this checkpoint's camera/crew edits.12,917 loads
still originate at elevated receivers. Median legacy upper-operation duration
is9.85ms;4,863 operations have no moving sample even on an ideal60Hz timeline.
These are schedule calculations, not measured browser FPS. A receiver, rope or
larger actor count cannot supply missing material provenance or visible time.

`CAMPAIGN-SUPPORT-AND-ROUTE-REJECTIONS.md` records why the next14 endpoints do
not yet form a supported campaign and why594 tested two-piece routes were
rejected. No rejected route was installed. The next change needs actual
supported joints/temporary assembly support and additional supported stations,
then a slower multi-load campaign; it cannot reuse endpoint reachability as
proof or turn a complete pylon into one oversized payload.

The full Eiffel goal remains active. Other legacy delivery routes, equipment
assembly/removal, Paris variation and material realism remain open. Do not move
to the next wonder yet or claim whole-tower physical correctness.

Local review: http://127.0.0.1:5589/?review=eiffel-rigging-camera-v11#/wonder/eiffel-tower
