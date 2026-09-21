# Colosseum and Eiffel — first public preview review

2026-09-21 JST. Read-only visual-director review. Candidate: production `http://127.0.0.1:5590`, `main-D8RR7sSY.js`. No source edits, rebuild, deployment, publication, or repository changes.

**Recommendation: GO for a clearly described first public preview of both films. No newly discovered broken-film blocker requires a broad art rebuild. Neither film earns complete Spec 04 visual acceptance in this independent scorecard.** Spec 04 requires every board score ≥2.4 and construction causality 3/3 (`specs/04-testing.md:235–241`); the scores below retain those remaining limits. Desktop is the primary product; portrait receives readable controls and framing rather than identical detail (`specs/00-overview.md:21–26`).

## Actual coverage

- Four uninterrupted **1×** runs: Colosseum **60 seconds** and default Eiffel **180-second Cinematic**, each at **1440×900** and **390×844**. Run: 2026-09-20 16:43:43–16:52:36 UTC (Sep 21 JST). Real Chromium / ANGLE Metal Apple M2 Ultra.
- **154 full-resolution timed screenshots**, chronological contact sheets, four WebM recordings, actual rendered-camera diagnostics and media events in [results.json](results.json). Colosseum sampled every 2 seconds; Eiffel every 4 seconds. Visual judgments use these full-film sequences plus 36 finer actual-UI-seek frames for Eiffel; they do not certify every intervening frame.
- All four runs reached the replayable ending, retained the same canvas, replayed successfully, and returned home without a loader or horizontal overflow. Eiffel reverse seek remained paused, all six chapter buttons were reachable, and the last selected chapter reached approximately 144 seconds. [Portrait chapter menu](mobile/eiffel-tower/chapter-menu.png).
- **Zero page/console errors and zero HTTP failures** in all four full runs. Two existing `PCFSoftShadowMap` deprecation warnings per run; these are not rendering failures.
- Eiffel: all **six Adam clips naturally ended at positive volume on both viewports**, inside their 8-second chapter windows. End times: 18.72/18.90, 27.90, 37.44, 48.24, 76.32, 148.32 seconds. Correct `eiffel-tower-short.mp3` decoded to 179.979 seconds. Colosseum reused the completed seven-clip, both-viewport narration acceptance in `artifacts/chapters-history-2026-09-21/browser/REPORT.md`; this review's full Colosseum runs retained its default narration OFF.
- [Eiffel detail probe](eiffel-detail.json): narration on/off, pause/resume, in-beat seek, replacement on forward seek, silence outside a chapter, and soundtrack mute/unmute all passed on both sizes. Its blanket “no rejected audio from page load” assertion **failed**, recording 14 ordinary `NotAllowedError` autoplay-before-user-interaction responses per fresh direct link. The raw failures are preserved; successful UI-driven playback and all natural clip endings establish recovery. This is the browser's interaction requirement, not evidence that narration continues silently after Play.
- Browser audio was muted externally: **no auditory-quality signoff**. Viewport QA is not physical-phone QA. Shared GPU: **no FPS/performance acceptance claim**.

## Scorecard — 0 to 3

Evidence links below refer to actual production captures; film seconds divide by 60 (Colosseum) or 180 (Eiffel) for normalized `t`.

