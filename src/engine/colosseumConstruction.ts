import { clamp, easeInOutQuad } from './easing';
import {
  COLOSSEUM_A,
  COLOSSEUM_ARENA_A,
  COLOSSEUM_ARENA_B,
  COLOSSEUM_B,
  COLOSSEUM_CONSTRUCTION,
  COLOSSEUM_FOUNDATION_HEIGHT,
  COLOSSEUM_QUARRY,
  COLOSSEUM_STOREY_HEIGHT,
  COLOSSEUM_WAGON_BED,
  bayTheta,
  ellipsePoint,
  ellipseYaw,
} from '../data/colosseumConstruction';
import type {
  ColosseumPart,
  ColosseumPhase,
  ColosseumRoute,
} from '../data/colosseumTypes';
import type { Vec3 } from '../data/constructionTypes';
import { colosseumTerrainHeightAt } from './colosseumTerrain';

export interface ColosseumPartState {
  phase: ColosseumPhase;
  visible: boolean;
  position: Vec3;
  rotation: Vec3;
  scale: [1, 1, 1];
  support: 'quarry-yard' | 'wagon-bed' | 'working-floor' | 'crane-hook' | 'masonry';
  mechanism: 'none' | 'wagon' | 'crane';
  wagonLift: number;
  phaseLocal: number;
  contactDust: boolean;
  contactDustAmount: number;
}

export interface ActiveColosseumOperation {
  part: ColosseumPart;
  state: ColosseumPartState;
}

