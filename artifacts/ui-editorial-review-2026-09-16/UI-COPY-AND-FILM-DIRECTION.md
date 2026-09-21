# WonderForge — UI copy and film direction

Editorial review · 16 September 2026 · Implementation brief for the next coding agent

## The recommendation

**Give the opening the restraint of a major historical game's title screen.** One evocative line can establish the premise. The controls and historical explanations should remain clear and specific.

The current copy repeatedly announces the obvious, uses technical language without explanation, and tries to manufacture awe. Use poetry where it introduces an idea: these familiar monuments once existed only as unfinished work. Avoid surrounding that idea with more promotional sentences.

Replace both the current slogan and its technical supporting paragraph with this opening:

> **WonderForge**
>
> Before they were wonders.
>
> **Browse films**

The line invites the viewer into the monuments' unfinished past. It leaves the transformation to the film instead of describing the medium. Do not add an explanatory subtitle underneath it. Make the brand the semantic page heading and set the tagline beneath it, with space around the two. Keep reconstruction notes in About. The page title can simply be **WonderForge**.

Reject these phrases in the previous proposed direction as well: “the world’s great landmarks take shape,” “stone faces catching the desert light,” “frame the turning of the seasons,” and “An iron landmark, piece by piece.” They add mood without useful information. The revised instructions below supersede any earlier recommendation to retain them.

This document proposes changes; no application code, specifications, narration files, or existing user work was modified during this review.

## Scope and evidence

Inspected the running local preview at `http://127.0.0.1:5589/`, using the in-app browser, plus current UI, caption, narration, and wonder-data source files. Read the current UI/film specifications and recent handoff entries. Two parallel source reviewers covered interaction copy and documentary editing.

The public gallery currently offers Giza, Stonehenge, Colosseum, and Eiffel. Its other six entries are visible but unavailable. This review covers their gallery treatment, not full films for those unpublished entries. Detailed Eiffel text was inspected in source; the public three-minute film was inspected in the browser.

| Step | Surface inspected | Assessment | Evidence |
|---|---|---|---|
| 1 | Opening title | Generic slogan; technical supporting copy and inaccurate duration promise | [Desktop](02-home-desktop.png), [narrow screen](11-mobile-home.png) |
| 2 | Gallery | Clear grouping; labels read like internal production status | [Desktop](03-gallery.png), [phone-sized viewport](10-mobile-gallery.png) |
| 3 | Eiffel chapters and controls | Good picture-led structure; some copy contradicts the authored action | [Controls and active caption](04-eiffel-controls.png) |
| 4 | Eiffel information panel | Useful secondary reading; florid description and mixed historical/present-day context | [Information panel](05-eiffel-facts.png) |
| 5 | Eiffel final-frame seek | Restrained closing composition; player language could be clearer | [Final-frame seek](06-eiffel-ending.png) |
| 6 | Giza playback | Quote, construction caption, chapter list, and controls compete for reading attention | [Paused at approximately 44%](07-giza-reading-load.png) |
| 7 | Stonehenge playback | Long humorous quotation dominates a contemplative construction film | [Paused at approximately 73%](08-stonehenge-quote.png) |
| 8 | Colosseum playback and chapter text | Architectural specificity is valuable; several sentences require specialist vocabulary | [Paused at approximately 29%](09-colosseum.png) |

Desktop captures used a 1440 × 900 viewport; phone-sized checks used 390 × 844. Desktop captures show softened UI text in this capture environment: use them for composition, not a diagnosis of production font rendering. Exact wording was cross-checked against accessibility text and source. This was a sampled editorial review, not uninterrupted playback of every film, an audio listening certification, a physical-device test, or a full accessibility audit. Loading was observed briefly; recovery/error wording was reviewed in source without deliberately causing failures. The ending capture was reached by scrubbing, so it does not verify automatic completion/replay state.

## 1. Editorial rules

