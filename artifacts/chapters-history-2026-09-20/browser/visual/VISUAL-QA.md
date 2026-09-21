# Chapter visual QA — production browser run

2026-09-20. Production preview `http://127.0.0.1:5590`. Full 38-chapter pass: `main-UE8LJ20v.js`; targeted correction recheck: `main-CmV5abji.js`. Chromium's full `channel:'chromium'` browser reported **ANGLE Metal Renderer: Apple M2 Ultra**. Desktop: 1440×900; primary portrait: 390×844, DPR 1; additional correction checks: 320×844 and 375×667. This is desktop GPU rendering at mobile dimensions, not a physical-phone performance test.

## Result

All **19 chapters × 2 viewports = 38** chapters were reached by clicking their actual chapter-menu buttons, paused through the UI, then sought to their midpoints through the Film position input. The current DOM bodies matched each menu's described sentence. Each frame had one active chapter, full caption opacity, in-viewport caption bounds, no horizontal page overflow, and the same connected canvas. No browser page/console errors were recorded.

**Chapter visual placement passes after one narrow correction.** The initial portrait Stonehenge solstice caption overlapped the Sun. Root moved only that caption below the disc, and nine new production captures at three portrait sizes confirm that both Sun and monument remain clear. The underlying film remained visible and the text fit even in the initial failure, illustrating why a geometry-only UI check was insufficient. The before evidence is preserved below. Other chapter placement is acceptable within the current scene framing, with the minor limits noted below.

This pass does **not** accept new narration playback or audible timing. Narration stayed off; root reports only **2 of 19** revised narration clips generated, with the other 17 pending API-key allowance. The muted Chromium launch and visual test are **not an auditory signoff**.

## Corrected finding and production recheck

### Initial portrait Stonehenge failure: the final sentence covered its subject

[Full-resolution failing frame](mobile/stonehenge/stonehenge-axis.png), t=.855.

The mobile caption frame occupies x20–370, y62.6–193.3. Its three lines cross the central Sun, approximately x155–235, y78–170 in this captured frame. The image's principal solar event therefore competes with the sentence explaining it.

Root implemented a narrower `top:25vh` override on `[data-caption-id="stonehenge-axis"]`, preserving all other caption positions. This is better than the initial approximate 29vh suggestion because it gives the smallest viewport more room above the monument.

The corrected production bundle was inspected at **t=.80, .855 and .91** in each of three portrait viewports. All nine screenshots show the Sun unobstructed above the caption and the full main stone circle below it, with no browser errors or horizontal overflow. The fading text near .80/.91 is the intended caption envelope, not clipped content.

| Viewport | Measured caption rectangle | Visual clearance |
|---|---|---|
| 390×844 | x20, y211, width350, height130.7 | Clear of Sun and monument at all three times. |
| 320×844 | x20, y211, width280, height156.7 | Four-line sentence remains above the stones; the lower edge is the tightest tall-phone case, but it does not intersect the monument. |
| 375×667 | x20, y166.75, width335, height130.7 | Clear of the solar disc and the smaller projected monument at all three times. |

Corrected midpoint evidence: [390×844](after-axis/390x844-0.855.png), [320×844](after-axis/320x844-0.855.png), [375×667](after-axis/375x667-0.855.png). All nine originals and exact measurements are in [after-axis/results.json](after-axis/results.json). The small gold kicker now passes across the distant tree/horizon band; this is a minor remaining contrast/detail interaction, while the body text and solar subject are clear.

## Visual inspection across all chapters

| Film | Desktop | Portrait |
|---|---|---|
| Giza: six chapters | All text fits; Khufu, Khafre and Menkaure chapters occur on their intended work/camera intervals. Upper and lower placements stay off the central work surface. | All six fit in two or three lines above the monuments. The final Menkaure view has the smaller pyramid partially behind its larger neighbour; this is an existing camera/occlusion limit, not a new caption obstruction. |
| Stonehenge: six chapters | Dressing, upright raising and outer lintel scaffolds are visible on their corresponding beats. The bluestone line now occurs during the smaller-stone build. The solar ending leaves the circle and Sun clear. | First five caption placements leave the active stonework clear. Earthwork and dressing captions extend into the bright horizon but remain readable. Final axis caption now passes the nine-frame correction check above. |
| Colosseum: seven chapters | All text fits. The crane and seating captions mildly cross the rightmost outer scaffold/façade edge; they leave the lifting apparatus's main silhouette and the seating bowl readable. Upper-right placement could reduce that minor overlap if desired, but it is not comparable to the Stonehenge Sun obstruction. Moonrise text sits away from both Moon and monument. | All seven caption bodies remain in the upper sky with the construction below. The Moon in the final chapter is clear below its caption, and the amphitheatre is legible at night. The seven-item menu fits and each item can be selected. |

Contact sheets used for inspection:

- [Giza desktop](desktop-pyramids-of-giza-contact.png), [Giza portrait](mobile-pyramids-of-giza-contact.png)
- [Stonehenge desktop](desktop-stonehenge-contact.png), [Stonehenge portrait](mobile-stonehenge-contact.png)
- [Colosseum desktop](desktop-colosseum-contact.png), [Colosseum portrait](mobile-colosseum-contact.png)

All full-resolution chapter captures are in `desktop/{wonder}/` and `mobile/{wonder}/`; filenames use their caption IDs. Midpoint times are recorded in [results.json](results.json).

## Navigation and title/quote handoff

- All 38 menu-button clicks sought to the intended chapter start. At mobile width the disclosure closed after every selection, restoring its caption. First/last menu screenshots are preserved for each film and viewport. All six/six/seven entries were reachable.
- The desktop list is bounded and its active row remains available. The seven-row Colosseum list fits at this viewport; reachability was checked by real clicks rather than inferring it from array length.
- At t=.04 and .069 the opening title exists and no caption exists. At .071 the title has gone and the first caption exists, for all three films and both sizes.
- Immediately before each final caption endpoint, the caption exists and the quote card does not. Immediately afterward, the quote phase exists and the caption does not. Endpoints checked: Giza .935, Stonehenge .915, Colosseum .965.
- The mobile stylesheet intentionally hides full quotation text/author and leaves the wonder name in that closing phase (`src/ui/eiffelCinematicLayout.css`). Mobile closing screenshots therefore show name-only; DOM quote-presence checks do not prove a visible full quotation. There is no simultaneous final caption/title in these captures.
- These are paused midbeat visual captures plus boundary probes, not a continuous narration acceptance run. Chapter click briefly resumes real playback before the UI pause.

## Reproduction and scope

Run `node artifacts/chapters-history-2026-09-20/browser/visual/review.mjs` against the stated production preview. An optional `mobile` or `desktop` argument resumes one viewport while retaining the other result. The first mobile attempt had a test-harness error because role queries exclude a closed disclosure's hidden contents; the script now inventories its DOM buttons and opens it before interaction. No application defect is attributed to that attempt.

`contact-sheets.mjs` builds review boards from the original captures; it does not alter those evidence screenshots. The script only reads the rendered page and diagnostic GPU identity, and uses actual menu/transport controls. It imports no application module or playback store from the production bundle.

Application source was not modified by this reviewer during the browser-QA task. Root implemented the correction; this reviewer completed the affected production recheck with `axis-after.mjs`. No need to repeat unrelated chapter captures for that target-only CSS change. Existing stylized terrain, compressed camera geography, and minor scaffold-edge overlaps are art/scene limits, not newly introduced chapter blockers. This report accepts the scoped chapter visuals and navigation, not overall AAA scene quality, physical-phone performance, or the incomplete revised narration track.
