// Procedural surface-detail recipes for the shared material kit (Spec 06).
// Pure data: each recipe becomes a small GLSL value-noise injection into the
// matching MeshStandardMaterial via src/render/three/proceduralDetail.ts.
// No textures, no runtime randomness; the only animated term (Nile ripple) is
// phased from playback t so scrubbing stays deterministic.

/** Which position space the detail is sampled in. */
export type DetailSpace =
  /** Local, pre-instance coordinates: detail travels with the carried part. */
  | 'object'
  /** World coordinates: physically consistent frequency on placed surfaces. */
  | 'world';

/** Which plane pair the noise is sampled on. */
export type DetailPlane =
  /** Ground-aligned surfaces (terrain, roads, water): sample on XZ. */
  | 'xz'
  /** Everything else: blend of XY and ZX to avoid grid alignment. */
  | 'mixed';

export interface GrainRecipe {
  /** Noise cells per unit of the recipe's space. */
  scale: number;
  /** Multiplicative value swing, 0..~0.1. */
  amplitude: number;
  /** < 1 stretches the grain along local Y (timber members). Default 1. */
  anisotropy?: number;
}

export interface BandingRecipe {
  /** Sedimentary strata cycles per unit along local Y. */
  scale: number;
  amplitude: number;
}

export interface MottleRecipe {
  /** Broad patch cycles per unit. */
  scale: number;
  amplitude: number;
}

export interface RippleRecipe {
  /** Ripple cells per world unit. */
  scale: number;
  /** Phase advance per unit of playback t (deterministic). */
  speed: number;
  /** Roughness swing added by the ripple. */
  roughness: number;
  /** Small value swing so the ripple reads even in flat light. */
  amplitude: number;
}

export interface NormalRippleRecipe {
  /** Multiplier for the finite-difference ripple slope used to ruffle the surface normal. */
  strength: number;
}

export type MaterialDetailRole =
  | 'core-limestone'
  | 'casing-limestone'
  | 'granite'
  | 'sand'
  | 'compacted-earth'
  | 'quarry-cut'
  | 'wood'
  | 'water'
  | 'whitewash'
  | 'mud-brick'
  | 'city-roof'
  | 'city-accent'
  | 'linen'
  | 'foliage'
  | 'farmland';

export interface MaterialDetailRecipe {
  role: MaterialDetailRole;
  /** Era/material rationale, kept honest per Spec 00's authenticity rule. */
  description: string;
  space: DetailSpace;
  plane: DetailPlane;
  grain?: GrainRecipe;
  banding?: BandingRecipe;
  mottle?: MottleRecipe;
  /** Roughness swing coupled to the grain/mottle detail, 0 disables. */
  roughnessSwing?: number;
  ripple?: RippleRecipe;
  /** Optional normal ruffle derived from the same ripple field; intended for horizontal water. */
  normalRipple?: NormalRippleRecipe;
}