const PHASES: Array<{ phase: ColosseumPhase; until: number }> = [
  { phase: 'quarry', until: 0.14 },
  { phase: 'hauled', until: 0.48 },
  { phase: 'staged', until: 0.58 },
  { phase: 'hoisted', until: 0.9 },
  { phase: 'seated', until: 1 },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function colosseumVerticalHalfExtent(dimensions: readonly [number, number, number]): number {
  return dimensions[1] / 2;
}

function localT(part: ColosseumPart, t: number): number {
  return clamp((t - part.start) / part.duration);
}

function phaseAt(u: number): { phase: ColosseumPhase; local: number; from: number; until: number } {
  let from = 0;
  for (const step of PHASES) {
    if (u <= step.until) {
      const span = step.until - from;
      return { phase: step.phase, local: span <= 0 ? 1 : (u - from) / span, from, until: step.until };
    }
    from = step.until;
  }
  return { phase: 'seated', local: 1, from: 0.9, until: 1 };
}

function sourcePose(part: ColosseumPart): Vec3 {
  const scatter = (part.bay % 9) * 1.35 - 6;
  const row = part.storey + 1;
  const x = COLOSSEUM_QUARRY[0] + (part.lane - 1) * 3.2;
  const z = COLOSSEUM_QUARRY[2] + scatter + row * 0.4;
  return [x, colosseumTerrainHeightAt(x, z) + colosseumVerticalHalfExtent(part.dimensions), z];
}

function stagingPose(part: ColosseumPart): Vec3 {
  const theta = bayTheta(part.bay);
  const [x, z] = ellipsePoint(COLOSSEUM_A + 10, COLOSSEUM_B + 8.5, theta);
  const half = colosseumVerticalHalfExtent(part.dimensions);
  return [x, colosseumTerrainHeightAt(x, z) + half, z];
}

function shortestAngleDelta(from: number, to: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function outerRingPoint(theta: number, pad = 22): [number, number] {
  return ellipsePoint(COLOSSEUM_A + pad, COLOSSEUM_B + pad, theta);
}

function haulPose(part: ColosseumPart, route: ColosseumRoute, local: number): Vec3 {
  const source = sourcePose(part);
  const staged = stagingPose(part);
  const eased = easeInOutQuad(local);
  const roadX = route.road[0];
  const roadZ = route.road[2] + (part.lane - 1) * 2.1;
  const roadTheta = 0.04;
  const bay = bayTheta(part.bay);
  let x: number;
  let z: number;
  if (eased < 0.34) {
    const p = easeInOutQuad(eased / 0.34);
    x = lerp(source[0], roadX, p);
    z = lerp(source[2], roadZ, p);
  } else if (eased < 0.82) {
    const p = easeInOutQuad((eased - 0.34) / 0.48);
    const theta = roadTheta + shortestAngleDelta(roadTheta, bay) * p;
    [x, z] = outerRingPoint(theta);
    z += (part.lane - 1) * 1.4;
  } else {
    const p = easeInOutQuad((eased - 0.82) / 0.18);
    const [ox, oz] = outerRingPoint(bay);
    x = lerp(ox, staged[0], p);
    z = lerp(oz + (part.lane - 1) * 1.4, staged[2], p);
  }
  const ontoWagon = easeInOutQuad(clamp(local / 0.12));
  const offWagon = 1 - easeInOutQuad(clamp((local - 0.86) / 0.14));
  const lift = COLOSSEUM_WAGON_BED * Math.min(ontoWagon, offWagon);
  return [x, colosseumTerrainHeightAt(x, z) + colosseumVerticalHalfExtent(part.dimensions) + lift, z];
}

export function colosseumInsideArena(x: number, z: number, margin = 1.08): boolean {
  return (x / COLOSSEUM_ARENA_A) ** 2 + (z / COLOSSEUM_ARENA_B) ** 2 < margin;
}

function hoistClearance(part: ColosseumPart): number {
  if (part.group === 'foundation' || part.storey < 0) return 1.15;
  return 1.65;
}

function hoistPose(part: ColosseumPart, local: number): Vec3 {
  const staged = stagingPose(part);
  const seat = part.finalPosition;
  const liftY = seat[1] + hoistClearance(part);
  if (local < 0.42) {
    const up = easeInOutQuad(local / 0.42);
    return [staged[0], lerp(staged[1], liftY, up), staged[2]];
  }
  if (local < 0.76) {
    const over = easeInOutQuad((local - 0.42) / 0.34);
    return [lerp(staged[0], seat[0], over), liftY, lerp(staged[2], seat[2], over)];
  }
  const down = easeInOutQuad((local - 0.76) / 0.24);
  return [seat[0], lerp(liftY, seat[1], down), seat[2]];
}

export function colosseumWorkingDeckY(part: ColosseumPart, x: number, z: number): number {
  if (part.storey <= 0) return colosseumTerrainHeightAt(x, z);
  return COLOSSEUM_FOUNDATION_HEIGHT + part.storey * COLOSSEUM_STOREY_HEIGHT;
}

export interface ColosseumCraneRig {
  base: Vec3;
  mastTop: Vec3;
  boomTip: Vec3;
  hook: Vec3;
  yaw: number;
  treadwheel: Vec3;
}

export function colosseumCraneRigAt(part: ColosseumPart, state: ColosseumPartState): ColosseumCraneRig | null {
  if (state.mechanism !== 'crane') return null;
  const staged = stagingPose(part);
  const half = colosseumVerticalHalfExtent(part.dimensions);
  const hook: Vec3 = [state.position[0], state.position[1] + half, state.position[2]];
  const deckY = colosseumWorkingDeckY(part, staged[0], staged[2]);
  const boomY = Math.max(hook[1] + 0.9, deckY + 7.5);
  const boomTip: Vec3 = [state.position[0], boomY, state.position[2]];
  const mastTop: Vec3 = [staged[0], boomY, staged[2]];
  const base: Vec3 = [staged[0], deckY, staged[2]];
  const yaw = Math.atan2(state.position[0] - staged[0], state.position[2] - staged[2]) || state.rotation[1];
  const lateralX = Math.cos(yaw);
  const lateralZ = -Math.sin(yaw);
  const treadwheel: Vec3 = [base[0] - Math.sin(yaw) * 1.6 + lateralX * 1.2, deckY + 2.1, base[2] - Math.cos(yaw) * 1.6 + lateralZ * 1.2];
  return { base, mastTop, boomTip, hook, yaw, treadwheel };
}

const SCAFFOLD_WINDOWS = [
  { storey: 0, raiseFrom: 0.08, raiseUntil: 0.16, strikeFrom: 0.52, strikeUntil: 0.6 },
  { storey: 1, raiseFrom: 0.48, raiseUntil: 0.56, strikeFrom: 0.68, strikeUntil: 0.76 },
  { storey: 2, raiseFrom: 0.64, raiseUntil: 0.72, strikeFrom: 0.84, strikeUntil: 0.92 },
  { storey: 3, raiseFrom: 0.8, raiseUntil: 0.86, strikeFrom: 0.94, strikeUntil: 0.995 },
] as const;

export const COLOSSEUM_SCAFFOLD_STATIONS = 20;
export const COLOSSEUM_SCAFFOLD_SEGMENT = 2.875;

function envelopeHeight(t: number, raiseFrom: number, raiseUntil: number, strikeFrom: number, strikeUntil: number): number {
  if (t < raiseFrom || t >= strikeUntil) return 0;
  if (t < raiseUntil) return easeInOutQuad((t - raiseFrom) / (raiseUntil - raiseFrom));
  if (t < strikeFrom) return 1;
  return 1 - easeInOutQuad((t - strikeFrom) / (strikeUntil - strikeFrom));
}

/** Metres of ground-rooted scaffold the working face currently needs. */
export function colosseumScaffoldStackHeightAt(t: number): number {
  let height = 0;
  for (const window of SCAFFOLD_WINDOWS) {
    const factor = envelopeHeight(t, window.raiseFrom, window.raiseUntil, window.strikeFrom, window.strikeUntil);
    if (factor <= 0) continue;
    const rise = window.storey === 3 ? 8.4 : COLOSSEUM_STOREY_HEIGHT;
    const base = window.storey <= 0 ? 0 : COLOSSEUM_FOUNDATION_HEIGHT + window.storey * COLOSSEUM_STOREY_HEIGHT;
    height = Math.max(height, base + rise * factor);
  }
  return height;
}

export interface ColosseumScaffoldWindow {
  kind: 'raising' | 'hold' | 'striking';
  raiseFrom: number;
  raiseUntil: number;
  strikeFrom: number;
  strikeUntil: number;
  base: number;
  rise: number;
}

export function colosseumScaffoldWindowAt(t: number): ColosseumScaffoldWindow | null {
  let raising: ColosseumScaffoldWindow | null = null;
  let striking: ColosseumScaffoldWindow | null = null;
  let hold: ColosseumScaffoldWindow | null = null;
  for (const window of SCAFFOLD_WINDOWS) {
    const rise = window.storey === 3 ? 8.4 : COLOSSEUM_STOREY_HEIGHT;
    const base = window.storey <= 0 ? 0 : COLOSSEUM_FOUNDATION_HEIGHT + window.storey * COLOSSEUM_STOREY_HEIGHT;
    const shaped = {
      raiseFrom: window.raiseFrom,
      raiseUntil: window.raiseUntil,
      strikeFrom: window.strikeFrom,
      strikeUntil: window.strikeUntil,
      base,
      rise,
    };
    if (t >= window.raiseFrom && t < window.raiseUntil) raising = { kind: 'raising', ...shaped };
    else if (t >= window.strikeFrom && t < window.strikeUntil) striking = { kind: 'striking', ...shaped };
    else if (t >= window.raiseUntil && t < window.strikeFrom) hold = { kind: 'hold', ...shaped };
  }
  return raising ?? striking ?? hold;
}

export interface ColosseumScaffoldBay {
  station: number;
  segmentCount: number;
  segmentLength: typeof COLOSSEUM_SCAFFOLD_SEGMENT;
  height: number;
  footY: number;
  deckY: number;
  position: Vec3;
  yaw: number;
}

export function colosseumScaffoldsAt(t: number): ColosseumScaffoldBay[] {
  const raw = colosseumScaffoldStackHeightAt(t);
  if (raw < COLOSSEUM_SCAFFOLD_SEGMENT * 0.5) return [];
  const segmentCount = Math.max(1, Math.floor(raw / COLOSSEUM_SCAFFOLD_SEGMENT));
  const height = segmentCount * COLOSSEUM_SCAFFOLD_SEGMENT;
  const bays: ColosseumScaffoldBay[] = [];
  for (let station = 0; station < COLOSSEUM_SCAFFOLD_STATIONS; station += 1) {
    const theta = (station / COLOSSEUM_SCAFFOLD_STATIONS) * Math.PI * 2 - Math.PI / 2;
    const [x, z] = ellipsePoint(COLOSSEUM_A + 7.4, COLOSSEUM_B + 6.6, theta);
    const footY = colosseumTerrainHeightAt(x, z);
    bays.push({
      station,
      segmentCount,
      segmentLength: COLOSSEUM_SCAFFOLD_SEGMENT,
      height,
      footY,
      deckY: footY + height,
      position: [x, footY + height, z],
      yaw: ellipseYaw(COLOSSEUM_A, COLOSSEUM_B, theta),
    });
  }
  return bays;
}

export interface ColosseumCenteringBay {
  id: string;
  position: Vec3;
  yaw: number;
  heightFactor: number;
  span: number;
}

export function colosseumCenteringAt(t: number): ColosseumCenteringBay[] {
  const bays: ColosseumCenteringBay[] = [];
  for (const part of COLOSSEUM_CONSTRUCTION.parts) {
    if (part.group !== 'vault') continue;
    const raiseFrom = part.start - 0.018;
    const raiseUntil = part.start;
    const strikeFrom = part.start + part.duration;
    const strikeUntil = strikeFrom + 0.035;
    const heightFactor = envelopeHeight(t, raiseFrom, raiseUntil, strikeFrom, strikeUntil);
    if (heightFactor < 0.04) continue;
    bays.push({
      id: part.id,
      position: part.finalPosition,
      yaw: part.finalRotation[1],
      heightFactor,
      span: part.dimensions[2],
    });
  }
  return bays;
}

export function colosseumPartStateAt(
  part: ColosseumPart,
  route: ColosseumRoute,
  t: number,
): ColosseumPartState {
  if (t < part.start) {
    const source = sourcePose(part);
    return {
      phase: 'quarry',
      visible: false,
      position: source,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      support: 'quarry-yard',
      mechanism: 'none',
      wagonLift: 0,
      phaseLocal: 0,
      contactDust: false,
      contactDustAmount: 0,
    };
  }
  if (t >= part.start + part.duration) {
    return {
      phase: 'seated',
      visible: true,
      position: part.finalPosition,
      rotation: part.finalRotation,
      scale: [1, 1, 1],
      support: 'masonry',
      mechanism: 'none',
      wagonLift: 0,
      phaseLocal: 1,
      contactDust: false,
      contactDustAmount: 0,
    };
  }

  const u = localT(part, t);
  const { phase, local } = phaseAt(u);
  const staged = stagingPose(part);
  if (phase === 'quarry') {
    const source = sourcePose(part);
    return {
      phase,
      visible: true,
      position: source,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      support: 'quarry-yard',
      mechanism: 'none',
      wagonLift: 0,
      phaseLocal: local,
      contactDust: false,
      contactDustAmount: 0,
    };
  }
  if (phase === 'hauled') {
    const position = haulPose(part, route, local);
    return {
      phase,
      visible: true,
      position,
      rotation: [0, Math.atan2(position[0] - COLOSSEUM_QUARRY[0], position[2] - COLOSSEUM_QUARRY[2]), 0],
      scale: [1, 1, 1],
      support: 'wagon-bed',
      mechanism: 'wagon',
      wagonLift: COLOSSEUM_WAGON_BED * Math.min(
        easeInOutQuad(clamp(local / 0.12)),
        1 - easeInOutQuad(clamp((local - 0.86) / 0.14)),
      ),
      contactDust: true,
      contactDustAmount: 0.45,
      phaseLocal: local,
    };
  }
  if (phase === 'staged') {
    return {
      phase,
      visible: true,
      position: staged,
      rotation: part.finalRotation,
      scale: [1, 1, 1],
      support: 'working-floor',
      mechanism: 'none',
      wagonLift: 0,
      phaseLocal: local,
      contactDust: local > 0.85,
      contactDustAmount: local > 0.85 ? 0.2 : 0,
    };
  }
  if (phase === 'hoisted') {
    return {
      phase,
      visible: true,
      position: hoistPose(part, local),
      rotation: part.finalRotation,
      scale: [1, 1, 1],
      support: 'crane-hook',
      mechanism: 'crane',
      wagonLift: 0,
      phaseLocal: local,
      contactDust: local > 0.92,
      contactDustAmount: local > 0.92 ? 0.35 : 0,
    };
  }
  return {
    phase: 'seated',
    visible: true,
    position: part.finalPosition,
    rotation: part.finalRotation,
    scale: [1, 1, 1],
    support: 'masonry',
    mechanism: 'none',
    wagonLift: 0,
    phaseLocal: 1,
    contactDust: false,
    contactDustAmount: 0,
  };
}

export function activeColosseumOperationsAt(
  plan: typeof COLOSSEUM_CONSTRUCTION,
  t: number,
): ActiveColosseumOperation[] {
  const route = plan.routes[0]!;
  const active: ActiveColosseumOperation[] = [];
  for (const part of plan.parts) {
    if (t < part.start || t >= part.start + part.duration) continue;
    const state = colosseumPartStateAt(part, route, t);
    if (!state.visible) continue;
    if (state.phase === 'seated') continue;
    active.push({ part, state });
  }
  return active;
}

export function seatedColosseumCountAt(plan: typeof COLOSSEUM_CONSTRUCTION, t: number): number {
  return plan.parts.filter((part) => t >= part.start + part.duration).length;
}