- **Opening:** use one evocative line, **Before they were wonders.** Give it the composure of a title screen; do not stack a second slogan or explanatory paragraph beneath it.
- **Controls:** plain and predictable. Use Play, Pause, Chapters, Music, Narration, and About this wonder.
- **Captions:** explain something useful about the work. If the sentence merely repeats what is obvious in the picture, consider removing it. Silence is an editorial choice, not missing content.
- **History:** distinguish documented information from this film's reconstruction. Do not imply that an inferred building method is settled fact.
- **Tone:** poetic restraint at the opening; ordinary, specific English in controls and explanations. No promotional superlatives or obligatory poetic ending for every caption.
- Read every proposed line aloud. Would a knowledgeable person actually say it? Could the same sentence appear on a hotel, AI demo, or travel-ad landing page with one noun changed? If so, rewrite or delete it.
- Use sentence case in authored strings; let typography provide emphasis. Reserve the display typeface for names and short headings, and use the body face for explanatory sentences.
- Avoid implementation terms such as “procedural,” “physical construction diorama,” “beats,” and “seated assembly” in ordinary viewing controls.
- Do not replace authentic quotations with invented lines attributed to historical people. Verify an original source before changing an attribution or publishing a shortened excerpt.

## 2. First pass: exact UI replacements

These are the safest, highest-return changes. Source paths below are relative to the WonderForge repository; line numbers identify the reviewed snapshot and may move.

### Opening and gallery

| Location | Current | Recommended | Reason |
|---|---|---|---|
| `src/ui/Hero.tsx:9` | World wonders, built before your eyes | **Before they were wonders.** | Invites the viewer into the monuments' unfinished past. Make the brand the page heading and place this line beneath it. |
| `src/ui/Hero.tsx:12` | Construction cinematics, rebuilt as procedural 3D dioramas — from bare ground to glory in one minute. | **Delete the supporting paragraph.** | The tagline and Browse films button are sufficient; do not add a second explanation. |
| `src/ui/Hero.tsx:19` | Enter the gallery | **Browse films** | Says what the button does. |
| `src/ui/Gallery.tsx:40` | Ready | **Watch now** | Frames availability around the visitor's action. |
| `src/ui/Gallery.tsx:67` | In progress | **In production** | Makes clear that the films, rather than the ancient monuments, are unfinished. |
| Below the second gallery heading | No explanation | **Do not add a sentence by default.** | “In production” already explains the group. Add help only if testing finds real confusion. |
| `index.html`, description metadata | Civ VI-style World Wonder construction cinematics, rebuilt for the web. | **Animated reconstructions of the pyramids of Giza, Stonehenge, the Colosseum and the Eiffel Tower under construction.** | Describes the available content without promotional language. Keep this list synchronized with published films. |
| `index.html`, page title | WonderForge — World Wonders, Built Before Your Eyes | **WonderForge** | Removes the rejected slogan from browser tabs and search titles too. |

Preserve the current four/six split, chronology, disabled rows, and stable wonder IDs. “In production” is a wording change, not an instruction to publish the other films. Keep the recently removed catalog disclaimer/footer removed.

### Player labels

| Location | Current | Recommended |
|---|---|---|
| `src/ui/CaptionBeatIndex.tsx:90` accessible group | Construction beats | **Film chapters** |
| `src/ui/CaptionBeatIndex.tsx:124` chapter button | Jump to {title} | **Play from {title}** during normal playback; use a label consistent with the actual reduced-motion behavior instead of promising playback there. |
| `src/ui/TransportBar.tsx:72` slider label | Seek | **Film position** |
| `src/ui/TransportBar.tsx:88` | Replay | **Replay film** |
| `src/ui/TransportBar.tsx:109` | Wonder facts | **About this wonder** |
| `src/ui/FactsPanel.tsx:19` | Close facts | **Close information panel** |
| `src/ui/CinematicView.tsx:173` wordmark | WonderForge, with no destination in its accessible name | Keep visible wordmark; add **WonderForge, back to films** as its accessible name. |
| `src/ui/Gallery.tsx:28` | WonderForge, back to title | **WonderForge, back to introduction** |
| `src/ui/CaptionVoiceToggle.tsx:27` | Enable narration / Disable narration | **Turn narration on / Turn narration off** |
| `src/ui/TransportBar.tsx:125` spoken speed label | {value}× speed | **Playback speed: {value} times**; keep visible `1×`, `2×`, `4×`. |
| `src/render/three/ThreeCanvas.tsx:176` scene label | {name} physical construction diorama | **Animated construction of {name}** |

