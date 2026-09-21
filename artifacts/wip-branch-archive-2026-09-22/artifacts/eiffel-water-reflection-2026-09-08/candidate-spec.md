# Eiffel water reflection sampling — 2026-09-08

Extend only the rebuilt Eiffel water's existing filtering. Preserve the authored
water animation, sky colors, wave amplitudes, ripple filter and other wonders.
The narrow analytic sun response must average within the pixel footprint rather
than sampling one normal and assuming it represents the entire pixel. Retain
its original radiance and a material-local uniform for matched before/after QA.

Use four quarter-pixel sample offsets. Reconstruct the same finite-difference
water normal at each offset with first-order coordinate derivatives and fixed
noise footprint weights. The sample evaluator itself contains no derivatives.
Never differentiate the already filtered normal, reflected direction, or sun
response: that would imply undefined higher-order derivatives.

Before promotion require actual desktop/mobile WebGL compilation, frozen-clock
water-only orbit A/B at tracked world positions, full-scene screenshots, and
checks that nearby resolved water retains detail. A local metric improvement
must not be reported as whole-scene flicker elimination. If the bounded change
has no measured benefit or unacceptable cost, retain evidence and do not promote.
