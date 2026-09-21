# Stage-23 upper-route compatibility

The immutable baked route file remains sealed to whole-manifest FNV `be42a493`.
The current summit revision changes that whole-manifest FNV to `bd2decda`, but
all 6,984 manifest records through stage 23 retain protected-domain FNV
`90640500`. Runtime compatibility is explicitly limited to that current whole
manifest plus the unchanged domain. Every one of the 1,085 corrections still
must match its baked per-operation input hash, covering the derived part,
timing, station, pickup, receiver and support dependency.

Focused verification on 2026-09-08:

- `eiffel-upper-route-compatibility.test.ts`, `eiffel-upper-clearance.test.ts`,
  and `eiffel-signature-timing.test.ts`: 9/9 passed.
- `eiffel-physical-construction-clock.test.ts`, `eiffel-film.test.ts`, and
  `eiffel-summit-work-camera.test.ts`: 24/24 passed.
- `npm run typecheck -- --pretty false`: passed.

Restoring baked corrections does not alter scheduling coordinates. The long-load
start remains productionT `0.8054955483449447`; stage-63 duration remains
`160.42677070385625` seconds and representative wave 3596 remains
`0.8995834287321787..0.9`. The browser sampler was regenerated after the gate
change. This compatibility proof does not revalidate later summit handling.
