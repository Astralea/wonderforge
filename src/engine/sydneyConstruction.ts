import { clamp, easeInOutQuad } from './easing';
import {
  SYDNEY_CONSTRUCTION,
  SYDNEY_CRANE_BASES,
  SYDNEY_FALSEWORK_SEGMENT,
  SYDNEY_FALSEWORK_STATIONS,
  SYDNEY_PODIUM_DECK,
  SYDNEY_SAILS,
  SYDNEY_TROLLEY_BED,
  SYDNEY_YARD,
} from '../data/sydneyConstruction';
import type { SydneyPart, SydneyPhase, SydneyRoute } from '../data/sydneyTypes';
import type { Vec3 } from '../data/constructionTypes';
import { sydneyTerrainHeightAt } from './sydneyTerrain';

export interface SydneyPartState {
  phase: SydneyPhase;
  visible: boolean;
  position: Vec3;
  rotation: Vec3;
  scale: [1, 1, 1];
  support: 'cast-yard' | 'trolley-bed' | 'working-floor' | 'crane-hook' | 'masonry';
  mechanism: 'none' | 'trolley' | 'crane';
  trolleyLift: number;
  phaseLocal: number;
  contactDust: boolean;
  contactDustAmount: number;
}

export interface ActiveSydneyOperation {
  part: SydneyPart;
  state: SydneyPartState;
}

const PODIUM_PHASES: Array<{ phase: SydneyPhase; until: number }> = [
  { phase: 'cast', until: 0.2 },
  { phase: 'hauled', until: 0.86 },
  { phase: 'seated', until: 1 },
];

