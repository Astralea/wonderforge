# Giza and Stonehenge — release visual review

2026-09-21. Read-only review of production `http://127.0.0.1:5590/`, verified bundle `main-D8RR7sSY.js`. No application edits, deployment, publication, or repository visibility change.

**Giza: GO for an initial public preview, with the polish below. Stonehenge: nearly ready; fix the desktop Sun/letterbox collision before posting.** This is a bounded visual recommendation, not certification of photorealism, archaeology, audio taste, or physical-phone performance.

## One pre-posting correction

**P1 — Stonehenge's ending Sun is partly hidden by the desktop letterbox.** The closing composition is strong, but the focal body itself crosses the permanent black bar. Compare the actual UI at [t=.867 / 52.0s](stonehenge/desktop-live-26-t0.8670.png) with the [chrome-free .86 frame](stonehenge/desktop-debug-t0.86.png). The [final UI](stonehenge/desktop-live-30-t1.0000.png) still clips the upper limb. This is not simply a halo touching the frame.

[Captured-camera geometry evidence](geometry-review.json) uses runtime camera position/direction/FOV, the actual solar direction, and the authored 1.55° radius. On 1440×900 the bar ends at y=54px. The geometric disc top is y=10.2px at t=.8, 21.1px at .867, and 36.7px at 1: respectively 43.8, 32.9, and 17.3 pixels of its vertical extent are covered. Actual pitch agrees with the pure sampler within .004°. The [390×844 ending](stonehenge/mobile-ui-t1.png) is clear because its FOV is wider.

