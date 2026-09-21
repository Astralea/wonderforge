# Live visual review — 2026-09-20

Read-only visual-director review of the live `https://wonderforge.pages.dev` captures taken by the root reviewer. Only the numbered, accepted captures in this directory were opened as image evidence. Rejected captures and historical evidence were excluded. `specs/04-testing.md`, `specs/05-ui.md`, and recent `HANDOFF.md` entries supplied the intended quality bar, not proof of current behavior.

This is a still-image review. It cannot certify motion continuity, real-time pacing, contact physics, audio, frame rate, or auto-hide timing. The visible chrome is a paused/interaction state; its presence does not establish that it remains throughout ordinary playback. A text collision in that supported state is still a defect.

Scores use the board's 0–3 scale: 0 broken, 1 substantial weakness, 2 serviceable with visible compromises, 3 strong. Spec 04 lines 237–241 require at least 2.4 in ordinary categories and 3 in construction causality. **Actual construction causality and motion clarity remain unassessed**; a separate visual operation-legibility score describes only what the still makes intelligible.

## Highest-priority observations

1. **Confirmed layout defect:** Stonehenge's solstice caption and quote collide in portrait and cover its ring ([10-stonehenge-solstice-portrait.png](10-stonehenge-solstice-portrait.png), t=0.82). This directly conflicts with Spec 05 lines 179–184, which require the text systems not to overlap. Fix this before directing a mobile social audience to the site.
2. **Confirmed visual defect:** Colosseum has a hard, nearly horizontal beige/blue horizon boundary in every reviewed desktop and portrait checkpoint ([12](12-colosseum-build-desktop.png), t=0.32; [13](13-colosseum-vaults-desktop.png), t=0.58; [14](14-colosseum-late-desktop.png) and [15](15-colosseum-late-portrait.png), t=0.86; [16](16-colosseum-reveal-desktop.png), t=1). The world appears to end beneath the sky. The image alone does not establish which fog/terrain/sky parameter causes it.
3. **Observed readability weakness:** Stonehenge's early mechanism and final stones are too dark to explain their form easily, while its sky/sun carries much higher contrast ([07](07-stonehenge-upright-desktop.png), t≈0.083; [09](09-stonehenge-solstice-desktop.png), t=0.82; [11](11-stonehenge-reveal-desktop.png), t=1).

## Pyramids of Giza

| Category | Score | Current image evidence |
|---|---:|---|
| Composition | 2 | The working pyramid is centered at 0.35/0.62 and all three separate in the reveal, but the 0.62 desktop crops the completed pyramid on the left; portrait gives the active work surface to the quote. [03](03-giza-build-desktop.png), [04](04-giza-raising-desktop.png), [05](05-giza-build-portrait.png), [06](06-giza-reveal-desktop.png). |
| Silhouette | 3 | The stepped pyramid family and the three-monument hierarchy read immediately at t=1. [06](06-giza-reveal-desktop.png). |
| Material readability | 2 | Individual masonry courses are distinguishable; broad, regular brown ramp decks dominate the build and read more like tiled platforms than earthwork at this viewing distance. [03](03-giza-build-desktop.png), t=0.35; [04](04-giza-raising-desktop.png), t=0.62. |
| Lighting | 2 | Shadow direction and warm reveal are readable, but beige build haze and the strongly orange reveal reduce separation between masonry, earth and distant settlement. [03](03-giza-build-desktop.png), t=0.35; [06](06-giza-reveal-desktop.png), t=1. |
| Environment depth | 2 | Nile, fields, tents and settlement make a connected world; much of the distance dissolves into one pale band during construction. [03](03-giza-build-desktop.png), t=0.35; [06](06-giza-reveal-desktop.png), t=1. |
| UI restraint | 1 | Desktop text has separate zones; in portrait the quote directly crosses the working slab and crew while the open chapter list and rail consume substantial height. [05](05-giza-build-portrait.png), t=0.62. |
| Visual operation legibility | 1 | Crews and hauled stones can be found, but the load/rope/support relationship is minute relative to the overall frame and is harder to read on portrait. [03](03-giza-build-desktop.png), t=0.35; [04](04-giza-raising-desktop.png), [05](05-giza-build-portrait.png), t=0.62. |
| Construction causality; motion clarity | N/A | Stills do not verify trajectories, duration, speed, support continuity or moving crews. |

Top three improvements, ranked by expected gain versus implementation risk:

