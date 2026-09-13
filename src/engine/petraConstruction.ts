import type { UnitScale, Vec3 } from '../data/constructionTypes';
import {
  PETRA_CONSTRUCTION,
  PETRA_FACADE_HEIGHT,
  PETRA_MAX_ACTIVE,
  PETRA_SLED_BED_HEIGHT,
} from '../data/petraConstruction';
import type {
  PetraConstructionPlan,
  PetraRockMember,
  PetraRoute,
  PetraSpoilCell,
} from '../data/petraTypes';
import { clamp, easeInOutQuad } from './easing';
import { petraTerrainHeightAt } from './petraTerrain';

export const PETRA_SPOIL_PHASES = [
  'in-situ',
  'cut',
  'lowered',
  'hauled',
  'dumped',
] as const;

export type PetraSpoilPhase = (typeof PETRA_SPOIL_PHASES)[number];

export type PetraSupport =
  | 'parent-cliff'
  | 'rock-bench'
  | 'timber-chute'
  | 'sled'
  | 'dump-ground';

export type PetraMechanism =
  | 'none'
  | 'pick'
  | 'chute'
  | 'sled';

export type PetraContactKind = 'none' | 'cut' | 'runners' | 'dump';

export interface PetraSpoilState {
  phase: PetraSpoilPhase;
  phaseProgress: number;
  position: Vec3;
  rotation: Vec3;
  scale: UnitScale;
  support: PetraSupport;
  mechanism: PetraMechanism;
  visible: boolean;
  operationId: string;
  sledLift: number;
  contactDust: boolean;
  contactDustAmount: number;
  contactKind: PetraContactKind;
}

export interface PetraMemberState {
  visible: boolean;
  position: Vec3;
  rotation: Vec3;
  scale: UnitScale;
}

export interface ActivePetraOperation {
  cell: PetraSpoilCell;
  route: PetraRoute;
  state: PetraSpoilState;
}

const UNIT: UnitScale = [1, 1, 1];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function petraWorkingFaceY(rawT: number): number {
  const t = clamp(rawT);
  const build = clamp((t - 0.08) / 0.84);
  return lerp(PETRA_FACADE_HEIGHT + 0.4, 0.28, easeInOutQuad(build));
}

export function petraVerticalHalfExtent(dimensions: readonly [number, number, number]): number {
  return dimensions[1] * 0.5;
}

function haulPoint(x: number, z: number, halfY: number, carrier: number): Vec3 {
  return [x, petraTerrainHeightAt(x, z) + halfY + carrier, z];
}

function yawAlong(a: Vec3, b: Vec3): number {
  return Math.atan2(b[0] - a[0], b[2] - a[2]);
}

function laneOffset(route: PetraRoute, lane: number): number {
  return ((lane % 4) - 1.5) * route.laneWidth * 0.28;
}

function cellDumpPose(cell: PetraSpoilCell): Vec3 {
  const halfY = petraVerticalHalfExtent(cell.dimensions);
  return haulPoint(cell.dumpPosition[0], cell.dumpPosition[2], halfY, 0);
}