Source: [closing camera keyframes](../../../../src/engine/stonehengeCamera.ts#L28) use 10.2°→9.6°→9.2° pitch, [UI letterbox](../../../../src/ui/CinematicView.tsx#L163) covers 6vh, and [sky data](../../../../src/data/stonehengeSky.ts#L85) holds the Sun at 5.4° with a 1.55° radius. Recommended direction: lower the closing camera pitch, preserving the azimuth/solstice alignment, actual Sun direction, radius, and construction schedule. For the current 35° desktop FOV, a pitch at or below approximately 8.05° admits the whole disc plus 1.5vh breathing room below the 6vh bar. An approximately 2.3° reduction of the three closing keyframes is a reasonable starting trial. Ease the approach and recheck the complete monument, caption, and actual UI at .78/.86/.92/1 on both sizes. Do not move the Sun or shrink its disc to work around this composition defect.

## Full films and chapter pacing

Both desktop films ran uninterrupted at 1× from zero to completion in approximately 60.26 seconds. Each produced 31 timestamped UI captures, a full WebM, and 241 quarter-second diagnostic samples. Both clocks were monotone, ended with Replay available, displayed all six current chapters, and recorded zero page/console errors. Eight Giza and ten Stonehenge portrait UI checkpoints also recorded zero errors. [Results](results.json), [Giza film](pyramids-of-giza/desktop-full-1x.webm), [Stonehenge film](stonehenge/desktop-full-1x.webm).

The review examined those timed frame sequences and the specific raising/crib checkpoints; it is not an assertion that every video frame or every stone trajectory was independently measured. Existing transformed-contact tests and the root's 1,299-test gate complement the visual evidence.

Giza's close foundation/haul opening, Khafre handoff near halfway, rapid Menkaure build, and separated final ensemble form a coherent minute. The six history chapters now identify the actual three projects instead of treating the entire minute as generic masonry. “Three separate reigns” closes the historical compression clearly. The final chapter ends before the quote, leaving a quiet ending. See [14.0s haul](pyramids-of-giza/desktop-live-07-t0.2340.png), [30.0s high course](pyramids-of-giza/desktop-live-15-t0.5000.png), and [60.0s ensemble](pyramids-of-giza/desktop-live-30-t1.0000.png).

Stonehenge's sequence distinguishes upright raising, timber-supported lintels, smaller stones, and the solar axis. The mechanism remains legible at the formerly sensitive [.083](stonehenge/mobile-ui-t0.083.png), [.21055](stonehenge/mobile-ui-t0.21055.png), and [.2135](stonehenge/mobile-ui-t0.2135.png) checkpoints; no obvious floating heel or unsupported lintel was found there. The final reorientation is faster than the preceding orbit, but it resolves into a calm held axis rather than an endpoint snap. The [portrait axis caption](stonehenge/mobile-ui-t0.86.png) sits between Sun and monument, and the [upright chapter](stonehenge/desktop-live-13-t0.4340.png) accompanies visible raising work. The final quiet interval is intact.

The latest [chapter report](../../../chapters-history-2026-09-21/REPORT.md) and [recorded scripts](../../../chapters-history-2026-09-21/CHAPTER-SCRIPTS.md) supersede older voice choices/proposals. Current text correctly qualifies reconstructed methods, says “many” Welsh bluestones, identifies separate Giza reigns, and names the two solstice directions. The root's 38-case browser evidence establishes narration asset/timing transport; this visual pass used muted browser output and does not add a subjective listening claim.

## Ranked nonblocking polish

1. **P2 — Giza early haze and smooth ramps weaken depth.** At [.10 / 6s](pyramids-of-giza/desktop-live-03-t0.1000.png) and [.234 / 14s](pyramids-of-giza/desktop-live-07-t0.2340.png), beige haze merges distant settlement and sky, while broad smooth earthwork surfaces dominate the individually jointed stones. Reduce the early atmospheric wash modestly and give the existing ramps restrained earth variation. This would improve the first impression without changing construction or adding props.
2. **P2 — Giza's portrait late handoff temporarily loses the ensemble.** At [.88 / 52.8s](pyramids-of-giza/mobile-ui-t0.88.png) Khafre is cropped and Khufu is offscreen; at [.94 / 56.4s](pyramids-of-giza/mobile-ui-t0.94.png) completed monuments still cross the sides. The [final frame](pyramids-of-giza/mobile-ui-t1.png) fits all three: actual final stone bounds stay between x=-.948 and .959 NDC. An earlier portrait pullback would make this transition more gracious. It is secondary for the stated desktop-first preview and does not invalidate the final reveal.
3. **P3 — Stonehenge remains visually spare between operations.** The [middle build](stonehenge/desktop-live-13-t0.4340.png) has a broad, uniform green field and a pale hill rim; small construction actions carry most of the interest. A restrained soil/turf and atmospheric-depth pass could improve it later. Preserve the open downland and the ending's light; a dense invented settlement would not be an appropriate remedy.

## Spec 04 scorecard

Board scale 0–3; Spec 04 maps this by ×5/3, requiring at least 2.4 in every category and 3 in construction causality. These are visual judgments with the above scope, not numerical physical-proof scores.

| Category | Giza | Stonehenge | Evidence |
| --- | ---: | ---: | --- |
| Composition | 2.5 | **2.2** | Giza final ensemble resolves; Stonehenge's desktop solar focal point hits the bar. |
| Silhouette | 2.6 | 2.7 | Giza three-monument hierarchy at1; Stonehenge central trilithons and full circle at.867. |
| Construction causality | 3.0 | 3.0 | No apparent support breach in examined high-course/raising/crib checkpoints; current contact-test evidence supports the visible mechanisms. |
| Material readability | 2.4 | 2.5 | Giza masonry joints separate from earth, though ramps are smooth; Stonehenge timber and stone separate at.434. |
| Lighting | 2.4 | 2.7 | Giza early wash remains its weakest interval; Stonehenge retains readable faces and long axial shadows. |
| Environment depth | 2.4 | 2.4 | Giza camp→river→city remains layered; Stonehenge's open plain has limited variation but a visible hill/sky layer. |
| Motion clarity | 2.5 | 2.6 | Timed full-film sequences show monotone construction and continuous handoffs; Stonehenge's late turn is brisk but resolves. |
| UI restraint | 2.6 | **2.3** | Current chapters and quote timing work at both sizes; Stonehenge's fixed bar still obscures the ending Sun. |

Giza passes this scoped first-preview review. Stonehenge fails the formal composition/UI floor until the small framing correction is accepted in actual UI. After that correction, nothing else found here warrants delaying an initial public preview for a large scenery rebuild.

Renderer observations: desktop peak sampled counts were 176 calls / 275,974 triangles for Giza and 85 / 110,468 for Stonehenge. The GPU was shared with another reviewer; no FPS/performance conclusion is drawn. Portrait is viewport emulation, not a physical phone. Full capture scripts, rejected/current frames, diagnostics, and geometry calculations remain in this folder.