1. **Reserve a visible portrait work area.** Make the quote, chapter explanation and control rail share explicit safe areas, with at most one expanded passage competing with the work. The existing quote is authentic presentation content; retaining access does not require covering the central assembly. This changes the quote policy in Spec 05 lines 136–137 if its visibility is altered. Acceptance: at t=0.62, both a working load and its crew remain unobscured at 390×844 with chrome awake. Evidence: [05](05-giza-build-portrait.png).
2. **Give one haul/raising operation a closer shot or longer composition hold.** Keep stones and humans physically scaled; change framing so a viewer can locate the load, pulling team and destination without studying the image. Return to the existing separated ensemble for the reveal. Acceptance: the key operation is understandable in a phone-size still without its caption. Evidence: [03](03-giza-build-desktop.png), t=0.35; [04](04-giza-raising-desktop.png), t=0.62. This is a cinematographic recommendation, not evidence that the engine's operation is wrong.
3. **Improve midtone and material separation.** Reduce near-scene haze, retain neutral limestone in the warm grade, and give the ramp surface a less regular earth texture while preserving its geometry/contact contract. Acceptance: pyramid, ramp, quarry and greenbelt remain distinct at build/reveal. Evidence: [03](03-giza-build-desktop.png), t=0.35; [06](06-giza-reveal-desktop.png), t=1.

**Twitter verdict:** a recognizable, coherent diorama with a usable wide reveal. The current portrait presentation undercuts the construction story; it is not yet a polished Civ-style movie still at the project's stated release bar. Visual review cannot certify its motion.

## Stonehenge

| Category | Score | Current image evidence |
|---|---:|---|
| Composition | 2 | Ring and solstice axis are centered, but the opening operation occupies a small dark patch and the final view gives more emphasis to empty ground and sky than stone detail. [07](07-stonehenge-upright-desktop.png), t≈0.083; [09](09-stonehenge-solstice-desktop.png), t=0.82. |
| Silhouette | 2 | The mid-build trilithons are distinct; at the solstice/reveal the stones merge into a dark central band. [08](08-stonehenge-lintels-desktop.png), t=0.58; [11](11-stonehenge-reveal-desktop.png), t=1. |
| Material readability | 1 | Sarsens read as fairly uniform gray prisms at 0.58, and front-facing surface detail is lost at the reveal. [08](08-stonehenge-lintels-desktop.png), [11](11-stonehenge-reveal-desktop.png). |
| Lighting | 1 | Long shadows and visible sun express alignment, but exposure favors sky over the actual stones. [09](09-stonehenge-solstice-desktop.png), t=0.82; [11](11-stonehenge-reveal-desktop.png), t=1. |
| Environment depth | 1 | Repeated ball-canopy trees and a pale ridge/fog strip give the downs a sparse prototype appearance; there is little middle-distance structure. [07](07-stonehenge-upright-desktop.png), t≈0.083; [08](08-stonehenge-lintels-desktop.png), t=0.58. |
| UI restraint | 0 | The portrait caption physically intersects the quote; both cover the central monument. [10](10-stonehenge-solstice-portrait.png), t=0.82. |
| Visual operation legibility | 1 | An A-frame and tilted stone can be located early, but the operation is small and dark; later available frames primarily explain the result. [07](07-stonehenge-upright-desktop.png), t≈0.083; [08](08-stonehenge-lintels-desktop.png), t=0.58. |
| Construction causality; motion clarity | N/A | No uninterrupted upright rotation, crib lift, traverse or seating sequence was viewed. |

Top three improvements:

1. **Fix portrait collision and text dominance.** Give the chapter sentence and long quote mutually exclusive display zones or progressive disclosure; extend the existing compact chapter approach to this scene if appropriate. Acceptance: no text/text overlap at t=0.82 and the ring stays visible with controls awake at 390×844. Evidence: [10](10-stonehenge-solstice-portrait.png). This is a defect, not an aesthetic preference.
2. **Light the stones while preserving solstice shadows.** Raise the readable stone midtones through balanced sky fill/material response; retain the sun position and long axis shadows. Acceptance: lintels, uprights and gaps remain distinguishable in the actual portrait and desktop reveal. Evidence: [09](09-stonehenge-solstice-desktop.png), t=0.82; [11](11-stonehenge-reveal-desktop.png), t=1. Do not fix the image by bleaching the whole field.
3. **Bring the lifting mechanism into the story.** A closer early composition that shows A-frame, rope, tipping stone and pit together would offer greater gain than extra distant props. Acceptance: the mechanism is readable without zooming at phone size. Evidence: [07](07-stonehenge-upright-desktop.png), t≈0.083. Secondary art debt remains in the repeated tree silhouettes and pale horizon, visible in [08](08-stonehenge-lintels-desktop.png), t=0.58.

