import type { Vec3 } from './constructionTypes';
import { mulberry32 } from '../engine/random';
import { sydneyTerrainHeightAt } from '../engine/sydneyTerrain';
import type {
  SydneyConstructionPlan,
  SydneyLayer,
  SydneyPart,
  SydneyPartGroup,
  SydneyRoute,
} from './sydneyTypes';

export const SYDNEY_LENGTH = 183;
export const SYDNEY_WIDTH = 120;
export const SYDNEY_HEIGHT = 67;
export const SYDNEY_PODIUM_HEIGHT = 12;
export const SYDNEY_PODIUM_DECK = 14.2;
export const SYDNEY_SPHERE_RADIUS = 75;
export const SYDNEY_TROLLEY_BED = 0.85;
export const SYDNEY_MAX_ACTIVE = 18;
export const SYDNEY_YARD: Vec3 = [10, 2.1, 78];
export const SYDNEY_FALSEWORK_SEGMENT = 6;
export const SYDNEY_FALSEWORK_STATIONS = 8;

const LAYERS: SydneyLayer[] = [
  { id: 'harbour-sky', depth: 0, motion: 'playback-time' },
  { id: 'harbour-water', depth: 1, motion: 'static-world-space' },
  { id: 'bennelong-point', depth: 2, motion: 'static-world-space' },
  { id: 'shells', depth: 3, motion: 'playback-time' },
  { id: 'work-systems', depth: 4, motion: 'playback-time' },
  { id: 'foreground-yard', depth: 5, motion: 'static-world-space' },
];

export interface SydneySailDef {
  id: number;
  group: Exclude<SydneyPartGroup, 'podium'>;
  /**
   * World-space position of the seated sail centroid (metres).
   * Derived from the sphere geometry — the renderer places this with scale [1,1,1].
   */
  position: Vec3;
  /**
   * Rotation applied to the sail mesh [rx, ry, rz] in radians.
   * ry is the fan yaw (azimuth of the sail arc); rx tilts toward the apex.
   */
  rotation: Vec3;
  /**
   * Approximate bounding extents [width, height, depth] in metres — used only
   * for collision/hoist clearance and caption beats, NOT as a Three.js scale.
   * The tile geometry is authored at full size from the sphere; scale stays [1,1,1].
   */
  dimensions: Vec3;
  ribCount: number;
  /** Sphere parameters for generating the full-size cap geometry. */
  sphere: {
    /** Sphere centre in world space (metres). */
    centre: Vec3;
    /** Latitude of the shell base on the sphere (rad from north pole). */
    phiStart: number;
    /** Angular height of the shell patch (rad). */
    phiLength: number;
    /** Azimuthal half-width of the shell patch (rad). */
    thetaHalf: number;
  };
  /** Pointed Utzon vault cut from the 75 m sphere (Spec 13 harbour fabric). */
  vault: {
    half: number;
    foot: number;
  };
}

/**
 * Utzon's 1961 spherical solution: every sail is a patch cut from a single
 * sphere of radius SYDNEY_SPHERE_RADIUS (75 m). Two main groups:
 *   Concert Hall — NE side (positive X), sphere centre near [6, 14, -14]
 *   Opera Theatre — NW side (negative X), sphere centre near [-12, 14, 4]
 * Shells nest from outermost (tallest) to innermost (smallest).
 * Positions are derived analytically so the silhouette reads correctly
 * from 500–700 m: a nested fan of curved blades, not individual blobs.
 */
