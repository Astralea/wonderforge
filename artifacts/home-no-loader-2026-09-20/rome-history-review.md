# Colosseum city context — 2026-09-20

Owner asks why the setting looks empty, where the amphitheatre was built, and
what Rome looked like then. This is a research and implementation review;
the city background has not been rebuilt in this pass. Read-only historical
review delegated to `.factory/droids/wonder-historian.md`.

## Historical basis

The site is in central Rome, on the former artificial lake of Nero's Domus
Aurea, between the Palatine, the Oppian/Esquiline and the Caelian. Vespasian's
amphitheatre replaced an imperial lake with a public venue; Titus inaugurated
it in AD 80. The immediate construction clearing can be spacious. That does
not imply an empty countryside beyond it. The palace estate itself contained
pavilions, gardens, woods and vineyards, with major buildings on the Palatine
and Oppian. [PArCo Domus Aurea](https://colosseo.it/en/area/domus-aurea/),
[PArCo archaeological itinerary](https://colosseo.it/en/itineraries/walking-in-the-parco-in-neros-footsteps/),
[Rome official historical guide](https://www.turismoroma.it/sites/default/files/02-Roma-Monumentale.pdf).

| Sector | Period-specific environment | Source / reconstruction limit |
|---|---|---|
| West / southwest | Existing imperial buildings and terraces of the Palatine | [PArCo Palatine](https://colosseo.it/en/area/the-palatine/). Do not copy the complete later Domitianic palace. |
| North / northeast | Oppian slope, former Golden House buildings and gardens; Titus baths by the AD 80 completion | [Rome Titus baths](https://www.turismoroma.it/it/luoghi/terme-di-tito) places them northeast of the arena, on the southern slope of the Oppian, with access steps and a smaller body than later imperial baths. |
| South / southeast | Caelian built terraces, Temple of Claudius precinct and Neronian aqueduct branch | [Rome Temple of Claudius](https://www.turismoroma.it/en/node/1137) dates the beginning to AD 54 and restoration to Vespasian; describes the substantial platform and its relationship to the aqueduct. |
| Northwest | Velia ridge and routes toward the Forum | [Rome Velia exhibition](https://www.turismoroma.it/it/eventi/1932-l%E2%80%99elefante-e-il-colle-perduto). Do not copy today's excavated, road-cut open vista. |

[Tacitus, Annals 15.43](https://penelope.uchicago.edu/Thayer/e/roman/texts/tacitus/annals/15b%2A.html#43)
describes the post-64 rebuilding with planned street alignments, wider roads,
restricted building heights, open spaces and porticoes fronting tenements.
This concerns districts outside the imperial appropriation. It supports the
surrounding city's architectural vocabulary, not exact plot-by-plot evidence
for the amphitheatre's immediate surroundings.

## Period boundaries

- Titus baths: AD 80; appropriate to the completion, not as a finished complex
  throughout the construction opening.
- Ludus Magnus: Domitian, AD 81–96. [Rome archaeology](https://sovraintendenzaroma.it/node/2335).
- Complete Domitianic palace: AD 81–92. [Met collection note](https://www.metmuseum.org/art/collection/search/247174).
- Trajan baths: AD 109. [Rome archaeology](https://sovraintendenzaroma.it/node/5288).
- Temple of Venus and Roma: begun AD 121. Moving the Colossus to the familiar
  later position beside the amphitheatre was also Hadrianic.
  [PArCo temple history](https://colosseo.it/en/marvels/temple-of-venus-and-roma/).
- Arch of Constantine: AD 315. [PArCo conservation history](https://colosseo.it/en/restauri/the-maintenance-of-the-arch-of-constantine/).

Spec 12 compresses some Domitianic work into the film. Resolve that chronology
explicitly before adding monuments; later landmarks must not exist from the
opening. Specific shops, street shapes and uncertain elevations should be
labelled authored reconstruction rather than documented archaeology.

## Current implementation findings

- `src/engine/colosseumRomeLots.ts:5`: only `insula`, `palace`, `pine`,
  `cypress` lot kinds. Counts cannot supply recognizable civic/imperial
  structures, street fronts, bath terraces or temple precincts.
- `src/engine/colosseumRomeLots.ts:15`: the 2.15-times ellipse exclusion creates
  about 90–108 m of radial clearance outside the facade, with valley lots
  beginning at radius 210 m. This is an authored buffer, not an archaeological
  boundary. Keep actual haul/rig access, but articulate an irregular city edge.
- `src/engine/colosseumTerrain.ts:19`: prioritize the missing near-site Velia
  and Oppian relief. The named far hills also have a compass error: Aventine
  is northwest, and Quirinal/Viminal south, despite the renderer explicitly
  defining +Z as north at `ColosseumEnvironment.ts:419`. Aventine belongs
  southwest; Quirinal/Viminal northward. Distance compression does not explain
  that directional reversal.
- The saved `.86` portrait capture in the preceding repair shows repeated
  roof blocks and an aqueduct in homogeneous ochre haze. This supports the
  owner's sparse/generic impression. It is a prior capture, not a fresh
  browser verification of the final shadow optimization.

Recommended next implementation: retain an active central worksite; establish
correct near-site landforms and roads; build differentiated imperial, temple,
bath and residential silhouettes by direction; add continuous but varied roof
fabric farther out; keep the middle-distance streets and facades readable
through the atmosphere. Use building diversity and connected urban form before
adding more instances. Maintain deterministic placement and renderer budgets.

## Sydney status checked in the same pass

Current `src/data/index.ts` lists only Giza, Stonehenge, Colosseum and Eiffel
as On site. Sydney remains In production. HANDOFF records earlier September 18
shell, bridge and harbour work, and the September 20 return to In production
because the finished mesh was still below the owner's quality bar. The saved
`artifacts/sydney-ready-2026-09-20/t1/desktop.png` still shows coarse harbour
fabric and an unfinished-looking shell composition. No Sydney geometry was
changed by the four-film repair or this homepage correction.
