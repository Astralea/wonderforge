/**
 * Canonical data model — Spec 01.
 * Pure data + types only; no React, no THREE.
 */

export type Era =
  | 'ancient'
  | 'classical'
  | 'medieval'
  | 'renaissance'
  | 'industrial'
  | 'modern';

export interface Quote {
  text: string;
  author: string;
}

export interface WonderPalette {
  ground: string;
  primary: string;
  accent: string;
  sky: string;
}

export type ShapeKind =
  | 'box'
  | 'cylinder'
  | 'cone'
  | 'pyramid'
  | 'prism'
  | 'sphere'
  | 'torus'
  /** Earthen construction wedge: low at +z, high at -z. */
  | 'ramp'
  /** Curved spherical-cap shell (Sydney Opera House sails). */
  | 'sail';

export type MaterialKey =
  | 'primary'
  | 'accent'
  | 'ground'
  | 'foliage'
  | 'water'
  | 'light'
  /** Near-black recesses: doorways, window openings, arcade voids. */
  | 'shadow'
  /** Pale finished/casing stone, derived from the wonder's primary color. */
  | 'casing';

/**
 * Construction truth (Spec 02 §Construction truth): solids are placed or
 * carved — never scaled.
 */
export type Entrance =
  /** additive: hovers in from the site yard at full size, settles with a dip */
  | 'place'
  /** additive masonry: place + ripple by order */
  | 'stack'
  /** subtractive: rock/debris present from the start, removed top-down */
  | 'carve'
  /** non-solids only (water, glass, light): opacity ramp, never scaled */
  | 'fade'
  /** scaffolding lifecycle: rises before its stage, sinks after (life.ts) */
  | 'scaffold'
  /** site features present from the first frame */
  | 'none';

export interface Part {
  shape: ShapeKind;
  material: MaterialKey;
  /** [x, y, z] — y is the BOTTOM of the part (it sits on y). */
  position: [number, number, number];
  /** World dimensions: [width, height, depth]. */
  scale: [number, number, number];
  /** Radians, applied X then Y then Z. */
  rotation?: [number, number, number];
  /** How the part is constructed. Default: 'place'. */
  entrance?: Entrance;
  /** Ripple order for 'stack' entrances (0 = first). */
  order?: number;
  /** Max horizontal displacement (world units) applied via seeded PRNG. */
  jitter?: number;
}

export interface Stage {
  name: string;
  parts: Part[];
  /**
   * Rhythm weight (Spec 02 §Construction timeline): heavier stages get longer
   * windows. Default 1.
   */
  weight?: number;
}

export interface StructureSpec {
  stages: Stage[];
  /** Radians — camera azimuth at t=0. Default 0. */
  startAzimuth?: number;
  /** Full camera turns across the movie. Default 1.25. */
  turns?: number;
  /** Multiplier on the derived orbit radius. Below 1 frames tighter. */
  framing?: number;
}

export interface Wonder {
  id: string;
  name: string;
  location: string;
  region: string;
  era: Era;
  /** Negative = BC. */
  completedYear: number;
  endsAtNight: boolean;
  quote: Quote;
  description: string;
  facts: string[];
  palette: WonderPalette;
  structure: StructureSpec;
}
