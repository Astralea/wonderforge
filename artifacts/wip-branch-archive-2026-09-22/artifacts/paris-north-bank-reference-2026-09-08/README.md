# Paris north-bank composition reference — 2026-09-08

Read-only research for the parent’s next Blender background revision. No source,
scene, Blender or MCP changes were made by this research agent. The observations
below guide an authored, compressed scene; they do not identify every parcel or
recover hidden geometry from one photograph.

## Visually inspected primary photographs

1. **Alphonse Liébert, balloon view, [1889], LoC 92514593.**
   [Primary catalogue](https://www.loc.gov/pictures/item/92514593/).
   The live catalogue identifies an albumen photographic print, not an engraving.
   Existing local image inspected:
   `artifacts/paris-stability-followup-2026-09-07/references/loc-balloon-paris-large.jpg`.
   The visible city beyond the fair forms a continuous roofscape. Narrow attached
   fronts, unequal eaves, mixed ridge directions and irregular rear wings produce
   variety without isolated buildings surrounded by grass. Tree-lined streets
   remain continuous between blocks. The river has a deliberate quay edge,
   landing places and clustered moored craft. The foreground exhibition garden
   contains exceptional pavilion forms: do not copy those as normal housing.

2. **Neurdein frères, view toward Trocadéro from Eiffel, [1889], BnF 44464599.**
   [Primary catalogue](https://catalogue.bnf.fr/ark:/12148/cb444645996),
   [Gallica original](https://gallica.bnf.fr/ark:/12148/btv1b11600048s).
   BnF identifies an albumen positive from a glass negative. The catalogue and
   its exact-image [Commons mirror](https://commons.wikimedia.org/wiki/File:Exposition_Universelle_de_1889._Vue_sur_le_Trocad%C3%A9ro_prise_de_la_Tour_Eiffel_-_btv1b11600048s.jpg)
   were opened; the image was visually inspected in the browser at 960 × 748.
   No new remote image was downloaded. The image separates three layers:
   bridge/quay, planted exhibition gardens with paths and pavilions, then a dense
   urban roofscape behind the palace and to its sides. Keep this hierarchy.
   It does not justify filling the palace forecourt or every garden void with
   residential blocks. Image resolution here was insufficient to survey distant
   parcel boundaries or count ordinary street traffic.

## Concrete modeling direction

These are design inferences from the photographs, not measured historical values.

- Replace the isolated north-bank parcels with connected **street fronts**.
  Keep a common frontage alignment while dividing each long wing into several
  unequal house widths and roof segments. Preserve a few taller corner houses;
  vary most neighboring eaves modestly so the street still reads as one block.
- Give the block interiors unequal depths: one large court, two small courts,
  offset rear wings, service sheds and narrow passages. Exposed end walls belong
  at a passage or incomplete frontage, not at every repeated house boundary.
- Establish a road hierarchy before filling parcels: continuous quay boulevard,
  a few connecting avenues, narrower cross streets. Where authored oblique
  streets meet, use a clipped corner or wedge-shaped frontage. Exact triangular
  junction locations have **not** been established by this pass.
- Make remaining gaps legible: paved courtyards, planted gardens, service yards,
  plazas or streets. Large unexplained grass bands between every street row
  contradict the visible continuous city impression.
- Concentrate visible life where paths meet: bridge approaches, landing stages,
  pavilion entrances and pavement corners. Add small stationary groups and
  vendors as well as walkers. Keep road carriage lanes and the construction
  haul route usable; do not scatter people uniformly across lawns or water.
- Reuse the existing period horse vehicles and boats. These photographs do not
  establish routine motorcar traffic or a reliable traffic census; adding a
  modern-looking stream of cars would not be supported by this evidence.
- Prioritize block silhouettes, ground use and broad material differences in
  the distant city. Tiny railings/window grids will add aliasing before they
  add readable variety. Preserve the current footprint-filtered terrain and
  mipmapped facade atlas pipeline.

## Map and additional-photo leads, not admitted as visual evidence

- [Official 1889 exposition plan, Ministry of Commerce and Industry](https://archive.org/details/planofficieldele00expo).
  The 15-page scanned publication was identified and PDF text read; separate
  Champ de Mars and Trocadéro sheets exist. Screenshot retrieval failed, so this
  pass has not traced streets or claimed metric plan accuracy.
- [Liébert balloon view toward Arc de Triomphe, LoC 92514595](https://www.loc.gov/pictures/item/92514595/).
  The primary catalogue confirms a photographic print dated [1889]. Browser
  access stopped at a human-verification challenge; no challenge was solved,
  and the image was not visually inspected or used for parcel guidance.

## Current-source implication

Before the parent’s new revision, `scripts/paris_exposition_geometry.py:263`
iterates the same `rowCenters × columns` arrangement; its five typologies alter
internal wings but remain isolated inside similarly sized rectangles. More roof
types alone therefore preserve the repeated settlement pattern. The next pass
should change the street/block composition as well as the building details.