Keep Play, Pause, Previous wonder, Next wonder, and Chapters. They already explain their actions. Keep “3 min film”: it is accurate for public Eiffel. Avoid changing every string simply to make the pass look comprehensive.

**Implementation trap:** `src/ui/eiffelCinematicLayout.css` selects `[aria-label='Cinematic controls']`. Do not casually rename that group; if changing it, migrate styling to a stable class/data attribute in the same change.

### Loading and recovery

| Location | Current | Recommended |
|---|---|---|
| `ThreeCanvas.tsx:191` generic loading heading | Preparing your journey | **Loading {wonder name}…** |
| `ThreeCanvas.tsx:196` | Preparing scene | **Loading…** as a fallback status; do not display it beside a heading that already says the same thing. |
| `ThreeCanvas.tsx:214` helper | Models, city and construction details | **Delete.** The progress indicator already explains the wait. |
| `ThreeCanvas.tsx:224` failure | The {name} model could not be loaded. | **We couldn’t load this scene.** |
| `ThreeCanvas.tsx:229` recovery action | Reload scene | **Reload page** |

“Reload page” describes the existing `window.location.reload()` action. A narrower “Retry loading” action would require an implementation change.

For Eiffel's measured loading categories, use plain nouns beneath the loading heading: **City**, **Ironwork**, **Lifting frames**, **Joints**, **Fastenings**, **First platform**, **Steam winch**, **Upper platforms**, **Summit**, then **Starting film…**. The category explains current progress; it needs no extra decorative sentence. **Delete “An iron landmark, piece by piece.”**

Category strings in `src/render/three/EiffelWorld.ts:159` also act as pending-set keys. Update both insertion and completion strings, or separate stable keys from display copy. Synchronize `ThreeCanvas.tsx` fallbacks. Keep actual progress accounting and first-ready-frame dismissal intact; these wording changes must not alter readiness behavior.

## 3. Eiffel: correct the story to match the pictures

**Priority: high.** The current joint caption says “workers align the plates and tighten the bolts.” The current authored short-film sequence explicitly omits that worker/tool action and shows the whole iron member moving into place. See `src/ui/eiffelChapterCaptions.ts:26` and `specs/46-eiffel-progress-story.md:37–43`.

The relay sentence also implies a continuous freight route toward the summit. The spec explicitly records the omission of freight above the second-floor receiver (`specs/46-eiffel-progress-story.md:85–90`). Do not repair that mismatch by promising more in the narration.

Recommended six-caption script, preserving IDs and current short-film windows:

| Stable ID and window | Current title | Proposed title | Proposed spoken/displayed sentence |
|---|---|---|---|
| `eiffel-lift-prepared`, 15–23 s | At the foot of the tower | **The first lift** | **A lifting frame raises an iron section from the ground.** |
| `eiffel-lift-later`, 24–32 s | Work around the tower | **The four legs** | **Crews work on all four legs of the tower.** |
| `eiffel-joint-prepared`, 34–42 s | An iron joint | **Aligning the iron** | **A crane turns the next iron section and lowers it into position.** |
| `eiffel-joint-later`, 44–52 s | Four pylons, one tower | **The lower structure** | **The four legs will meet at the first platform.** |
| `eiffel-relay-prepared`, 72–80 s | From platform to platform | **The first platform** | **An iron section arrives at the first platform, ready for the next lift.** |
| `eiffel-relay-later`, 144–152 s | Above Paris | **The upper tower** | **The frame narrows above the second platform.** |

