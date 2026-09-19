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
export const COLOSSEUM_PODIUM_HEIGHT = 4.4;
export const COLOSSEUM_WAGON_BED = 0.9;
export const COLOSSEUM_MAX_ACTIVE = 24;
export const COLOSSEUM_QUARRY: Vec3 = [172, 1.2, 10];

const PODIUM_A = 43.2;
const PODIUM_B = 25.8;
const INNER_ARCADE_A = 57.5;
const INNER_ARCADE_B = 40.5;
const INTER_ARCADE_A = 74;
const INTER_ARCADE_B = 60.5;

const CAVEA_IMA = { innerA: 45, innerB: 27.4, outerA: 56.2, outerB: 39.4, height: 13.2, foot: 4.4 };
const CAVEA_MEDIA = { innerA: 59, innerB: 42, outerA: 72.4, outerB: 58.8, height: 13.6, foot: 17.6 };
const CAVEA_SUMMA = { innerA: 76, innerB: 62.2, outerA: 91.4, outerB: 75.6, height: 11.8, foot: 31.2 };

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

export function bayWidth(a: number, b: number, theta: number): number {
  return Math.hypot(a * Math.sin(theta), b * Math.cos(theta)) * ((Math.PI * 2) / COLOSSEUM_BAYS);
}

export function ellipseRadius(a: number, b: number, theta: number): number {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return 1 / Math.hypot(c / a, s / b);
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
      start: 0.11 + segment * 0.007,
      duration: 0.04,
      colorVariation: rand() * 2 - 1,
    }));
  }

  // Continuous exterior silhouette: storeys overlap so the oval keeps rising
  // instead of freezing on a completed ground arcade while inner vaults fill.
  const storeyWindow = [
    { storey: 0, origin: 0.12, span: 0.24, duration: 0.030 },
    { storey: 1, origin: 0.34, span: 0.22, duration: 0.028 },
    { storey: 2, origin: 0.55, span: 0.18, duration: 0.022 },
  ];
  const arcadeHeight = COLOSSEUM_STOREY_HEIGHT;
  for (const wave of storeyWindow) {
    const y = COLOSSEUM_FOUNDATION_HEIGHT + wave.storey * arcadeHeight + arcadeHeight / 2;
    for (let bay = 0; bay < COLOSSEUM_BAYS; bay += 1) {
      const theta = bayTheta(bay);
      const [nx, nz] = ellipseOutward(COLOSSEUM_A, COLOSSEUM_B, theta);
      const [x, z] = ellipsePoint(COLOSSEUM_A - 1.4, COLOSSEUM_B - 1.2, theta);
      const yaw = ellipseYaw(COLOSSEUM_A, COLOSSEUM_B, theta);
      const spacing = bayWidth(COLOSSEUM_A, COLOSSEUM_B, theta);
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
        bayWidth(COLOSSEUM_A, COLOSSEUM_B, theta) * 0.94,
        COLOSSEUM_ATTIC_HEIGHT - 0.4,
        2.9,
      ],
      finalPosition: [x + nx * 0.15, y, z + nz * 0.15],
      finalRotation: [0, yaw, 0],
      material: 'travertine',
      lane: bay % 4,
      start: 0.74 + bay * (0.12 / COLOSSEUM_BAYS),
      duration: 0.01,
      colorVariation: rand() * 2 - 1,
    }));
  }

  const innerArcadeWindow = [
    { storey: 0, a: INNER_ARCADE_A, b: INNER_ARCADE_B, origin: 0.48, span: 0.12, duration: 0.007, depth: 2.7, prefix: 'inner-arcade' },
    { storey: 0, a: INTER_ARCADE_A, b: INTER_ARCADE_B, origin: 0.5, span: 0.12, duration: 0.007, depth: 2.85, prefix: 'inter-arcade' },
  ] as const;
  for (const wave of innerArcadeWindow) {
    const rise = wave.prefix === 'inner-arcade' ? 8.4 : arcadeHeight - 0.45;
    const y = wave.prefix === 'inner-arcade'
      ? COLOSSEUM_FOUNDATION_HEIGHT + rise / 2
      : COLOSSEUM_FOUNDATION_HEIGHT + wave.storey * arcadeHeight + arcadeHeight / 2;
    for (let bay = 0; bay < COLOSSEUM_BAYS; bay += 1) {
      const theta = bayTheta(bay);
      const [x, z] = ellipsePoint(wave.a, wave.b, theta);
      const yaw = ellipseYaw(wave.a, wave.b, theta);
      parts.push(part({
        id: `${wave.prefix}-${wave.storey}-${bay}`,
        group: 'inner-arcade',
        kind: 'arch',
        bay,
        storey: wave.storey,
        dimensions: [bayWidth(wave.a, wave.b, theta) * 0.94, rise, wave.depth],
        finalPosition: [x, y, z],
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
    const yaw = ellipseYaw(COLOSSEUM_A, COLOSSEUM_B, theta);
    const arcade = parts.find((entry) => entry.id === `arcade-0-${bay}`)!;
    const [podiumX, podiumZ] = ellipsePoint(PODIUM_A, PODIUM_B, theta);
    parts.push(part({
      id: `podium-${bay}`,
      group: 'podium',
      kind: 'block',
      bay,
      storey: 0,
      dimensions: [bayWidth(PODIUM_A, PODIUM_B, theta) * 1.04, COLOSSEUM_PODIUM_HEIGHT, 2.4],
      finalPosition: [podiumX, COLOSSEUM_PODIUM_HEIGHT / 2, podiumZ],
      finalRotation: [0, yaw, 0],
      material: 'travertine',
      lane: bay % 4,
      start: Math.max(0.16 + bay * (0.16 / COLOSSEUM_BAYS), 0.08),
      duration: 0.008,
      colorVariation: rand() * 2 - 1,
    }));

    const radialInner = ellipseRadius(PODIUM_A + 1.2, PODIUM_B + 1.1, theta);
    const radialOuter = ellipseRadius(COLOSSEUM_A - 4.2, COLOSSEUM_B - 3.6, theta);
    const radialSpan = radialOuter - radialInner;
    const radialMid = (radialInner + radialOuter) / 2;
    const radialX = Math.cos(theta) * radialMid;
    const radialZ = Math.sin(theta) * radialMid;
    const radialStart = Math.max(0.38 + bay * (0.12 / COLOSSEUM_BAYS), arcade.start + arcade.duration + 0.006);
    parts.push(part({
      id: `radial-${bay}`,
      group: 'radial',
      kind: 'block',
      bay,
      storey: 0,
      dimensions: [1.85, 9.8, radialSpan],
      finalPosition: [radialX, COLOSSEUM_FOUNDATION_HEIGHT + 4.9, radialZ],
      finalRotation: [0, yaw, 0],
      material: 'tuff',
      lane: bay % 3,
      start: radialStart,
      duration: 0.008,
      colorVariation: rand() * 2 - 1,
    }));

    const vaultMid = (
      ellipseRadius(INNER_ARCADE_A, INNER_ARCADE_B, theta)
      + ellipseRadius(INTER_ARCADE_A, INTER_ARCADE_B, theta)
    ) / 2;
    const vaultX = Math.cos(theta) * vaultMid;
    const vaultZ = Math.sin(theta) * vaultMid;
    const vaultStart = Math.max(0.58 + bay * (0.14 / COLOSSEUM_BAYS), radialStart + 0.01);
    parts.push(part({
      id: `vault-${bay}`,
      group: 'vault',
      kind: 'block',
      bay,
      storey: 0,
      dimensions: [bayWidth(INNER_ARCADE_A, INNER_ARCADE_B, theta) * 1.02, 3.2, 14.4],
      finalPosition: [vaultX, COLOSSEUM_FOUNDATION_HEIGHT + 9.8 + 1.6, vaultZ],
      finalRotation: [0, yaw, 0],
      material: 'pozzolana',
      lane: bay % 3,
      start: vaultStart,
      duration: 0.008,
      colorVariation: rand() * 2 - 1,
    }));

    const imaArcade = arcade;
    const mediaArcade = parts.find((entry) => entry.id === `arcade-1-${bay}`)!;
    const summaArcade = parts.find((entry) => entry.id === `arcade-2-${bay}`)!;
    const imaStart = Math.max(
      0.6 + bay * (0.12 / COLOSSEUM_BAYS),
      vaultStart + 0.01,
      imaArcade.start + imaArcade.duration + 0.008,
    );
    const mediaStart = Math.max(
      0.76 + bay * (0.08 / COLOSSEUM_BAYS),
      imaStart + 0.012,
      mediaArcade.start + mediaArcade.duration + 0.008,
    );
    const summaStart = Math.max(
      0.78 + bay * (0.07 / COLOSSEUM_BAYS),
      mediaStart + 0.01,
      summaArcade.start + summaArcade.duration + 0.008,
    );
    const maeniana = [
      { id: 'ima', band: CAVEA_IMA, storey: 0, start: imaStart, material: 'travertine' as const },
      { id: 'media', band: CAVEA_MEDIA, storey: 1, start: mediaStart, material: 'travertine' as const },
      { id: 'summa', band: CAVEA_SUMMA, storey: 2, start: summaStart, material: 'timber' as const },
    ];
    for (const maenianum of maeniana) {
      const midA = (maenianum.band.innerA + maenianum.band.outerA) / 2;
      const midB = (maenianum.band.innerB + maenianum.band.outerB) / 2;
      const [seatX, seatZ] = ellipsePoint(midA, midB, theta);
      const radial = ellipseRadius(maenianum.band.outerA, maenianum.band.outerB, theta)
        - ellipseRadius(maenianum.band.innerA, maenianum.band.innerB, theta);
      parts.push(part({
        id: `cavea-${maenianum.id}-${bay}`,
        group: 'cavea',
        kind: 'seat',
        bay,
        storey: maenianum.storey,
        dimensions: [bayWidth(midA, midB, theta) * 1.08, maenianum.band.height, radial],
        finalPosition: [seatX, maenianum.band.foot + maenianum.band.height / 2, seatZ],
        finalRotation: [0, yaw, 0],
        material: maenianum.material,
        lane: bay % 4,
        start: maenianum.start,
        duration: 0.006,
        colorVariation: rand() * 2 - 1,
      }));
    }
  }

  const arenaSectors = 16;
  for (let sector = 0; sector < arenaSectors; sector += 1) {
    const theta = ((sector + 0.5) / arenaSectors) * Math.PI * 2 - Math.PI / 2;
    const yaw = ellipseYaw(COLOSSEUM_ARENA_A, COLOSSEUM_ARENA_B, theta);
    const [x, z] = ellipsePoint(COLOSSEUM_ARENA_A * 0.5, COLOSSEUM_ARENA_B * 0.5, theta);
    const radial = ellipseRadius(COLOSSEUM_ARENA_A, COLOSSEUM_ARENA_B, theta) * 0.96;
    const chord = bayWidth(COLOSSEUM_ARENA_A, COLOSSEUM_ARENA_B, theta) * (COLOSSEUM_BAYS / arenaSectors) * 1.12;
    parts.push(part({
      id: `arena-${sector}`,
      group: 'arena',
      kind: 'plank',
      bay: Math.round((sector / arenaSectors) * COLOSSEUM_BAYS) % COLOSSEUM_BAYS,
      storey: 0,
      dimensions: [chord, 0.22, radial],
      finalPosition: [x, 0.24, z],
      finalRotation: [0, yaw, 0],
      material: 'timber',
      lane: sector % 3,
      start: 0.76 + sector * (0.08 / arenaSectors),
      duration: 0.01,
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
