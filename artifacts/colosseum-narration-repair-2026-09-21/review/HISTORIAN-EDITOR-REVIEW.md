# Colosseum narration: construction relevance review

2026-09-21. Read-only historian/editor review under `.factory/droids/wonder-historian.md`. No application, spec, audio or deployment edits by this reviewer. Read Specs 12, 49, 50, HANDOFF, the seven current caption bodies and the earlier source audit; independently refreshed official sources below. Inspected the archived seven-shot desktop contact sheet and current construction data. Root owns implementation and current playback acceptance.

## Findings

- **[major] `src/data/captions.ts`, `colosseum-moonrise` (original lines 231–236):** the final line describes a sky event and conveys no construction information. It can be astronomically correct while violating the owner's editorial requirement. A beautiful final sky does not require a narrated sky chapter. Remove this chapter from the active caption/audio track and retain the visual Moonrise as a quiet completed-monument reveal.
- **[major] `specs/50-historical-film-chapters.md` (original lines 29–35) and `specs/12-colosseum-reference-scene.md` (original lines 510–513):** both explicitly institutionalized the quiet Moonrise as a chapter. Correct the authoring policy, rather than merely exchanging one sentence. Every narration beat should explain the monument's site preparation, materials, engineering, assembly, designed structure or construction history. Atmosphere alone is insufficient. No universal chapter count applies.
- **[minor] `src/data/captions.ts`, `colosseum-seating` (original lines 215–220):** social-rank seating is historically accurate and relates to design intent, but the body explains social organization more than construction. The owner's explicit emphasis favors the supported replacement below. The caption window shows the emerging seating bowl; a structural explanation fits it.
- **[note] `colosseum-titus`:** the original line is accurate. Its original .71–.81 window overlaps the last scaffold removal (work ends at .8). Moving this historical conclusion after .8 yields a cleaner sequence. “Opened” or “inaugurated” should remain; do not claim that every later addition was complete in AD 80.

## Recommended final track

Use **six chapters**, because the Moonrise observation is unnecessary, not because six is a target. Retain the first four bodies. Replace only the seating body and closing body, preserving the selected Andrea Williams voice and measuring both new recordings.

| Chapter | Review of original text and visible-shot fit | Recommendation |
| --- | --- | --- |
| Nero's former lake | Site history is directly relevant. The opening scene has already drained the site; it need not show the lake. Vespasian is supported. | Keep. |
| Travertine from Tivoli | Identifies structural material and its source during the growing piers. The archaeology supports the load-bearing masonry claim. | Keep. |
| Lifting the blocks | Active lifts are visible. The Haterii relief supports period wheel-powered lifting equipment, but not the exact modeled crane placement. | Keep “In this reconstruction.” |
| Under the vaults | Timber centering appears beneath the developing interior. “Here” refers to the modeled reconstruction; exact formwork arrangements are not claimed as excavated evidence. | Keep. |
| Seating | Bowl and supporting structure are visible during assembly. Access function and structural support are construction-related explanations. | **Kicker: “Supporting the seating.” Body: “Vaulted passageways support the seating and lead spectators inside.”** |
| Titus / opening | End after visible work and dismantling finish; the finished monument can hold while its construction history concludes. | **Kicker: “From Vespasian to Titus.” Body: “Construction began under Vespasian. Titus opened the amphitheatre in AD 80.”** |
| Moonrise | Correct observation of an authored representative sky, but unrelated to construction. | Remove active chapter; preserve sky and quiet ending. |

Root's proposed closing window `.805–.94` (48.3–56.4 seconds) is reasonable pending measured speech duration, caption fit and playback checks. Leave the remainder of the 60-second film without further narration. The new final sentence deliberately avoids choosing a disputed exact start year or treating the representative June 21 sky as the known inauguration date.

A seventh facade beat is not needed. If a future shot needs it, “Three tiers of stone arches form the outer façade” is supported by Rome's official description. In this film, adding that line after an inauguration ending would weaken the chronology and reproduce the unnecessary-chapter problem.