const SHELL_PHASES: Array<{ phase: SydneyPhase; until: number }> = [
  { phase: 'cast', until: 0.14 },
  { phase: 'hauled', until: 0.48 },
  { phase: 'staged', until: 0.58 },
  { phase: 'hoisted', until: 0.9 },
  { phase: 'seated', until: 1 },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function sydneyVerticalHalfExtent(dimensions: readonly [number, number, number]): number {
  return dimensions[1] / 2;
}

function localT(part: SydneyPart, t: number): number {
  return clamp((t - part.start) / part.duration);
}

function phaseAt(
  u: number,
  graph: SydneyPart['graph'],
): { phase: SydneyPhase; local: number; from: number; until: number } {
  const steps = graph === 'podium' ? PODIUM_PHASES : SHELL_PHASES;
  let from = 0;
  for (const step of steps) {
    if (u <= step.until) {
      const span = step.until - from;
      return { phase: step.phase, local: span <= 0 ? 1 : (u - from) / span, from, until: step.until };
    }
    from = step.until;
  }
  return { phase: 'seated', local: 1, from: 0.9, until: 1 };
}

function sourcePose(part: SydneyPart): Vec3 {
  const scatter = (part.bay % 7) * 2.4 - 7;
  const x = SYDNEY_YARD[0] + (part.lane - 1) * 3.6 + (part.kind === 'sail' ? 8 : 0);
  const z = SYDNEY_YARD[2] + scatter;
  return [x, sydneyTerrainHeightAt(x, z) + sydneyVerticalHalfExtent(part.dimensions), z];
}

export function sydneyStagingPose(part: SydneyPart): Vec3 {
  const sail = SYDNEY_SAILS.find((entry) => entry.id === part.sail);
  const half = sydneyVerticalHalfExtent(part.dimensions);
  if (!sail) {
    const x = 22 + (part.lane - 1) * 4;
    const z = 20;
    return [x, SYDNEY_PODIUM_DECK + half, z];
  }
  const outX = Math.sin(sail.rotation[1] + 0.9);
  const outZ = Math.cos(sail.rotation[1] + 0.9);
  const x = sail.position[0] + outX * 22 + (part.lane - 1) * 2.2;
  const z = sail.position[2] + outZ * 18 + (part.bay % 3) * 1.4;
  return [x, SYDNEY_PODIUM_DECK + half, z];
}

function haulPose(part: SydneyPart, route: SydneyRoute, local: number): Vec3 {
  const source = sourcePose(part);
  const dest = part.graph === 'podium' ? part.finalPosition : sydneyStagingPose(part);
  const eased = easeInOutQuad(local);
  const roadX = route.road[0] + (part.lane - 1) * 2.4;
  const roadZ = route.road[2];
  let x: number;
  let z: number;
  if (eased < 0.28) {
    const p = easeInOutQuad(eased / 0.28);
    x = lerp(source[0], roadX, p);
    z = lerp(source[2], roadZ, p);
  } else if (eased < 0.82) {
    const p = easeInOutQuad((eased - 0.28) / 0.54);
    x = lerp(roadX, dest[0], p);
    z = lerp(roadZ, dest[2], p);
  } else {
    const p = easeInOutQuad((eased - 0.82) / 0.18);
    x = lerp(lerp(roadX, dest[0], 1), dest[0], p);
    z = lerp(lerp(roadZ, dest[2], 1), dest[2], p);
  }
  const onto = easeInOutQuad(clamp(local / 0.12));
  const off = 1 - easeInOutQuad(clamp((local - 0.86) / 0.14));
  const lift = SYDNEY_TROLLEY_BED * Math.min(onto, off);
  const floor = part.graph === 'podium'
    ? sydneyTerrainHeightAt(x, z)
    : eased > 0.55
      ? lerp(sydneyTerrainHeightAt(x, z), SYDNEY_PODIUM_DECK, easeInOutQuad((eased - 0.55) / 0.45))
      : sydneyTerrainHeightAt(x, z);
  return [x, floor + sydneyVerticalHalfExtent(part.dimensions) + lift, z];
}

function hoistClearance(part: SydneyPart): number {
  return part.kind === 'sail' ? 8 : 4.5;
}

function hoistPose(part: SydneyPart, local: number): Vec3 {
  const staged = sydneyStagingPose(part);
  const seat = part.finalPosition;
  const liftY = Math.max(seat[1], staged[1]) + hoistClearance(part);
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

export interface SydneyCraneRig {
  crane: 0 | 1;
  base: Vec3;
  mastTop: Vec3;
  jibTip: Vec3;
  hook: Vec3;
  yaw: number;
}

export function sydneyCraneRigAt(part: SydneyPart, state: SydneyPartState): SydneyCraneRig | null {
  if (state.mechanism !== 'crane') return null;
  const half = sydneyVerticalHalfExtent(part.dimensions);
  const hook: Vec3 = [state.position[0], state.position[1] + half + 0.4, state.position[2]];
  const base = SYDNEY_CRANE_BASES[part.crane]!;
  const mastTop: Vec3 = [base[0], Math.max(hook[1] + 12, SYDNEY_PODIUM_DECK + 78), base[2]];
  const yaw = Math.atan2(state.position[0] - base[0], state.position[2] - base[2]);
  const jibTip: Vec3 = [state.position[0], mastTop[1] - 2.4, state.position[2]];
  return { crane: part.crane, base: [base[0], base[1], base[2]], mastTop, jibTip, hook, yaw };
}

const FALSEWORK_WINDOWS = [
  { group: 'concert' as const, raiseFrom: 0.16, raiseUntil: 0.24, strikeFrom: 0.78, strikeUntil: 0.9, rise: 42 },
  { group: 'opera' as const, raiseFrom: 0.28, raiseUntil: 0.36, strikeFrom: 0.82, strikeUntil: 0.94, rise: 40 },
  { group: 'restaurant' as const, raiseFrom: 0.4, raiseUntil: 0.48, strikeFrom: 0.86, strikeUntil: 0.97, rise: 24 },
];

function envelopeHeight(t: number, raiseFrom: number, raiseUntil: number, strikeFrom: number, strikeUntil: number): number {
  if (t < raiseFrom || t >= strikeUntil) return 0;
  if (t < raiseUntil) return easeInOutQuad((t - raiseFrom) / (raiseUntil - raiseFrom));
  if (t < strikeFrom) return 1;
  return 1 - easeInOutQuad((t - strikeFrom) / (strikeUntil - strikeFrom));
}

export function sydneyFalseworkStackHeightAt(t: number): number {
  let height = 0;
  for (const window of FALSEWORK_WINDOWS) {
    const factor = envelopeHeight(t, window.raiseFrom, window.raiseUntil, window.strikeFrom, window.strikeUntil);
    if (factor <= 0) continue;
    height = Math.max(height, window.rise * factor);
  }
  return height;
}

export interface SydneyFalseworkWindow {
  kind: 'raising' | 'hold' | 'striking';
  group: 'concert' | 'opera' | 'restaurant';
  raiseFrom: number;
  raiseUntil: number;
  strikeFrom: number;
  strikeUntil: number;
  rise: number;
}

export function sydneyFalseworkWindowAt(t: number): SydneyFalseworkWindow | null {
  let raising: SydneyFalseworkWindow | null = null;
  let striking: SydneyFalseworkWindow | null = null;
  let hold: SydneyFalseworkWindow | null = null;
  for (const window of FALSEWORK_WINDOWS) {
    const shaped = { ...window };
    if (t >= window.raiseFrom && t < window.raiseUntil) raising = { kind: 'raising', ...shaped };
    else if (t >= window.strikeFrom && t < window.strikeUntil) striking = { kind: 'striking', ...shaped };
    else if (t >= window.raiseUntil && t < window.strikeFrom) hold = { kind: 'hold', ...shaped };
  }
  return raising ?? striking ?? hold;
}

export interface SydneyFalseworkBay {
  station: number;
  group: 'concert' | 'opera' | 'restaurant';
  segmentCount: number;
  segmentLength: typeof SYDNEY_FALSEWORK_SEGMENT;
  height: number;
  footY: number;
  deckY: number;
  position: Vec3;
  yaw: number;
}

const FALSEWORK_FOOTPRINT: Array<{ x: number; z: number; group: SydneyFalseworkBay['group']; yaw: number }> = [
  { x: 14, z: -24, group: 'concert', yaw: -0.3 },
  { x: 26, z: -10, group: 'concert', yaw: -0.1 },
  { x: -8, z: -18, group: 'concert', yaw: 0.4 },
  { x: -22, z: 0, group: 'opera', yaw: 0.6 },
  { x: -30, z: 14, group: 'opera', yaw: 0.8 },
  { x: -12, z: 16, group: 'opera', yaw: 0.5 },
  { x: 6, z: 22, group: 'restaurant', yaw: 0.15 },
  { x: 16, z: 28, group: 'restaurant', yaw: 0.28 },
];

export function sydneyFalseworkAt(t: number): SydneyFalseworkBay[] {
  const bays: SydneyFalseworkBay[] = [];
  for (let station = 0; station < SYDNEY_FALSEWORK_STATIONS; station += 1) {
    const foot = FALSEWORK_FOOTPRINT[station]!;
    const window = FALSEWORK_WINDOWS.find((entry) => entry.group === foot.group)!;
    const factor = envelopeHeight(t, window.raiseFrom, window.raiseUntil, window.strikeFrom, window.strikeUntil);
    const raw = window.rise * factor;
    if (raw < SYDNEY_FALSEWORK_SEGMENT * 0.5) continue;
    const segmentCount = Math.max(1, Math.floor(raw / SYDNEY_FALSEWORK_SEGMENT));
    const height = segmentCount * SYDNEY_FALSEWORK_SEGMENT;
    const footY = sydneyTerrainHeightAt(foot.x, foot.z);
    bays.push({
      station,
      group: foot.group,
      segmentCount,
      segmentLength: SYDNEY_FALSEWORK_SEGMENT,
      height,
      footY,
      deckY: footY + height,
      position: [foot.x, footY + height, foot.z],
      yaw: foot.yaw,
    });
  }
  return bays;
}

export function sydneyPartStateAt(
  part: SydneyPart,
  route: SydneyRoute,
  t: number,
): SydneyPartState {
  if (t < part.start) {
    const source = sourcePose(part);
    return {
      phase: 'cast',
      visible: false,
      position: source,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      support: 'cast-yard',
      mechanism: 'none',
      trolleyLift: 0,
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
      trolleyLift: 0,
      phaseLocal: 1,
      contactDust: false,
      contactDustAmount: 0,
    };
  }

  const u = localT(part, t);
  const { phase, local } = phaseAt(u, part.graph);
  if (phase === 'cast') {
    const source = sourcePose(part);
    return {
      phase,
      visible: true,
      position: source,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      support: 'cast-yard',
      mechanism: 'none',
      trolleyLift: 0,
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
      rotation: [0, Math.atan2(position[0] - SYDNEY_YARD[0], position[2] - SYDNEY_YARD[2]), 0],
      scale: [1, 1, 1],
      support: 'trolley-bed',
      mechanism: 'trolley',
      trolleyLift: SYDNEY_TROLLEY_BED * Math.min(
        easeInOutQuad(clamp(local / 0.12)),
        1 - easeInOutQuad(clamp((local - 0.86) / 0.14)),
      ),
      contactDust: true,
      contactDustAmount: 0.4,
      phaseLocal: local,
    };
  }
  if (phase === 'staged') {
    const staged = sydneyStagingPose(part);
    return {
      phase,
      visible: true,
      position: staged,
      rotation: part.finalRotation,
      scale: [1, 1, 1],
      support: 'working-floor',
      mechanism: 'none',
      trolleyLift: 0,
      phaseLocal: local,
      contactDust: local > 0.85,
      contactDustAmount: local > 0.85 ? 0.18 : 0,
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
      trolleyLift: 0,
      phaseLocal: local,
      contactDust: local > 0.92,
      contactDustAmount: local > 0.92 ? 0.32 : 0,
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
    trolleyLift: 0,
    phaseLocal: 1,
    contactDust: false,
    contactDustAmount: 0,
  };
}

export function activeSydneyOperationsAt(
  plan: typeof SYDNEY_CONSTRUCTION,
  t: number,
): ActiveSydneyOperation[] {
  const route = plan.routes[0]!;
  const active: ActiveSydneyOperation[] = [];
  for (const part of plan.parts) {
    if (t < part.start || t >= part.start + part.duration) continue;
    const state = sydneyPartStateAt(part, route, t);
    if (!state.visible) continue;
    if (state.phase === 'seated') continue;
    active.push({ part, state });
  }
  return active;
}

export function seatedSydneyCountAt(plan: typeof SYDNEY_CONSTRUCTION, t: number): number {
  return plan.parts.filter((part) => t >= part.start + part.duration).length;
}
