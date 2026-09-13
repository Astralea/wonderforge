import type { Vec3 } from './constructionTypes';
import { mulberry32 } from '../engine/random';
import type {
  ColosseumConstructionPlan,
  ColosseumLayer,
  ColosseumPart,
  ColosseumRoute,
} from './colosseumTypes';

export const COLOSSEUM_MAJOR = 188;
export const COLOSSEUM_MINOR = 156;
export const COLOSSEUM_A = 94;
export const COLOSSEUM_B = 78;
export const COLOSSEUM_HEIGHT = 48;
export const COLOSSEUM_ARENA_A = 41.5;
export const COLOSSEUM_ARENA_B = 24;
export const COLOSSEUM_BAYS = 80;
export const COLOSSEUM_STOREY_HEIGHT = 11.5;
export const COLOSSEUM_ATTIC_HEIGHT = 10.5;
export const COLOSSEUM_FOUNDATION_HEIGHT = 3.5;
export const COLOSSEUM_WAGON_BED = 0.9;
export const COLOSSEUM_MAX_ACTIVE = 24;
export const COLOSSEUM_QUARRY: Vec3 = [172, 1.2, 10];

const LAYERS: ColosseumLayer[] = [
  { id: 'roman-valley-sky', depth: 0, motion: 'playback-time' },
  { id: 'palatine-caelian', depth: 1, motion: 'static-world-space' },
  { id: 'drained-valley', depth: 2, motion: 'playback-time' },
  { id: 'amphitheatre', depth: 3, motion: 'playback-time' },
  { id: 'work-systems', depth: 4, motion: 'playback-time' },
  { id: 'foreground-road', depth: 5, motion: 'static-world-space' },
];

export function ellipsePoint(a: number, b: number, theta: number): [number, number] {
  return [a * Math.cos(theta), b * Math.sin(theta)];
}

export function ellipseOutward(a: number, b: number, theta: number): [number, number] {
  const nx = b * Math.cos(theta);
  const nz = a * Math.sin(theta);
  const length = Math.hypot(nx, nz) || 1;
  return [nx / length, nz / length];
}

export function ellipseYaw(a: number, b: number, theta: number): number {
  const [nx, nz] = ellipseOutward(a, b, theta);
  return Math.atan2(nx, nz);
}

export function bayTheta(bay: number): number {
  return (bay / COLOSSEUM_BAYS) * Math.PI * 2 - Math.PI / 2;
}

function part(partial: Omit<ColosseumPart, 'scale' | 'routeId'>): ColosseumPart {
  return { ...partial, scale: [1, 1, 1], routeId: 'tivoli-east' };
}

