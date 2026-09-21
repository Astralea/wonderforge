import type { UnitScale, Vec3 } from '../data/constructionTypes';
import type {
  StonehengeConstructionPlan,
  StonehengeRoute,
  StonehengeStone,
} from '../data/stonehengeTypes';
import { clamp, easeInOutQuad, easeOutCubic } from './easing';
import {
  contactStateAt,
  packingFillAt,
  type StonehengeContactKind,
} from './stonehengeContact';
import { stonehengeTerrainHeightAt } from './stonehengeTerrain';

export const STONEHENGE_UPRIGHT_PHASES = [
  'rough',
  'dressed',
  'hauled',
  'positioned',
  'tilted',
  'raised',
  'packed',
  'seated',
] as const;

export const STONEHENGE_LINTEL_PHASES = [
  'rough',
  'dressed',
  'hauled',
  'queued',
  'cribbed',
  'hoisted',
  'aligned',
  'seated',
] as const;

export type StonehengeConstructionPhase =
  | (typeof STONEHENGE_UPRIGHT_PHASES)[number]
  | (typeof STONEHENGE_LINTEL_PHASES)[number];

export type StonehengeSupport =
  | 'source-ground'
  | 'dressing-bed'
  | 'sled'
  | 'ground-skids'
  | 'pit-ramp'
  | 'a-frame'
  | 'timber-crib'
  | 'guide-rails'
  | 'packed-chalk'
  | 'stone-joints';

export type StonehengeMechanism =
  | 'none'
  | 'sled'
  | 'skids'
  | 'a-frame'
  | 'timber-crib'
  | 'guide-rails';

export interface StonehengeConstructionState {
  phase: StonehengeConstructionPhase;
  phaseProgress: number;
  position: Vec3;
  rotation: Vec3;
  scale: UnitScale;
  support: StonehengeSupport;
  mechanism: StonehengeMechanism;
  visible: boolean;
  operationId: string;
  ropeTension: number;
  cribHeight: number;
  sledLift: number;
  contactDust: boolean;
  contactDustAmount: number;
  contactKind: StonehengeContactKind;
  packingFill: number;
  /** The pivot/stone-butt path for uprights; null for lintels. */
  heelPosition: Vec3 | null;
}

export interface ActiveStonehengeOperation {
  stone: StonehengeStone;
  route: StonehengeRoute;
  state: StonehengeConstructionState;
}

interface Pose {
  position: Vec3;
  rotation: Vec3;
  heelPosition: Vec3 | null;
}

/** Runner + deck height of Stonehenge's timber sledge/skids (~34 cm). */
export const STONEHENGE_SLED_BED_HEIGHT = 0.34;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function yawAlong(a: Vec3, b: Vec3, fallback: number): number {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  return Math.hypot(dx, dz) < 1e-7 ? fallback : Math.atan2(dx, dz);
}

function lanePoint(point: Vec3, route: StonehengeRoute, lane: number): Vec3 {
  const laneOffset = ((lane % 6) - 2.5) * route.laneWidth * 0.32;
  return [point[0] + laneOffset, point[1], point[2] - laneOffset * 0.18];
}

function outwardFor(stone: StonehengeStone): [number, number] {
  const length = Math.hypot(stone.finalPosition[0], stone.finalPosition[2]);
  if (length > 1.5) {
    return [stone.finalPosition[0] / length, stone.finalPosition[2] / length];
  }
  return [Math.sin(stone.finalRotation[1]), Math.cos(stone.finalRotation[1])];
}

export function stonehengeVerticalHalfExtent(
  stone: StonehengeStone,
  rotation: readonly [number, number, number],
): number {
  const roll = rotation[2];
  return (
    Math.abs(Math.sin(roll)) * stone.dimensions[0]
    + Math.abs(Math.cos(roll)) * stone.dimensions[1]
  ) * 0.5;
}

