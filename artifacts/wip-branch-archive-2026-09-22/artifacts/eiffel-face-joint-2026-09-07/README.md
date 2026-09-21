# Blender face-joint candidate — 2026-09-07

This checkpoint creates an actual editable replacement for the incorrectly
oriented slab `lower-ne-02-m015-c000`. It does **not** promote the candidate
into the main movie. The live 264 s construction, Paris facade materials and
physical route seal remain unchanged (`main-rhqaRE78.js`). The larger Eiffel
goal remains active, including ground provenance for legacy upper operations,
city variation/density and remaining joint contacts.

## Review

Local interactive comparison:
http://127.0.0.1:5590/artifacts/eiffel-face-joint-2026-09-07/review.html

Drag either view to rotate both. The slider withdraws the new plate and four
fitted pads by up to 40 cm along the joint normal. It is a geometry study with
the beam already seated, **not a crane/ground-transport simulation**. Desktop
1440×900 and mobile 390×844 captures and browser results are under `qa/`.

- Editable source: `blender/eiffel-face-joint.blend`.
- New five-solid GLB: `model/face-joint.glb` (60 triangles).
- Unchanged local context and original slab: `model/joint-context.glb`.
- Actual Cycles renders: `renders/original.png`, `candidate.png`,
  `candidate-back.png`.
- Blender frame 1 is withdrawn; frame 61 is seated. Geometry never scales.

Parent used the installed Blender Lab MCP `execute_blender_code`, with a fresh
read-only probe before each build. The probe confirmed Blender 5.2.1 LTS and
the previous Paris source. The builder creates an isolated new scene and saves
in this folder. MCP probe/build responses are under `blender/`.

## Measured result

The previously authored `design.ts` candidate was more complete than the old
handoff implied: its self-contact and last-40-cm insertion tests were present.
This checkpoint independently reruns them using the new pure convex engine.

- Final five occupied convex pieces: no penetration above 0.1 micrometre
  numerical tolerance against 13,813 other final tower bounding solids.
- Whole 40 cm straight insertion: exact convex sweep, no reported penetration.
- No candidate self-penetration. Four fitted bottom faces touch measured beam
  faces; pad tops meet the 14 mm outer plate. Original geometry mass estimate:
  69.259960 kg at 7,800 kg/m³. These are authored dimensions, not historical
  joint measurements or a structural-capacity certificate.
- **Rejected sequence:** installing the plate before the incoming beam blocks
  its current path. At 10 ms samples over 46 s, one pad penetrates the beam by
  111.460 mm at 44.84 s; the plate itself reaches 86.519 mm. This positively
  demonstrates the scheduling defect. Sampling is not a continuous-clearance
  certificate.

`placement-audit.json` records the actual source/candidate hashes and keeps
`productionAdmitted: false`. `scripts/audit-eiffel-face-joint.ts` reproduces it.
The old slab is excluded only when evaluating its proposed replacement; its
identity is preserved and the original remains in the left comparison view.

## Verification

- 589 tests / 79 files pass; typecheck and production build pass.
- New tests parse the **actual Blender GLB**, verify all source corners,
  closed two-manifold edges, positive volume/mass and 60 triangles, then check
  its final and swept solids against all other final tower solids and itself.
  Export checks allow 1 micrometre for Float32 geometry, not model overlap.
- Found and corrected a real export precision issue: subtract the common joint
  origin in Python double precision before constructing a Float32 mathutils
  vector. The first version rounded large world positions too early.
- Browser QA loads all five meshes, compiles the actual GPU shader, checks no
  overflow/errors on both sizes, moves the real pointer to orbit, and verifies
  the slider translates the model exactly 0.4 m. Screenshots were inspected.
- The first full test run had an existing 5 s foundation-crew timeout while
  Blender rendered. No assertion failed in that test; the complete final run
  used two workers and passed. Initial/final logs are retained. The initial
  review also exposed a missing favicon request; the local page now has an
  inline empty favicon and clean console/network results.

## Remaining integration work

The candidate is not bolted or riveted yet. Do not portray its contact pads as
a finished structural connection. It must arrive from ground stock with a
visible support/handling method, stay supported while the beam seats, and be
placed and fastened **after** that beam. Check the payload/COM and sling/crew
clearance if it rides with a beam; the old route cannot be reused blindly.

Production promotion also needs a manifest representation of the real convex
pieces, intentional child/source identities, revised dependencies, both
construction and seated LOD exports, a regenerated route cache and re-audited
physical integrity seal. Existing renderer compact LOD expects one mesh per
source; this candidate GLB has five independently editable pieces under that
source. Do not bypass that constraint by silently merging occupied gaps into
a box. Six other legacy contacts and high-origin operations remain open.

No plugin installation or external image-generation service was needed.
