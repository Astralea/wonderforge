import { mulberry32 } from './random';
import { SYDNEY_CONSTRUCTION } from '../data/sydneyConstruction';
import {
  SYDNEY_BRIDGE,
  sydneyGroundKindAt,
  sydneyTerrainHeightAt,
  type SydneyGroundKind,
} from './sydneyTerrain';

export type SydneyHarbourKind = 'shed' | 'office' | 'terrace' | 'fig';

export interface SydneyHarbourLot {
  kind: SydneyHarbourKind;
  x: number;
  z: number;
  yaw: number;
  scale: number;
  storeys: number;
}

function inKeepOut(x: number, z: number): boolean {
  return SYDNEY_CONSTRUCTION.keepOuts.some(
    (box) => x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ,
  );
}

function nearBridgeSpan(x: number, z: number): boolean {
  if (Math.abs(x - SYDNEY_BRIDGE.x) > 36) return false;
  const mid = (SYDNEY_BRIDGE.northZ + SYDNEY_BRIDGE.southZ) / 2;
  return Math.abs(z - mid) < 58;
}

function tryLot(
  lots: SydneyHarbourLot[],
  lot: SydneyHarbourLot,
  minGround: number,
  allowed: readonly SydneyGroundKind[],
): boolean {
  if (inKeepOut(lot.x, lot.z) || nearBridgeSpan(lot.x, lot.z)) return false;
  if (sydneyTerrainHeightAt(lot.x, lot.z) < minGround) return false;
  if (!allowed.includes(sydneyGroundKindAt(lot.x, lot.z))) return false;
  lots.push(lot);
  return true;
}

function addGrid(
  lots: SydneyHarbourLot[],
  rand: () => number,
  kind: Exclude<SydneyHarbourKind, 'fig'>,
  originX: number,
  originZ: number,
  cols: number,
  rows: number,
  spacingX: number,
  spacingZ: number,
  yaw: number,
  allowed: readonly SydneyGroundKind[],
  minGround: number,
  storeysFor: (col: number, row: number, rand: () => number) => number,
): void {
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (kind === 'shed' && col % 4 === 2) continue;
      if (kind === 'office' && (col % 3 === 1 || row % 4 === 2)) continue;
      if (kind === 'terrace' && row % 5 === 2) continue;
      const x = originX + (col - (cols - 1) / 2) * spacingX + (rand() - 0.5) * spacingX * 0.16;
      const z = originZ + (row - (rows - 1) / 2) * spacingZ + (rand() - 0.5) * spacingZ * 0.14;
      const scale =
        kind === 'office' ? 1.08 + rand() * 0.5 : kind === 'shed' ? 1.12 + rand() * 0.32 : 0.88 + rand() * 0.26;
      tryLot(
        lots,
        { kind, x, z, yaw: yaw + (rand() - 0.5) * 0.08, scale, storeys: storeysFor(col, row, rand) },
        minGround,
        allowed,
      );
    }
  }
}

function addFigCluster(
  lots: SydneyHarbourLot[],
  rand: () => number,
  originX: number,
  originZ: number,
  count: number,
  spreadX: number,
  spreadZ: number,
  allowed: readonly SydneyGroundKind[],
): void {
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < count * 18) {
    attempts += 1;
    const x = originX + (rand() - 0.5) * spreadX;
    const z = originZ + (rand() - 0.5) * spreadZ;
    if (
      tryLot(
        lots,
        { kind: 'fig', x, z, yaw: rand() * Math.PI * 2, scale: 0.95 + rand() * 0.5, storeys: 1 },
        1.15,
        allowed,
      )
    ) {
      placed += 1;
    }
  }
}

/** Compressed 1966 harbour neighbourhoods. Deterministic. */
export function createSydneyHarbourLots(): SydneyHarbourLot[] {
  const rand = mulberry32('sydney-harbour-lots-1966');
  const lots: SydneyHarbourLot[] = [];
  addGrid(lots, rand, 'shed', -8, 118, 8, 3, 22, 16, 0, ['quay', 'point'], 1.1, () => 1);
  addGrid(
    lots,
    rand,
    'office',
    8,
    250,
    11,
    7,
    22,
    20,
    0.02,
    ['city'],
    2,
    (col, row, r) => 6 + ((col + row) % 7) + Math.floor(r() * 4),
  );
  addGrid(
    lots,
    rand,
    'office',
    -90,
    268,
    7,
    5,
    24,
    22,
    -0.08,
    ['city'],
    2,
    (col, row, r) => 5 + ((col * 3 + row) % 6) + Math.floor(r() * 3),
  );
  addGrid(lots, rand, 'terrace', -40, -150, 9, 5, 12, 14, 0.12, ['north'], 1.8, () => 2);
  addGrid(lots, rand, 'terrace', -160, -128, 6, 4, 13, 15, -0.2, ['north'], 1.8, () => 2);
  addFigCluster(lots, rand, 28, 86, 14, 70, 46, ['garden', 'quay', 'point']);
  addFigCluster(lots, rand, -36, 72, 8, 48, 28, ['quay', 'point']);
  addFigCluster(lots, rand, -70, -168, 12, 90, 50, ['north']);
  addFigCluster(lots, rand, 110, 108, 10, 54, 36, ['garden']);
  addFigCluster(lots, rand, 150, 70, 16, 70, 44, ['garden']);
  return lots;
}

export const SYDNEY_HARBOUR_LOTS = createSydneyHarbourLots();

export function sydneyHarbourLotsOf(kind: SydneyHarbourKind): SydneyHarbourLot[] {
  return SYDNEY_HARBOUR_LOTS.filter((lot) => lot.kind === kind);
}
