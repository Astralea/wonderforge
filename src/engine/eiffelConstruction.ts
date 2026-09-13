import { clamp, easeInOutQuad } from './easing';
import {
  EIFFEL_CONSTRUCTION,
  EIFFEL_CREEPER_CABIN,
  EIFFEL_CREEPER_COUNTER,
  EIFFEL_LEGS,
  EIFFEL_WAGON_BED,
  EIFFEL_YARD,
  eiffelLegCenter,
} from '../data/eiffelConstruction';
import type { EiffelConstructionPlan, EiffelPart, EiffelPhase, EiffelRoute } from '../data/eiffelTypes';
import type { Vec3 } from '../data/constructionTypes';
import { eiffelTerrainHeightAt } from './eiffelTerrain';

export interface EiffelPartState {
  phase: EiffelPhase;
  visible: boolean;
  position: Vec3;
  rotation: Vec3;
  scale: [1, 1, 1];
  support: 'iron-yard' | 'wagon-bed' | 'working-floor' | 'crane-hook' | 'lattice';
  mechanism: 'none' | 'wagon' | 'crane';
  wagonLift: number;
  phaseLocal: number;
  contactDust: boolean;
  contactDustAmount: number;
}

export interface ActiveEiffelOperation {
  part: EiffelPart;
  state: EiffelPartState;
}