## Historical sources refreshed

1. [Parco archeologico del Colosseo, Carta dei servizi](https://colosseo.it/sito/wp-content/uploads/2018/11/Colosseo_carta-dei-servizi.pdf): identifies Vespasian as initiator, Titus's inauguration in 80, and Domitian's completion in 82. The distinction supports the proposed closing line and warns against “all construction completed in 80.” [Rome municipality's monument account](https://www.turismoroma.it/en/node/1155) independently identifies Vespasian's commission and Titus's role. Official summaries differ on the precise starting year (70/72), which is omitted.
2. [Park epigraphy lesson](https://colosseo.it/en/event/stories-from-the-colosseum-epigraphy-lessons-the-earthquakes-of-the-5th-century-and-the-end-of-the-games/): identifies the reused slab's original inaugural inscription as Titus's, AD 80. This directly corroborates the opening milestone.
3. [Ministry of Culture, ICCD archaeological-site vocabulary](https://iccd.cultura.gov.it/getFile.php?id=9028), printed page 49, “anfiteatro”: names the Colosseum, describes radial supports joined by barrel vaults below the seating, and access corridors beneath the cavea. Supports the proposed seating body. Native PDF and extracted text are preserved beside this report (`iccd-sites-2023.pdf`, `.txt`, text lines 2786–2798).
4. [Park southern-ambulatories excavation account](https://colosseo.it/en/southern-ambulatories/): structural foundations, travertine bases/piers, vaults and radial/annular corridors. This provides direct archaeological context without purporting to document every temporary timber.
5. [Park cavea account](https://colosseo.it/en/marvels/the-cavea-of-the-colosseum-and-the-belvedere-terrace/) and [excavated barriers and balustrades](https://colosseo.it/en/opere/barriers-and-balustrades/): seating by rank, designated access routes and protected steps. The original social-rank line was accurate; its replacement is an editorial relevance correction.
6. [Park, Nero's footsteps](https://colosseo.it/en/itineraries/walking-in-the-parco-in-neros-footsteps/): Flavian amphitheatre replaced Nero's artificial lake. [Vatican Museums, Haterii mausoleum](https://www.museivaticani.va/content/museivaticani/it/collezioni/musei/museo-gregoriano-profano/Mausoleo-degli-Haterii.html): early second-century builders' memorial, large wheel-driven lifting machine, references to Flavian projects. It supports technological reconstruction, not a literal construction-day record.

The earlier Tivoli-source evidence remains documented in `artifacts/chapters-history-2026-09-20/review/COLOSSEUM-PRIMARY-SOURCE-CHECK.md`; the new Park account also confirms that conservation material was selected near the original Tivoli quarries. No new precise distance, workforce count or lifting-capacity claim is introduced.

## Who authored the Moonrise line?

The earliest inspected local narrative record is the 2026-09-20 chapter rewrite. Its historian supplement (`COLOSSEUM-PRIMARY-SOURCE-CHECK.md:3`) calls itself a review of “root's seven-chapter rewrite”; its final row (line 13) explicitly characterizes the Moonrise body as an authored-film observation owned/verified by root and the celestial agent. The script archive and narration source snapshot contain the same words.

The current Git diff shows this seven-chapter rewrite, including Moonrise, as uncommitted changes relative to the last caption commit. Historical Git author names therefore cannot identify who wrote that line. No inspected record identifies an individual human author. The supported account is that the assistant's editorial rewrite introduced it, and the review checked astronomical truth without rejecting its lack of construction relevance. It was not an invention by the ElevenLabs voice provider: the generation pipeline supplied the written caption body.

## Acceptance boundary

The six-beat revision is historically coherent and more faithful to the requested subject. The astronomical ending can remain unchanged. This review approves the proposed copy and factual scope; it does not claim current audio listening, new waveform timing, current browser playback or deployment acceptance. Those remain root's checks before release.
