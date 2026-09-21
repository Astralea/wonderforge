/**
 * Shared Bennelong Point / harbour sampler (Spec 13). Construction poses and
 * environment meshes must call this, never a renderer-private heightfield.
 *
 * Water sits at 0. The peninsula is a north-pointing capsule; Circular Quay
 * land continues south of the point. Harbour Bridge pylons sit on local
 * abutments; the arch span is water.
 */

export const SYDNEY_WATER_Y = 0;

export const SYDNEY_BRIDGE = {
  x: -268,
  southZ: 88,
  northZ: -52,
  deckY: 48,
  archRise: 54,
  pylonHalfW: 18,
  pylonHalfD: 14,
} as const;

export type SydneyGroundKind =
  | 'water'
  | 'point'
  | 'quay'
  | 'garden'
  | 'city'
  | 'abutment'
  | 'north';

function peninsulaHeight(x: number, z: number): number {
  const nx = x / 64;
  const nz = (z + 8) / 98;
  const peninsula = nx * nx + nz * nz * 0.62;
  if (peninsula >= 1) return 0;
  return 0.35 + (1 - peninsula) * 2.05;
}

function quayHeight(x: number, z: number): number {
  if (z <= 68 || z >= 158 || Math.abs(x) >= 108) return 0;
  const quay = 1 - Math.min(1, Math.abs(x) / 108);
  return 1.15 + quay * 0.55;
}

function gardenHeight(x: number, z: number): number {
  if (x <= 72 || x >= 210 || z <= 48 || z >= 148) return 0;
  const gx = (x - 132) / 68;
  const gz = (z - 96) / 46;
  const garden = gx * gx + gz * gz;
  if (garden >= 1) return 0;
  return 1.5 + (1 - garden) * 5.8;
}

function cityHeight(x: number, z: number): number {
  if (z <= 152 || z >= 390 || Math.abs(x) >= 248) return 0;
  const edgeZ = Math.min(1, (z - 152) / 22);
  const edgeX = 1 - Math.min(1, Math.max(0, (Math.abs(x) - 200) / 48));
  return (2.1 + (z - 152) * 0.01) * edgeZ * edgeX;
}

function abutmentHeight(x: number, z: number): number {
  const bx = SYDNEY_BRIDGE.x;
  const south = ((x - bx) / 28) ** 2 + ((z - SYDNEY_BRIDGE.southZ) / 18) ** 2;
  if (south < 1) return 2.1 + (1 - south) * 1.4;
  const north = ((x - bx) / 28) ** 2 + ((z - SYDNEY_BRIDGE.northZ) / 18) ** 2;
  if (north < 1) return 2.1 + (1 - north) * 1.4;
  return 0;
}

function northShoreHeight(x: number, z: number): number {
  if (z < -165) {
    const nsx = (x + 40) / 200;
    const nsz = (z + 248) / 85;
    const north = nsx * nsx + nsz * nsz;
    if (north < 1) return 2.2 + (1 - north) * 18;
  }
  if (z < -78 && z > -210 && x > -330 && x < 70) {
    const kx = (x + 90) / 168;
    const kz = (z + 142) / 58;
    const kirribilli = kx * kx * 0.72 + kz * kz;
    if (kirribilli < 1) return 1.7 + (1 - kirribilli) * 9.4;
  }
  return 0;
}

export function sydneyTerrainHeightAt(x: number, z: number): number {
  return Math.max(
    peninsulaHeight(x, z),
    quayHeight(x, z),
    gardenHeight(x, z),
    cityHeight(x, z),
    abutmentHeight(x, z),
    northShoreHeight(x, z),
    SYDNEY_WATER_Y,
  );
}

export function sydneyGroundKindAt(x: number, z: number): SydneyGroundKind {
  const height = sydneyTerrainHeightAt(x, z);
  if (height <= 0.2) return 'water';
  const scores: Array<readonly [SydneyGroundKind, number]> = [
    ['point', peninsulaHeight(x, z)],
    ['quay', quayHeight(x, z)],
    ['garden', gardenHeight(x, z)],
    ['city', cityHeight(x, z)],
    ['abutment', abutmentHeight(x, z)],
    ['north', northShoreHeight(x, z)],
  ];
  let kind: SydneyGroundKind = 'point';
  let best = -1;
  for (const [name, value] of scores) {
    if (value > best) {
      best = value;
      kind = name;
    }
  }
  return kind;
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
