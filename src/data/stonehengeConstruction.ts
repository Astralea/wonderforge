import { mulberry32 } from '../engine/random';
import type { Vec3 } from './constructionTypes';
import type {
  StonehengeConstructionPlan,
  StonehengeLayer,
  StonehengeMaterial,
  StonehengeRoute,
  StonehengeStone,
  StonehengeStoneGroup,
  StonehengeStoneRole,
} from './stonehengeTypes';

/** Large operations remain finite; this stays below Giza's 24-stone cap. */
export const STONEHENGE_MAX_ACTIVE = 20;
export const STONEHENGE_AXIS = Math.PI / 4;
export const STONEHENGE_OUTER_RADIUS = 15;

const routes: StonehengeRoute[] = [
  {
    id: 'sarsen-north',
    source: [18, 0.72, 92],
    dressing: [23, 0.58, 68],
    queue: [12, 0.42, 40],
    laneWidth: 2.8,
  },
  {
    id: 'bluestone-west',
    source: [-91, 0.64, 40],
    dressing: [-67, 0.52, 31],
    queue: [-41, 0.38, 18],
    laneWidth: 2.35,
  },
  {
    id: 'heel-northeast',
    source: [66, 0.65, 82],
    dressing: [51, 0.5, 64],
    queue: [34, 0.36, 43],
    laneWidth: 2.6,
  },
];

const layers: StonehengeLayer[] = [
  { id: 'weather-sky', depth: 0, motion: 'playback-time' },
  { id: 'rolling-downs', depth: 1, motion: 'static-world-space' },
  { id: 'open-grassland', depth: 2, motion: 'static-world-space' },
  { id: 'henge-earthwork', depth: 3, motion: 'static-world-space' },
  { id: 'stone-settings', depth: 4, motion: 'playback-time' },
  { id: 'work-systems', depth: 5, motion: 'playback-time' },
  { id: 'foreground-chalk-cut', depth: 6, motion: 'static-world-space' },
];

function rotateXZ(x: number, z: number, radians: number): [number, number] {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [x * cosine - z * sine, x * sine + z * cosine];
}

interface StoneInput {
  id: string;
  group: StonehengeStoneGroup;
  role: StonehengeStoneRole;
  material: StonehengeMaterial;
  dimensions: Vec3;
  finalPosition: Vec3;
  finalYaw: number;
  embedDepth?: number;
  supportIds?: string[];
  routeId?: StonehengeStone['routeId'];
  lane: number;
  start: number;
  duration: number;
  variation: number;
}

function stone(input: StoneInput): StonehengeStone {
  return {
    id: input.id,
    group: input.group,
    role: input.role,
    material: input.material,
    dimensions: input.dimensions,
    finalPosition: input.finalPosition,
    // Authored XZ angles turn +X toward +Z; Three.js Y yaw turns the opposite way.
    finalRotation: [0, -input.finalYaw, 0],
    scale: [1, 1, 1],
    embedDepth: input.embedDepth ?? 0,
    supportIds: input.supportIds ?? [],
    routeId: input.routeId ?? 'sarsen-north',
    lane: input.lane,
    start: input.start,
    duration: input.duration,
    colorVariation: input.variation,
  };
}