export const SYDNEY_SAILS: SydneySailDef[] = [
  // Concert Hall — 4 nested shells, largest south, nesting north. Foot origin on the podium.
  {
    id: 0, group: 'concert',
    position: [10, SYDNEY_PODIUM_DECK, 20], rotation: [0.22, -0.32, 0], dimensions: [49, 54, 57],
    sphere: { centre: [12, 14, 6], phiStart: 0.72, phiLength: 0.58, thetaHalf: 0.40 },
    vault: { half: 0.40, foot: 1.12 },
    ribCount: 4,
  },
  {
    id: 1, group: 'concert',
    position: [13, SYDNEY_PODIUM_DECK, 10], rotation: [0.24, -0.24, 0], dimensions: [43, 48, 54],
    sphere: { centre: [15, 14, -6], phiStart: 0.80, phiLength: 0.50, thetaHalf: 0.36 },
    vault: { half: 0.36, foot: 1.04 },
    ribCount: 4,
  },
  {
    id: 2, group: 'concert',
    position: [15, SYDNEY_PODIUM_DECK, 0], rotation: [0.26, -0.16, 0], dimensions: [36, 43, 50],
    sphere: { centre: [17, 14, -16], phiStart: 0.88, phiLength: 0.42, thetaHalf: 0.32 },
    vault: { half: 0.32, foot: 0.96 },
    ribCount: 3,
  },
  {
    id: 3, group: 'concert',
    position: [16, SYDNEY_PODIUM_DECK, -8], rotation: [0.28, -0.08, 0], dimensions: [27, 36, 45],
    sphere: { centre: [18, 14, -24], phiStart: 0.96, phiLength: 0.34, thetaHalf: 0.26 },
    vault: { half: 0.26, foot: 0.88 },
    ribCount: 3,
  },
  // Opera Theatre — 3 nested shells
  {
    id: 4, group: 'opera',
    position: [-10, SYDNEY_PODIUM_DECK, 22], rotation: [0.22, 0.56, 0], dimensions: [48, 52, 56],
    sphere: { centre: [-10, 14, 8], phiStart: 0.74, phiLength: 0.54, thetaHalf: 0.38 },
    vault: { half: 0.38, foot: 1.08 },
    ribCount: 4,
  },
  {
    id: 5, group: 'opera',
    position: [-13, SYDNEY_PODIUM_DECK, 12], rotation: [0.24, 0.66, 0], dimensions: [46, 46, 51],
    sphere: { centre: [-13, 14, -4], phiStart: 0.82, phiLength: 0.46, thetaHalf: 0.34 },
    vault: { half: 0.34, foot: 1.00 },
    ribCount: 4,
  },
  {
    id: 6, group: 'opera',
    position: [-15, SYDNEY_PODIUM_DECK, 2], rotation: [0.26, 0.74, 0], dimensions: [43, 40, 45],
    sphere: { centre: [-15, 14, -14], phiStart: 0.90, phiLength: 0.38, thetaHalf: 0.28 },
    vault: { half: 0.28, foot: 0.92 },
    ribCount: 3,
  },
  // Restaurant shells — smaller, south of the halls
  {
    id: 7, group: 'restaurant',
    position: [2, SYDNEY_PODIUM_DECK, 30], rotation: [0.24, 0.12, 0], dimensions: [29, 35, 47],
    sphere: { centre: [2, 14, 18], phiStart: 0.92, phiLength: 0.34, thetaHalf: 0.28 },
    vault: { half: 0.28, foot: 0.90 },
    ribCount: 3,
  },
  {
    id: 8, group: 'restaurant',
    position: [8, SYDNEY_PODIUM_DECK, 36], rotation: [0.26, 0.22, 0], dimensions: [20, 28, 41],
    sphere: { centre: [8, 14, 26], phiStart: 1.00, phiLength: 0.26, thetaHalf: 0.22 },
    vault: { half: 0.22, foot: 0.82 },
    ribCount: 2,
  },
];

export const SYDNEY_CRANE_BASES: Vec3[] = [
  [46, SYDNEY_PODIUM_DECK, -6],
  [-38, SYDNEY_PODIUM_DECK, 14],
];

function part(partial: Omit<SydneyPart, 'scale' | 'routeId'>): SydneyPart {
  return { ...partial, scale: [1, 1, 1], routeId: 'point-yard' };
}

