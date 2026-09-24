# Sydney motion correction — scoped visual review

Date: 2026-09-23. Final production bundle: `/assets/main-DLtirTZI.js`, confirmed by `final-production/report.json`, both `final-hero-verified/*/report.json` files, and `final-live-film/report.json`.

**Verdict: accept the bounded motion/readability correction, with physical-realism limits below.** Workers now visibly inhabit the yard and erected scaffold stations, boats visibly travel, and the revised pullback allows the yard operation to lead into the larger construction view. The targeted background depth error is substantially reduced. These findings do not certify universally flicker-free rendering, physically realistic speeds, or a complete historical construction simulation. Earlier scene and garden reviews are retained as historical evidence; their scores are not a substitute for this motion review.

## Evidence actually inspected

- Final production desktop and portrait captures at t = 0.32, 0.58, 0.78, and 1, plus `final-production/desktop-film.png` and `mobile-film.png`.
- Final verified hero reports, explicitly recording the final bundle and 1× playback; directly viewed `final-hero-verified/rib/frame-11.png`, `frame-15.png`, `frame-18.png`, and `final-hero-verified/sail/frame-09.png`, `frame-12.png`, `frame-14.png`. Also viewed the earlier same-source `final-hero-motion` rib frames 11/13/15/17 and sail frames 09/11/12/13/14, with their timestamp/phase reports.
- Independent development-camera evidence in `review-camera-final/`: sixteen desktop/portrait transition captures, two recorded 1× runs, their timing report, and selected player samples spanning yard dwell, outward transition, and panorama. This development evidence predates the final worker cleanup; the final production and verified hero captures confirm the framing in the final build.
- Parsed all twelve final-production diagnostic/error entries, both final hero reports, the final lifecycle report, and the 31-view depth-reference comparison in `final-depth-rotation/report.json`.

Visual motion judgments here come from timestamped frame sequences. Recordings exist, but this review does not claim independent continuous playback of every video frame or an audible listening pass.

## Findings

| Concern | Finding and practical boundary |
| --- | --- |
| Invisible workers | Corrected in the intended close construction beat. `final-production/desktop-0.32.png` and `mobile-0.32.png` show distinct human figures beside the trolley, casting stock, and yard routes, unobscured by the podium. Figures on actual erected platforms are visible in `desktop-0.58.png`. In wide portrait views workers still become tiny; this is not constant close-range legibility throughout the movie. |
| Abrupt camera pullback | Corrected. The rejected draft changed from close yard to almost full harbour between 0.345 and 0.355, only 0.6 seconds at 1×. The final camera spreads its pullback over roughly four seconds. `review-camera-final/mobile-natural-02.png` through `-06.png` show readable yard action around 0.329/0.338, then progressive widening at 0.349/0.359/0.369. Final verified rib frames preserve that relationship. No further camera change is warranted by these captures. |
| Construction handoff | The reviewed sequence makes trolley transport, crane suspension, and arrival at the receiving structure distinguishable. Verified rib and sail reports associate the selected parts with cast-yard, trolley-bed, working-floor, crane-hook, and seated support phases. The visible cables and loads agree at the sampled phases; no obvious floating load or ground penetration was identified in those samples. This is not an exhaustive swept-volume collision audit. |
| Static boats | Corrected visibly. Boats change position and heading relative to the podium and shoreline across final production 0.58, 0.78, and 1; they also progress in the timed camera samples. Some boats remain berthed by design. No boat visibly intersects land in the inspected frames. Small wide-view hulls do not communicate detailed marine dynamics. |
| Background flashing | Strong evidence supports the specific depth-precision fix. Summing the 31 matched views in `final-depth-rotation/report.json` gives 47,751 differing pixels for near = 0.5 versus the near = 100 reference, and 262 for near = 20: about a 99.45% reduction. All twelve final production diagnostics report near = 20. This controlled reference comparison isolates a depth error; its residual is nonzero and it does not establish absence of every temporal aliasing, shadow, water, browser, or device issue. Stills alone cannot establish flicker elimination. |

## Physical-realism limits that remain

1. **Most construction remains strongly accelerated.** Selected hero jobs have legible handling phases, but remaining crane moves and transfers compress much longer real operations into fractions of a second. Persistent return paths improve continuity; they do not make the fleet's speed or acceleration physically credible. The broad changes between the sail sequence's adjacent timed frames remain evidence of that compression.
2. **Falsework is a simplified support representation.** The visible fixed scaffold towers communicate support and worker stations, but do not reproduce the full erection, repositioning, and dismantling of historical support arches. The film is not a physically complete falsework simulation (`final-production/desktop-0.58.png`; verified rib sequence).
3. **Labour and rigging remain stylized.** Human-scale workers and readable yard poses establish activity, but task animation, contact, sling/load dynamics, and detailed fastening are simplified. Wide portrait construction still depends principally on cranes and parts for readability. An unrelated elevated load can cross the upper background during the close beat; the chosen yard operation remains visible, but it is not perfectly isolated (`review-camera-final/mobile-0.345.png`).

These are substantive limits on a claim of physical realism, even though they do not block acceptance of the specific worker, boat, camera, and depth corrections. The highest-value next choreography improvement would be a more legible supported placement/fastening hold for one representative job, rather than adding more tiny workers to the panorama.

## Runtime boundary

The final production report records zero errors at all twelve checkpoints and both player control checks. Desktop advances naturally from 0.58 to 0.603; portrait from 0.582 to 0.603. Reduced motion starts and holds at 1. Both viewport modes use ANGLE Metal on Apple M2 Ultra; portrait screenshots do not constitute physical mobile-device testing.

`final-live-film/report.json` records uninterrupted progression to t = 1 at 60.332 seconds, replay to 0.015, successful catalog return, and no errors for the same final bundle. Both `final-hero-verified` reports record 1× playback and empty error arrays. `audibleListening` is false. This review did not rerun the unit/type/build suite; those checks belong to the implementation verification record.
