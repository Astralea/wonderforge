# Eiffel local experience refinements

## Short-film shadow coverage

The 180-second cinematic edition fits its single directional shadow camera to
the current tower and construction shot. The former fixed near-ground shadow
volume excludes the upper tower; enlarging only its orthographic XY bounds is
insufficient because high members can also lie behind the light camera.

Wide shots cover the erected tower footprint, working-height allowance and
ground support. Fit tiered bounds derived from the actual kit manifest rather
than a full-width box extending to the summit: foundations reach62.5m from the
axis, while the upper shaft and lantern are much narrower. Retain a68m ground
half-width and at least4m margin around each structural height band's bounds.
This avoids admitting unrelated city/tree casters through empty upper corners.
Close shots concentrate on the camera's operation target and
nearby supporting structure, with a continuous transition to the wide envelope
as the camera withdraws. This is a bounded lighting envelope, not proof that
every moving member, distant Paris building or ground-cast shadow is covered.
Use the existing erection-height milestones; retain all construction poses.

Fit both lateral projection and depth. Quantize projection extents and snap the
target's light-space lateral coordinates to shadow texels to reduce crawling.
Beyond the structural/support envelope, retain4m lateral padding (less at most
half a shadow texel after snapping),16m light-depth padding, and a1m near plane.
Verify the remaining lateral/depth margin numerically at both map resolutions.
Keep the existing one sun, 2048 desktop / 1024 mobile maps, material settings,
bias, exposure and main-camera compositions. The detailed edition and other
wonders retain their original shadow rig through an explicit reset path.

Numerical tests must project tower and close/support envelope corners through
the actual Three.js light camera for multiple Eiffel sun directions and both
map sizes, including the formerly clipped 277m and 300m upper-tower points.
Verify deterministic fitting, texel snapping and restoration of the old rig.
Desktop/mobile image comparison and rendering budgets remain browser gates;
frustum coverage alone does not certify appearance or frame rate.

In the short film, the separate steam-drive assembly stops casting a shadow
when its estimated projected diameter is at most 12 CSS pixels. All of its
source geometry, motion and shadow reception remain present. Its caster returns
in closer shots and unconditionally in the detailed edition. Derive the bound
from the saved model with allowance for the crank stroke; do not apply this rule
to the tower, carried members, supporting platforms or other wonders. Verify
source/batch transforms survive forward and reverse camera changes unchanged.
