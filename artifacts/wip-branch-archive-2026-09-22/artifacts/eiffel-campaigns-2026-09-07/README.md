# Eiffel Guyenet crane — Blender and web mechanism study

The stalled work resumed with a concrete editable crane and a working web
review. This is an isolated component milestone. The production Eiffel movie
still uses its previous construction rigs and retains its unresolved routes.
The full owner goal remains active; do not advance to another wonder yet.

## Review and source

- Local review: http://127.0.0.1:5589/eiffel-crane.html
- Editable Blender source: `blender/eiffel-guyenet.blend` (43 MB; earlier scenes
  remain inside the file). Initial and v2 files/captures are retained.
- Render: `blender/eiffel-guyenet.png`.
- Builder: `scripts/blender_eiffel_guyenet.py`; actual installed Blender Lab MCP
  invocation: `scripts/build-eiffel-guyenet-via-mcp.py`.
- Latest execution evidence: `mcp-build-v5.log`,
  `blender/mcp-build-result.json`. This was run through MCP, not simulated by
  writing a .blend extension onto another format. No plugin installation.
- Export: `public/models/eiffel-guyenet/crane.glb`: 10,684 triangles,
  588,832 bytes, articulated role nodes.

The visible crane has a short lattice pivot, fixed lattice jib, two rigid ties,
a sliding collar, a level timber platform, an inclined carriage, a haul screw
and rotating nut, two safety jacks, guide skates and a rotating hoist drum.
The test trestle is a braced display support; it is not the tower's actual
installed elevator-guide support. The web hoist uses an original 4.6 m open
I-section with a calculated mass of 825.24 kg at an assumed 7,800 kg/m³ density.
Its lower flange contacts the timber bearers at the beginning and end. This
mass claim does not extend to the current tower kit's solid box members.

## Historical reference and authored geometry

[1889 technical account](https://cnum.cnam.fr/pgi/redir.php?ident=8XAE353.1&onglet=c)
and [atlas plate55–56, figure23](https://cnum.cnam.fr/pgi/fpage.php?4XAE43.1/79/100/265/5/265=)
informed the topology. Saved browser capture: `reference-atlas-55-56.png`.
Documented: 4,000 kg crane capacity, 5.5–12 m working reach, 2.5 m main screw
stroke and 0.5 m safety-jack strokes. Unlabelled dimensions are interpretations,
including jib/tie length, rail gauge, inclination, offsets and screw lead.

Parent corrections after the independent mechanical report: headRest is now
**1.00 m**, allowing for the actual square crossbar corners, and the shaft is
4.20 m. All moving stations are offset 0.95 m toward the outside guide face.
Real exported bronze skate vertices maintain a gap below 0.1 mm to the flange
plane throughout sampled climbing. Head/base shoes use the same inclined
contact geometry. Earlier 1.10 m / 36.48 mm figures in the independent report
are intermediate evidence, not the final model's dimensions or clearance claim.

Working poses are limited to an authored 60–120° sector relative to the guides;
the web luff demonstration uses90°. Climbing requires an unloaded inward parked
jib at5.5 m reach. Unrestricted slew remains unsafe with this guide arrangement.
The sampler enforces bolted supports through five safety-jack resets. Bolt
insertion, steam supply, labour and full installation/removal are not animated.

## Verification

- Full repository suite: **512 tests across62 files**, typecheck and build pass.
- After the final drum/asset revision: **13 component tests** pass; final UI
  framing change was followed by typecheck/build and production-browser QA.
- Real GLB tests check tie endpoints under reach/slew, unchanged solid scales,
  safety contact, skate/flange contact, manifest coherence and rejected unsafe
  poses. Pure geometry tests include exact G crossbar and oriented shoe boxes;
  they retain historical bad-geometry witnesses. These are component checks,
  not a full tower swept-volume or structural-strength certificate.
- **16 desktop/mobile captures**, zero browser errors, actual Play/Pause,
  pointer orbit and exact-pixel reverse seek. Every inspected model vertex fits
  the default camera: maximum absolute NDC x=0.7825,
  y=0.7993. Manual orbit/zoom can of course change framing.
- Review bundle `/assets/eiffelCrane-y9rmDUkc.js`; main bundle `/assets/main-DboWmeYR.js`. The multipage Vite build
  keeps both the normal gallery and review available on the existing port5589.
- See `verification-summary.json`, `source-sha256.json`, and `web/verification.json`.
  Initial unframed captures were overwritten by final captures; the numeric
  framing regression is now checked by `scripts/qa-eiffel-guyenet.mjs`.

Production multipage smoke checks also rendered Giza and Eiffel at t=0.6 with
zero browser errors (`main-smoke.json`). These are navigation/render smoke
checks, not fresh full-film acceptance. Temporary dev5590 was stopped;5589 stays
running. The Codex panel-open request returned queued.

## Required next work

Use this mechanism to author one real lower-pylon rail-supported campaign in
actual tower coordinates. Supply installed rails, continuous support, a payload
mass model, clear receiving/placement paths, serialized seconds-long operations,
and a supported transition to the next station. Do not replace generic per-part
rigs by merely holding their last transform or increasing their jib length.

The earlier NE coverage study and signature timing helper remain isolated.
The existing movie still has211 unresolved first-floor operations and4,524
whole-film collision sample pairs from the prior audit. Background/sky finishing
and complete lifecycle/visual acceptance remain open. The saved Paris scene,
125° camera orbit and summit work remain available; this turn does not claim
fresh whole-film physical acceptance or new Paris/summit changes.
