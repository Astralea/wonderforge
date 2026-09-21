# wip/local-20260915 archive — 2026-09-22

Salvaged from the local-only branch `wip/local-20260915` ("WIP: park local dirty
tree before quality pass", commit `ed479c6`, 2026-09-15) before that branch was
deleted to reclaim disk. The branch was never pushed; GitHub never held any of it.

## Why the branch was deleted

`.git` had grown to 7.9 GB. 11.41 GB of blob content was reachable only from
this branch, of which 11.24 GB was binaries — 181 `.blend` files (one 954 MB
`Untitled.blend`), 5,410 PNG captures, GLBs and WebM recordings from the
2026-09-07..15 Eiffel and Paris passes.

The `.blend` files were not archived. They are build outputs, not sources: the
54 `scripts/blender_*.py` generators write them (`bpy.ops.wm.save_as_mainfile`)
alongside the GLBs the app actually ships. Re-running a generator reproduces
both.

## What was salvaged

Everything here existed *only* on that branch — verified absent from both the
working tree and every ref on GitHub.

- `.agents/skills/` — 22 agent skill definitions, including the project-specific
  `wonderforge-scene-builder` and the `threejs-*` family. Only four remained on
  disk.
- `.factory/skills`, `.cursor/mcp.json`, `NEXT_AGENT_HANDOFF.md`
- `specs/48-eiffel-living-finale-and-compass.md` — a *different* spec 48; the
  number was later reused by `48-public-film-repair.md`.
- `src/engine/eiffelGeography.ts`, `src/engine/eiffelEndingBirds.ts`,
  `src/render/three/EiffelEndingBirds.ts`
- `tests/eiffel-geography.test.ts`, `tests/eiffel-ending-birds.test.ts`,
  `tests/eiffel-finale-motion.test.ts`
- 1,373 written reports, test logs and notes (`.md`, `.log`, `.txt`) from the
  2026-09-07..15 passes.

Not salvaged: PNG captures, GLB models, WebM recordings and JSON data dumps
unique to that branch. The films they documented shipped; the reports describing
them are here.

The source files above are archived, **not** restored to the tree. They were
removed during the quality pass and nothing currently imports them.
