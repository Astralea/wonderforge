/**
 * Shared Champ de Mars sampler (Spec 14). Construction poses and environment
 * meshes must call this, not a private renderer heightfield.
 */

export const EIFFEL_SEINE_WATER_Y = 0.2;

export function eiffelTerrainHeightAt(x: number, z: number): number {
  const champ = Math.exp(-(x ** 2 + (z - 20) ** 2) / (2 * 140 ** 2)) * -0.35;
  const riverBank = Math.max(0, (-z - 90) / 80) * -1.8;
  const ecole = Math.exp(-(x ** 2 + (z - 280) ** 2) / (2 * 90 ** 2)) * 6.5;
  const trocadero = Math.exp(-(x ** 2 + (z + 240) ** 2) / (2 * 70 ** 2)) * 14;
  const eastYard = Math.exp(-((x - 150) ** 2 + (z - 40) ** 2) / (2 * 50 ** 2)) * 1.4;
  const relief = champ + riverBank + ecole + trocadero + eastYard;
  // Prepared, level erection footprint for the Blender model's foundation soles.
  const edge = Math.max(Math.abs(x), Math.abs(z));
  const blend = Math.max(0, Math.min(1, (edge - 66) / 20));
  const prepared = relief * blend * blend * (3 - 2 * blend);
  // Carve a continuous channel under the actual rotated water plane. A water
  // sheet over the old Trocadero hill left islands of turf and floating barges.
  const across = Math.abs(Math.sin(.08) * x + Math.cos(.08) * (z + 175));
  const shoreT = Math.max(0, Math.min(1, (across - 54) / 18));
  const shore = shoreT * shoreT * (3 - 2 * shoreT);
  return (EIFFEL_SEINE_WATER_Y - 3.8) * (1 - shore) + prepared * shore;
}
