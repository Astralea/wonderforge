# Onward renderer integration — ready for composed build

The same actual carrier/payload and original bridge stock cart persist through
the full280second chapter, including13metres of platform travel. Four original
cart wheels retain exported orientations and roll on their own distance clock;
receiver trolley wheels retain the original hoist clock. The original freight
hatch rotates about its real pivot. The new addon supplies rigid hardware and
all72crew bodypart roles; it does not duplicate the cargo or tower.

EiffelLongLoadOnwardSystem loads the exact onward.glb, batches by source
material/layout and applies absolute parent-local rigid poses. Clevis pin/keeper
remain children of the moving clevis; all other sampled roots use their exported
world frame. Source child quaternions and fixed geometry are preserved. Omitted
pose channels reset to source values, making reverse queries independent of
prior frames. Per-instance view/shadow culling stays enabled. Pending and
completed loads own/dispose all geometry, materials and batching resources.

Bounded browser diagnostics expose plain sampled state and actual source-node
local/world poses through __THREE_GAME_DIAGNOSTICS__.eiffelLongLoad. No writable
Three scene handles were exposed. Diagnostic state remains updated during fully
opaque cuts; worldVisible distinguishes those hidden frames.

Final focused renderer/drive/cut suites:11/11 pass, including actual public GLBs,
full crossing/release/hatch/72worker role placement, same cargo/cart identities,
reverse280→0, nested pin transforms, exact batch matrices and disposal. Base
cohort cap12 retained after root harmonized bridge materials in Blender. No
whole-scene budget was relaxed.

Independent final dense sampler probe:5601coordinates across0..280, sampled at
±1µs. Maximum role-position delta3.267328µm, maximum quaternion angular
delta0.00008048854rad; failures[]. Final probes include Maxwell's -.92pusher
placement and Euler's continuous hatch worker. Earlier motion audit findings
remain explicitly intermediate snapshots; latest phase/bolt joins have no>5mm
jumps. Root owns final fullsuite/build, Euler owns actual composed browser QA;
this document does not claim that GPU gate has run yet.

## Mobile asset profile

After the first composed mobile GPU budget failure, root generated separate
onward-mobile.glb and closed-sling-mobile.glb through Blender MCP. The renderer
selects only those two URLs when the initial canvas CSS width is below700px,
using the same threshold as existing mobile rendering quality. Profile selection
is made at scene construction; it does not reload meshes during later resizes.
Default/desktop still uses the unchanged full exports. Asset modules use no DOM.
Diagnostics expose profile, selected sling URL and addon.assetUrl.

Actual-file renderer suites now12/12 pass and typecheck passes. Tests compare
all desktop/mobile role names/multiplicities, world matrices and fixed scales at
0,60,128,176,202,242,280and reverse; the mobile source triangle total is lower,
and repeated disposal releases every batch exactly once. Root reports combined
addon/sling source19216→11152triangles, preserving all hardware/bodypart roles.
Root owns mobile contact geometry verification. Parent owns subsequent build;
Euler must rerun actual composed GPU budgets and served mobile-asset hash gates.

A subsequent actual mobile peak required the third mobile URL, bridge-mobile.glb.
The initial-width profile now selects mobile bridge, closed sling and addon;
desktop keeps all three originals. Root created the fixed-floor geometric union
and spatial iron chunks in Blender. Renderer role comparison accepts the static
iron role's Mesh→Group change while enforcing the same role multiplicity and
world transforms. Final actual-file suites12/12 and typecheck pass with all three
mobile exports. Source is frozen for parent's final build and Euler's GPU rerun.