function createTrilithons(random: () => number): StonehengeStone[] {
  const result: StonehengeStone[] = [];
  // Local horseshoe opens toward +z; rotating 45° aligns the opening NE.
  const pairs = [
    { center: [0, -5] as const, yaw: 0, visibleHeight: 7.0 },
    { center: [-3.35, -3.45] as const, yaw: -0.55, visibleHeight: 6.35 },
    { center: [-4.75, 0] as const, yaw: -1.18, visibleHeight: 5.55 },
    { center: [3.35, -3.45] as const, yaw: 0.55, visibleHeight: 6.35 },
    { center: [4.75, 0] as const, yaw: 1.18, visibleHeight: 5.55 },
  ];

  pairs.forEach((pair, pairIndex) => {
    const pairYaw = pair.yaw + STONEHENGE_AXIS;
    const center = rotateXZ(pair.center[0], pair.center[1], STONEHENGE_AXIS);
    const gap = pairIndex === 0 ? 2.8 : 2.45;
    const totalHeight = pair.visibleHeight + 1.15;
    const uprightStart = 0.025 + pairIndex * 0.024;
    const uprightDuration = 0.09;
    const ids = [`trilithon-${pairIndex.toString().padStart(2, '0')}-upright-a`, `trilithon-${pairIndex.toString().padStart(2, '0')}-upright-b`];

    [-1, 1].forEach((side, sideIndex) => {
      const offsetX = Math.cos(pairYaw) * side * gap * 0.5;
      const offsetZ = Math.sin(pairYaw) * side * gap * 0.5;
      result.push(stone({
        id: ids[sideIndex]!,
        group: 'trilithon',
        role: 'upright',
        material: 'sarsen',
        dimensions: [1.35 + random() * 0.12, totalHeight, 1.05 + random() * 0.1],
        finalPosition: [center[0] + offsetX, -1.15 + totalHeight / 2, center[1] + offsetZ],
        finalYaw: pairYaw + (random() - 0.5) * 0.025,
        embedDepth: 1.15,
        lane: pairIndex * 2 + sideIndex,
        start: uprightStart + sideIndex * 0.004,
        duration: uprightDuration,
        variation: random() * 2 - 1,
      }));
    });

    const supportEnd = uprightStart + 0.004 + uprightDuration;
    result.push(stone({
      id: `trilithon-${pairIndex.toString().padStart(2, '0')}-lintel`,
      group: 'trilithon',
      role: 'lintel',
      material: 'sarsen',
      dimensions: [gap + 1.55, 0.88, 1.2],
      finalPosition: [center[0], pair.visibleHeight + 0.44, center[1]],
      finalYaw: pairYaw,
      supportIds: ids,
      lane: 10 + pairIndex,
      start: supportEnd + 0.006,
      duration: 0.118,
      variation: random() * 2 - 1,
    }));
  });
  return result;
}

function createOuterSarsens(random: () => number): StonehengeStone[] {
  const result: StonehengeStone[] = [];
  const uprights: StonehengeStone[] = [];
  const count = 30;
  for (let index = 0; index < count; index += 1) {
    const angle = STONEHENGE_AXIS + (index / count) * Math.PI * 2;
    // The outer uprights vary in width/depth and material value, but their
    // dressed tenon shoulders share one level so each rigid lintel can bear on
    // both adjacent supports instead of bridging an authored air gap.
    const visibleHeight = 4.1;
    const embedDepth = 1.05;
    const totalHeight = visibleHeight + embedDepth;
    const start = 0.175 + index * 0.0084;
    uprights.push(stone({
      id: `outer-sarsen-upright-${index.toString().padStart(2, '0')}`,
      group: 'outer-sarsen',
      role: 'upright',
      material: 'sarsen',
      dimensions: [1.28 + random() * 0.12, totalHeight, 0.95 + random() * 0.1],
      finalPosition: [
        Math.cos(angle) * STONEHENGE_OUTER_RADIUS,
        -embedDepth + totalHeight / 2,
        Math.sin(angle) * STONEHENGE_OUTER_RADIUS,
      ],
      finalYaw: angle,
      embedDepth,
      lane: index % 14,
      start,
      duration: 0.105,
      variation: random() * 2 - 1,
    }));
  }
  result.push(...uprights);

  const chord = 2 * STONEHENGE_OUTER_RADIUS * Math.sin(Math.PI / count);
  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count;
    // Begin on the south-west, camera-facing arc. This is cinematic staging,
    // not a claim about prehistoric build order: it keeps the physical crib
    // lift readable instead of hiding it behind the already seated circle.
    const sequence = (index + count / 2) % count;
    const angle = STONEHENGE_AXIS + ((index + 0.5) / count) * Math.PI * 2;
    const supportEnd = Math.max(
      uprights[index]!.start + uprights[index]!.duration,
      uprights[next]!.start + uprights[next]!.duration,
    );
    result.push(stone({
      id: `outer-sarsen-lintel-${index.toString().padStart(2, '0')}`,
      group: 'outer-sarsen',
      role: 'lintel',
      material: 'sarsen',
      dimensions: [chord * 1.06, 0.78, 1.02],
      finalPosition: [
        Math.cos(angle) * STONEHENGE_OUTER_RADIUS,
        4.48,
        Math.sin(angle) * STONEHENGE_OUTER_RADIUS,
      ],
      finalYaw: angle + Math.PI / 2,
      supportIds: [uprights[index]!.id, uprights[next]!.id],
      lane: index % 14,
      start: Math.max(0.48 + sequence * 0.0075, supportEnd + 0.006),
      duration: 0.07,
      variation: random() * 2 - 1,
    }));
  }
  return result;
}

