/**
 * Shared Siq / plaza height sampler for Petra (Spec 11).
 *
 * Engine poses and renderer meshes must both consume this function. A private
 * renderer heightfield plus a flat haul plane is how stones float.
 */

export function petraTerrainHeightAt(x: number, z: number): number {
  const undulation = 0.045 * Math.sin(z * 0.13) + 0.02 * Math.sin(x * 0.21 + z * 0.08);
  const downSiq = Math.max(0, -z - 6) * 0.0035;
  const dumpDish = z < -40 ? Math.min(0.55, (-z - 40) * 0.012) : 0;
  return undulation + downSiq - dumpDish;
}
