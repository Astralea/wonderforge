/**
 * Shared Bennelong Point / harbour sampler (Spec 13). Construction poses and
 * environment meshes must call this, never a renderer-private heightfield.
 *
 * Water sits at 0. The peninsula is a north-pointing capsule; Circular Quay
 * land continues south of the point. Harbour Bridge piers are west.
 */

export const SYDNEY_WATER_Y = 0;

export function sydneyTerrainHeightAt(x: number, z: number): number {
  const nx = x / 64;
  const nz = (z + 8) / 98;
  const peninsula = nx * nx + nz * nz * 0.62;
  if (peninsula < 1) {
    const shore = 1 - peninsula;
    return 0.35 + shore * 2.05;
  }
  if (z > 68 && z < 150 && Math.abs(x) < 92) {
    const quay = 1 - Math.min(1, Math.abs(x) / 92);
    return 1.15 + quay * 0.55;
  }
  if (x < -210 && x > -340 && z > -40 && z < 90) {
    return 1.4;
  }
  if (z < -165) {
    const nsx = (x + 40) / 200;
    const nsz = (z + 248) / 85;
    const north = nsx * nsx + nsz * nsz;
    if (north < 1) return 2.2 + (1 - north) * 18;
  }
  return SYDNEY_WATER_Y;
}

export function sydneyOnPeninsula(x: number, z: number): boolean {
  return sydneyTerrainHeightAt(x, z) > 0.2;
}

/** Peninsula land/water ellipse. Interior is land; `seaward` 1 is the
 *  authored shoreline and values above 1 sit in the harbour. Yaw follows
 *  the local tangent so waterline foam can ride the bank. */
export function sydneyPeninsulaShoreAt(
  theta: number,
  seaward = 1,
): { x: number; z: number; yaw: number } {
  const a = 64;
  const b = 98 / Math.sqrt(0.62);
  const x = a * Math.cos(theta) * seaward;
  const z = -8 + b * Math.sin(theta) * seaward;
  const dx = -a * Math.sin(theta);
  const dz = b * Math.cos(theta);
  return { x, z, yaw: Math.atan2(dx, dz) };
}