export function createSydneyConstructionPlan(): SydneyConstructionPlan {
  const rand = mulberry32('sydney-utzon-v1');
  const parts: SydneyPart[] = [];
  const routes: SydneyRoute[] = [
    {
      id: 'point-yard',
      yard: SYDNEY_YARD,
      road: [8, 2, 52],
      staging: [22, SYDNEY_PODIUM_DECK, 18],
      laneWidth: 4.4,
    },
  ];

  const podiumW = 108;
  const podiumL = 92;
  const cols = 4;
  const rows = 3;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      const w = podiumW / cols;
      const d = podiumL / rows;
      const x = -podiumW / 2 + (col + 0.5) * w;
      const z = -podiumL / 2 + 6 + (row + 0.5) * d;
      const seatY = sydneyTerrainHeightAt(x, z) + SYDNEY_PODIUM_HEIGHT / 2;
      parts.push(part({
        id: `podium-${index}`,
        group: 'podium',
        kind: 'block',
        graph: 'podium',
        sail: -1,
        bay: index,
        crane: 0,
        dimensions: [w - 0.35, SYDNEY_PODIUM_HEIGHT, d - 0.35],
        finalPosition: [x, seatY, z],
        finalRotation: [0, 0, 0],
        material: 'granite',
        lane: col % 3,
        start: 0.02 + index * 0.012,
        duration: 0.048,
        colorVariation: rand() * 2 - 1,
      }));
    }
  }

  let cursor = 0.175;
  for (const sail of SYDNEY_SAILS) {
    const ribStarts: number[] = [];
    for (let rib = 0; rib < sail.ribCount; rib += 1) {
      const along = (rib / Math.max(1, sail.ribCount - 1) - 0.5) * sail.dimensions[0] * 0.42;
      const yaw = sail.rotation[1];
      const x = sail.position[0] + Math.cos(yaw) * along;
      const z = sail.position[2] + Math.sin(yaw) * along;
      const height = sail.dimensions[1] * (0.72 + rib * 0.04);
      const start = cursor;
      ribStarts.push(start);
      parts.push(part({
        id: `rib-${sail.id}-${rib}`,
        group: sail.group,
        kind: 'rib',
        graph: 'shell',
        sail: sail.id,
        bay: sail.id * 4 + rib,
        crane: (sail.id % 2) as 0 | 1,
        dimensions: [2.35, height, 1.15],
        finalPosition: [x, SYDNEY_PODIUM_DECK + height / 2 + 0.4, z],
        finalRotation: [sail.rotation[0] * 0.35, yaw, 0],
        material: 'concrete',
        lane: rib % 3,
        start,
        duration: 0.044,
        colorVariation: rand() * 2 - 1,
      }));
      cursor += 0.015;
    }
    const lastRibEnd = ribStarts.at(-1)! + 0.044;
    parts.push(part({
      id: `sail-${sail.id}`,
      group: sail.group,
      kind: 'sail',
      graph: 'shell',
      sail: sail.id,
      bay: sail.id,
      crane: (sail.id % 2) as 0 | 1,
      dimensions: sail.dimensions,
      finalPosition: sail.position,
      finalRotation: sail.rotation,
      material: 'tile',
      lane: sail.id % 3,
      start: lastRibEnd + 0.01,
      duration: 0.056,
      colorVariation: rand() * 2 - 1,
    }));
    cursor = Math.max(cursor, lastRibEnd + 0.012);
  }

  const shells = parts.filter((entry) => entry.graph === 'shell');
  const minStart = Math.min(...shells.map((entry) => entry.start));
  const maxEnd = Math.max(...shells.map((entry) => entry.start + entry.duration));
  const span = Math.max(0.001, maxEnd - minStart);
  for (const entry of shells) {
    const u0 = (entry.start - minStart) / span;
    const u1 = (entry.start + entry.duration - minStart) / span;
    entry.start = 0.165 + u0 * 0.81;
    entry.duration = Math.max(0.03, (u1 - u0) * 0.81);
  }

  return {
    seed: 'sydney-utzon-v1',
    length: SYDNEY_LENGTH,
    width: SYDNEY_WIDTH,
    height: SYDNEY_HEIGHT,
    podiumHeight: SYDNEY_PODIUM_HEIGHT,
    trolleyBedHeight: SYDNEY_TROLLEY_BED,
    maxActive: SYDNEY_MAX_ACTIVE,
    parts,
    routes,
    layers: LAYERS.map((layer) => ({ ...layer })),
    keepOuts: [
      { id: 'shell-volume', minX: -40, maxX: 40, minZ: -42, maxZ: 36 },
      { id: 'south-yard', minX: -18, maxX: 28, minZ: 64, maxZ: 92 },
    ],
  };
}

export const SYDNEY_CONSTRUCTION = createSydneyConstructionPlan();
