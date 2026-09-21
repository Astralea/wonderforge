# Floating-stone QA handoff

Build verified on 2026-08-29 with production asset `index-CLCtklvn.js`.

## Numeric evidence

- `tests/stonehenge-construction.test.ts` samples source, dressing, hauled,
  skid, crib, guide, and final-joint contacts across multiple stones/routes.
  Transformed stone-bottom or soffit residuals are capped at 0.03 m.
- `tests/construction.test.ts` samples Giza phase interiors and ramp progress.
  Stone-bottom to immediate support and carrier-bottom to ground/deck residuals
  are capped at 0.01 m; the ramp support sample is capped at 0.03 m.
- `tests/stonehenge-world.test.ts` pins the procedural geometry's actual
  load-bearing envelope after weathering.
- Full gate: 29 test files / 321 tests, typecheck, and build passed.

## Browser sweep still required

The managed sandbox rejected a new preview listener with `listen EPERM`.
The existing process reported on port 5589 was unreachable from this network
namespace. The inspector then failed to launch Chromium because macOS denied
the Mach rendezvous registration. No screenshot or GPU budget is claimed.

Capture desktop 1440x900 and mobile 390x844 at:

- `#/debug/wonder/stonehenge/0.12` — source/dressing ground contact.
- `#/debug/wonder/stonehenge/0.32` — sled/skid runner contact.
- `#/debug/wonder/stonehenge/0.58` — heel/A-frame contact.
- `#/debug/wonder/stonehenge/0.78` — crib/guide-to-soffit contact.
- `#/debug/wonder/stonehenge/0.92` and `/1.0` — final joint/turf seating.
- `#/debug/wonder/pyramids-of-giza/0.35` — loaded/haul carrier contact.
- `#/debug/wonder/pyramids-of-giza/0.62` — ramp/deck/crib contact.
- `#/debug/wonder/pyramids-of-giza/0.90` — upper-course final settle.

Use the Vertex image at
`artifacts/vertex-wonder-ref/stonehenge-construction.png` as a qualitative
reference for narrow contact shadows, compressed/interrupted turf and chalk at
bases, runners seated into grass, cribs touching lintel soffits, visible human
scale, and the high-angle dusk near/site/far composition.
