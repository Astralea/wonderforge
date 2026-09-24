import { mulberry32 } from './random';
import { COLOSSEUM_A, COLOSSEUM_B } from '../data/colosseumConstruction';
import { COLOSSEUM_HILLS, colosseumTerrainHeightAt } from './colosseumTerrain';

export type ColosseumRomeKind = 'insula' | 'palace' | 'pine' | 'cypress';

export interface ColosseumRomeLot {
  kind: ColosseumRomeKind;
  x: number;
  z: number;
  yaw: number;
  scale: number;
}

const OVAL_KEEP = 2.15;

function onOval(x: number, z: number): boolean {
  return Math.hypot(x / COLOSSEUM_A, z / COLOSSEUM_B) < OVAL_KEEP;
}

function onHaul(x: number, z: number): boolean {
  return x > 88 && x < 240 && Math.abs(z) < 48;
}

function valleyFootLots(
  rand: () => number,
  kind: ColosseumRomeKind,
  count: number,
  minR: number,
  maxR: number,
): ColosseumRomeLot[] {
  const lots: ColosseumRomeLot[] = [];
  let attempts = 0;
  while (lots.length < count && attempts < count * 16) {
    attempts += 1;
    const angle = rand() * Math.PI * 2;
    const radius = minR + rand() * (maxR - minR);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (onOval(x, z) || onHaul(x, z)) continue;
    lots.push({
      kind,
      x,
      z,
      yaw: facingValley(x, z) + (rand() - 0.5) * 0.16,
      scale: kind === 'palace' ? 1.05 + rand() * 0.28 : 1.35 + rand() * 0.7,
    });
  }
  return lots;
}

function facingValley(x: number, z: number): number {
  return Math.atan2(-x, -z);
}

function gridLots(
  rand: () => number,
  hillId: (typeof COLOSSEUM_HILLS)[number]['id'],
  cols: number,
  rows: number,
  spacingX: number,
  spacingZ: number,
  kind: ColosseumRomeKind,
  minGround: number,
): ColosseumRomeLot[] {
  const hill = COLOSSEUM_HILLS.find((item) => item.id === hillId);
  if (!hill) return [];
  const lots: ColosseumRomeLot[] = [];
  const yaw0 = facingValley(hill.x, hill.z);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      // Every third column is a street; every fourth row is a cross-lane.
      if (col % 3 === 1 || row % 4 === 2) continue;
      const jitterX = (rand() - 0.5) * spacingX * 0.18;
      const jitterZ = (rand() - 0.5) * spacingZ * 0.18;
      const localX = (col - (cols - 1) / 2) * spacingX + jitterX;
      const localZ = (row - (rows - 1) / 2) * spacingZ + jitterZ;
      const x = hill.x + Math.cos(yaw0) * localX - Math.sin(yaw0) * localZ;
      const z = hill.z + Math.sin(yaw0) * localX + Math.cos(yaw0) * localZ;
      if (onOval(x, z) || onHaul(x, z)) continue;
      const ground = colosseumTerrainHeightAt(x, z);
      if (ground < minGround) continue;
      const streetYaw = col % 3 === 0 ? yaw0 : yaw0 + Math.PI / 2;
      lots.push({
        kind,
        x,
        z,
        yaw: streetYaw + (rand() - 0.5) * 0.1,
        scale: kind === 'palace' ? 1.15 + rand() * 0.35 : 1.55 + rand() * 0.9,
      });
    }
  }
  return lots;
}

function ridgePines(
  rand: () => number,
  hillId: (typeof COLOSSEUM_HILLS)[number]['id'],
  count: number,
  kind: ColosseumRomeKind,
): ColosseumRomeLot[] {
  const hill = COLOSSEUM_HILLS.find((item) => item.id === hillId);
  if (!hill) return [];
  const lots: ColosseumRomeLot[] = [];
  let attempts = 0;
  while (lots.length < count && attempts < count * 14) {
    attempts += 1;
    const angle = rand() * Math.PI * 2;
    const radius = hill.sigma * (0.38 + rand() * 0.55);
    const x = hill.x + Math.cos(angle) * radius;
    const z = hill.z + Math.sin(angle) * radius * 0.84;
    if (onOval(x, z)) continue;
    if (colosseumTerrainHeightAt(x, z) < 3.2) continue;
    lots.push({
      kind,
      x,
      z,
      yaw: rand() * Math.PI * 2,
      scale: kind === 'pine' ? 1.45 + rand() * 0.7 : 1.05 + rand() * 0.5,
    });
  }
  return lots;
}

/** Street-lot Rome on the four near rises plus a farther city ring. Deterministic. */
export function createColosseumRomeLots(): ColosseumRomeLot[] {
  const rand = mulberry32('colosseum-rome-street-lots');
  return [
    ...gridLots(rand, 'palatine', 12, 10, 19, 17, 'insula', 0.7),
    ...gridLots(rand, 'caelian', 11, 9, 19, 17, 'insula', 0.6),
    ...gridLots(rand, 'esquiline', 10, 8, 20, 18, 'insula', 0.6),
    ...gridLots(rand, 'aventine', 10, 8, 20, 18, 'insula', 0.5),
    ...gridLots(rand, 'quirinal', 10, 8, 20, 18, 'insula', 0.8),
    ...gridLots(rand, 'viminal', 9, 7, 20, 18, 'insula', 0.7),
    ...gridLots(rand, 'janiculum', 8, 6, 22, 19, 'insula', 0.9),
    ...gridLots(rand, 'palatine', 5, 3, 26, 22, 'palace', 4.5),
    ...gridLots(rand, 'caelian', 4, 3, 26, 20, 'palace', 3.2),
    ...gridLots(rand, 'esquiline', 4, 2, 28, 22, 'palace', 2.4),
    ...gridLots(rand, 'quirinal', 4, 2, 28, 22, 'palace', 3.5),
    ...gridLots(rand, 'janiculum', 3, 2, 30, 24, 'palace', 4.5),
    ...valleyFootLots(rand, 'insula', 72, 210, 305),
    ...valleyFootLots(rand, 'pine', 36, 230, 340),
    ...ridgePines(rand, 'palatine', 80, 'pine'),
    ...ridgePines(rand, 'caelian', 70, 'pine'),
    ...ridgePines(rand, 'esquiline', 55, 'pine'),
    ...ridgePines(rand, 'aventine', 48, 'pine'),
    ...ridgePines(rand, 'quirinal', 52, 'pine'),
    ...ridgePines(rand, 'viminal', 42, 'pine'),
    ...ridgePines(rand, 'janiculum', 58, 'pine'),
    ...ridgePines(rand, 'palatine', 28, 'cypress'),
    ...ridgePines(rand, 'caelian', 24, 'cypress'),
    ...ridgePines(rand, 'esquiline', 18, 'cypress'),
    ...ridgePines(rand, 'aventine', 16, 'cypress'),
    ...ridgePines(rand, 'quirinal', 16, 'cypress'),
    ...ridgePines(rand, 'viminal', 12, 'cypress'),
    ...ridgePines(rand, 'janiculum', 18, 'cypress'),
  ];
}

export const COLOSSEUM_ROME_LOTS = createColosseumRomeLots();

export function colosseumRomeLotsOf(kind: ColosseumRomeKind): ColosseumRomeLot[] {
  return COLOSSEUM_ROME_LOTS.filter((lot) => lot.kind === kind);
}
