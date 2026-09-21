# Eiffel long-film story unification — 2026-09-09

Owner screenshots showed an almost finished tower at Detailed 30% followed by
prolonged detail work, and an oversized primitive summit derrick at96%.

The cause was the source schedule: at30%, production was0.7471 and the highest
visible solid reached288.117m; the following summit stair delivery occupied a
465-second insertion. This was an editorial mismatch, not stale Blender assets.

Spec41 introduces one monotone Detailed presentation-to-source map. All original
source operations/poses and saved Blender artifacts remain; duration is still
829.4267707038563s and the separate Cinematic edit stays180s. Structural growth
receives more viewing time, while the long stair delivery occupies a shorter
interval. The opening and final source tail remain exactly identity. The actual
kit regression now requires the30% frame to remain below60m.

Captions, narration offsets and navigation share that mapping. Beacon plays only
after final seating, followed by the closing quote. Explicit same-beat seeks
restart narration at the new offset; animation ticks do not restart audio.

Spec42 replaces the tiny summit apparatus close-up with an aspect-aware upper
shaft/platform composition, minimum210m radius. Existing supported routes and
apparatus geometry remain unchanged. This is a cinematography correction, not
a claim that the generic derrick/worker models were rebuilt or made photoreal.

## Verification evidence

- `final/report.json`: desktop1440x900 and mobile390x844, nine chronological
  frames each, zero page errors. All six real BGM speed samples pass: native
  rate1 and elapsed audio follows wall time at animation1x/2x/4x.
- `final/1440-0.3.png` and `final/1440-0.96.png`: reviewed lower-frame
  construction and medium-wide summit, alongside corresponding mobile captures.
- `composition-review/interrupted.txt`: first exploratory run interrupted by
  Vite source refresh; retained and not treated as verification.
- `full-tests.log`: first full run1027pass/1fail. Only failure was an obsolete
  paused-canvas readiness fixture expecting raw viewer time instead of the new
  mapped source time; updated to assert identical mapped frames before/after
  asynchronous readiness. No production readiness behavior was weakened.

Browser samples verify selected states and native music timing, not a complete
14-minute real-time viewing or a whole-film frame-rate certification. No public
publication, model regeneration, audio generation, or plugin installation.

Local review: https://wonderforge.localhost/#/wonder/eiffel-tower

Final mobile captures also verify the compact chapter index follows the active
chapter without covering the summit. The earlier `verified/` capture set is
retained to show the visual issue that prompted this last navigation correction.
Typecheck and production build pass; build identity is in `source-hashes.json`.

Final full suite: **1030/1030 tests in195files**,183.62s. See
`full-tests-final.log` and `final-verification.json`.
