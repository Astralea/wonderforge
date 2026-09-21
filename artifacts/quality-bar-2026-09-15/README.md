# Wonder quality pass — Colosseum / Stonehenge / Petra

Date: 2026-09-15 (JST). Branch: `wonders/quality-colosseum-stonehenge-petra`.
Local preview: https://wonderforge.localhost/ (loopback 5589).

## Opera House vs Eiffel/Giza bar

Captured `#/debug/wonder/sydney-opera-house/0.58`: readable harbour diorama (86 calls / 55k tris,
edge density 0.261) with podium, one sail, yellow cranes, barges, and Harbour Bridge token.
Below the Giza bar: toy-scale geometry, sparse crews, little atmospheric living-site density,
and no continuous construction-film depth matching Giza's camp/ramp/worker storytelling or
Eiffel's member-level chronography. Kept as catalog context only; not raised this pass.

## What changed

### Colosseum
- Retimed arcade storeys to overlap so the exterior silhouette keeps rising (s0→s1→s2→attic)
  instead of freezing on a finished ground arcade while only inner vaults advance.
- Scaffold raise/strike windows track the new storeys; camera target height rises with the facade.
- Living-site density: more pines/insulae/aqueduct piers, timber stocks, mixing tubs.
- Spec 12 notes the continuous-exterior progression contract.
- Evidence: `after/colosseum-t0.32|0.48|0.58|0.78` (two arcade tiers visible by ~0.48–0.58).

### Stonehenge
- Earlier trilithon/heel seating; outer sarsens and lintels start sooner; bluestones spread earlier.
- Cuts the long 0–20% settled freeze; mid-film settling stays monotonic.

### Petra
- Camera opened (higher pitch, wider stand-off) so the dry rift sky reads above the Siq.
- Gorge walls shortened/pushed out; massif lowered; sandstone materials brightened with soft emissive.
- Lighting: stronger ambient, lower haze, zenith-biased clear color, softer fogStretch.
- Still below Giza/Eiffel bar: blocky facade, dark massif slab, floating spoil readability,
  and low triangle budget. Documented as remaining blockers.

## Gates
- Focused: colosseum/stonehenge/petra construction+world + `wonder-progress-story` — 53/53 green.
- `npm run typecheck` and `npm run build` green.

## Leftovers for Chenguang
- Petra: lit sandstone cliff instead of dark massif; bind spoil to visible sleds/ropes;
  enrich Siq ecology toward Giza living-site density.
- Colosseum: still low-poly vs Giza AAA atmosphere; optional closer working-face beats.
- Stonehenge: optional atmosphere/crew pass.
- Do not invent the unnamed house / Forbidden City wonder.
- Prior dirty tree parked on `wip/local-20260915` (includes unfinished Eiffel progress work).
