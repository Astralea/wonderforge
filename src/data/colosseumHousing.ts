/** Original, deliberately compressed street architecture, not surveyed AD 80 plots.
 * Dimensions are metres; +Y up, fronts toward +Z. The background Blender
 * authoring script reads this JSON literal so fallbacks and delivered assets
 * share the same silhouettes and footprint contract. */
export const COLOSSEUM_HOUSING = [
  {
    "id": "courtyard",
    "label": "Low open courtyard house",
    "wings": [
      { "x": 0, "z": -2.95, "width": 10, "depth": 2.1, "height": 4.3, "roof": 1.15 },
      { "x": 0, "z": 2.95, "width": 10, "depth": 2.1, "height": 4.3, "roof": 1.15 },
      { "x": -3.95, "z": 0, "width": 2.1, "depth": 3.8, "height": 4.3, "roof": 1.05 },
      { "x": 3.95, "z": 0, "width": 2.1, "depth": 3.8, "height": 4.3, "roof": 1.05 }
    ]
  },
  {
    "id": "stepped",
    "label": "Stepped upper-storey court",
    "wings": [
      { "x": -1.8, "z": -2.2, "width": 6.4, "depth": 3.6, "height": 6.2, "roof": 1.25 },
      { "x": 3.2, "z": -2.2, "width": 3.6, "depth": 3.6, "height": 8.8, "roof": 1.4 },
      { "x": -3.2, "z": 1.8, "width": 3.6, "depth": 4.4, "height": 4.4, "roof": 1.1 }
    ]
  },
  {
    "id": "frontage",
    "label": "Joined street frontage with ground-floor shops",
    "wings": [
      { "x": -2.5, "z": 0, "width": 5, "depth": 7.8, "height": 6.7, "roof": 1.3 },
      { "x": 2.5, "z": 0, "width": 5, "depth": 7.8, "height": 5.1, "roof": 1.25 }
    ]
  },
  {
    "id": "corner",
    "label": "Tall corner house with lower adjoining wings",
    "wings": [
      { "x": -3, "z": 2, "width": 4, "depth": 4, "height": 10.8, "roof": 1.35 },
      { "x": 2, "z": 2, "width": 6, "depth": 4, "height": 7.4, "roof": 1.3 },
      { "x": -3, "z": -2, "width": 4, "depth": 4, "height": 5.2, "roof": 1.1 }
    ]
  }
] as const;

export type ColosseumHousingId = (typeof COLOSSEUM_HOUSING)[number]['id'];
export const COLOSSEUM_HOUSING_HALF_WIDTH = 5.5;
export const COLOSSEUM_HOUSING_HALF_DEPTH = 4.6;
export const COLOSSEUM_HOUSING_RADIUS = 7.4;
export const COLOSSEUM_HOUSING_GLB = '/models/colosseum-rome/housing-variants.glb';

export function colosseumHousingById(id: ColosseumHousingId = 'courtyard') {
  return COLOSSEUM_HOUSING.find(profile => profile.id === id)!;
}