function createBluestones(random: () => number): StonehengeStone[] {
  const result: StonehengeStone[] = [];
  const addBluestone = (
    id: string,
    group: 'bluestone-circle' | 'bluestone-horseshoe',
    x: number,
    z: number,
    yaw: number,
    sequence: number,
  ) => {
    const visibleHeight = 2.05 + random() * 0.45;
    const embedDepth = 0.52;
    const totalHeight = visibleHeight + embedDepth;
    const start = 0.58 + sequence * (0.22 / 58);
    result.push(stone({
      id,
      group,
      role: 'upright',
      material: 'bluestone',
      dimensions: [0.68 + random() * 0.18, totalHeight, 0.56 + random() * 0.14],
      finalPosition: [x, -embedDepth + totalHeight / 2, z],
      finalYaw: yaw + (random() - 0.5) * 0.08,
      embedDepth,
      routeId: 'bluestone-west',
      lane: sequence % 12,
      start,
      duration: 0.028,
      variation: random() * 2 - 1,
    }));
  };

  for (let index = 0; index < 40; index += 1) {
    const angle = STONEHENGE_AXIS + (index / 40) * Math.PI * 2;
    addBluestone(
      `bluestone-circle-${index.toString().padStart(2, '0')}`,
      'bluestone-circle',
      Math.cos(angle) * 11.1,
      Math.sin(angle) * 11.1,
      angle,
      index,
    );
  }

  // A compact horseshoe open to the NE, graded toward its closed SW end.
  for (let index = 0; index < 19; index += 1) {
    const u = index / 18;
    const angle = STONEHENGE_AXIS + Math.PI * (0.18 + u * 1.64);
    const radius = 6.7 - 1.2 * Math.sin(Math.PI * u);
    addBluestone(
      `bluestone-horseshoe-${index.toString().padStart(2, '0')}`,
      'bluestone-horseshoe',
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      angle,
      40 + index,
    );
  }
  return result;
}

function createHeelStone(random: () => number): StonehengeStone {
  const visibleHeight = 4.9;
  const embedDepth = 0.85;
  const totalHeight = visibleHeight + embedDepth;
  const radius = 27;
  return stone({
    id: 'heel-stone',
    group: 'heel-stone',
    role: 'upright',
    material: 'sarsen',
    dimensions: [2.05, totalHeight, 1.25],
    finalPosition: [
      Math.cos(STONEHENGE_AXIS) * radius,
      -embedDepth + totalHeight / 2,
      Math.sin(STONEHENGE_AXIS) * radius,
    ],
    finalYaw: STONEHENGE_AXIS + 0.08,
    embedDepth,
    routeId: 'heel-northeast',
    lane: 0,
    start: 0.09,
    duration: 0.11,
    variation: random() * 2 - 1,
  });
}

export function createStonehengeConstructionPlan(): StonehengeConstructionPlan {
  const random = mulberry32('wonderforge:stonehenge:v1');
  const stones = [
    ...createTrilithons(random),
    createHeelStone(random),
    ...createOuterSarsens(random),
    ...createBluestones(random),
  ];
  return {
    seed: 'wonderforge:stonehenge:v1',
    stones,
    routes: routes.map((route) => ({ ...route, source: [...route.source], dressing: [...route.dressing], queue: [...route.queue] })),
    layers: layers.map((layer) => ({ ...layer })),
    axisRadians: STONEHENGE_AXIS,
    outerRadius: STONEHENGE_OUTER_RADIUS,
    groundY: 0,
  };
}

export const STONEHENGE_CONSTRUCTION = createStonehengeConstructionPlan();