function horizontalPosition(
  stone: StonehengeStone,
  point: Vec3,
  rotation: Vec3,
  carrierHeight = 0,
): Vec3 {
  return [
    point[0],
    stonehengeTerrainHeightAt(point[0], point[2])
      + stonehengeVerticalHalfExtent(stone, rotation)
      + carrierHeight,
    point[2],
  ];
}

/** Transform a metre-space local point using the renderer's YXZ convention. */
export function stonehengePointFromPose(point: Vec3, position: Vec3, rotation: Vec3): Vec3 {
  const [pitch, yaw, roll] = rotation;
  const x = point[0] * Math.cos(roll) - point[1] * Math.sin(roll);
  const y = point[0] * Math.sin(roll) + point[1] * Math.cos(roll);
  const pitchedY = y * Math.cos(pitch) - point[2] * Math.sin(pitch);
  const z = y * Math.sin(pitch) + point[2] * Math.cos(pitch);
  return [
    position[0] + x * Math.cos(yaw) + z * Math.sin(yaw),
    position[1] + pitchedY,
    position[2] - x * Math.sin(yaw) + z * Math.cos(yaw),
  ];
}

function uprightRaisePose(
  stone: StonehengeStone,
  outward: [number, number],
  progress: number,
): Pose {
  const theta = progress * Math.PI * 0.5;
  const halfLength = stone.dimensions[1] * 0.5;
  const startHeelY = stonehengeTerrainHeightAt(stone.finalPosition[0], stone.finalPosition[2])
    + stone.dimensions[0] * 0.5;
  const finalHeelY = stone.finalPosition[1] - halfLength;
  const heelY = lerp(startHeelY, finalHeelY, Math.sin(theta));
  const heel: Vec3 = [stone.finalPosition[0], heelY, stone.finalPosition[2]];
  const yaw = stone.finalRotation[1];
  // Local +Y tips toward -X under positive Z rotation. Choose the outward
  // side, then derive the centre from the actual rotated butt-to-centre arm.
  const sign = -Math.cos(yaw) * outward[0] + Math.sin(yaw) * outward[1] >= 0 ? 1 : -1;
  const rotation: Vec3 = [0, yaw, sign * (Math.PI * 0.5 - theta)];
  return {
    position: stonehengePointFromPose([0, halfLength, 0], heel, rotation),
    rotation,
    heelPosition: heel,
  };
}

/** A short traverse perpendicular to the lintel's long bearing axis. */
export function stonehengeLintelStagingPosition(stone: StonehengeStone): Vec3 {
  const yaw = stone.finalRotation[1];
  const outward = outwardFor(stone);
  const sign = Math.sin(yaw) * outward[0] + Math.cos(yaw) * outward[1] >= 0 ? 1 : -1;
  return [
    stone.finalPosition[0] + Math.sin(yaw) * sign * 1.15,
    0,
    stone.finalPosition[2] + Math.cos(yaw) * sign * 1.15,
  ];
}

