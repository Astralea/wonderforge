# Eiffel water reflection experiment — rejected, 2026-09-08

**No production change retained.** A four-sample within-pixel reconstruction of
the analytic water sun lobe compiled successfully but provided no measured
benefit over the existing ripple filtering. The candidate source, proposed
specification, tests and all images are preserved here. `eiffelWater.ts` was
restored explicitly; no git reset or other source rollback was used.

## Valid comparison

`web-warm/qa.json`: 12 deterministic camera positions per variant, desktop
1440x900 and mobile390x844, all water/light/construction clocks frozen at .5.
All scene meshes except actual water are hidden for metric isolation. Three
warmup draws occur before **each** measured sequence so newly compiled water
program uniforms cannot bias its first frame. Camera angles span .0055 radians.
Both variants use the existing ripple-octave filter. Full-scene frames accompany
the isolated metric. No console or GPU shader errors; same geometry/draw counts.

Tracked-world-point adjacent-frame luminance change (0–255 scale):

| View | Existing | Candidate | Outcome |
|---|---:|---:|---|
| Desktop panoramic | .01937854 | .01937854 | Identical |
| Mobile panoramic | .01757124 | .01757124 | Identical |
| Desktop sun-aligned fountain | 2.50114231 | 2.50151702 | .015% worse |
| Mobile sun-aligned fountain | .32626540 | .32761224 | .413% worse |

The near sun-aligned view deliberately places the reflected sun across the
fountain to challenge the lobe. It contains visible glare and resolved surface
variation; this is not only a test of water outside the sun reflection. The
metric includes actual reflection movement and nearest-pixel sampling, and is
not a physical ground-truth error score. It supports rejecting this expensive
candidate, not certifying the water globally flicker-free.

## Controls and rejected evidence

`web/control.json` compares the original center reflection with a zero-offset
version of the candidate's normal/lobe reconstruction. They are pixel-exact in
both desktop/mobile, near and far views. All four pixel-offset samples collapse
to the center for this control. GPU shader compilation succeeds, and copied
normal reconstruction is therefore not hiding a different material response in
those tested views. The regular near-view quadrature differs by at most 1 color
level at a few desktop pixels, zero on mobile; it preserves near detail.

**Do not cite preliminary dawn reductions in `web/qa.json` or `qa.log`.** The
initial sequence did not warm newly compiled shader variants before measurement.
Its first-frame uniform initialization produced a false large improvement. The
properly warmed run supersedes it. `web-rejected-framing/` is also invalid for
metrics because no tracked water points were inside that original film close-up
camera. Both sets remain as diagnostic evidence.

## Implementation and verification scope

- Candidate contains no derivative inside the sample-normal evaluator. It uses
  first derivatives of original noise coordinates/view position only; no
  dFdx(filteredNormal) or higher-order derivative nesting.
- It evaluates four copies of the original analytic sun response rather than
  scaling brightness or altering shared roughness. This adds substantial shader
  arithmetic without demonstrated benefit, so no promotion/performance claim.
- `focused-tests.log`: two candidate shader-composition tests passed. These were
  followed by actual desktop/mobile GPU rendering, not treated as GPU proof.
- `restored-focused-tests.log`: original water composition test passes after
  restoration; the unrelated near-frustum test is intentionally skipped by the
  test-name selector. Broad tests/typecheck/build remain parent-owned.
- No Blender/MCP, model edits, shared material recipe change or dist build.

## Reproduce without changing production

`candidate-route.mjs` intercepts the local dev request for `eiffelWater.ts` in
Playwright and transpiles the archived candidate, so the original production
source stays untouched. `smoke-candidate.mjs` checks this replay path. `qa.mjs`
and `control.mjs` use the same interception; they require dev server5590. Copy
existing evidence elsewhere before rerunning those scripts, since their output
filenames are deterministic. The archived test text/spec are review records,
not active source requirements.

Next bounded action: prioritize measured fine-building-edge/geometry changes
in the parent's new Paris asset. Do not spend on another water rewrite without
reproducing a remaining visible defect in the actual current film. Existing
near5m and water-noise filtering stay in place.
