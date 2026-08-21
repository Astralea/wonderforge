# WonderForge — Agent Guide

Fan-made web recreation of Civilization VI's World Wonder construction movies:
procedural Three.js dioramas, orbiting camera, dawn-to-dusk light, and visible
physical construction by workers, roads, sleds, ramps, scaffolds, and levers.

**Read `specs/` first.** It is the source of truth. Giza is the sole reference
scene for the current rebuild; keep the other nine catalog entries functional.

## Agent transition

After reading `specs/`, read `HANDOFF.md` before changing code. It records the
current Three.js architecture, verification evidence, accepted visual captures,
decisions to preserve, known pitfalls, and next priorities.

As of the 2026-08-13 handoff, this directory is not a Git worktree and no
WonderForge development or preview service is expected to be running. Check the
chosen port before starting a server, preserve existing files and artifacts,
and ask before initializing version control or deleting generated evidence.

## Workflow

1. Change the spec first when behavior changes.
2. Write or extend tests in `tests/`.
3. Implement until `npm run test && npm run typecheck && npm run build` is green.
4. Run desktop and mobile browser QA for visual/rendering work.

## Delegation preferences (owner, 2026-08-21)

- Default delegate: the review-board droids in `.factory/droids/` run as
  parallel subagents (read-only roles must cite evidence; implementation
  droids get tightly-scoped briefs with disjoint file ownership).
- Non-frontend work may also go to Codex 5.6-sol or Claude Opus as separate
  sessions — past passes credit "delegated: Codex" and "delegated:
  grok/cursor-agent". From inside a Devin CLI session those CLIs are not
  invocable (no MCP bridge; `claude_design` is unreliable): author the brief
  into a droid file or task prompt and let the owner run the other tool.
- Frontend visual work stays with the in-session droids so captures,
  contract tests, and the review board stay in one evidence chain.

## Hard rules

- `src/engine/` and `src/data/` stay pure: no React, DOM, or Three.js imports.
- Three.js/WebGL is the production renderer. `ThreeCanvas.tsx` owns the DOM
  canvas; modules in `src/render/three/` own and dispose GPU resources.
- Structural solids never scale, teleport, or rise from underground. Giza uses
  individual human-scale stones and the construction state graph in Spec 02.
- Determinism: no runtime `Math.random()`; use `src/engine/random.ts`.
- Quotes/facts must be authentic and attributed.
- Never rename a wonder `id`; deep links depend on them.
- New reference scenes require typed scene/construction data and registration;
  legacy JSON scene documents remain temporary fallbacks only.

## Debug routes

- `#/debug/<shape>` — legacy primitive viewer while fallback scenes remain.
- `#/debug/wonder/<id>/<t>` — deterministic chrome-free frame for scene QA.

## Verify

`npm run test && npm run typecheck && npm run build`
