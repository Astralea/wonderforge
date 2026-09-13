import type { UnitScale, Vec3 } from './constructionTypes';
import type {
  PetraConstructionPlan,
  PetraKeepOut,
  PetraLayer,
  PetraRockMember,
  PetraRoute,
  PetraSpoilCell,
} from './petraTypes';
import { mulberry32 } from '../engine/random';

export const PETRA_FACADE_WIDTH = 24.9;
export const PETRA_FACADE_HEIGHT = 38.8;
export const PETRA_MAX_ACTIVE = 12;
export const PETRA_SLED_BED_HEIGHT = 0.28;
export const PETRA_SPOIL_COLUMNS = 8;
export const PETRA_SPOIL_ROWS = 10;

const UNIT: UnitScale = [1, 1, 1];
const LAYERS: PetraLayer[] = [
  { id: 'dry-rift-sky', depth: 0, motion: 'playback-time' },
  { id: 'sandstone-massif', depth: 1, motion: 'static-world-space' },
  { id: 'siq-gorge', depth: 2, motion: 'static-world-space' },
  { id: 'treasury-facade', depth: 3, motion: 'playback-time' },
  { id: 'work-systems', depth: 4, motion: 'playback-time' },
  { id: 'foreground-siq-floor', depth: 5, motion: 'static-world-space' },
];

const ROUTE: PetraRoute = {
  id: 'siq-south',
  ledge: [13.2, 18, -1.4],
  plaza: [8.4, 0.4, -7.2],
  siq: [2.1, 0.2, -24],
  dump: [-17.5, -0.4, -48],
  laneWidth: 1.35,
};

const KEEP_OUTS: PetraKeepOut[] = [
  { id: 'cliff-sanctuary', minX: -13, maxX: 13, minZ: 0, maxZ: 14 },
  { id: 'facade-apron', minX: -14, maxX: 14, minZ: -4.5, maxZ: 0 },
  { id: 'siq-haul', minX: -6, maxX: 6, minZ: -46, maxZ: -4 },
  { id: 'dump-fan', minX: -28, maxX: -10, minZ: -56, maxZ: -40 },
];

function member(
  id: string,
  group: PetraRockMember['group'],
  kind: PetraRockMember['kind'],
  dimensions: Vec3,
  finalPosition: Vec3,
  colorVariation: number,
  rotation: Vec3 = [0, 0, 0],
): PetraRockMember {
  return {
    id,
    group,
    kind,
    dimensions,
    finalPosition,
    finalRotation: rotation,
    scale: UNIT,
    coveringCellIds: [],
    colorVariation,
  };
}

function overlaps(cell: PetraSpoilCell, item: PetraRockMember, pad: number): boolean {
  const dx = (cell.dimensions[0] + item.dimensions[0]) * 0.5 + pad;
  const dy = (cell.dimensions[1] + item.dimensions[1]) * 0.5 + pad;
  return (
    Math.abs(cell.sourcePosition[0] - item.finalPosition[0]) <= dx
    && Math.abs(cell.sourcePosition[1] - item.finalPosition[1]) <= dy
  );
}

function createMembers(rand: () => number): PetraRockMember[] {
  const columns: PetraRockMember[] = [];
  for (let index = 0; index < 6; index += 1) {
    const x = -9.6 + index * 3.84;
    columns.push(member(
      `portico-column-${index}`,
      'portico',
      'column',
      [1.22, 12.4, 1.22],
      [x, 8.5, 1.35],
      rand() * 2 - 1,
    ));
    columns.push(member(
      `portico-capital-${index}`,
      'portico',
      'capital',
      [1.55, 0.72, 1.55],
      [x, 15.06, 1.35],
      rand() * 2 - 1,
    ));
  }
  const tholos: PetraRockMember[] = [];
  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
    tholos.push(member(
      `tholos-column-${index}`,
      'tholos',
      'column',
      [0.82, 7.4, 0.82],
      [Math.cos(angle) * 2.35, 23.9, 1.55 + Math.sin(angle) * 0.55],
      rand() * 2 - 1,
    ));
  }
  return [
    member('podium', 'podium', 'block', [24.6, 2.3, 4.4], [0, 1.15, 1.9], rand() * 2 - 1),
    ...columns,
    member('doorway', 'doorway', 'block', [3.4, 7.6, 1.9], [0, 6.1, 0.55], rand() * 2 - 1),
    member('side-panel-west', 'portico', 'block', [3.8, 8.2, 1.4], [-10.8, 6.5, 0.7], rand() * 2 - 1),
    member('side-panel-east', 'portico', 'block', [3.8, 8.2, 1.4], [10.8, 6.5, 0.7], rand() * 2 - 1),
    member('entablature', 'entablature', 'block', [24.2, 2.2, 2.6], [0, 16.4, 1.5], rand() * 2 - 1),
    member('pediment-west', 'pediment', 'block', [8.4, 3.6, 1.8], [-7.8, 19.4, 1.45], rand() * 2 - 1, [0, 0, 0.22]),
    member('pediment-east', 'pediment', 'block', [8.4, 3.6, 1.8], [7.8, 19.4, 1.45], rand() * 2 - 1, [0, 0, -0.22]),
    member('tholos-drum', 'tholos', 'block', [5.6, 2.1, 5.2], [0, 20.55, 1.7], rand() * 2 - 1),
    ...tholos,
    member('tholos-roof', 'tholos', 'cone', [6.4, 4.8, 6.4], [0, 29.4, 1.7], rand() * 2 - 1),
    member('urn', 'urn', 'cone', [1.6, 3.4, 1.6], [0, 33.7, 1.7], rand() * 2 - 1),
    member('aedicule-west', 'aedicule', 'block', [5.2, 6.8, 1.7], [-8.6, 24.6, 1.2], rand() * 2 - 1),
    member('aedicule-east', 'aedicule', 'block', [5.2, 6.8, 1.7], [8.6, 24.6, 1.2], rand() * 2 - 1),
  ];
}