export function createColosseumConstructionPlan(): ColosseumConstructionPlan {
  const rand = mulberry32('colosseum-flavian-v1');
  const parts: ColosseumPart[] = [];
  const routes: ColosseumRoute[] = [
    {
      id: 'tivoli-east',
      quarry: COLOSSEUM_QUARRY,
      road: [128, 0.4, 6],
      staging: [108, 0.5, 4],
      laneWidth: 4.2,
    },
  ];

  for (let segment = 0; segment < 16; segment += 1) {
    const theta = (segment / 16) * Math.PI * 2 - Math.PI / 2;
    const [x, z] = ellipsePoint((COLOSSEUM_A + COLOSSEUM_ARENA_A) / 2, (COLOSSEUM_B + COLOSSEUM_ARENA_B) / 2, theta);
    const yaw = ellipseYaw(COLOSSEUM_A, COLOSSEUM_B, theta);
    parts.push(part({
      id: `foundation-${segment}`,
      group: 'foundation',
      kind: 'block',
      bay: segment * 5,
      storey: -1,
      dimensions: [18.4, COLOSSEUM_FOUNDATION_HEIGHT, 14.2],
      finalPosition: [x, COLOSSEUM_FOUNDATION_HEIGHT / 2, z],
      finalRotation: [0, yaw, 0],
      material: 'pozzolana',
      lane: segment % 3,
      start: 0.02 + segment * 0.006,
      duration: 0.04,
      colorVariation: rand() * 2 - 1,
    }));
  }

  const storeyWindow = [
    { storey: 0, origin: 0.16, span: 0.22, duration: 0.032 },
    { storey: 1, origin: 0.56, span: 0.16, duration: 0.024 },
    { storey: 2, origin: 0.70, span: 0.12, duration: 0.018 },
  ];
  const arcadeHeight = COLOSSEUM_STOREY_HEIGHT;
  for (const wave of storeyWindow) {
    const y = COLOSSEUM_FOUNDATION_HEIGHT + wave.storey * arcadeHeight + arcadeHeight / 2;
    for (let bay = 0; bay < COLOSSEUM_BAYS; bay += 1) {
      const theta = bayTheta(bay);
      const [nx, nz] = ellipseOutward(COLOSSEUM_A, COLOSSEUM_B, theta);
      const [x, z] = ellipsePoint(COLOSSEUM_A - 1.4, COLOSSEUM_B - 1.2, theta);
      const yaw = ellipseYaw(COLOSSEUM_A, COLOSSEUM_B, theta);
      const spacing = Math.hypot(COLOSSEUM_A * Math.sin(theta), COLOSSEUM_B * Math.cos(theta))
        * ((Math.PI * 2) / COLOSSEUM_BAYS);
      parts.push(part({
        id: `arcade-${wave.storey}-${bay}`,
        group: 'arcade',
        kind: 'arch',
        bay,
        storey: wave.storey,
        dimensions: [spacing * 0.94, arcadeHeight - 0.35, 3.35],
        finalPosition: [x + nx * 0.2, y, z + nz * 0.2],
        finalRotation: [0, yaw, 0],
        material: 'travertine',
        lane: bay % 4,
        start: wave.origin + bay * (wave.span / COLOSSEUM_BAYS),
        duration: wave.duration,
        colorVariation: rand() * 2 - 1,
      }));
    }
  }

  for (let bay = 0; bay < COLOSSEUM_BAYS; bay += 1) {
    const theta = bayTheta(bay);
    const [nx, nz] = ellipseOutward(COLOSSEUM_A, COLOSSEUM_B, theta);
    const [x, z] = ellipsePoint(COLOSSEUM_A - 1.2, COLOSSEUM_B - 1.0, theta);
    const yaw = ellipseYaw(COLOSSEUM_A, COLOSSEUM_B, theta);
    const y = COLOSSEUM_FOUNDATION_HEIGHT + 3 * arcadeHeight + COLOSSEUM_ATTIC_HEIGHT / 2;
    parts.push(part({
      id: `attic-${bay}`,
      group: 'attic',
      kind: 'block',
      bay,
      storey: 3,
      dimensions: [
        Math.hypot(COLOSSEUM_A * Math.sin(theta), COLOSSEUM_B * Math.cos(theta))
          * ((Math.PI * 2) / COLOSSEUM_BAYS) * 0.94,
        COLOSSEUM_ATTIC_HEIGHT - 0.4,
        2.9,
      ],
      finalPosition: [x + nx * 0.15, y, z + nz * 0.15],
      finalRotation: [0, yaw, 0],
      material: 'travertine',
      lane: bay % 4,
      start: 0.84 + bay * (0.10 / COLOSSEUM_BAYS),
      duration: 0.016,
      colorVariation: rand() * 2 - 1,
    }));
  }

  for (let index = 0; index < 24; index += 1) {
    const bay = Math.round((index / 24) * COLOSSEUM_BAYS) % COLOSSEUM_BAYS;
    const theta = bayTheta(bay);
    const [nx, nz] = ellipseOutward(COLOSSEUM_A, COLOSSEUM_B, theta);
    const midA = (COLOSSEUM_A + COLOSSEUM_ARENA_A) / 2;
    const midB = (COLOSSEUM_B + COLOSSEUM_ARENA_B) / 2;
    const [x, z] = ellipsePoint(midA, midB, theta);
    const yaw = ellipseYaw(COLOSSEUM_A, COLOSSEUM_B, theta);
    const arcade = parts.find((entry) => entry.id === `arcade-0-${bay}`)!;
    const radialStart = 0.405 + index * (0.09 / 24);
    parts.push(part({
      id: `radial-${index}`,
      group: 'radial',
      kind: 'block',
      bay,
      storey: 0,
      dimensions: [2.35, 9.6, 16.5],
      finalPosition: [x - nx * 2.2, 3.5 + 4.8, z - nz * 2.2],
      finalRotation: [0, yaw, 0],
      material: 'tuff',
      lane: index % 3,
      start: Math.max(radialStart, arcade.start + arcade.duration + 0.01),
      duration: 0.032,
      colorVariation: rand() * 2 - 1,
    }));
    const vaultStart = 0.48 + index * (0.08 / 24);
    parts.push(part({
      id: `vault-${index}`,
      group: 'vault',
      kind: 'wedge',
      bay,
      storey: 0,
      dimensions: [5.4, 3.1, 13.8],
      finalPosition: [x - nx * 1.1, 3.5 + 9.6 + 1.55, z - nz * 1.1],
      finalRotation: [0.18, yaw, 0],
      material: 'pozzolana',
      lane: index % 3,
      start: Math.max(vaultStart, radialStart + 0.034),
      duration: 0.03,
      colorVariation: rand() * 2 - 1,
    }));
    parts.push(part({
      id: `cavea-${index}`,
      group: 'cavea',
      kind: 'wedge',
      bay,
      storey: 1,
      dimensions: [6.2, 2.15, 11.4],
      finalPosition: [x - nx * 0.4, 3.5 + 9.6 + 3.1 + 2.4, z - nz * 0.4],
      finalRotation: [0.28, yaw, 0],
      material: 'travertine',
      lane: index % 3,
      start: Math.max(0.50 + index * (0.07 / 24), vaultStart + 0.032),
      duration: 0.028,
      colorVariation: rand() * 2 - 1,
    }));
  }

  return {
    seed: 'colosseum-flavian-v1',
    major: COLOSSEUM_MAJOR,
    minor: COLOSSEUM_MINOR,
    height: COLOSSEUM_HEIGHT,
    bays: COLOSSEUM_BAYS,
    wagonBedHeight: COLOSSEUM_WAGON_BED,
    maxActive: COLOSSEUM_MAX_ACTIVE,
    parts,
    routes,
    layers: LAYERS.map((layer) => ({ ...layer })),
    keepOuts: [
      { id: 'arena', minX: -COLOSSEUM_ARENA_A - 2, maxX: COLOSSEUM_ARENA_A + 2, minZ: -COLOSSEUM_ARENA_B - 2, maxZ: COLOSSEUM_ARENA_B + 2 },
      { id: 'east-road', minX: 100, maxX: 176, minZ: -8, maxZ: 16 },
    ],
  };
}

export const COLOSSEUM_CONSTRUCTION = createColosseumConstructionPlan();
