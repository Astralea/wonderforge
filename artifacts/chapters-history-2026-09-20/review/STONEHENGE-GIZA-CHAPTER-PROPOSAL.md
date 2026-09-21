# Stonehenge and Giza: history-led chapter review

2026-09-20. Initially a read-only application audit; root subsequently accepted the proposed tracks and delegated two narrow corrections: the Stonehenge catalog's Preseli claim and Spec 10's obsolete late-lintel prose. Those corrections are applied. Root owns chapter implementation and audio generation. No audio was generated in this review. Timing evidence comes from the current pure construction graphs and production camera samplers, sampled directly in Node. Proposed windows still require actual regenerated-audio duration checks and desktop/portrait playback acceptance.

## Recommendation

Use six chapters for Stonehenge and six for Giza in the current 60-second films. This is a result of the material, not a reusable chapter quota. Stonehenge has an earlier enclosure, distinctive stone craft, two different erection operations, the smaller imported stones, and the final solar axis. Giza needs to identify the three successive royal projects while explaining the visible material supply and construction. A chapter about every tool would crowd out that historical story.

Speak the sentence only; leave the kicker on screen. At 110–125 spoken words/minute the proposals contain roughly 30–34 seconds of speech per minute, allowing the work, music, and final image to breathe. These are pacing estimates, not measured clip lengths. All generated clips must fit their individual windows with at least 0.4 seconds remaining.

## Stonehenge: exact proposed track

All six windows last 7.2 seconds. Each ordinary gap lasts 1.5 seconds; the last sentence ends at 54.9 seconds, leaving 5.1 seconds without narration.

| ID / kicker | t window / seconds | Exact spoken and caption sentence | Words / estimated speech at 125–110 wpm | Visible event and evidence |
|---|---|---|---|---|
| `stonehenge-earthwork` / Before the stones | .070–.190 / 4.2–11.4 | An earthwork enclosure stood here centuries before the great stone circle. | 11 / 5.28–6.00 s | The bank and ditch already surround early stone operations; the sentence correctly describes an earlier phase, not an excavation currently animated. [EH building history][s1] and [timeline][s3]. |
| `stonehenge-sarsens` / Shaping the sarsens | .215–.335 / 12.9–20.1 | Hammerstones shaped the sarsens; their joints echo skilled woodworking. | 9 / 4.32–4.91 s | New outer uprights are still being dressed and transported while inner lintels are assembled. Hammerstone waste and worked joints are archaeological evidence. [EH building history][s1]. |
| `stonehenge-pits` / Raising the uprights | .360–.480 / 21.6–28.8 | Here, ropes tip uprights into pits; rubble then secures their bases. | 11 / 5.28–6.00 s | Outer upright tipping/raising/packing continues across this interval. “Here” describes the film's particular mechanism; the complete rope/A-frame system remains an interpretation. [EH reconstruction][s2]. |
| `stonehenge-lintels` / Across the uprights | .505–.625 / 30.3–37.5 | The film uses timber platforms to raise the stone lintels. | 10 / 4.80–5.45 s | Outer lintel transport gives way to cribbing and hoisting. Explicitly marks the staged mechanism as a reconstruction. [EH reconstruction][s2]. |
| `stonehenge-bluestones` / Stones from Wales | .650–.770 / 39.0–46.2 | Many smaller bluestones came from the Preseli Hills in Wales. | 10 / 4.80–5.45 s | The smaller circle and then horseshoe are physically being assembled. “Many” avoids treating every stone called a bluestone as Welsh. See [EH stones guide][s4] and [Altar Stone primary research][s5]. |
| `stonehenge-axis` / The solstice axis | .795–.915 / 47.7–54.9 | These stones frame midsummer sunrise and, in the opposite direction, midwinter sunset. | 12 / 5.76–6.55 s | Camera has reached the NE–SW axis at .78; the SW sun accompanies the nearly complete setting, then the completed circle. [EH winter-solstice explanation][s6]. |

Total: **63 words**, 30.24–34.36 estimated spoken seconds. The 12-word final line leaves about 0.65 seconds at 110 wpm, but its commas may add pauses; measure the generated result.

### What this corrects