const PHASES: Array<{ phase: EiffelPhase; until: number }> = [
  { phase: 'yard', until: 0.14 },
  { phase: 'hauled', until: 0.48 },
  { phase: 'staged', until: 0.58 },
  { phase: 'hoisted', until: 0.9 },
  { phase: 'seated', until: 1 },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function eiffelVerticalHalfExtent(dimensions: readonly [number, number, number]): number {
  return dimensions[1] / 2;
}

function localT(part: EiffelPart, t: number): number {
  return clamp((t - part.start) / part.duration);
}

function phaseAt(u: number): { phase: EiffelPhase; local: number } {
  let from = 0;
  for (const step of PHASES) {
    if (u <= step.until) {
      const span = step.until - from;
      return { phase: step.phase, local: span <= 0 ? 1 : (u - from) / span };
    }
    from = step.until;
  }
  return { phase: 'seated', local: 1 };
}

function sourcePose(part: EiffelPart): Vec3 {
  const scatter = (Math.abs(part.storey) % 9) * 1.4 - 6;
  const x = EIFFEL_YARD[0] + (part.lane - 1) * 3.1;
  const z = EIFFEL_YARD[2] + scatter + part.storey * 0.12;
  return [x, eiffelTerrainHeightAt(x, z) + eiffelVerticalHalfExtent(part.dimensions), z];
}

function stagingPose(part: EiffelPart): Vec3 {
  const leg = EIFFEL_LEGS.find((entry) => entry.key === part.leg) ?? EIFFEL_LEGS[0]!;
  const y = Math.max(2, part.finalPosition[1] * 0.08);
  const [x, z] = eiffelLegCenter(leg.sx, leg.sz, y);
  const padX = leg.sx * 18;
  const padZ = leg.sz * 18;
  const sx = part.leg === 'axis' ? part.finalPosition[0] * 0.2 + 22 : x + padX;
  const sz = part.leg === 'axis' ? part.finalPosition[2] * 0.2 + 16 : z + padZ;
  const half = eiffelVerticalHalfExtent(part.dimensions);
  return [sx, eiffelTerrainHeightAt(sx, sz) + half, sz];
}

function haulPose(part: EiffelPart, route: EiffelRoute, local: number): Vec3 {
  const source = sourcePose(part);
  const staged = stagingPose(part);
  const eased = easeInOutQuad(local);
  let x: number;
  let z: number;
  if (eased < 0.4) {
    const p = easeInOutQuad(eased / 0.4);
    x = lerp(source[0], route.road[0], p);
    z = lerp(source[2], route.road[2] + (part.lane - 1) * 2.2, p);
  } else if (eased < 0.78) {
    const p = easeInOutQuad((eased - 0.4) / 0.38);
    x = lerp(route.road[0], route.staging[0], p);
    z = lerp(route.road[2] + (part.lane - 1) * 2.2, route.staging[2], p);
  } else {
    const p = easeInOutQuad((eased - 0.78) / 0.22);
    x = lerp(route.staging[0], staged[0], p);
    z = lerp(route.staging[2], staged[2], p);
  }
  const ontoWagon = easeInOutQuad(clamp(local / 0.12));
  const offWagon = 1 - easeInOutQuad(clamp((local - 0.86) / 0.14));
  const lift = EIFFEL_WAGON_BED * Math.min(ontoWagon, offWagon);
  return [x, eiffelTerrainHeightAt(x, z) + eiffelVerticalHalfExtent(part.dimensions) + lift, z];
}

function hoistPose(part: EiffelPart, local: number): Vec3 {
  const staged = stagingPose(part);
  const seat = part.finalPosition;
  const liftY = seat[1] + 2.4;
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

export interface EiffelCraneRig {
  base: Vec3;
  mastTop: Vec3;
  boomTip: Vec3;
  hook: Vec3;
  yaw: number;
  cabin: Vec3;
  counter: Vec3;
}

function attachCreeperHouse(rig: Omit<EiffelCraneRig, 'cabin' | 'counter'>): EiffelCraneRig {
  const bx = rig.boomTip[0] - rig.mastTop[0];
  const bz = rig.boomTip[2] - rig.mastTop[2];
  const span = Math.hypot(bx, bz) || 1;
  const ox = -bx / span;
  const oz = -bz / span;
  return {
    ...rig,
    cabin: [
      rig.mastTop[0] + ox * 4.8,
      rig.mastTop[1] + EIFFEL_CREEPER_CABIN[1] * 0.52,
      rig.mastTop[2] + oz * 4.8,
    ],
    counter: [
      rig.mastTop[0] + ox * 9.6,
      rig.mastTop[1] + EIFFEL_CREEPER_COUNTER[1] * 0.45,
      rig.mastTop[2] + oz * 9.6,
    ],
  };
}

export function eiffelCraneRigAt(part: EiffelPart, state: EiffelPartState): EiffelCraneRig | null {
  if (state.mechanism !== 'crane') return null;
  const staged = stagingPose(part);
  const half = eiffelVerticalHalfExtent(part.dimensions);
  const hook: Vec3 = [state.position[0], state.position[1] + half, state.position[2]];
  const boomY = Math.max(staged[1] + 8, Math.min(hook[1] + 1.2, staged[1] + 22));
  const dx = state.position[0] - staged[0];
  const dz = state.position[2] - staged[2];
  const span = Math.hypot(dx, dz) || 1;
  const reach = Math.min(8.4, span);
  const boomTip: Vec3 = [staged[0] + (dx / span) * reach, boomY, staged[2] + (dz / span) * reach];
  const mastTop: Vec3 = [staged[0], boomY, staged[2]];
  const base: Vec3 = [staged[0], eiffelTerrainHeightAt(staged[0], staged[2]), staged[2]];
  const yaw = Math.atan2(state.position[0] - staged[0], state.position[2] - staged[2]) || state.rotation[1];
  return attachCreeperHouse({ base, mastTop, boomTip, hook, yaw });
}

/** One creeper per pylon through the join, never a mast per hoist. */
function parkedCreeperOnChord(part: EiffelPart, leg: EiffelPart['leg']): EiffelCraneRig & { leg: EiffelPart['leg'] } {
  const staged = stagingPose(part);
  const half = eiffelVerticalHalfExtent(part.dimensions);
  const boomY = Math.max(staged[1] + 8, Math.min(part.finalPosition[1] + half + 4.2, staged[1] + 22));
  const [sx, , sz] = staged;
  const [tx, , tz] = part.finalPosition;
  const dx = tx - sx;
  const dz = tz - sz;
  const span = Math.hypot(dx, dz) || 1;
  const reach = Math.min(8.4, span * 0.35);
  const tipX = sx + (dx / span) * reach;
  const tipZ = sz + (dz / span) * reach;
  return {
    ...attachCreeperHouse({
      base: [sx, eiffelTerrainHeightAt(sx, sz), sz],
      mastTop: [sx, boomY, sz],
      boomTip: [tipX, boomY, tipZ],
      hook: [tipX, boomY - 2.4, tipZ],
      yaw: Math.atan2(dx, dz),
    }),
    leg,
  };
}

export function eiffelStationCranesAt(
  plan: EiffelConstructionPlan,
  t: number,
  operations: readonly ActiveEiffelOperation[],
): Array<EiffelCraneRig & { leg: EiffelPart['leg'] }> {
  const stations = new Map<EiffelPart['leg'], EiffelCraneRig & { leg: EiffelPart['leg'] }>();
  for (const { part, state } of operations) {
    const rig = eiffelCraneRigAt(part, state);
    if (!rig || part.leg === 'axis') continue;
    const prev = stations.get(part.leg);
    if (!prev || rig.mastTop[1] > prev.mastTop[1]) {
      stations.set(part.leg, { ...rig, leg: part.leg });
    }
  }
  if (t < 0.78) {
    for (const { key } of EIFFEL_LEGS) {
      if (stations.has(key)) continue;
      let top: EiffelPart | undefined;
      for (const part of plan.parts) {
        if (part.leg !== key || part.kind !== 'chord') continue;
        if (t < part.start + part.duration) continue;
        if (!top || part.finalPosition[1] > top.finalPosition[1]) top = part;
      }
      if (top) stations.set(key, parkedCreeperOnChord(top, key));
    }
  }
  for (const { part, state } of operations) {
    if (part.leg !== 'axis') continue;
    const rig = eiffelCraneRigAt(part, state);
    if (!rig) continue;
    const prev = stations.get('axis');
    if (!prev || rig.mastTop[1] > prev.mastTop[1]) {
      stations.set('axis', { ...rig, leg: 'axis' });
    }
  }
  return [...stations.values()];
}

export function eiffelPartStateAt(part: EiffelPart, route: EiffelRoute, t: number): EiffelPartState {
  if (t < part.start) {
    const source = sourcePose(part);
    return {
      phase: 'yard',
      visible: false,
      position: source,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      support: 'iron-yard',
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
      support: 'lattice',
      mechanism: 'none',
      wagonLift: 0,
      phaseLocal: 1,
      contactDust: false,
      contactDustAmount: 0,
    };
  }

  const u = localT(part, t);
  const { phase, local } = phaseAt(u);
  if (phase === 'yard') {
    const source = sourcePose(part);
    return {
      phase,
      visible: true,
      position: source,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      support: 'iron-yard',
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
      rotation: [0, Math.atan2(position[0] - EIFFEL_YARD[0], position[2] - EIFFEL_YARD[2]), 0],
      scale: [1, 1, 1],
      support: 'wagon-bed',
      mechanism: 'wagon',
      wagonLift: EIFFEL_WAGON_BED * Math.min(
        easeInOutQuad(clamp(local / 0.12)),
        1 - easeInOutQuad(clamp((local - 0.86) / 0.14)),
      ),
      contactDust: true,
      contactDustAmount: 0.42,
      phaseLocal: local,
    };
  }
  if (phase === 'staged') {
    const staged = stagingPose(part);
    return {
      phase,
      visible: true,
      position: staged,
      rotation: [0, part.finalRotation[1], 0],
      scale: [1, 1, 1],
      support: 'working-floor',
      mechanism: 'none',
      wagonLift: 0,
      phaseLocal: local,
      contactDust: false,
      contactDustAmount: 0,
    };
  }
  if (phase === 'hoisted') {
    return {
      phase,
      visible: true,
      position: hoistPose(part, local),
      rotation: [
        part.finalRotation[0] * local,
        part.finalRotation[1] * local,
        part.finalRotation[2] * local,
      ],
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
    support: 'lattice',
    mechanism: 'none',
    wagonLift: 0,
    phaseLocal: 1,
    contactDust: false,
    contactDustAmount: 0,
  };
}

export function activeEiffelOperationsAt(plan: typeof EIFFEL_CONSTRUCTION, t: number): ActiveEiffelOperation[] {
  const route = plan.routes[0]!;
  const active: ActiveEiffelOperation[] = [];
  for (const part of plan.parts) {
    if (t < part.start || t >= part.start + part.duration) continue;
    const state = eiffelPartStateAt(part, route, t);
    if (!state.visible || state.phase === 'seated') continue;
    active.push({ part, state });
  }
  return active;
}

export function seatedEiffelCountAt(plan: typeof EIFFEL_CONSTRUCTION, t: number): number {
  return plan.parts.filter((part) => t >= part.start + part.duration).length;
}

/** Top of already-seated iron on this leg (and shared platforms) below `belowY`. */
export function eiffelWorkingFloorYAt(
  plan: typeof EIFFEL_CONSTRUCTION,
  t: number,
  leg: EiffelPart['leg'],
  belowY: number,
): number {
  let floor = 1.1;
  for (const part of plan.parts) {
    if (t < part.start + part.duration) continue;
    const sharedDeck = part.group === 'platform' && part.finalPosition[1] < belowY;
    if (part.leg !== leg && !sharedDeck) continue;
    const top = part.finalPosition[1] + eiffelVerticalHalfExtent(part.dimensions);
    if (top < belowY - 0.4 && top > floor) floor = top;
  }
  return floor;
}