function uprightPoses(stone: StonehengeStone, route: StonehengeRoute): Pose[] {
  const laneSource = lanePoint(route.source, route, stone.lane);
  const laneDressing = lanePoint(route.dressing, route, stone.lane);
  const laneQueue = lanePoint(route.queue, route, stone.lane);
  const outward = outwardFor(stone);
  const pitPose = uprightRaisePose(stone, outward, 0);
  const sourceRotation: Vec3 = [0, yawAlong(route.source, route.dressing, stone.finalRotation[1]), pitPose.rotation[2]];
  const haulRotation: Vec3 = [0, yawAlong(route.dressing, route.queue, stone.finalRotation[1]), pitPose.rotation[2]];
  const queueRotation: Vec3 = [0, yawAlong(route.queue, pitPose.position, stone.finalRotation[1]), pitPose.rotation[2]];
  const dressingOffset: Vec3 = [laneDressing[0] - 1.1, laneDressing[1], laneDressing[2] + 0.8];
  const finalPose: Pose = {
    position: [...stone.finalPosition],
    rotation: [...stone.finalRotation],
    heelPosition: [
      stone.finalPosition[0],
      stone.finalPosition[1] - stone.dimensions[1] * 0.5,
      stone.finalPosition[2],
    ],
  };
  return [
    {
      position: horizontalPosition(stone, laneSource, sourceRotation),
      rotation: sourceRotation,
      heelPosition: horizontalPosition(stone, laneSource, sourceRotation),
    },
    {
      position: horizontalPosition(stone, dressingOffset, sourceRotation),
      rotation: sourceRotation,
      heelPosition: horizontalPosition(stone, dressingOffset, sourceRotation),
    },
    {
      position: horizontalPosition(stone, laneDressing, haulRotation, STONEHENGE_SLED_BED_HEIGHT),
      rotation: haulRotation,
      heelPosition: horizontalPosition(stone, laneDressing, haulRotation, STONEHENGE_SLED_BED_HEIGHT),
    },
    {
      position: horizontalPosition(stone, laneQueue, queueRotation, STONEHENGE_SLED_BED_HEIGHT),
      rotation: queueRotation,
      heelPosition: horizontalPosition(stone, laneQueue, queueRotation, STONEHENGE_SLED_BED_HEIGHT),
    },
    pitPose,
    uprightRaisePose(stone, outward, 0.42),
    finalPose,
    finalPose,
    finalPose,
  ];
}

function lintelPoses(stone: StonehengeStone, route: StonehengeRoute): Pose[] {
  const laneSource = lanePoint(route.source, route, stone.lane);
  const laneDressing = lanePoint(route.dressing, route, stone.lane);
  const laneQueue = lanePoint(route.queue, route, stone.lane);
  const sourceRotation: Vec3 = [0, yawAlong(route.source, route.dressing, stone.finalRotation[1]), 0];
  const haulRotation: Vec3 = [0, yawAlong(route.dressing, route.queue, stone.finalRotation[1]), 0];
  const stagingRotation: Vec3 = [0, stone.finalRotation[1], 0];
  const dressingOffset: Vec3 = [laneDressing[0] - 0.8, laneDressing[1], laneDressing[2] + 0.6];
  const staging: Vec3 = stonehengeLintelStagingPosition(stone);
  staging[1] = horizontalPosition(stone, staging, stagingRotation, STONEHENGE_SLED_BED_HEIGHT)[1];
  const highY = stone.finalPosition[1] + 0.62;
  const quarterY = staging[1] + (highY - staging[1]) * 0.34;
  return [
    { position: horizontalPosition(stone, laneSource, sourceRotation), rotation: sourceRotation, heelPosition: null },
    { position: horizontalPosition(stone, dressingOffset, sourceRotation), rotation: sourceRotation, heelPosition: null },
    { position: horizontalPosition(stone, laneDressing, haulRotation, STONEHENGE_SLED_BED_HEIGHT), rotation: haulRotation, heelPosition: null },
    { position: horizontalPosition(stone, laneQueue, [0, yawAlong(route.queue, staging, stone.finalRotation[1]), 0], STONEHENGE_SLED_BED_HEIGHT), rotation: [0, yawAlong(route.queue, staging, stone.finalRotation[1]), 0], heelPosition: null },
    { position: staging, rotation: [0, stone.finalRotation[1], 0], heelPosition: null },
    { position: [staging[0], quarterY, staging[2]], rotation: [0, stone.finalRotation[1], 0], heelPosition: null },
    { position: [staging[0], highY, staging[2]], rotation: [0, stone.finalRotation[1], 0], heelPosition: null },
    { position: [stone.finalPosition[0], highY, stone.finalPosition[2]], rotation: [...stone.finalRotation], heelPosition: null },
    { position: [...stone.finalPosition], rotation: [...stone.finalRotation], heelPosition: null },
  ];
}

function stateRoles(
  stone: StonehengeStone,
  phaseIndex: number,
  phaseProgress: number,
  position: Vec3,
  sledLift: number,
  complete: boolean,
): Pick<
  StonehengeConstructionState,
  'support' | 'mechanism' | 'ropeTension' | 'cribHeight' | 'sledLift' | 'contactDust' | 'contactDustAmount' | 'contactKind' | 'packingFill'
