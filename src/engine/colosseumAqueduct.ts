import { COLOSSEUM_AQUEDUCT as A } from '../data/colosseumAqueduct';
import { colosseumTerrainHeightAt } from './colosseumTerrain';

export const AQUEDUCT_PITCH = A.clearSpan + A.pierWidth;
export const AQUEDUCT_LENGTH = (A.pierCount - 1) * AQUEDUCT_PITCH;

export function aqueductPointAt(distance: number) {
  return {
    x: A.start[0] + A.direction[0] * distance,
    z: A.start[1] + A.direction[1] * distance,
    springing: A.springingHeight + distance * A.grade,
  };
}

export function aqueductPierAt(index: number) {
  const distance = index * AQUEDUCT_PITCH;
  const point = aqueductPointAt(distance);
  // Embed the bottom under the lowest corner rather than leave an uphill
  // footing floating. The top remains on the continuous conduit grade.
  let ground = Infinity;
  for (const along of [-A.pierWidth / 2, A.pierWidth / 2]) {
    for (const across of [-A.depth / 2, A.depth / 2]) {
      const x = point.x + A.direction[0] * along - A.direction[1] * across;
      const z = point.z + A.direction[1] * along + A.direction[0] * across;
      ground = Math.min(ground, colosseumTerrainHeightAt(x, z));
    }
  }
  return { ...point, distance, ground: ground - 0.05 };
}