These are plain replacements if the six existing spoken slots are retained. In a separate edit, test removing the second and final spoken lines: both may be unnecessary when the shot is clear. Keep their chapter navigation available. Removing narration/overlays requires an explicit change to cue selection and verification; do not leave empty audio files or silently remove stable IDs.

Source: `src/ui/eiffelChapterCaptions.ts:20–32`; windows: `src/engine/eiffelFilmEdit.ts:56–62`. These lines are editorial proposals against the current shot plan. Watch each complete window at 1× before recording; do not assume a matching still proves every verb across the entire sentence.

The copy object currently feeds both Cinematic and Detailed editions. Check both. If one sentence cannot truthfully describe both pictures, create edition-specific copy and audio bindings instead of making the short film's wording a regression for Detailed.

Detailed-only navigation can also become plainer: “Receiving on the second floor” → **The second-floor lift**; “The final summit lift” → **Installing the mast**; “The final assembly is seated…” → **The last section is in place.** These are source-reviewed secondary recommendations, not browser-verified Detailed playback.

## 4. Other films: selected caption improvements

Keep the specialist knowledge, but translate it into something a visitor can understand while watching moving images. The sentences below are proposed replacements, not independently verified historical transcripts. Preserve the existing uncertainty where a mechanism is reconstructed. The source locations make each change reviewable.

| Film / source in `src/data/captions.ts` | Existing wording to address | Proposed heading and sentence |
|---|---|---|
| Giza, lines 43–44 | “Blocks are won…” | **The quarry** — Stone comes from the plateau; white casing stone arrives from Tura. |
| Giza, lines 51–52 | “Sledges run on wetted roads…” | **The haul** — Water on the sand helps crews pull the loaded sledges. |
| Giza, lines 59–60 | Ramps described as a definitive historical method | **Raising the stone** — In this reconstruction, ramps carry stones to each new level. |
| Giza, lines 75–76 | “One building day stands for three reigns.” | **The three pyramids** — The film shows three reigns in a single day. This explains time compression; do not turn it into a poetic sign-off. |
| Stonehenge, lines 93–94 | “Sarsen faces were dressed… before the haul.” | **Shaping the stones** — Hammerstones shape the faces of the great sarsen stones. |
| Stonehenge, lines 109–110 | “Each upright is rotated into a ramp-sided pit…” | **Raising the uprights** — Here, each upright tips into a sloping pit before rubble secures its base. |
| Stonehenge, lines 117–118 | “Timber platforms are a likely way…” | **Lifting the lintels** — The film uses timber platforms to raise the lintels. |
| Stonehenge, lines 125–126 | “The Axis”; sentence fragment | **Solstice alignment** — The stones align with the midsummer sunrise and midwinter sunset. |
| Colosseum, lines 184–185 | “stands on Nero’s drained lake between Palatine and Caelian” | **The site** — The amphitheatre was built on the site of Nero’s drained lake. |
| Colosseum, lines 200–201 | “Treadwheel cranes of the Haterii type…” | **Lifting the blocks** — In this reconstruction, treadwheel cranes lift blocks to each new level. |
| Colosseum, lines 208–209 | “Timber centering carries opus caementicium vaults over the radial walls.” | **The vaults** — Timber supports hold the vaults during construction. |
| Colosseum, lines 216–217 | “Eighty arched bays stack three classical orders under a fourth attic storey.” | **The outer walls** — Three tiers of arches rise beneath the solid upper wall. |

“Centering,” the Latin concrete term, and classical orders can be explained in About, where visitors control their reading time. Avoid forcing an architecture glossary into a six-second passage.