function createCells(rand: () => number): PetraSpoilCell[] {
  const width = PETRA_FACADE_WIDTH / PETRA_SPOIL_COLUMNS;
  const height = PETRA_FACADE_HEIGHT / PETRA_SPOIL_ROWS;
  const depth = 2.55;
  const cells: PetraSpoilCell[] = [];
  for (let row = 0; row < PETRA_SPOIL_ROWS; row += 1) {
    for (let column = 0; column < PETRA_SPOIL_COLUMNS; column += 1) {
      const x = -PETRA_FACADE_WIDTH / 2 + (column + 0.5) * width;
      const y = (row + 0.5) * height;
      const side = x < 0 ? -1 : 1;
      const dumpIndex = row * PETRA_SPOIL_COLUMNS + column;
      cells.push({
        id: `spoil-${row.toString().padStart(2, '0')}-${column.toString().padStart(2, '0')}`,
        column,
        row,
        dimensions: [width * 0.92, height * 0.88, depth],
        sourcePosition: [x, y, 0.15],
        dumpPosition: [
          -16.2 + (dumpIndex % 7) * 1.15,
          0.55 + Math.floor(dumpIndex / 7) * 0.42,
          -46.5 - (dumpIndex % 5) * 1.05,
        ],
        scale: UNIT,
        routeId: 'siq-south',
        lane: (column + row) % 4,
        start: 0.085 + (PETRA_SPOIL_ROWS - 1 - row) * 0.074 + (column % 5) * 0.012,
        duration: 0.075,
        colorVariation: rand() * 2 - 1,
      });
      void side;
    }
  }
  return cells;
}

function bindCovering(members: PetraRockMember[], cells: PetraSpoilCell[]): void {
  for (const item of members) {
    const covering = cells
      .filter((cell) => overlaps(cell, item, 0.55))
      .sort((a, b) => Math.abs(b.sourcePosition[1] - item.finalPosition[1])
        - Math.abs(a.sourcePosition[1] - item.finalPosition[1]));
    const ids = covering.slice(0, Math.max(2, Math.min(6, covering.length))).map((cell) => cell.id);
    if (ids.length === 0) {
      const nearest = [...cells].sort((a, b) => {
        const da = Math.hypot(
          a.sourcePosition[0] - item.finalPosition[0],
          a.sourcePosition[1] - item.finalPosition[1],
        );
        const db = Math.hypot(
          b.sourcePosition[0] - item.finalPosition[0],
          b.sourcePosition[1] - item.finalPosition[1],
        );
        return da - db;
      });
      ids.push(nearest[0]!.id, nearest[1]!.id);
    }
    item.coveringCellIds = ids;
  }
}

export function createPetraConstructionPlan(): PetraConstructionPlan {
  const rand = mulberry32('petra-treasury-v1');
  const members = createMembers(rand);
  const cells = createCells(rand);
  bindCovering(members, cells);
  return {
    seed: 'petra-treasury-v1',
    members,
    cells,
    routes: [ROUTE],
    layers: LAYERS.map((layer) => ({ ...layer })),
    keepOuts: KEEP_OUTS.map((item) => ({ ...item })),
    facadeWidth: PETRA_FACADE_WIDTH,
    facadeHeight: PETRA_FACADE_HEIGHT,
    groundY: 0,
  };
}

export const PETRA_CONSTRUCTION = createPetraConstructionPlan();