export const MATERIAL_DETAIL_RECIPES: MaterialDetailRecipe[] = [
  {
    role: 'core-limestone',
    description:
      'Mokattam nummulitic limestone, rough-dressed: fine grain with faint horizontal bedding carried from the quarry strata.',
    space: 'object',
    plane: 'mixed',
    grain: { scale: 14, amplitude: 0.05 },
    banding: { scale: 9, amplitude: 0.032 },
    roughnessSwing: 0.05,
  },
  {
    role: 'casing-limestone',
    description:
      'White Tura casing, dressed smooth: finer grain and barely-visible bedding on the pyramid\'s original bright face.',
    space: 'object',
    plane: 'mixed',
    grain: { scale: 22, amplitude: 0.03 },
    banding: { scale: 14, amplitude: 0.018 },
    roughnessSwing: 0.04,
  },
  {
    role: 'granite',
    description:
      'Granodiorite barged from Aswan for chamber courses: dense crystalline speckle, never bedded.',
    space: 'object',
    plane: 'mixed',
    grain: { scale: 30, amplitude: 0.05 },
    roughnessSwing: 0.06,
  },
  {
    role: 'sand',
    description:
      'Desert pavement of the western plateau: broad wind-sorted dune patches over a fine grain.',
    space: 'world',
    plane: 'xz',
    mottle: { scale: 0.016, amplitude: 0.055 },
    grain: { scale: 0.28, amplitude: 0.025 },
  },
  {
    role: 'compacted-earth',
    description:
      'Sled roads and ramp cores: trodden, moisture-mottled compaction from constant sled and foot traffic.',
    space: 'world',
    plane: 'xz',
    mottle: { scale: 0.35, amplitude: 0.05 },
    grain: { scale: 2.2, amplitude: 0.03 },
  },
  {
    role: 'quarry-cut',
    description:
      'Fresh quarry faces south-east of the plateau: stronger strata and tool-scale grain than weathered stone.',
    space: 'world',
    plane: 'mixed',
    grain: { scale: 1.6, amplitude: 0.045 },
    banding: { scale: 1.1, amplitude: 0.04 },
  },
  {
    role: 'wood',
    description:
      'Acacia and sycamore sleds, masts, yards and levers: grain stretched along each member so wood stops reading as brown plastic.',
    space: 'object',
    plane: 'mixed',
    grain: { scale: 6, amplitude: 0.06, anisotropy: 0.16 },
    roughnessSwing: 0.05,
  },
  {
    role: 'water',
    description:
      'Slow peret-season Nile current: the prevailing northerly breeze ruffles the river so drifting ripple bands catch the low sun.',
    space: 'world',
    plane: 'xz',
    ripple: { scale: 0.55, speed: 0.5, roughness: 0.3, amplitude: 0.035 },
    normalRipple: { strength: 0.36 },
  },
  {
    role: 'whitewash',
    description:
      'Lime-plastered estate and temple walls of the Memphis skyline: nearly smooth, slight trowel grain.',
    space: 'world',
    plane: 'mixed',
    grain: { scale: 2.4, amplitude: 0.02 },
  },
  {
    role: 'mud-brick',
    description:
      'Sun-dried Nile-mud brick: coarse, fiber-rich grain separating city fabric from dressed stone.',
    space: 'world',
    plane: 'mixed',
    grain: { scale: 0.9, amplitude: 0.04 },
  },
  {
    role: 'city-roof',
    description:
      'Palm-thatch and mud roofs over Memphis houses: soft weathered grain a step rougher than the walls.',
    space: 'world',
    plane: 'mixed',
    grain: { scale: 1.2, amplitude: 0.035 },
  },
  {
    role: 'city-accent',
    description:
      'Painted door and shrine accents in the far city: restrained grain so the color blocks stay readable.',
    space: 'world',
    plane: 'mixed',
    grain: { scale: 1.2, amplitude: 0.03 },
  },
  {
    role: 'linen',
    description:
      'Flax sailcloth and tenting: fine plain-weave grain on the square sails of the upstream boats.',
    space: 'object',
    plane: 'mixed',
    grain: { scale: 12, amplitude: 0.025 },
  },
  {
    role: 'foliage',
    description:
      'Date-palm crowns along the canal greenbelt: gentle value variation keeps groves from reading as flat plastic.',
    space: 'object',
    plane: 'mixed',
    grain: { scale: 4, amplitude: 0.05 },
  },
  {
    role: 'farmland',
    description:
      'Peret-season field strips on the floodplain: subtle grain over the per-instance crop tones.',
    space: 'world',
    plane: 'xz',
    grain: { scale: 0.8, amplitude: 0.03 },
  },
];

const recipeByRole = new Map(MATERIAL_DETAIL_RECIPES.map((recipe) => [recipe.role, recipe]));

export function materialDetailFor(role: MaterialDetailRole): MaterialDetailRecipe {
  const recipe = recipeByRole.get(role);
  if (!recipe) throw new Error(`Unknown material detail role: ${role}`);
  return recipe;
}
