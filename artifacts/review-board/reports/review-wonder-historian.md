# Wonder Historian — Review Board Findings

(Re-run 2026-08-16 after the original background task errored on usage limits.)

Scope: `specs/08-scene-realism.md`, `specs/00-overview.md`, `specs/01-wonder-catalog.md`, `src/data/gizaEnvironment.ts`, `src/data/gizaSky.ts`, `src/data/gizaConstruction.ts`, `src/data/materialDetail.ts`, all ten catalog entries in `src/data/wonders/`, the Giza scene JSON, and `tests/giza-sky.test.ts`.

## Findings

**[major] gizaEnvironment.ts:362 vs gizaSky.ts:116,122 — season/sun-path contradiction.** Era data declares `season: 'peret'` (winter growing season) and the crops/water recipes repeat it, but the sun path culminates at 78°, which the sky data itself calls "near-summer" — at 29.98°N a peret noon sun sits at roughly 37–57° (78° implies late May–July, shemu/akhet). Direction: lower `noonElevationDegrees` to ~55°, or move the declared season to shemu, or extend `productionNote` to admit the summer arc is kept for lighting drama.

**[major] gizaEnvironment.ts:417-427, 544-556 — Memphis placed on the wrong bank.** Geography zone and settlement say the capital is "seen across the river" (east of the channel). Historically Memphis stood on the **west** bank — the same side as Giza. The `historicalNote` covers the southward compression but never admits the bank swap. Direction: extend the note, or reposition the skyline on the near bank to the south.

**[major] gizaEnvironment.ts:562-563 — anticipated architecture in the 2560 BCE skyline.** Monumental temple pylons are Middle/New Kingdom; monumental obelisks begin with Fifth Dynasty sun temples — both centuries after Khufu. Spec 08 itself mandates these features, so: add an honest note that they anticipate later temple forms for skyline legibility, or swap for era-correct accents (niched enclosure walls, palace-façade paneling).

**[major] gizaEnvironment.ts:357-373 with gizaConstruction.ts:20-45 — multi-reign compression not covered by any note.** The era block claims "reign of Khufu, c. 2560 BCE", yet the plan raises Khafre's and Menkaure's pyramids simultaneously and includes the Sphinx (attributed to Khafre). The chronological compression — three reigns in one Khufu-era day — appears in no `productionNote`. Direction: one sentence in `ERA.productionNote`.

**[minor] wonders/machu-picchu.ts:13-16 — quote likely not about the wonder.** Samuel Prout Hill (1812–1861) died fifty years before Machu Picchu was revealed to the West in 1911; the "turrets… crumbling in decay" verse cannot describe the site. Verify, or prefer Hiram Bingham's documented lines.

**[minor] wonders/petra.ts:13-16 — untraceable attribution while the documented quote sits unused.** "Edward Dawson" is not traceable; the description already uses Burgon's "rose-red city half as old as time" uncredited. Swap the quote slot to Burgon's couplet, credited.

**[minor] wonders/stonehenge.ts:20 — "largest sarsen" figures describe the average.** ~25 t / ~4 m matches the average circle sarsen; the largest trilithon uprights run ~30–35+ t, ~6.6–7.3 m.

**[minor] wonders/sydney-opera-house.ts:22 — cost overrun understated.** AU$7M → ~AU$102M is ~14×, not "around ten times".

**[note]** machu-picchu (1450, `medieval`) vs forbidden-city (1420, `renaissance`) era labels chronologically inverted — mirrors Civ VI's assignments, sanctioned; worth a comment. **[note]** Colosseum pseudo-Bede prophecy originally about the Colossus — consider "attributed to". **[note]** chichen-itza.ts:15 bare "IslaDeb" — suggest `'IslaDeb, TripAdvisor'`. **[note]** gizaEnvironment.ts:369 seasonal-corvée stated as fact — soften to "traditionally associated with akhet". **[note]** gizaSky.ts:325-332 culmination (t=0.5) and meridian transit (t=0.45) don't coincide — cosmetic. **[note]** materialDetail.ts:108 granite rationale says "chamber courses" but the plan applies it to Menkaure's lower casing (historically right) — update the rationale text. **[note]** pre-register `camels` and `horses` in `exclusions` before animal traffic lands (both anachronistic for 2560 BCE).

## Verified sound

Khufu/Fourth Dynasty/−2560 consistent everywhere; exact coordinates; compass/horizon-sectors/sun-sweep/cloud-drift mutually consistent (the 20°-north-of-west sunset matches declination +18° exactly); Khufu-branch Nile close to the plateau (matches 2022 paleochannel research); Tura casing and Aswan granite logistics; Muqattam east / Libyan dunes west; deshret/kemet framing; emmer/barley/flax, date and doum palms, papyrus; Khafre's surviving upper casing; monument size ratios close to reality; Giza, Eiffel, Angkor, Forbidden City, Colosseum, Chichen Itza catalog facts check out.

## Verdict

The Giza data layer is in unusually good historical shape for a stylized fan piece. The four major findings are all one species — real compressions or contradictions that escaped the "honest simplification" contract — and each is fixable with either one sentence of honest annotation or one small data change. The catalog's quote hygiene (Machu Picchu, Petra) is the only place where something presented as authentic may simply not be.