**Twitter verdict:** the solstice beat has a clear idea and expressive shadows, but the current phone frame is not presentation-ready. Fix the collision and stone exposure before using this as a flagship film or social preview. It does not meet the still-image release bar.

## Colosseum

| Category | Score | Current image evidence |
|---|---:|---|
| Composition | 2 | The ellipse is a strong central subject and the interior is visible; portrait crops the left perimeter and overlays most of the facade with quote text. [14](14-colosseum-late-desktop.png), [15](15-colosseum-late-portrait.png), t=0.86. |
| Silhouette | 3 | Three arched tiers, solid attic and elliptical bowl read clearly; the reveal is recognizably the Colosseum. [16](16-colosseum-reveal-desktop.png), t=1. |
| Material readability | 2 | Arcade joints and stone surfaces are visible, but strong repetition and broad smooth seat/attic bands keep the model schematic. [14](14-colosseum-late-desktop.png), t=0.86; [16](16-colosseum-reveal-desktop.png), t=1. |
| Lighting | 2 | Warm side light separates arcade relief and seating; the unrelated beige/blue background break dominates the upper image. [14](14-colosseum-late-desktop.png), t=0.86; [16](16-colosseum-reveal-desktop.png), t=1. |
| Environment depth | 1 | Current neighborhoods are present, but the hard horizon, repeated separated apartment blocks and flat brown valley make the city read as placed props. [12](12-colosseum-build-desktop.png), t=0.32; [16](16-colosseum-reveal-desktop.png), t=1. |
| UI restraint | 1 | Caption/quote do not physically collide in the portrait checkpoint, but they cover the arena rim and facade. [15](15-colosseum-late-portrait.png), t=0.86. |
| Visual operation legibility | 1 | Tall capped timber towers and vivid red crews are obvious; the caption's treadwheel crane, its load and receiving contact are not comparably legible in the 0.58 still. [13](13-colosseum-vaults-desktop.png). This does not prove a crane is absent from the animation. |
| Construction causality; motion clarity | N/A | No complete wagon/crane/centering sequence was viewed. |

Top three improvements:

1. **Remove the hard horizon break.** Match the rendered far terrain/fog/sky transition and inspect the actual camera at all checkpoints in both aspect ratios. Acceptance: no straight beige/blue boundary at t=0.32, 0.58, 0.86 or 1. Evidence: [12](12-colosseum-build-desktop.png) through [16](16-colosseum-reveal-desktop.png). This directly addresses an observed artifact; its implementation cause remains undiagnosed by this visual role.
2. **Stage one unmistakable crane lift.** Frame the wheel, rope, masonry load and receiving arcade together; reduce visual competition from the repeated scaffold towers. Preserve human/structure dimensions and use camera/material separation to clarify labor. Acceptance: a viewer can point to what is lifting what without relying on the prose. Evidence: [12](12-colosseum-build-desktop.png), t=0.32; [13](13-colosseum-vaults-desktop.png), t=0.58.
3. **Recover the portrait facade.** Move/disclose quote and chapter content within shared safe areas and slightly adjust portrait framing so the whole oval reads with margin. Acceptance: no left-perimeter crop at the late hold and a substantial unoccluded run of arcade. Evidence: [15](15-colosseum-late-portrait.png), t=0.86. Secondary art priority: connect city blocks through streets and varied lot edges before adding more identical buildings; their repetition is visible in [16](16-colosseum-reveal-desktop.png), t=1.

**Twitter verdict:** the strongest immediately recognizable completed stone monument in the inspected frames, with a proper stadium interior. The horizon seam is conspicuous enough to fix before showcasing it; current portrait typography also weakens the result. It does not meet the complete visual release bar.

## Eiffel Tower

The current sunrise ending is intentional: `specs/47-eiffel-night-to-sunrise.md` lines 1–3 supersede the older night-reveal wording in Spec 04. The daylight endpoint is not reported as a defect.