The Stonehenge solstice wording is supported by [English Heritage's explanation of the alignments](https://www.english-heritage.org.uk/visit/places/stonehenge/things-to-do/solstice/what-is-the-winter-solstice/). Other historical lines above retain or qualify existing project claims; their source audit remains a pre-publication task rather than an assertion that this review validated every fact.

## 5. Information panels and quotations

Use the information panel for context and evidence. A good order is: name, location/date, a few sourced facts, then optional reconstruction notes and quotation attribution. An introductory paragraph is optional. Do not write one just because the schema contains a description field.

Remove the decorative descriptions displayed from `src/data/wonders/`. Do not replace them with more scenic prose:

| File, description around line 18 | Recommended treatment |
|---|---|
| `pyramids-of-giza.ts` | Omit the introductory paragraph. Use the verified facts; distinguish the three-pyramid ensemble from the Seven Wonders designation. |
| `stonehenge.ts` | Omit the introductory paragraph. Use the facts about the stones, chronology and alignment, with appropriate sources. |
| `colosseum.ts` | Omit the introductory paragraph. Use the existing facts after source review; avoid a generic sentence about Rome or crowds. |
| `eiffel-tower.ts` | Omit the introductory paragraph. The part count, rivets and construction dates are more informative than “iron lace.” |

Remove the unused visual gap in `FactsPanel` when omitting a paragraph. Check other consumers before changing description data or types. A short factual introduction can be added later if it answers a question not covered by the facts; it is not required for this pass.

For Eiffel, simplify the present-day height fact to **“The tower opened at 312 metres in 1889. Today, including its antennas, it reaches 330 metres.”** Keep it clearly identified as historical versus present-day context; the film depicts 1889. The official tower site supports these heights and the opening year: [opening height](https://www.toureiffel.paris/en/news/history-and-culture/133-years-and-1083-feet) and [current/original figures](https://www.toureiffel.paris/fr/le-monument/chiffres-cle). Its [official construction history](https://www.toureiffel.paris/en/the-monument/history) is also the appropriate reference for the part count and assembly facts. Do not describe “antennas added 18 metres” as though that subtraction explained the full history of changes.

**Quotation treatment is an editorial decision, not a simple replacement string:**

- Stonehenge's extended Bill Bryson passage requires sustained reading and introduces a comic voice during the build. Move the full passage into the information panel, or select a genuinely sourced short excerpt for the ending. Do not silently paraphrase it inside quotation marks.
- Giza and Colosseum also display quotations throughout much of construction. Consider reserving quotations for the final reveal, with full sources in About.
- Existing author names alone are insufficient for source traceability. Add work/publication, date when known, and source URL to the data model if making attribution available in the UI.
- Check the Colosseum/Bede quotation's attribution and what the original text refers to. This review flags the question; it does not establish a corrected attribution.

## 6. Additional directing and interaction suggestions

These require behavior, layout, or information-architecture changes. Keep them separate from the first copy patch.

### A. Give each moment one main text job

Use the opening to name the monument, the construction passages to explain selected actions, and the ending to provide reflection. Giza's screenshot shows a quotation, caption, chapter index, and controls simultaneously; Stonehenge adds a much longer quotation. Text competes with the event the viewer came to see.

Recommend a separate pass that moves non-Eiffel quotations to the closing passage and preserves chapters as optional navigation. Do not change film timing, camera motion, or caption windows incidentally while editing labels. Let the final shot breathe before introducing a large next-film invitation.

### B. Show film time rather than construction percentage

Use **1:24 / 3:00** for Eiffel's viewing position. A bare percentage can mean construction completion, loading, or film progress; those are different measurements in this product. Keep percentage for genuine loading readiness. Derive elapsed/total film time from the selected duration while retaining the existing normalized timeline underneath. Add an accessible value such as **1 minute 24 seconds of 3 minutes**.

Gallery runtime labels could use **1 min film** and **3 min film**, generated from the same duration configuration. They describe runtime at 1×, not a promise at every playback speed. Do not hardcode a site-wide one-minute slogan again.

### C. Explain narration at faster speeds

At 2×/4×, captions and narration are suppressed, but the preference can still display “Narration on.” Show **Narration available at 1×** beside the control or in its explanatory text when relevant. Keep the user's enabled preference so returning to 1× restores expected behavior. Do not silently toggle it off.

Separate **Music** and **Narration** visibly or through reliable hover/focus help. A microphone icon suggests recording, although this feature only plays narration; a speech/narrator symbol would be clearer. Icon-only tooltips must work with keyboard focus, too.

### D. Use body typography for sentences

The current caption sentences use the display face. Try the existing body typeface for explanatory lines, keep display type for titles, and reduce all-cap visual density. Check contrast over both bright sky and dark ground rather than solving readability with an increasingly large opaque panel. This is a layout/typography proposal, not a measured contrast failure.

### E. Fix narrow-screen title cropping

At 390 × 844, the WonderForge wordmark extends beyond both sides of the viewport. See screenshot 11. Fit its font size and tracking to the available width while preserving the brand name. This is a small responsive correction; desktop remains the primary platform.

The desktop catalog's lower rows extend below the captured 900px viewport. Confirm they are reachable with ordinary scrolling/focus: the source enables `md:overflow-visible` inside a clipped full-height home container. Treat this as a reachability risk to reproduce, not a completed keyboard-accessibility diagnosis. The phone-sized catalog already exposes a scrollable region.

### F. Simplify repeated historical metadata

Location and date usually orient a viewer more effectively than repeated game-style era classifications. Consider **Paris, France · 1889** on the opening and catalog, keeping richer context in About. Do not change dates or wonder IDs in this cleanup. Multi-phase monuments need a deliberate chronology treatment rather than a universal “Completed in” label.

## 7. Narration is part of the copy change

Do not mark a caption rewrite complete while the old recording still speaks the old line.

1. Update the relevant spec before changing the behavior contract. Specs 41 and 46 currently preserve existing text/audio; revise those clauses explicitly for an approved narration pass.
2. Keep stable caption IDs. Update authored text, generator script input, and `src/data/narration.ts` metadata together.
3. Generate the actual replacement recordings through the existing approved offline narration workflow, using each film's assigned voice. Preserve the original recordings until the new set passes review. External generation/cost authorization must be resolved in that implementation task; this document does not authorize a paid generation run.
4. Measure each new recording. General caption padding requires at least 0.4 seconds inside its display window; all six short Eiffel windows are eight seconds. Listen to the beginning and ending at 1×. Shorten prose instead of accelerating the narrator to fit.
5. Check title-only changes too: the generator speaks headings for Giza, Stonehenge, Colosseum, and Eiffel fact tracks, even though metadata stores only the body. The six Eiffel story clips speak the body only.
6. Fix the source-reviewed generator omission before a complete Stonehenge regeneration: `stonehenge-axis` exists in captions/metadata but is missing from that track's beat list in `scripts/generate-narration.py`.
7. Verify actual audio, not just string equality and file existence. Those tests cannot establish that an MP3 contains the new words.

Key files: `src/data/narration.ts`, `scripts/generate-narration.py`, `src/ui/useCaptionVoice.ts`, `src/ui/eiffelChapterCaptions.ts`.

## 8. Implementation order and acceptance

**Pass 1 — public UI copy:** replace the slogan with **Before they were wonders.**, remove its supporting paragraph, update gallery/control labels, remove loading filler, and update metadata/page title. Preserve good standard control labels. Update Specs 01/05 where they prescribe visible labels. When removing text, adjust semantic headings and spacing deliberately.

**Pass 2 — documentary script and audio:** Eiffel mismatch first; then selected other-film captions and removal of decorative information-panel descriptions. Resolve source questions before publishing new historical assertions. Verify shared Cinematic/Detailed data and regenerate actual affected recordings.

**Pass 3 — presentation:** quotation timing, film-time display, narration availability, typography, narrow-screen wordmark, and catalog reachability. Record these as behavior/layout changes with appropriate spec revisions.

Acceptance checklist for the implementing agent:

- Every changed visible, tooltip, and accessible string uses consistent terminology.
- Four playable entries and six unavailable entries remain correctly gated; deep links and previous/next navigation retain their behavior.
- No universal one-minute claim remains in public copy or metadata.
- The rejected slogan is absent from the homepage and page title. None of the rejected replacement phrases is introduced as new UI copy.
- The opening contains the brand, **Before they were wonders.**, and **Browse films**, without an additional explanatory subtitle.
- No new sentence is added merely to fill an existing text slot. Avoid duplicate loading explanations and decorative introductions.
- Changed chapters accurately describe their complete shot windows, including the retained Detailed edition where applicable.
- Caption text, generated audio, measured durations, metadata, and generator inputs agree.
- The load percentage still reflects real readiness, and failure/reload labels describe the actual action.
- Keyboard focus, reduced motion, slider values, narration at 1×/2×/4×, and mobile wrapping receive explicit checks.
- Run the project's tests, typecheck, and build. Relevant tests include `tests/ui.test.tsx`, `tests/captions.test.ts`, `tests/narration.test.ts`, `tests/eiffel-story-narration.test.ts`, `tests/eiffel-chapter-captions.test.tsx`, `tests/eiffel-caption-voice-clock.test.tsx`, and `tests/three-canvas-readiness.test.tsx`. The full test run can use `npm run test -- --maxWorkers=2` for this geometry-heavy suite, followed by `npm run typecheck` and `npm run build`.
- Inspect the served build at desktop and a narrow viewport and listen to revised narration in real playback. A build alone does not establish editorial acceptance.

The checkout already contained many modified UI/spec files before this review. Preserve them; re-read the live diff before implementing. This review ran no tests because it changes only this brief and adds evidence images. It makes no deployment or publication claim.

## 9. Prompt to give the coding agent

> Read `artifacts/ui-editorial-review-2026-09-16/UI-COPY-AND-FILM-DIRECTION.md`, current `specs/`, and the latest `HANDOFF.md` entries. Implement Pass 1 of the recommended copy changes and its directly associated accessibility labels, preserving existing uncommitted work, route IDs, film clocks, catalog gating, and readiness behavior. Update the appropriate specifications first. Do not treat the optional directing/layout suggestions or narration rewrites as incidental string edits. For Pass 2, first prepare the exact text/audio change list, resolve source and generation requirements, then replace and listen to the actual recordings as well as updating metadata. Keep Pass 3 separately reviewable. Run the relevant checks and report which passes are complete, which recordings were actually regenerated, and what remains. Do not publish or deploy.

## 10. Selected visual evidence

### Opening — technically worded promise and an incorrect universal duration

![Opening title at desktop](02-home-desktop.png)

### Gallery — internal status language

![Desktop gallery](03-gallery.png)

### Eiffel — construction caption, optional chapters, and transport

![Eiffel working shot](04-eiffel-controls.png)

### About — secondary reading belongs here

![Eiffel information panel](05-eiffel-facts.png)

### Ending — inspected by seeking to the final frame

![Eiffel final-frame seek](06-eiffel-ending.png)

### Giza — several simultaneous text systems

![Giza text hierarchy](07-giza-reading-load.png)

### Stonehenge — the quotation competes with the picture

![Stonehenge quotation](08-stonehenge-quote.png)

### Colosseum — architectural vocabulary needs a plainer reading layer

![Colosseum playback](09-colosseum.png)

### Narrow screens — usable scrolling, cropped brand title

![Phone-sized gallery](10-mobile-gallery.png)

![Phone-sized opening title](11-mobile-home.png)
