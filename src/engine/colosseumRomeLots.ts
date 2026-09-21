import { mulberry32 } from './random';
import { COLOSSEUM_URBAN_CONTEXT } from '../data/colosseumUrbanContext';
import { COLOSSEUM_A, COLOSSEUM_B } from '../data/colosseumConstruction';
import { COLOSSEUM_HILLS, colosseumTerrainHeightAt } from './colosseumTerrain';
import { createCaelianStreetFronts, isClearOfRomeContext, caelianLotFoundation } from './colosseumUrbanContext';
import { COLOSSEUM_HOUSING_HALF_WIDTH, COLOSSEUM_HOUSING_HALF_DEPTH, COLOSSEUM_HOUSING_RADIUS, type ColosseumHousingId } from '../data/colosseumHousing';

export type ColosseumRomeKind = 'insula' | 'palace' | 'pine' | 'cypress';

export interface ColosseumRomeLot {
  kind: ColosseumRomeKind;
  x: number;
  z: number;
  yaw: number;
  scale: number;
  district?: string;
  housing?: ColosseumHousingId;
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
      // Connected short street fronts, staggered cross-lanes and courtyards.
      // District-dependent breaks avoid the former identical checkerboard.
      const offset = hillId === 'palatine' || hillId === 'velia' ? 1 : 0;
      if ((col + offset) % 4 === 3 || (row + offset) % 5 === 4) continue;
      const jitterX = (rand() - 0.5) * spacingX * 0.18;
      const jitterZ = (rand() - 0.5) * spacingZ * 0.18;
      const localX = (col - (cols - 1) / 2 + (row % 2) * .25) * spacingX + jitterX;
      const localZ = (row - (rows - 1) / 2) * spacingZ + jitterZ;
      const x = hill.x + Math.cos(yaw0) * localX + Math.sin(yaw0) * localZ;
      const z = hill.z - Math.sin(yaw0) * localX + Math.cos(yaw0) * localZ;
      if (onOval(x, z) || onHaul(x, z)) continue;
      const ground = colosseumTerrainHeightAt(x, z);
      if (ground < minGround) continue;
      const streetYaw = yaw0 + (row % 2 ? Math.PI : 0);
      lots.push({
        kind,
        x,
        z,
        yaw: streetYaw + (rand() - 0.5) * 0.1,
        scale: kind === 'palace' ? 1.1 + rand() * .22 : 1.12 + rand() * .24,
        district: hillId,
        ...(kind === 'insula' ? { housing: housingForStreet(hillId, row, col) } : {}),
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

/** Buildings face the same connected lanes rendered in the urban context. */
function westernStreetFronts(): ColosseumRomeLot[] {
  const lots: ColosseumRomeLot[] = [];
  for (const street of COLOSSEUM_URBAN_CONTEXT.streets.filter(item => item.id === 'velia-palatine-lane' || item.id === 'velia-north-lane')) {
    for (let segment = 1; segment < street.points.length; segment++) {
      const a = street.points[segment-1]!, b = street.points[segment]!;
      const length = Math.hypot(b[0]-a[0], b[1]-a[1]);
      const dx = (b[0]-a[0])/length, dz = (b[1]-a[1])/length;
      const bays = Math.floor(length/18);
      for (let bay = 0; bay < bays; bay++) for (const side of [-1, 1]) {
        const along = (bay+.5)*length/bays;
        const offset = side*(street.width/2+11);
        const x = a[0]+dx*along-dz*offset, z = a[1]+dz*along+dx*offset;
        if (onOval(x,z) || onHaul(x,z)) continue;
        lots.push({ kind:'insula', x,z, yaw:-Math.atan2(dz,dx)+(side>0?Math.PI:0),
          scale:1.14+((bay+segment)%3)*.055, district:street.id,
          housing: housingForStreet('western-lane',segment,bay+(side>0?2:0)) });
      }
    }
  }
  return lots;
}

/** Street-lot Rome on the four near rises plus a farther city ring. Deterministic. */
export function createColosseumRomeLots(): ColosseumRomeLot[] {
  const rand = mulberry32('colosseum-rome-street-lots');
  const streets: ColosseumRomeLot[] = createCaelianStreetFronts().map((lot, i) => ({ ...lot, housing: housingForStreet('caelian-watercourse', Math.floor(i / 10), i) }));
  const existing = [
    ...gridLots(rand, 'palatine', 13, 10, 17, 15.5, 'insula', 0.7),
    ...gridLots(rand, 'caelian', 11, 9, 17, 16, 'insula', 0.6),
    ...gridLots(rand, 'esquiline', 10, 8, 20, 18, 'insula', 0.6),
    ...gridLots(rand, 'aventine', 10, 8, 20, 18, 'insula', 0.5),
    ...gridLots(rand, 'quirinal', 10, 8, 20, 18, 'insula', 0.8),
    ...gridLots(rand, 'viminal', 9, 7, 20, 18, 'insula', 0.7),
    ...gridLots(rand, 'janiculum', 11, 7, 20, 18, 'insula', 0.9),
    ...gridLots(rand, 'velia', 13, 7, 17, 16, 'insula', 0.5),
    ...gridLots(rand, 'oppian', 7, 5, 18, 16, 'insula', 0.5),
    ...gridLots(rand, 'palatine', 5, 3, 26, 22, 'palace', 4.5),
    ...gridLots(rand, 'caelian', 4, 3, 26, 20, 'palace', 3.2),
    ...gridLots(rand, 'esquiline', 4, 2, 28, 22, 'palace', 2.4),
    ...gridLots(rand, 'quirinal', 4, 2, 28, 22, 'palace', 3.5),
    ...gridLots(rand, 'janiculum', 3, 2, 30, 24, 'palace', 4.5),
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
  // Streets have priority, then larger district wings, then residences and trees.
  // Full rotated footprints keep neighbouring blocks physically separate while
  // allowing genuine narrow alleys instead of radius-based empty circles.
  const accepted = [...streets];
  const priority = (lot: ColosseumRomeLot) => lot.kind === 'palace' ? 0 : lot.kind === 'insula' ? 1 : 2;
  for (const lot of [...westernStreetFronts(), ...existing.sort((a, b) => priority(a) - priority(b))]) {
    const radius = romeLotRadius(lot);
    if (!isClearOfRomeContext(lot.x, lot.z, radius)) continue;
    if (streets.some(front => Math.hypot(front.x-lot.x, front.z-lot.z) < radius + romeLotRadius(front) + 2)) continue;
    const building = lot.kind === 'insula' || lot.kind === 'palace';
    if (accepted.some(other => {
      const otherBuilding = other.kind === 'insula' || other.kind === 'palace';
      return (building || otherBuilding) && romeLotsOverlap(lot, other, 1.2);
    })) continue;
    accepted.push(lot);
  }
  return accepted;
}

export function romeLotRadius(lot: ColosseumRomeLot): number {
  // Includes overhanging roofs/crowns, not just wall or trunk centres.
  return (lot.kind === 'insula' ? COLOSSEUM_HOUSING_RADIUS : lot.kind === 'palace' ? 10.5 : lot.kind === 'pine' ? 5.5 : 1.8) * lot.scale;
}

/** Repeat short street rhythms, never a single silhouette across a hill. */
function housingForStreet(district: string, row: number, col: number): ColosseumHousingId {
  if ((col + row * 3) % 7 === 0) return 'corner';
  if ((col + row) % 4 === 0) return 'stepped';
  if (district === 'palatine' || district === 'janiculum') return (col + row) % 3 ? 'courtyard' : 'frontage';
  return (col + row) % 3 ? 'frontage' : 'courtyard';
}

function halfExtents(lot: ColosseumRomeLot): readonly [number, number] {
  const size: readonly [number, number] = lot.kind === 'insula'
    ? [COLOSSEUM_HOUSING_HALF_WIDTH, COLOSSEUM_HOUSING_HALF_DEPTH]
    : lot.kind === 'palace' ? [9, 5.6] : lot.kind === 'pine' ? [5.5, 5.5] : [1.8, 1.8];
  return [size[0] * lot.scale, size[1] * lot.scale];
}

/** Separating-axis check on complete yawed roof/base bounds, including an alley. */
export function romeLotsOverlap(a: ColosseumRomeLot, b: ColosseumRomeLot, alley = 0): boolean {
  const axes = (lot: ColosseumRomeLot) => [[Math.cos(lot.yaw), -Math.sin(lot.yaw)], [Math.sin(lot.yaw), Math.cos(lot.yaw)]] as const;
  const aa = axes(a), ba = axes(b), ah = halfExtents(a), bh = halfExtents(b);
  for (const axis of [...aa, ...ba]) {
    const span = (basis: typeof aa, half: readonly [number, number]) =>
      Math.abs(axis[0] * basis[0][0] + axis[1] * basis[0][1]) * half[0] +
      Math.abs(axis[0] * basis[1][0] + axis[1] * basis[1][1]) * half[1];
    if (Math.abs((b.x-a.x)*axis[0] + (b.z-a.z)*axis[1]) >= span(aa,ah) + span(ba,bh) + alley) return false;
  }
  return true;
}

/** Terrain sampling and level support shared by the renderer and contracts. */
export function romeHousingFoundation(lot: ColosseumRomeLot) {
  const half = halfExtents(lot);
  const samples: Array<{x:number; z:number; ground:number}> = [];
  for (const u of [-1, 0, 1]) for (const v of [-1, 0, 1]) {
    const x = lot.x + Math.cos(lot.yaw) * u * half[0] + Math.sin(lot.yaw) * v * half[1];
    const z = lot.z - Math.sin(lot.yaw) * u * half[0] + Math.cos(lot.yaw) * v * half[1];
    samples.push({ x, z, ground: colosseumTerrainHeightAt(x, z) });
  }
  const top = lot.district === 'caelian-watercourse' ? caelianLotFoundation(lot).top : Math.max(...samples.map(p => p.ground)) + .12;
  return { top, bottom: Math.min(...samples.map(p => p.ground)) - .18, half, samples };
}

export const COLOSSEUM_ROME_LOTS = createColosseumRomeLots();

export function colosseumRomeLotsOf(kind: ColosseumRomeKind): ColosseumRomeLot[] {
  return COLOSSEUM_ROME_LOTS.filter((lot) => lot.kind === kind);
}