function poseAt(
  cell: PetraSpoilCell,
  route: PetraRoute,
  u: number,
): { position: Vec3; rotation: Vec3; phase: PetraSpoilPhase; support: PetraSupport; mechanism: PetraMechanism; sledLift: number; contactKind: PetraContactKind; contactDust: boolean } {
  const halfY = petraVerticalHalfExtent(cell.dimensions);
  const source: Vec3 = [...cell.sourcePosition];
  const side = source[0] < 0 ? -1 : 1;
  const ledge: Vec3 = [
    side * Math.abs(route.ledge[0]),
    source[1],
    route.ledge[2],
  ];
  const plaza = haulPoint(
    side * Math.abs(route.plaza[0]) + laneOffset(route, cell.lane),
    route.plaza[2],
    halfY,
    PETRA_SLED_BED_HEIGHT,
  );
  const siq = haulPoint(
    route.siq[0] + laneOffset(route, cell.lane),
    route.siq[2],
    halfY,
    PETRA_SLED_BED_HEIGHT,
  );
  const dump = cellDumpPose(cell);
  const hauledDump = haulPoint(dump[0], dump[2], halfY, PETRA_SLED_BED_HEIGHT);

  if (u <= 0) {
    return {
      position: source,
      rotation: [0, 0, 0],
      phase: 'in-situ',
      support: 'parent-cliff',
      mechanism: 'none',
      sledLift: 0,
      contactKind: 'none',
      contactDust: false,
    };
  }
  if (u < 0.18) {
    const p = u / 0.18;
    return {
      position: source,
      rotation: [0, 0, 0],
      phase: 'cut',
      support: 'rock-bench',
      mechanism: 'pick',
      sledLift: 0,
      contactKind: 'cut',
      contactDust: p > 0.2,
    };
  }
  if (u < 0.4) {
    const p = (u - 0.18) / 0.22;
    const mid = p < 0.55
      ? lerpVec3(source, ledge, easeInOutQuad(p / 0.55))
      : lerpVec3(ledge, plaza, easeInOutQuad((p - 0.55) / 0.45));
    return {
      position: mid,
      rotation: [0, yawAlong(source, plaza), 0],
      phase: 'lowered',
      support: p < 0.55 ? 'timber-chute' : 'sled',
      mechanism: p < 0.55 ? 'chute' : 'sled',
      sledLift: p < 0.55 ? 0 : PETRA_SLED_BED_HEIGHT,
      contactKind: p < 0.55 ? 'none' : 'runners',
      contactDust: p > 0.7,
    };
  }
  if (u < 0.86) {
    const p = (u - 0.4) / 0.46;
    const position = p < 0.5
      ? lerpVec3(plaza, siq, easeInOutQuad(p / 0.5))
      : lerpVec3(siq, hauledDump, easeInOutQuad((p - 0.5) / 0.5));
    // Re-seat Y onto the sampled floor so eased XZ never chords through air.
    const seated: Vec3 = [
      position[0],
      petraTerrainHeightAt(position[0], position[2]) + halfY + PETRA_SLED_BED_HEIGHT,
      position[2],
    ];
    return {
      position: seated,
      rotation: [0, yawAlong(plaza, dump), 0],
      phase: 'hauled',
      support: 'sled',
      mechanism: 'sled',
      sledLift: PETRA_SLED_BED_HEIGHT,
      contactKind: 'runners',
      contactDust: true,
    };
  }
  const p = (u - 0.86) / 0.14;
  const lift = PETRA_SLED_BED_HEIGHT * (1 - easeInOutQuad(p));
  const position: Vec3 = [
    dump[0],
    petraTerrainHeightAt(dump[0], dump[2]) + halfY + lift,
    dump[2],
  ];
  return {
    position,
    rotation: [0, yawAlong(siq, dump), 0],
    phase: 'dumped',
    support: lift > 0.02 ? 'sled' : 'dump-ground',
    mechanism: lift > 0.02 ? 'sled' : 'none',
    sledLift: lift,
    contactKind: 'dump',
    contactDust: p < 0.55,
  };
}

export function petraSpoilStateAt(
  cell: PetraSpoilCell,
  route: PetraRoute,
  rawT: number,
): PetraSpoilState {
  const t = clamp(rawT);
  const end = cell.start + cell.duration;
  if (t < cell.start) {
    const rest = poseAt(cell, route, 0);
    return {
      ...rest,
      phaseProgress: 0,
      scale: UNIT,
      visible: true,
      operationId: cell.id,
      contactDustAmount: 0,
    };
  }
  const u = t >= end ? 1 : (t - cell.start) / cell.duration;
  const pose = poseAt(cell, route, u);
  const phaseProgress = u <= 0 ? 0 : u < 0.18 ? u / 0.18
    : u < 0.4 ? (u - 0.18) / 0.22
      : u < 0.86 ? (u - 0.4) / 0.46
        : (u - 0.86) / 0.14;
  return {
    ...pose,
    phaseProgress,
    scale: UNIT,
    visible: true,
    operationId: cell.id,
    contactDustAmount: pose.contactDust ? Math.min(1, 0.35 + phaseProgress * 0.5) : 0,
  };
}

export function petraMemberStateAt(
  member: PetraRockMember,
  plan: PetraConstructionPlan,
  rawT: number,
): PetraMemberState {
  const t = clamp(rawT);
  const top = member.finalPosition[1] + member.dimensions[1] * 0.5;
  const faceCleared = petraWorkingFaceY(t) <= top - 0.04;
  const cellsById = new Map(plan.cells.map((cell) => [cell.id, cell]));
  const route = plan.routes[0]!;
  const coveringGone = member.coveringCellIds.every((id) => {
    const cell = cellsById.get(id);
    if (!cell) return true;
    const state = petraSpoilStateAt(cell, route, t);
    return state.phase !== 'in-situ' && state.phase !== 'cut';
  });
  return {
    visible: faceCleared && coveringGone,
    position: member.finalPosition,
    rotation: member.finalRotation,
    scale: UNIT,
  };
}

export function activePetraOperationsAt(
  plan: PetraConstructionPlan = PETRA_CONSTRUCTION,
  rawT = 0,
): ActivePetraOperation[] {
  const t = clamp(rawT);
  const route = plan.routes[0]!;
  const active: ActivePetraOperation[] = [];
  for (const cell of plan.cells) {
    if (t < cell.start || t >= cell.start + cell.duration) continue;
    const state = petraSpoilStateAt(cell, route, t);
    if (state.phase === 'in-situ' || state.phase === 'dumped') continue;
    active.push({ cell, route, state });
    if (active.length >= PETRA_MAX_ACTIVE) break;
  }
  return active;
}

export function revealedPetraMemberCountAt(
  plan: PetraConstructionPlan,
  t: number,
): number {
  return plan.members.filter((member) => petraMemberStateAt(member, plan, t).visible).length;
}