| Category | Score | Current image evidence |
|---|---:|---|
| Composition | 2 | Closeups make the lifting frame large, and the later tower is vertically framed, but foreground braces cross the operation; portrait quote/rail cover the first platform and feet. [17](17-eiffel-first-lift-desktop.png), t=0.12; [18](18-eiffel-aligning-desktop.png), t=0.22; [22](22-eiffel-reveal-portrait.png), t=1. |
| Silhouette | 2 | Four-leg spread and platforms read at 0.58; the slender upper lattice loses contrast against the pale sky at 0.86/1. [19](19-eiffel-platform-desktop.png), [20](20-eiffel-upper-desktop.png), [23](23-eiffel-reveal-desktop.png). |
| Material readability | 2 | Close structural members and black lifting equipment are distinguishable, but distant iron reads like a light wire drawing beside strongly repeated solid city blocks. [18](18-eiffel-aligning-desktop.png), t=0.22; [23](23-eiffel-reveal-desktop.png), t=1. |
| Lighting | 2 | Blue/clouded opening and warmer endpoint supply a legible change; the final upper shaft lacks tonal separation from the atmosphere. [17](17-eiffel-first-lift-desktop.png), t=0.12; [23](23-eiffel-reveal-desktop.png), t=1. |
| Environment depth | 2 | Quays, river, streets, exhibition halls and city provide the richest connected context in this capture set, but identical blocks and polygon canopy rows are conspicuous at wide scale. [19](19-eiffel-platform-desktop.png), t=0.58; [23](23-eiffel-reveal-desktop.png), t=1. |
| UI restraint | 1 | Desktop closeup caption is clearly separated at upper right, a useful pattern. Portrait late/reveal keeps a tall chapter list with a prominent gold scrollbar and places quote/transport over the tower. [17](17-eiffel-first-lift-desktop.png), t=0.12; [21](21-eiffel-upper-portrait.png), t=0.86; [22](22-eiffel-reveal-portrait.png), t=1. |
| Visual operation legibility | 2 | Crane boom, cable and platform are much easier to locate than in the other films, but surrounding diagonal iron masks the carried member/receiving joint, especially at alignment. [17](17-eiffel-first-lift-desktop.png), t=0.12; [18](18-eiffel-aligning-desktop.png), t=0.22. |
| Construction causality; motion clarity | N/A | No continuous hoist/transfer/seating sequence was watched by this reviewer; load travel and timing remain unverified. |

Top three improvements:

1. **Clear the sightline to the payload and joint in the existing closeups.** Adjust the camera position/target around foreground braces so the load, hook/cable and receiving structure remain separable. Do not remove structural iron or inflate the payload. Acceptance: at both 0.12 and 0.22, a phone-size crop can identify the moving member and the destination without the caption. Evidence: [17](17-eiffel-first-lift-desktop.png), [18](18-eiffel-aligning-desktop.png). This is a framing weakness, not a claim of incorrect physics.
2. **Give the upper tower stronger tonal presence in the wide/reveal.** Tune iron material response, atmospheric contrast and sunlight direction/intensity together; preserve authored member dimensions and the accepted sunrise. Acceptance: upper shaft remains readable when the image is reduced to a social-feed size, without relying only on platform slabs for identity. Evidence: [20](20-eiffel-upper-desktop.png), t=0.86; [22](22-eiffel-reveal-portrait.png), [23](23-eiffel-reveal-desktop.png), t=1.
3. **Use the compact mobile chapter treatment through late film/reveal and protect the tower's lower half.** Keep the quote readable but place it outside the first-platform work/silhouette zone, and make the rail less visually dominant over the feet. The current visible gold scrollbar is interface chrome, not a scene artifact. Acceptance: the completed tower has a continuous unobscured silhouette at 390×844 with controls awake. Evidence: [21](21-eiffel-upper-portrait.png), t=0.86; [22](22-eiffel-reveal-portrait.png), t=1. Retest 320×844 separately; no capture of that width was supplied.

**Twitter verdict:** the best candidate for a construction-focused teaser because the actual lifting equipment has a close view and the world has substantial context. Still, the current alignment view makes the viewer look through structural clutter, and the wide finale loses iron contrast. Treat it as a promising public work in progress until the operation's continuous motion and the phone layout pass; this still review does not grant the project's full release score.

## Home and catalog

The illustrated wordmark is distinctive and the four On site entries are explicit in the current catalog ([01-home-desktop.png](01-home-desktop.png), ambient time unspecified; [02-catalog-desktop.png](02-catalog-desktop.png), ambient time unspecified). Preserve the owner-directed mark and title placement. The button and smaller catalog metadata are relatively low contrast against the warm scene, a polish opportunity visible in these stills; no numerical contrast/accessibility failure is claimed. The lower production list extends below the desktop capture, so this image alone cannot certify scrolling or keyboard behavior.

## Verification required after improvements

- Re-capture the exact checkpoints cited above with chrome awake, plus clean playing frames. The text systems must work in both states.
- Watch supported operations uninterrupted on desktop and phone, including delivery, lifting and contact; seeked stills cannot earn the causality score.
- Capture full endpoint/hold shots on 390×844 and Eiffel's required 320×844 width; do not treat one portrait checkpoint as all-device coverage.
- Re-score against Spec 04 only after those checks. Do not infer performance, audio quality, historical accuracy or production deployment readiness from this report.