> {
  const phaseNames = stone.role === 'upright' ? STONEHENGE_UPRIGHT_PHASES : STONEHENGE_LINTEL_PHASES;
  const phase = phaseNames[Math.min(7, phaseIndex)]!;
  const contact = contactStateAt(phase, phaseProgress);
  if (stone.role === 'upright') {
    const supports: StonehengeSupport[] = [
      'source-ground', 'dressing-bed', 'sled', 'ground-skids',
      'pit-ramp', 'a-frame', 'packed-chalk', 'packed-chalk',
    ];
    const mechanism: StonehengeMechanism = phaseIndex === 2
      ? 'sled'
      : phaseIndex === 1 && sledLift > 0.001
        ? 'skids'
      : phaseIndex === 3
        ? 'skids'
        : phaseIndex === 4 || phaseIndex === 5
          ? 'a-frame'
          : 'none';
    return {
      support: supports[phaseIndex]!,
      mechanism,
      ropeTension: phaseIndex === 2
        ? 0.62
        : phaseIndex === 4 || phaseIndex === 5
          ? 0.86 + Math.sin(Math.PI * phaseProgress) * 0.14
          : 0,
      cribHeight: 0,
      sledLift,
      contactDust: contact.contactDustAmount > 0.08,
      contactDustAmount: contact.contactDustAmount,
      contactKind: contact.contactKind,
      packingFill: packingFillAt(phase, phaseProgress),
    };
  }
  const supports: StonehengeSupport[] = [
    'source-ground', 'dressing-bed', 'sled', 'ground-skids',
    'timber-crib', 'timber-crib', 'guide-rails', 'stone-joints',
  ];
  const isCrib = phaseIndex === 4 || phaseIndex === 5;
  const onGuides = phaseIndex === 6 || (phaseIndex === 7 && !complete);
  return {
    support: onGuides ? 'guide-rails' : supports[phaseIndex]!,
    mechanism: phaseIndex === 2
      ? 'sled'
      : phaseIndex === 1 && sledLift > 0.001
        ? 'skids'
      : phaseIndex === 3
        ? 'skids'
        : isCrib
          ? 'timber-crib'
          : onGuides
            ? 'guide-rails'
            : 'none',
    ropeTension: phaseIndex === 2
      ? 0.62
      : phaseIndex >= 4 && phaseIndex <= 6
        ? 0.72
        : 0,
    cribHeight: isCrib || onGuides ? Math.max(0.04, position[1] - stone.dimensions[1] * 0.5) : 0,
    sledLift,
    contactDust: contact.contactDustAmount > 0.08,
    contactDustAmount: contact.contactDustAmount,
    contactKind: contact.contactKind,
    packingFill: packingFillAt(phase, phaseProgress),
  };
}

