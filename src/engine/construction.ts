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
  mechanism: 'none' | 'sled' | 'cribbing';
  /** Immediate support top; transformed block bottom must equal this. */
  supportY: number;
  /** Ground/ramp/deck surface below any temporary carrier. */
  groundY: number;
  /** Height occupied by the sled or crib between groundY and supportY. */
  carrierHeight: number;
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
export const GIZA_CRIB_HEIGHT = 0.24;

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
  const halfHeight = block.dimensions[1] * 0.5;
  const surface = (point: Vec3): Vec3 => [point[0], point[1] - halfHeight, point[2]];
  const quarrySurface = surface(quarry);
  const dressingSurface = surface(dressing);
  const queueSurface = surface(roadQueue);
  const footSurface = surface(rampFoot);
  const seatSurface: Vec3 = [
    block.finalPosition[0],
    block.finalPosition[1] - halfHeight,
    block.finalPosition[2],
  ];
  return [
    quarrySurface,
    add(quarrySurface, [0.48, 0, -0.22]),
    dressingSurface,
    add(dressingSurface, [0.34, 0, -0.18]),
    queueSurface,
    footSurface,
    crest,
    seatSurface,
    seatSurface,
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
  const complete = t >= block.start + block.duration - 1e-12;
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
  const surfacePosition = complete
    ? points[8]!
    : lerpVec3(points[rawPhase]!, points[rawPhase + 1]!, eased);

  // A block on a sled rides a sled-bed above the surface (Spec 08: "sled and
  // stone move as one unit" — ON the road, not through it). Lifted while
  // being loaded, carried at full height, then lowered through the climb's
  // last stretch so it arrives at the crest platform on cribbing height.
  // Ramps at both ends keep every phase boundary position-continuous.
  let carrierHeight = 0;
  if (!complete) {
    if (phase === 'loaded') {
      carrierHeight = SLED_BED_HEIGHT * eased;
    } else if (phase === 'hauled' || phase === 'queued' || phase === 'raised') {
      carrierHeight = SLED_BED_HEIGHT;
    } else if (phase === 'aligned') {
      carrierHeight = lerp(SLED_BED_HEIGHT, GIZA_CRIB_HEIGHT, eased);
    } else if (phase === 'seated') {
      carrierHeight = GIZA_CRIB_HEIGHT * (1 - eased);
    }
  }
  const sledLift = phase === 'loaded' || phase === 'hauled' || phase === 'queued' || phase === 'raised'
    ? carrierHeight
    : 0;
  const position: Vec3 = complete
    ? [...block.finalPosition]
    : [
        surfacePosition[0],
        surfacePosition[1] + block.dimensions[1] * 0.5 + carrierHeight,
        surfacePosition[2],
      ];
  const supportY = position[1] - block.dimensions[1] * 0.5;
  const groundY = supportY - carrierHeight;
  const mechanism: ConstructionState['mechanism'] = sledLift > 0
    ? 'sled'
    : carrierHeight > 0
      ? 'cribbing'
      : 'none';
  let support = SUPPORTS[phase];
  if (phase === 'seated' && !complete) support = 'cribbing';
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
    support,
    mechanism,
    supportY,
    groundY,
    carrierHeight,
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