- The former bluestone window .294–.445 preceded all actual bluestone operations, which begin at .58. The former upright window .475–.611 arrived as upright work was ending.
- `src/data/stonehengeConstruction.ts:115` starts inner uprights at .025 plus stagger; the final inner lintel finishes at .339. Outer uprights start .175 through .4186 and finish by .5236 (`:150`). Outer lintels run .48–.7675 (`:191`). Bluestones run .58–.828 (`:225`).
- Direct state samples: at .38, outer uprights are hauled, tilted, raised, and packed; at .58, outer lintels are cribbed/hoisted while the first bluestone is only rough; at .70 both outer lintels and smaller stones are active; at .84 all 135 stones are seated. `src/engine/stonehengeConstruction.ts:435` provides the sampled operation states.
- `src/engine/stonehengeCamera.ts:28` reaches the alignment shot at .78 and holds it through the ending. Do not retain Spec 10's stale “central trilithon lintel rises late in BUILD” signature-shot claim (`specs/10-stonehenge-reference-scene.md:88`); that event actually ends much earlier.
- The graph's order is a readable construction staging, not a claim that Welsh stones arrived historically after all sarsens. The English Heritage chronology allows earlier bluestone settings and later rearrangement. The script deliberately avoids “then the bluestones arrived.”
- `src/data/wonders/stonehenge.ts` repeats the blanket Preseli provenance claim in its catalog facts. Qualify that text too. English Heritage's older Building Stonehenge page contains outdated Welsh Altar Stone provenance; its newer stones guide and the 2024 research supersede that detail. Do not copy the older page indiscriminately.
- The authored sky combines the two solstice directions in one film. The final line explains the axis, without asserting sunrise and sunset at those two positions happened on one astronomical date. No new chapter about an Altar Stone is warranted unless the actual model and shot support it.

## Giza: exact proposed track

