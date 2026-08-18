import type {
  ConstructionBlock,
  ConstructionRoute,
  GizaConstructionPlan,
  UnitScale,
  Vec3,
} from '../data/constructionTypes';
import { clamp, easeInOutQuad, easeOutCubic } from './easing';

export const CONSTRUCTION_PHASES = [
  'quarried',
  'dressed',
  'loaded',
  'hauled',
  'queued',
  'raised',
  'aligned',
  'seated',
] as const;

export type ConstructionPhase = (typeof CONSTRUCTION_PHASES)[number];
export type ConstructionSupport =
  | 'quarry'
  | 'dressing-bed'
  | 'sled'
  | 'ramp'
  | 'cribbing'
  | 'masonry';

export interface ConstructionState {
  phase: ConstructionPhase;
  phaseProgress: number;
  position: Vec3;
  yaw: number;
  scale: UnitScale;
  support: ConstructionSupport;
  /**
   * Height of the sled bed under the block, already included in `position`.
   * Zero off the sled. The renderer draws deck and runners inside this gap
   * and stands the haul crew on the surface below it, so the sled rides ON
   * the road instead of ploughing through it.
   */
  sledLift: number;
  contactDust: boolean;
  visible: boolean;
  crewOperationId: string;
}

export interface ActiveConstructionState {
  block: ConstructionBlock;
  route: ConstructionRoute;
  state: ConstructionState;
}

/** Runner + deck height of a transport sled, world units (~34 cm). */
export const SLED_BED_HEIGHT = 0.34;

const SUPPORTS: Record<ConstructionPhase, ConstructionSupport> = {
  quarried: 'quarry',
  dressed: 'dressing-bed',
  loaded: 'sled',
  hauled: 'sled',
  queued: 'sled',
  raised: 'ramp',
  aligned: 'cribbing',
  seated: 'masonry',
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function pathPoints(block: ConstructionBlock, route: ConstructionRoute): Vec3[] {
  const { quarry, dressing, roadQueue, rampFoot } = route.waypoints;
  const crest = route.rampCrestFor(block);
  const aboveSeat: Vec3 = [
    block.finalPosition[0],
    block.finalPosition[1] + Math.max(0.38, block.dimensions[1] * 0.72),
    block.finalPosition[2],
  ];
  return [
    quarry,
    add(quarry, [0.48, 0.08, -0.22]),
    dressing,
    add(dressing, [0.34, 0.16, -0.18]),
    roadQueue,
    rampFoot,
    crest,
    aboveSeat,
    block.finalPosition,
  ];
}

function yawAlong(a: Vec3, b: Vec3, fallback: number): number {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  return Math.hypot(dx, dz) < 1e-7 ? fallback : Math.atan2(dx, dz);
}

export function constructionStateAt(
  block: ConstructionBlock,
  route: ConstructionRoute,
  t: number,
): ConstructionState {
  const points = pathPoints(block, route);
  const local = clamp((t - block.start) / block.duration);
  const rawPhase = Math.min(CONSTRUCTION_PHASES.length - 1, Math.floor(local * CONSTRUCTION_PHASES.length));
  const phase = CONSTRUCTION_PHASES[rawPhase]!;
  const phaseProgress = local >= 1 ? 1 : local * CONSTRUCTION_PHASES.length - rawPhase;
  // The climb is linear: a haul team on a gradient moves at a steady pace,
  // and easing the raised leg made the block's height lag the earthwork's
  // linear terrace profile, burying the sled mid-climb (Spec 08: "Ramp
  // ascent follows the ramp surface").
  const eased = phase === 'raised'
    ? phaseProgress
    : phase === 'hauled'
      ? easeInOutQuad(phaseProgress)
      : easeOutCubic(phaseProgress);
  let position = local >= 1
    ? [...block.finalPosition] as Vec3
    : lerpVec3(points[rawPhase]!, points[rawPhase + 1]!, eased);
  if (phase === 'raised' && local < 1) {
    // Ride the terrace treads, not the staircase's inside corners: the
    // earthwork renders as 12 terraces (Environment addRamps), and the
    // straight foot-to-crest line grazes each tread's uphill edge, so lift
    // by half a tread mid-climb. Sine-tapered to zero at the foot and the
    // crest platform so the phase-boundary positions stay continuous.
    const climb = points[rawPhase + 1]![1] - points[rawPhase]![1];
    const lift = (Math.max(0, climb) / 24) * Math.sin(Math.PI * phaseProgress);
    position = [position[0], position[1] + lift, position[2]];
  }

  // A block on a sled rides a sled-bed above the surface (Spec 08: "sled and
  // stone move as one unit" — ON the road, not through it). Lifted while
  // being loaded, carried at full height, then lowered through the climb's
  // last stretch so it arrives at the crest platform on cribbing height.
  // Ramps at both ends keep every phase boundary position-continuous.
  let sledLift = 0;
  if (local < 1) {
    if (phase === 'loaded') {
      sledLift = SLED_BED_HEIGHT * eased;
    } else if (phase === 'hauled' || phase === 'queued') {
      sledLift = SLED_BED_HEIGHT;
    } else if (phase === 'raised') {
      sledLift = SLED_BED_HEIGHT * Math.min(1, (1 - phaseProgress) / 0.18);
    }
  }
  if (sledLift > 0) {
    position = [position[0], position[1] + sledLift, position[2]];
  }
  const yaw = phase === 'aligned' || phase === 'seated'
    ? block.finalYaw
    : yawAlong(points[rawPhase]!, points[rawPhase + 1]!, block.finalYaw);
  const contactDust =
    (phase === 'hauled' && phaseProgress > 0.08 && phaseProgress < 0.94) ||
    (phase === 'seated' && phaseProgress > 0.72);

  return {
    phase,
    phaseProgress,
    position,
    yaw,
    scale: [1, 1, 1],
    support: SUPPORTS[phase],
    sledLift,
    contactDust,
    visible: t >= block.start,
    crewOperationId: `operation:${block.id}`,
  };
}

export function activeConstructionStatesAt(
  plan: GizaConstructionPlan,
  t: number,
): ActiveConstructionState[] {
  const routeById = new Map(plan.routes.map((route) => [route.id, route]));
  const active: ActiveConstructionState[] = [];
  for (const block of plan.blocks) {
    if (t < block.start || t >= block.start + block.duration) continue;
    const route = routeById.get(block.routeId);
    if (!route) continue;
    active.push({ block, route, state: constructionStateAt(block, route, t) });
  }
  return active;
}

export function settledBlockCountAt(plan: GizaConstructionPlan, t: number): number {
  let count = 0;
  for (const block of plan.blocks) {
    if (t >= block.start + block.duration) count += 1;
  }
  return count;
}
