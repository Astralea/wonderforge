# V2 web-adoption focused verification

Run with Node 24 on 2026-09-08.

- Adoption and historical evidence set: 10 files, 51 tests passed in 21.03 s.
- V2 summit shape, compatibility, readable clock, production, upper clearance,
  and film set: 6 files, 38 tests passed in 22.22 s.
- Corrected renderer budget, readable-clock duration, and asynchronous Paris
  disposal timeout: 3 files, 16 tests passed in 8.89 s.

The first repository-wide run found seven failures: four stale manifest/count
expectations and three dense-test timeouts under parallel load. After those
were corrected, the second full run found only the seated V2 triangle bound
(90,180 versus the old `<90,000`), readable-clock contention at 20 seconds,
and Paris asynchronous disposal contention at 5 seconds. The final focused
run above passed all three corrections. Parent owns the final clean full run,
`npm run typecheck`, and `npm run build` to avoid duplicate work.
