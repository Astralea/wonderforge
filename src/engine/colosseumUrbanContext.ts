import { COLOSSEUM_AQUEDUCT as A } from '../data/colosseumAqueduct';
import { COLOSSEUM_URBAN_CONTEXT as C, type RomePoint } from '../data/colosseumUrbanContext';
import { AQUEDUCT_LENGTH, aqueductPointAt } from './colosseumAqueduct';
import { colosseumTerrainHeightAt } from './colosseumTerrain';

export function distanceToRomeSegment(x: number, z: number, a: RomePoint, b: RomePoint): number {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}

/** A conservative complete-footprint clearance, shared by buildings and trees. */
export function isClearOfRomeContext(x: number, z: number, radius: number): boolean {
  const p = C.precinct;
  if (Math.abs(x - p.center[0]) < p.width / 2 + radius + 2 &&
      Math.abs(z - p.center[1]) < p.depth / 2 + radius + 2) return false;
  // Northern staircase, whose width/approach are owned by the precinct plan.
  const stairFoot = C.streets.find(street => street.id === 'precinct-north-approach')!.points[0]!;
  if (Math.abs(x - p.center[0]) < p.northEntryWidth / 2 + radius + 2 &&
      z > p.center[1] + p.depth / 2 - radius && z < stairFoot[1] + radius) return false;
  if (distanceToRomeSegment(x, z, A.start, C.watercourse.upstream) < C.watercourse.corridorHalfWidth + radius) return false;
  for (const street of C.streets) {
    for (let i = 1; i < street.points.length; i++) {
      if (distanceToRomeSegment(x, z, street.points[i - 1]!, street.points[i]!) < street.width / 2 + radius) return false;
    }
  }
  return true;
}

/** Street fronts share the utility's axis, with courts behind instead of random scatter. */
export function createCaelianStreetFronts() {
  const lots: Array<{ kind: 'insula'; x: number; z: number; yaw: number; scale: number; district: 'caelian-watercourse' }> = [];
  for (const side of [-1, 1]) {
    for (let row = 0; row < 2; row++) {
      for (let bay = 0; bay < 11; bay++) {
        // Cross-street breaks separate small blocks; the second row is staggered.
        if (row === 1 && bay % 4 === 2) continue;
        const along = 25 + bay * 29 + row * 9;
        const offset = side * (49 + row * 32);
        const p = aqueductPointAt(along);
        const x = p.x - A.direction[1] * offset, z = p.z + A.direction[0] * offset;
        const scale = 1.2 + ((bay + row * 2 + (side + 1)) % 4) * .1;
        if (!isClearOfRomeContext(x, z, 7.4 * scale)) continue;
        lots.push({ kind: 'insula', x, z, yaw: -Math.atan2(A.direction[1], A.direction[0]) + (side < 0 ? Math.PI : 0), scale, district: 'caelian-watercourse' });
      }
    }
  }
  return lots;
}

export function caelianLotFoundation(lot: { x: number; z: number; yaw: number; scale: number }) {
  const corners: Array<{ x: number; z: number; ground: number }> = [];
  for (const [u, v] of [[-5.5,-4.6], [5.5,-4.6], [5.5,4.6], [-5.5,4.6]]) {
    const x = lot.x + (Math.cos(lot.yaw) * u! + Math.sin(lot.yaw) * v!) * lot.scale;
    const z = lot.z + (-Math.sin(lot.yaw) * u! + Math.cos(lot.yaw) * v!) * lot.scale;
    corners.push({ x, z, ground: colosseumTerrainHeightAt(x, z) });
  }
  return { corners, top: Math.max(colosseumTerrainHeightAt(lot.x, lot.z), ...corners.map(p => p.ground)) + .12 };
}

export function romeContextManifest() {
  return {
    ...C,
    aqueduct: { ...A, length: AQUEDUCT_LENGTH },
    streetFronts: createCaelianStreetFronts(),
    evidenceScope: 'Typed authored context and existing Blender kits; see dated browser captures for film acceptance.',
  };
}