| Category | Colosseum | Eiffel Cinematic | Evidence / reason |
|---|---:|---:|---|
| Composition | 2.5 | 2.6 | Colosseum bowl remains centered through [36.06s, t=.601](desktop/colosseum/frame-03606.png), Moon clears the building at [58.14s, t=.969](desktop/colosseum/frame-05814.png). Eiffel's [portrait ending, t=1](mobile/eiffel-tower/ending.png) retains the complete tower and flag; work closeups are denser. |
| Silhouette | 2.8 | 2.8 | Colosseum ellipse, internal bowl and three arcade levels read at [36.06s](desktop/colosseum/frame-03606.png); Eiffel tapered iron/crown reads at [176.04s, t=.978](desktop/eiffel-tower/frame-17604.png). |
| Construction causality | 2.6 | 2.6 | Colosseum's staged piers, cranes, seats and successive storeys communicate the build in [0–22s](desktop/colosseum/contact-1.jpg) and [24–46s](desktop/colosseum/contact-2.jpg), but each transfer is not equally legible. Eiffel rig/cable/load become clearer by [19s, t=.106](desktop/eiffel-tower/detail/seek-019.png); foreground chords still cross the payload at [38s, t=.211](desktop/eiffel-tower/detail/seek-038.png). Not a finding of broken physical geometry. |
| Material readability | 2.5 | 2.6 | Stone/timber/red crews separate at [36.06s](desktop/colosseum/frame-03606.png). Eiffel iron, timber receiver and masonry separate at [76s, t=.422](desktop/eiffel-tower/detail/seek-076.png); very fine iron merges in wide views. |
| Lighting | 2.5 | 2.6 | Colosseum golden completion → dusk → Moon is a readable ending [48–60s](desktop/colosseum/contact-3.jpg), with deliberately subdued night walls. Eiffel [144–180s](desktop/eiffel-tower/contact-4.jpg) retains its dusk-to-bright final reveal. |
| Environment depth | **2.1** | 2.5 | Colosseum still has a broad bare worksite and detached distant housing during [6–36s](desktop/colosseum/contact-1.jpg); connected foreground Rome improves the ending. Eiffel's Seine, bridge, exhibition halls and city layer behind the tower [48–92s](desktop/eiffel-tower/contact-2.jpg), though repeated blocks remain obvious. |
| Motion clarity | 2.5 | 2.5 | Colosseum structural change continues through ~48s, then gives the Moon a distinct final hold [full sequence](desktop/colosseum/contact-3.jpg). Eiffel alternates close work and overview; ~88–104s is its quietest, least visibly changing stretch [sequence](desktop/eiffel-tower/contact-3.jpg). |
| UI restraint | 2.8 | 2.7 | Full-play chrome withdraws; portrait captions remain clear of the completed monuments [Colosseum 48–60s](mobile/colosseum/contact-2.jpg), [Eiffel 96–180s](mobile/eiffel-tower/contact-2.jpg). Eiffel caption panel is heavier but readable during work [portrait 38s](mobile/eiffel-tower/detail/seek-038.png). |

## Three improvements with the best gain relative to risk

1. **Connect Colosseum's early and middle ground to Rome.** Reposition a small portion of existing lanes, low walls and housing toward the edges of the opening camera's worksite. Preserve the work circulation area and Moon composition. The empty gap at [36.06s](desktop/colosseum/frame-03606.png) is a greater visual weakness than house-model detail; adding hundreds of new meshes is unnecessary.
2. **Give Eiffel's lifted member a cleaner background for more of each closeup.** Favor a small camera azimuth/target adjustment or a clearer material-value separation around [17–19s](desktop/eiffel-tower/detail/seek-017.png) and [36–40s](desktop/eiffel-tower/detail/seek-038.png), preserving physical clocks and the receiving joint. The camera already clears the first lift at 19s, so this is polish, not a reason to redesign the mechanism.
3. **Increase the perceptible progression through Eiffel's ~88–104s overview.** A restrained target-height/orbit progression could follow the advancing upper work while retaining the 180-second clock, six voices and the protected ending. [88–104s sequence](desktop/eiffel-tower/contact-3.jpg). Keep the slower breaths; avoid an arbitrary extra closeup or another narration block.

## Verdict

Both films now work as complete, recognizable, stylized miniature wonder films. Colosseum's lunar ending is the stronger composed moment; Eiffel has the richer connected setting and the more explicit close-work vocabulary. Their final stills can carry a first-preview announcement, while the Colosseum's open midground and Eiffel's crowded work sightlines prevent a blanket “finished Civ VI quality” claim. These are bounded art and editorial improvements for a later pass, not newly discovered crashes, missing endings, broken controls or truncated voice lines. Deployment, public metadata, privacy and the other two films remain outside this review.
