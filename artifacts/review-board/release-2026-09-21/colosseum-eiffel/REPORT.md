# Colosseum + Eiffel release review — 2026-09-21

**GO for a clearly described first public preview of both films. No newly discovered broken-film blocker. Neither receives complete Spec 04 visual acceptance.** No source edits, rebuild, deployment or publication performed.

Production `127.0.0.1:5590`, bundle `main-D8RR7sSY.js`, Chromium / real Apple M2 Ultra GPU. Both **Colosseum 60s** and default **Eiffel Cinematic 180s** completed uninterrupted **1×** playback at **1440×900 and 390×844**. Evidence: **154 timed screenshots, four WebM recordings**, actual camera diagnostics and media events in [results.json](results.json). [Detailed review and linked evidence](REVIEW.md).

All four endings replayed, retained their canvas, and returned home without a loader or overflow. Eiffel's six chapters were reachable; reverse seek remained paused. Zero page/console errors or HTTP failures; existing shadow-map deprecation warnings only. Eiffel's **six Adam clips naturally ended within their chapter windows on both viewports**; its correct ~180s score decoded. Colosseum's seven-clip narration acceptance is reused from `artifacts/chapters-history-2026-09-21/browser/REPORT.md`.

The bounded [Eiffel follow-up](eiffel-detail.json) passed narration on/off, pause/resume, elapsed seek, clip replacement, gap silence and soundtrack mute/unmute. Its blanket “no rejected play promises from page load” assertion failed on **14 standard autoplay-before-interaction NotAllowedError responses per fresh direct link**. UI-driven playback then worked; these policy rejections are preserved and distinguished from playback failure. Muted browser: no auditory-quality claim. Browser viewports: no physical-phone claim. Shared GPU: no performance claim.

| Spec 04 category, 0–3 | Colosseum | Eiffel |
|---|---:|---:|
| Composition | 2.5 | 2.6 |
| Silhouette | 2.8 | 2.8 |
| Construction causality | 2.6 | 2.6 |
| Material readability | 2.5 | 2.6 |
| Lighting | 2.5 | 2.6 |
| Environment depth | 2.1 | 2.5 |
| Motion clarity | 2.5 | 2.5 |
| UI restraint | 2.8 | 2.7 |

Spec 04 requires every score ≥2.4 and causality 3/3. Scores are visual judgments with per-category capture evidence in [REVIEW.md](REVIEW.md), not assertions of geometry/physics failures.

Two remaining art caveats:

1. **Colosseum:** broad bare midground still separates the worksite from Rome before the final urban reveal. [36.06s / t=.601](desktop/colosseum/frame-03606.png). The [58.14s Moon composition](desktop/colosseum/frame-05814.png) is strong and should be preserved.
2. **Eiffel:** foreground iron competes with the payload in work closeups, notably [38s / t=.211](desktop/eiffel-tower/detail/seek-038.png); the first lift becomes clearer by [19s](desktop/eiffel-tower/detail/seek-019.png). The quieter ~88–104s overview could communicate progress more strongly. [Portrait ending](mobile/eiffel-tower/ending.png) retains the full tower and flag.

Both are bounded polish opportunities for a later pass. A broad art rebuild is not a prerequisite for this first-preview recommendation; “complete Civ VI / Spec 04 visual acceptance” would overstate the current result.
