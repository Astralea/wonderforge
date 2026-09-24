/**
 * Shared alluvial-valley sampler for the Flavian amphitheatre (Spec 12).
 * Construction poses and environment meshes must call this, not a private
 * renderer heightfield.
 *
 * Palatine and Caelian are real — the oval sits in Nero's lakebed between
 * them — but their crests stay below the 48 m facade so the amphitheatre
 * remains the tallest thing in the shot.
 */

export interface ColosseumHill {
  id: 'palatine' | 'caelian' | 'esquiline' | 'aventine' | 'quirinal' | 'viminal' | 'janiculum';
  x: number;
  z: number;
  sigma: number;
  height: number;
}

export const COLOSSEUM_HILLS: readonly ColosseumHill[] = [
  { id: 'palatine', x: -400, z: -80, sigma: 145, height: 26 },
  { id: 'caelian', x: 90, z: -380, sigma: 125, height: 22 },
  { id: 'esquiline', x: 300, z: 260, sigma: 140, height: 14 },
  { id: 'aventine', x: -340, z: 280, sigma: 130, height: 12 },
  { id: 'quirinal', x: -220, z: -620, sigma: 130, height: 18 },
  { id: 'viminal', x: 280, z: -540, sigma: 120, height: 16 },
  { id: 'janiculum', x: -720, z: 80, sigma: 160, height: 22 },
];

export function colosseumHillCrestHeight(): number {
  return Math.max(...COLOSSEUM_HILLS.map((hill) => hill.height));
}

export function colosseumTerrainHeightAt(x: number, z: number): number {
  const site = Math.hypot(x, z);
  const flatten = site <= 140 ? 0 : site >= 220 ? 1 : (site - 140) / 80;
  let height = 0;
  for (const hill of COLOSSEUM_HILLS) {
    const dx = x - hill.x;
    const dz = z - hill.z;
    height += Math.exp(-(dx * dx + dz * dz) / (2 * hill.sigma * hill.sigma)) * hill.height;
  }
  return height * flatten;
}

/** Damp silt of Nero's drained lakebed (0 outside the oval, 1 at the arena). */
export function colosseumLakeScarWeight(x: number, z: number): number {
  const e = Math.hypot(x / 102, z / 86);
  if (e >= 1) return 0;
  return (1 - e) * (1 - e);
}
