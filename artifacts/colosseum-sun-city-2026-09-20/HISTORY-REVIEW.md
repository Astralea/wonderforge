# Roman housing and sunlight: historical review

2026-09-20 · read-only review using `.factory/droids/wonder-historian.md`.
Scope: Spec 12's city/sun refinement, Spec 49, typed urban context, new housing
profiles and manifest, western terrain, sun path and camera. No application or
specification edits. Rendering acceptance remains the visual review's job.

## Reference ledger

| Evidence | What it supports | Limit on its use here |
| --- | --- | --- |
| [Vitruvius, *De architectura* 2.8.17](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Vitruvius/2%2A.html#8.17), primary text | Rome's dense population and restricted ground area led to houses with multiple storeys; masonry supports and timber floors are described. | Earlier than AD 80; supports the established existence of upper-storey housing, not a census, precise Flavian elevations or these four model plans. |
| [Archaeological Park of Pompeii, Roman Housing](https://pompeiisites.org/en/pompeii-map/analysis/roman-housing/), official archaeological account | Atrium houses, open roof courts, peristyle gardens, and variation between larger wealthy residences and smaller simpler homes. | Pompeian comparative evidence, not a map of Rome. An atrium's roof opening and an open peristyle are different arrangements; the low open-court mesh is deliberately schematic. |
| [Archaeological Park of Pompeii, Shops VII.14](https://pompeiisites.org/en/excavations-plan-en/shops/), official archaeological account | A street-facing shop with rear service space, stairs and upper rooms affected by the AD 62 earthquake/fire, subsequently repaired or repurposed. | A concrete pre-AD 79 example of mixed street-front/upper-floor use. It does not establish identical shop fronts, storey counts or rooflines throughout Rome. |

These support a mixed residential vocabulary rather than one repeated tall
block. Stepped wings, joined fronts, particular roof pitches, colours, district
weights and every current lot position remain authored interpretation. No
Hadrianic/Antonine Ostian apartment-block plan or late-antique residential count
has been transferred into the AD 70–80 setting. The two Pompeii pages were read
from the official HTML directly after the web reader timed out on repeat opens.

## Findings and integration checks

- **[note] `src/data/colosseumHousing.ts:1–39`** — The four low-court,
  stepped, frontage and corner profiles explicitly disclaim surveyed AD 80
  plots. Their broad vocabulary is defensible from the evidence above. No
  claim that these are four archaeologically established Roman house types
  should be added.
- **[minor, conditional integration check] `src/data/colosseumHousing.ts:37`
  and `src/engine/colosseumRomeLots.ts:91`** — The 12.15 m corner model would
  reach nearly 29.8 m if it inherited the old 2.45 maximum uniform house scale.
  Reduce/cap tall-house placement scale when integrating the new kit. For
  historical context, [Strabo 5.3.7](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Strabo/5C%2A.html#3.7)
  reports Augustus restricting new buildings on public streets below seventy
  feet. That does not prove universal compliance in AD 80, but argues against
  making oversized towers routine. Integration was still underway at review.
- **[note] `src/data/colosseumSky.ts:50–62`,
  `src/render/three/RenderPipeline.ts:398–405` and
  `src/engine/colosseumCamera.ts:20–30`** — Under +X east/+Z north, the current
  azimuth sequence 14° → −90° → −194° means ENE → south → WNW. The late camera
  stands east/southeast and looks west/northwest. This is internally coherent.
  The explicit authored-day, enlarged-disc and non-dated-alignment notes are
  necessary: the cinematic curve is not an astronomical reconstruction of
  Titus's dedication day or a Roman counterpart to Stonehenge's alignment.
- **[note] `src/engine/colosseumTerrain.ts:32–40`** — The added western
  shoulders are explicitly compressed continuation, have no invented ancient
  landmark names, and do not purport to survey Janiculum contours. Keep that
  interpretation in the final report; no correction required.

## Chronology retained

`src/data/colosseumEnvironment.ts:97–107` still excludes the later Palatine
aqueduct extension, Trajan's baths and Constantine's arch. Spec 49 additionally
excludes the complete later Domitianic Palatine extensions; the existing
[Rome history review](../home-no-loader-2026-09-20/rome-history-review.md)
also excludes the later Ludus Magnus. Generic earlier Palatine residences are
appropriate, but should not acquire the plan/silhouette of Domitian's completed
palace: the [official PArCo Palatium account](https://colosseo.it/en/itineraries/palatium-living-on-the-palatine-from-the-foundation-of-rome-to-the-modern-age/)
distinguishes the earlier residential fabric and expanding Domus Tiberiana
from the subsequent hill-transforming Domus Flavia/Augustana project.

**Verdict:** no historical blocker to this authored city/sun direction. Housing
variation has contemporary or earlier support; western sunlight and compressed
terrain are honestly identified as cinematic decisions. Resolve the tall-house
scale integration check and retain the established chronological exclusions.
