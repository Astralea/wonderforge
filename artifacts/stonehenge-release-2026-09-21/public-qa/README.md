# Post-deployment public smoke check

Completed after the release owner confirmed deployment and supplied
`main-BR6Phg3M.js`. Authoritative passing evidence is in `confirmed/` and
`REPORT.md`. The original root-level attempt is preserved: its three desktop
failures came from a responsive chapter-toggle selector mismatch, corrected
before the successful eight-run repetition.

```sh
node artifacts/stonehenge-release-2026-09-21/public-qa/smoke.mjs --ready-bundle main-HASH.js --run new-attempt-name
```

The harness checks `https://wonderforge.pages.dev/` on desktop 1440×900 and
portrait 390×844. It validates the expected bundle before proceeding, checks the
four released catalog choices and six disabled entries, and launches all four
public film hash routes using ordinary gallery clicks. For each film it waits
for assets and arrival completion, verifies a nonempty render, and exercises
pause, play, pointer seeking, endpoint/reverse seeking and returning to the
catalog. It records page errors, HTTP errors, failed/aborted requests, renderer
diagnostics, screenshots and JSON results.

For the three historical films it clicks narration on and the first chapter,
checks actual HTMLMediaElement progress/decoded duration against accepted local
metadata, checks the matching caption, and records requested narration assets.
The browser output is muted. No synthetic play bypass or application-store
mutation is used. This is not subjective listening, all-clip completion, a
three-minute Eiffel run, physical-phone performance, final Stonehenge framing,
or an independent served-file hash/cache/privacy review; those checks have
separate owners and earlier evidence.

Do not run against a future public deployment until the release owner provides
the new deployment-ready confirmation and bundle filename. Use a new run name
to preserve accepted and failed evidence.