| ID / kicker | t window / seconds | Exact spoken and caption sentence | Words / estimated speech at 125–110 wpm | Visible event and evidence |
|---|---|---|---|---|
| `giza-khufu` / Khufu's pyramid | .070–.190 / 4.2–11.4 | Khufu's tomb rises first, built from limestone quarried on this plateau. | 11 / 5.28–6.00 s | Khufu foundation courses and supply operation are the camera's first subject. [Egypt Ministry: Great Pyramid][g1]. |
| `giza-roads` / The haul | .215–.335 / 12.9–20.1 | In this reconstruction, damp sand eases the passage of loaded sledges. | 11 / 5.28–6.00 s | The operation close view holds through .24 and pulls back through .30 while sledges continue. Experimental physical support, explicitly framed as reconstruction: [University of Amsterdam Institute of Physics][g5]. |
| `giza-ramps` / Raising the stone | .360–.480 / 21.6–28.8 | Here, ramps and levers raise each stone into place. | 9 / 4.32–4.91 s | Khufu's upper work is actively being delivered, raised, aligned and seated. “Here” refers to the visible authored ramp system; it does not claim a proven complete Khufu construction method. |
| `giza-khafre` / Khafre's pyramid | .545–.675 / 32.7–40.5 | Khafre, Khufu's son, builds the second great pyramid on higher ground. | 11 / 5.28–6.00 s | Khafre construction is underway; the .50–.58 camera handoff lands on this second project. Its modeled groundY is 1.35 versus Khufu's 0. [Egypt Ministry: Khafre complex][g2]. |
| `giza-casing` / White limestone | .700–.820 / 42.0–49.2 | White casing stone came by water from the quarries at Tura. | 11 / 5.28–6.00 s | Bright exterior courses rise on Khafre while Khufu is complete. The line describes material supply, not a newly depicted boat delivery. [Egypt Ministry: Great Pyramid][g1]; primary Khufu-period shipping evidence in [Merer's diary][g4]. |
| `giza-menkaure` / Menkaure's pyramid | .845–.935 / 50.7–56.1 | Menkaure's pyramid follows: three royal tombs, three separate reigns. | 9 / 4.32–4.91 s | Actual Menkaure construction starts .8443676 and finishes .905 as the camera opens to the ensemble. [Egypt Ministry: Giza Plateau][g3] and [Menkaure complex][g6]. |

Total: **62 words**, 29.76–33.82 estimated spoken seconds. Final line has a 5.4-second window and approximately 0.49 seconds spare at 110 wpm; measure its actual recording. Final quiet hold is 3.9 seconds. The two colons/commas may create longer model pauses than a word-count estimate predicts.

### Historical and visual boundaries

- Direct graph sampling gives Khufu .03–.5003076775; Khafre .5003076775–.8443675519; Menkaure .8443675519–.905. The graph actually stages three projects, whereas the former generic five process captions did not identify the handoffs.
- `src/engine/gizaCamera.ts:71` hands off Khufu→Khafre at .50–.58, Khafre→Menkaure at .80–.86, and expands to the ensemble at .88–.96. The final proposed line covers Menkaure's actual short build and the ensemble reveal.
- Wet-sand research is an experiment supporting physical plausibility, not a diary documenting this exact Khufu work site. The much-discussed transport image is later than Khufu. Do not turn the proposed qualified line back into a direct eyewitness historical assertion. No active pouring action was established by this code audit; if strict shot-literal narration is preferred, use: “Crews pull loaded sledges along the prepared roads to the pyramid.”
- The Tura diary is evidence for Khufu's stone transport, not documentation of every shipment to every Giza pyramid. The proposed sentence is generic; the source note should retain that distinction. The scene does not currently model an independently verified Nile shipping sequence. If a tighter source/shot pairing is preferred, move Tura history to the earlier Khufu section rather than adding a new river mechanism for the caption.
- “Three separate reigns” makes the historical compression explicit without an invented exact number of years. Avoid implying all three were raised in a literal single day.
- No new expert quotations are proposed. All twelve lines are original factual paraphrases or explicit descriptions of the film. Existing Bill Bryson and Napoleon catalog quotations are separate from this archaeological evidence; this audit does not newly authenticate their exact editions/wording.

## Remove quota assumptions without removing useful contracts

At audit start, there was no literal five-count assertion governing these three tracks. The important inherited constraints were instead:

1. `tests/captions.test.ts:9`: minimum two beats; initial `lastUntil=.12` and mandatory .03 gaps force first caption to .15; minimum .08 window; every caption ending by .88; 40–120 characters. These are global timing/copy assumptions, not historical requirements. Replace with valid bounds, ordering, non-overlap, deliberate breathing space, and per-track opening/final-hold acceptance. Do not replace five with a global six/seven quota.
2. `tests/captions.test.ts:55`: Giza assumed no caption at .9. Use a point outside the authored windows or assert the intended track-specific quiet ending.
3. `specs/05-ui.md` originally suggested “three to seven” documentary faces. Root's concurrent edits now correctly state there is no quota or inherited schedule. `specs/02-animation-engine.md` already made count per wonder. Historical HANDOFF mentions of “five Colosseum beats” record an old state; they are not a current authoring rule.
4. `src/ui/CaptionBeatIndex.tsx` already renders arbitrary `beats.map()` entries, but its bounded scrolling and active-row scroll logic were Eiffel-only. Generalize those layout protections for any longer chapter list; retain mobile disclosure.
5. `QuoteOverlay.tsx` previously assumed title through .15 and quote from .9. Root's concurrent adaptation now derives the title handoff and final quote from the first/last authored beats. Verify those boundaries in both desktop and portrait, including chapter seek and resumed narration.
6. `tests/narration.test.ts` correctly checks one clip per authored beat, body-text equality, and measured duration +.4 seconds within each window. Preserve these. Its `voices.size===5` assertion means five distinct narrators, not five chapters. Eiffel's independent five fact clips are outside this three-film rewrite.
7. The current file-name regex permits only a single lowercase suffix after `giza-george-` / `stonehenge-daniel-`. The proposed IDs can use `khufu`, `roads`, `ramps`, `khafre`, `casing`, `menkaure`, and `earthwork`, `sarsens`, `pits`, `lintels`, `bluestones`, `axis` without changing that naming rule. More descriptive hyphenated suffixes would require a matching regex update.

## Voice pipeline handoff

Preserve George for Giza (`JBFqnCBsd6RMkjVDRZzb`) and Daniel for Stonehenge (`onwK4e9ZLuTAKqWW03F9`), using the existing ElevenLabs `eleven_multilingual_v2` offline path. The existing script uses stability .6, similarity .75, style .25, speaker boost, and speed .92 for both voices. It normalizes the local MP3s to -16 LUFS / -1.5 dB true peak, then measures durations with ffprobe. No provider call belongs in the browser.

At audit start `scripts/generate-narration.py` prepended kickers for both these tracks, while `NarrationClip.captionText` and its tests claimed body-verbatim speech. Generate exactly the proposed body this time. Do not infer actual words from the typed metadata alone, and do not reuse old durations for new content. Check audible final words, pause/resume, chapter seek, and the last quiet hold after synthesis. Body-only text preserves the present metadata contract and avoids spending 1–2 seconds reading an already-visible label.

## Primary and official sources checked

[s1]: https://www.english-heritage.org.uk/visit/places/stonehenge/history-and-stories/building-stonehenge
[s2]: https://www.english-heritage.org.uk/visit/places/stonehenge/history-and-stories/stonehenge-reconstructed/
[s3]: https://www.english-heritage.org.uk/visit/places/stonehenge/history-and-stories/timeline
[s4]: https://www.english-heritage.org.uk/visit/places/stonehenge/things-to-do/stone-circle/stones-of-stonehenge
[s5]: https://www.nature.com/articles/s41586-024-07652-1
[s6]: https://www.english-heritage.org.uk/visit/places/stonehenge/things-to-do/solstice/what-is-the-winter-solstice/
[g1]: https://egymonuments.gov.eg/monuments/the-great-pyramid/
[g2]: https://egymonuments.gov.eg/monuments/pyramid-complex-of-khafre-khefren/
[g3]: https://egymonuments.gov.eg/archaeological-sites/giza-plateau/
[g4]: https://www.ifao.egnet.net/uploads/publications/divers/MIFAO136_ann_01.pdf
[g5]: https://iop.uva.nl/content/news/2014/00/prl-egyptian-pyramids.html
[g6]: https://egymonuments.gov.eg/monuments/pyramid-complex-of-menkaure/

Sources were used as attributed evidence, not as scripts to copy verbatim. The Altar Stone paper is original research; the institutions' archaeology/museum pages are official curatorial interpretations. Reconstruction methods remain labeled as such even when an official illustration uses them.