export function stonehengeConstructionStateAt(
  stone: StonehengeStone,
  route: StonehengeRoute,
  rawT: number,
): StonehengeConstructionState {
  const phases = stone.role === 'upright' ? STONEHENGE_UPRIGHT_PHASES : STONEHENGE_LINTEL_PHASES;
  const poses = stone.role === 'upright' ? uprightPoses(stone, route) : lintelPoses(stone, route);
  const local = clamp((rawT - stone.start) / stone.duration);
  const complete = rawT >= stone.start + stone.duration - 1e-12;
  const phaseIndex = Math.min(7, Math.floor(local * 8));
  const phaseProgress = local >= 1 ? 1 : local * 8 - phaseIndex;
  const eased = phaseIndex === 4 || phaseIndex === 5
    ? easeInOutQuad(phaseProgress)
    : easeOutCubic(phaseProgress);
  const from = poses[phaseIndex]!;
  const to = poses[phaseIndex + 1]!;
  let position = local >= 1 ? [...stone.finalPosition] as Vec3 : lerpVec3(from.position, to.position, eased);
  let rotation = local >= 1 ? [...stone.finalRotation] as Vec3 : lerpVec3(from.rotation, to.rotation, eased);
  let heelPosition = from.heelPosition && to.heelPosition
    ? lerpVec3(from.heelPosition, to.heelPosition, eased)
    : from.heelPosition ?? to.heelPosition ?? null;
  // Positioned: stay on the turf and approach the pit mouth, then settle
  // onto the heel. A raw lerp from queue to pit chords through the bank.
  if (stone.role === 'upright' && local < 1 && phaseIndex === 3) {
    const pit = uprightRaisePose(stone, outwardFor(stone), 0);
    const turfY = from.position[1];
    const approach: Vec3 = [pit.position[0], turfY, pit.position[2]];
    if (eased < 0.86) {
      const u = eased / 0.86;
      position = lerpVec3(from.position, approach, u);
      rotation = lerpVec3(from.rotation, pit.rotation, u);
      heelPosition = position;
    } else {
      const u = (eased - 0.86) / 0.14;
      position = lerpVec3(approach, pit.position, u);
      rotation = pit.rotation;
      heelPosition = pit.heelPosition
        ? lerpVec3(approach, pit.heelPosition, u)
        : pit.heelPosition;
    }
  }
  // Tilted/raised must ride the heel arc. Lerping the 0.42 and final
  // keyframes chords through the turf and reads as the stone sliding.
  if (stone.role === 'upright' && local < 1 && (phaseIndex === 4 || phaseIndex === 5)) {
    const raiseT = phaseIndex === 4 ? eased * 0.42 : 0.42 + eased * 0.58;
    const pose = uprightRaisePose(stone, outwardFor(stone), raiseT);
    position = pose.position;
    rotation = pose.rotation;
    heelPosition = pose.heelPosition;
  }
  // Lintels stay on the turf while skidding to the crib; the vertical
  // lift starts only once the stone is beside the support pair.
  if (stone.role === 'lintel' && local < 1 && phaseIndex === 3) {
    position = horizontalPosition(stone, position, rotation, STONEHENGE_SLED_BED_HEIGHT);
  }
  let sledLift = 0;
  if (local < 1) {
    if (phaseIndex === 1) sledLift = STONEHENGE_SLED_BED_HEIGHT * eased;
    else if (phaseIndex === 2) sledLift = STONEHENGE_SLED_BED_HEIGHT;
    else if (phaseIndex === 3) {
      sledLift = stone.role === 'upright'
        ? STONEHENGE_SLED_BED_HEIGHT * Math.min(1, Math.max(0, (1 - eased) / 0.14))
        : STONEHENGE_SLED_BED_HEIGHT;
    }
  }
  if (local < 1 && phaseIndex <= 2) {
    position = horizontalPosition(stone, position, rotation, sledLift);
    heelPosition = position;
  }
  if (stone.role === 'upright' && local < 1 && phaseIndex === 3 && eased < 0.86) {
    position = horizontalPosition(stone, position, rotation, sledLift);
    heelPosition = position;
  }
  const roles = stateRoles(stone, phaseIndex, phaseProgress, position, sledLift, complete);
  return {
    phase: phases[phaseIndex]!,
    phaseProgress,
    position,
    rotation,
    scale: [1, 1, 1],
    visible: rawT >= stone.start,
    operationId: `stonehenge:${stone.id}`,
    heelPosition,
    ...roles,
  };
}

export function activeStonehengeOperationsAt(
  plan: StonehengeConstructionPlan,
  t: number,
): ActiveStonehengeOperation[] {
  const routes = new Map(plan.routes.map((route) => [route.id, route]));
  return plan.stones.flatMap((stone) => {
    if (t < stone.start || t >= stone.start + stone.duration) return [];
    const route = routes.get(stone.routeId);
    return route ? [{ stone, route, state: stonehengeConstructionStateAt(stone, route, t) }] : [];
  });
}

export function settledStonehengeCountAt(plan: StonehengeConstructionPlan, t: number): number {
  return plan.stones.reduce((count, stone) => count + Number(t >= stone.start + stone.duration), 0);
}
