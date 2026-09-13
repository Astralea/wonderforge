/**
 * Shared alluvial-valley sampler for the Flavian amphitheatre (Spec 12).
 * Construction poses and environment meshes must call this, not a private
 * renderer heightfield.
 */

export function colosseumTerrainHeightAt(x: number, z: number): number {
  const site = Math.hypot(x, z);
  const flatten = site <= 125 ? 0 : site >= 175 ? 1 : (site - 125) / 50;
  const palatine = Math.exp(-((x + 260) ** 2 + (z + 90) ** 2) / (2 * 70 ** 2)) * 42;
  const caelian = Math.exp(-((x - 40) ** 2 + (z + 280) ** 2) / (2 * 64 ** 2)) * 36;
  const esquiline = Math.exp(-((x - 40) ** 2 + (z - 250) ** 2) / (2 * 72 ** 2)) * 26;
  const aventine = Math.exp(-((x + 210) ** 2 + (z - 170) ** 2) / (2 * 58 ** 2)) * 22;
  return (palatine + caelian + esquiline + aventine) * flatten;
}

/** Nero's lake recedes during INTRO; zero after the foundation wave. */
export function colosseumLakeLevelAt(t: number): number {
  if (t >= 0.16) return 0;
  const u = t / 0.16;
  return 1.15 * (1 - u * u * (3 - 2 * u));
}
