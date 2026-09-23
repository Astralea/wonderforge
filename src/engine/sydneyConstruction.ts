import { clamp, easeInOutQuad } from './easing';
import {
  SYDNEY_CONSTRUCTION,
  SYDNEY_CRANE_BASES,
  SYDNEY_FALSEWORK_SEGMENT,
  SYDNEY_PODIUM_DECK,
  SYDNEY_TROLLEY_BED,
} from '../data/sydneyConstruction';
import type {
  SydneyPart,
  SydneyPhase,
  SydneyRoute,
  SydneyConstructionPlan,
} from '../data/sydneyTypes';
import type { Vec3 } from '../data/constructionTypes';
import { sydneyTerrainHeightAt, sydneyBuildingToWorld } from './sydneyTerrain';
import {
  SYDNEY_SAILS,
  sydneyShellPoint,
  sydneyPatchVertices,
  sydneyPodiumHeightAt,
} from '../data/sydneyShells';

export const SYDNEY_CRANE_MAST_HEIGHT = 70;
export const SYDNEY_CRANE_JIB_LENGTH = 120;
export interface SydneyPartState {
  phase: SydneyPhase;
  visible: boolean;
  position: Vec3;
  rotation: Vec3;
  scale: [1, 1, 1];
  support:
    'cast-yard' | 'trolley-bed' | 'working-floor' | 'crane-hook' | 'masonry';
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
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sydneyVerticalHalfExtent = (
  dimensions: readonly [number, number, number],
): number => dimensions[1] / 2;

/** Geometry is baked in its final orientation and centred on its bounds. */
/** Two work lanes on the southern forecourt. All route coordinates share
 * the same surveyed building frame as the podium and shoreline. */
export function sydneyStagingPose(part: SydneyPart): Vec3 {
  const p = sydneyBuildingToWorld(
    part.crane === 0 ? 40 : -35,
    part.crane === 0 ? 118 : 132,
  );
  return [
    p.x,
    sydneyTerrainHeightAt(p.x, p.z) +
      part.dimensions[1] / 2 +
      SYDNEY_TROLLEY_BED,
    p.z,
  ];
}
export function sydneySourcePose(part: SydneyPart): Vec3 {
  const p = sydneyBuildingToWorld(
    (part.crane === 0 ? 40 : -35) + (part.lane - 1) * 8,
    (part.crane === 0 ? 145 : 152) + (part.bay % 2) * 6,
  );
  return [
    p.x,
    sydneyTerrainHeightAt(p.x, p.z) +
      part.dimensions[1] / 2 +
      SYDNEY_TROLLEY_BED,
    p.z,
  ];
}
function haulPose(
  part: SydneyPart,
  local: number,
): { position: Vec3; lift: number } {
  const from = sydneySourcePose(part),
    to = sydneyStagingPose(part);
  const u = easeInOutQuad(local);
  const x = lerp(from[0], to[0], u),
    z = lerp(from[2], to[2], u);
  // Trestle and trolley decks have equal height: a rigid bed never emerges
  // from beneath the ground while its load is being picked up.
  return {
    position: [
      x,
      sydneyTerrainHeightAt(x, z) + part.dimensions[1] / 2 + SYDNEY_TROLLEY_BED,
      z,
    ],
    lift: SYDNEY_TROLLEY_BED,
  };
}

const HOUSE_TOP = Math.max(
  ...SYDNEY_CONSTRUCTION.parts
    .filter((p) => p.graph === 'shell')
    .map((p) => p.finalPosition[1] + p.dimensions[1] / 2),
);
/** Radial luff plus azimuth slew: the rigid jib never changes length. */
function hoistPose(part: SydneyPart, local: number): Vec3 {
  const from = sydneyStagingPose(part),
    final = part.finalPosition;
  const approach = part.seatApproach;
  const to: Vec3 = approach
    ? [final[0] + approach[0], final[1] + approach[1], final[2] + approach[2]]
    : final;
  const lowerFrom = 0.72;
  const lowerUntil = approach ? 0.9 : 1;
  const travelY = HOUSE_TOP + part.dimensions[1] / 2 + 4;
  if (local < 0.3)
    return [
      from[0],
      lerp(from[1], travelY, easeInOutQuad(local / 0.3)),
      from[2],
    ];
  // Side infill lowers outside the neighbouring completed roof, then slides
  // horizontally into the joint. Geometry, heading and size remain rigid.
  if (approach && local >= lowerUntil) {
    const u = easeInOutQuad((local - lowerUntil) / (1 - lowerUntil));
    return [
      lerp(to[0], final[0], u),
      lerp(to[1], final[1], u),
      lerp(to[2], final[2], u),
    ];
  }
  if (local >= lowerFrom)
    return [
      to[0],
      lerp(
        travelY,
        to[1],
        easeInOutQuad((local - lowerFrom) / (lowerUntil - lowerFrom)),
      ),
      to[2],
    ];
  const base = SYDNEY_CRANE_BASES[part.crane]!;
  const a0 = Math.atan2(from[0] - base[0], from[2] - base[2]);
  const a1 = Math.atan2(to[0] - base[0], to[2] - base[2]);
  const delta = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
  const u = easeInOutQuad((local - 0.3) / (lowerFrom - 0.3));
  const radius = lerp(
    Math.hypot(from[0] - base[0], from[2] - base[2]),
    Math.hypot(to[0] - base[0], to[2] - base[2]),
    u,
  );
  const angle = a0 + delta * u;
  return [
    base[0] + Math.sin(angle) * radius,
    travelY,
    base[2] + Math.cos(angle) * radius,
  ];
}

const SHELL_VERTICES = new Map(
  SYDNEY_CONSTRUCTION.parts
    .filter((p) => p.graph === 'shell')
    .map(
      (part) =>
        [
          part.id,
          part.authoredVertices ??
            sydneyPatchVertices(SYDNEY_SAILS[part.sail]!, part.surface!),
        ] as const,
    ),
);
const LIFT_POINTS = new Map(
  SYDNEY_CONSTRUCTION.parts
    .filter((p) => p.graph === 'shell')
    .map((part) => {
      const vertices = SHELL_VERTICES.get(part.id)!;
      let top = 0;
      for (let i = 3; i < vertices.length; i += 3)
        if (vertices[i + 1]! > vertices[top + 1]!) top = i;
      return [
        part.id,
        [
          vertices[top]! - part.finalPosition[0],
          vertices[top + 1]! - part.finalPosition[1],
          vertices[top + 2]! - part.finalPosition[2],
        ] as Vec3,
      ] as const;
    }),
);

interface RoofTriangle {
  a: Vec3;
  b: Vec3;
  c: Vec3;
  denominator: number;
}
const ROOF_BIN_SIZE = 8;
const ROOF_BINS = new Map<string, RoofTriangle[]>();
for (const vertices of SHELL_VERTICES.values()) {
  for (let i = 0; i < vertices.length; i += 9) {
    const a = vertices.slice(i, i + 3) as Vec3,
      b = vertices.slice(i + 3, i + 6) as Vec3,
      c = vertices.slice(i + 6, i + 9) as Vec3;
    const denominator =
      (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
    if (Math.abs(denominator) < 1e-9) continue;
    const triangle = { a, b, c, denominator };
    for (
      let x = Math.floor(Math.min(a[0], b[0], c[0]) / ROOF_BIN_SIZE);
      x <= Math.floor(Math.max(a[0], b[0], c[0]) / ROOF_BIN_SIZE);
      x++
    )
      for (
        let z = Math.floor(Math.min(a[2], b[2], c[2]) / ROOF_BIN_SIZE);
        z <= Math.floor(Math.max(a[2], b[2], c[2]) / ROOF_BIN_SIZE);
        z++
      ) {
        const key = `${x},${z}`,
          bin = ROOF_BINS.get(key) ?? [];
        bin.push(triangle);
        ROOF_BINS.set(key, bin);
      }
  }
}
/** First physical shell hit above a support, including baked rib thickness.
 * Works for the authored fanned world grids without assuming an invertible
 * quarter dome, local centre, shell orientation or rectangular footprint. */
export function sydneyRoofUndersideAt(
  x: number,
  z: number,
  aboveY = SYDNEY_PODIUM_DECK,
): number | undefined {
  let lowest = Infinity;
  for (const { a, b, c, denominator } of ROOF_BINS.get(
    `${Math.floor(x / ROOF_BIN_SIZE)},${Math.floor(z / ROOF_BIN_SIZE)}`,
  ) ?? []) {
    const u =
      ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / denominator;
    const v =
      ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / denominator;
    if (u < -1e-7 || v < -1e-7 || u + v > 1 + 1e-7) continue;
    const y = u * a[1] + v * b[1] + (1 - u - v) * c[1];
    if (y > aboveY + 0.05) lowest = Math.min(lowest, y);
  }
  return Number.isFinite(lowest) ? lowest : undefined;
}

export interface SydneyCraneRig {
  crane: 0 | 1;
  base: Vec3;
  mastTop: Vec3;
  jibTip: Vec3;
  hook: Vec3;
  yaw: number;
}
function craneRigForHook(crane: 0 | 1, hook: Vec3): SydneyCraneRig {
  const base = SYDNEY_CRANE_BASES[crane]!;
  const mastTop: Vec3 = [base[0], base[1] + SYDNEY_CRANE_MAST_HEIGHT, base[2]];
  const radius = Math.hypot(hook[0] - base[0], hook[2] - base[2]);
  return {
    crane,
    base: [...base],
    mastTop,
    hook,
    jibTip: [
      hook[0],
      mastTop[1] +
        Math.sqrt(Math.max(0, SYDNEY_CRANE_JIB_LENGTH ** 2 - radius ** 2)),
      hook[2],
    ],
    yaw: Math.atan2(hook[0] - base[0], hook[2] - base[2]),
  };
}
function hookForPart(part: SydneyPart, position: Vec3): Vec3 {
  const lift = LIFT_POINTS.get(part.id) ?? [0, part.dimensions[1] / 2, 0];
  return [
    position[0] + lift[0]!,
    position[1] + lift[1]! + 1.2,
    position[2] + lift[2]!,
  ];
}
export function sydneyCraneRigAt(
  part: SydneyPart,
  state: SydneyPartState,
): SydneyCraneRig | null {
  return state.mechanism === 'crane'
    ? craneRigForHook(part.crane, hookForPart(part, state.position))
    : null;
}

export type SydneyCranePhase =
  | 'parked'
  | 'release'
  | 'return-lift'
  | 'return-slew'
  | 'return-lower'
  | 'attach'
  | 'hoist';
export interface SydneyCraneState extends SydneyCraneRig {
  phase: SydneyCranePhase;
  /** Related load during attachment/hoist/release; next load while returning. */
  partId: string | null;
  loaded: boolean;
}
interface CraneJob {
  part: SydneyPart;
  from: number;
  until: number;
  pickup: Vec3;
  seat: Vec3;
}
const CRANE_JOB_CACHE = new WeakMap<
  SydneyConstructionPlan,
  [CraneJob[], CraneJob[]]
>();
function craneJobs(plan: SydneyConstructionPlan, crane: 0 | 1): CraneJob[] {
  let lanes = CRANE_JOB_CACHE.get(plan);
  if (!lanes) {
    lanes = [[], []];
    for (const part of plan.parts) {
      if (part.graph !== 'shell') continue;
      lanes[part.crane].push({
        part,
        from: part.start + part.duration * 0.58,
        until: part.start + part.duration * 0.9,
        pickup: hookForPart(part, sydneyStagingPose(part)),
        seat: hookForPart(part, part.finalPosition),
      });
    }
    for (const lane of lanes) lane.sort((a, b) => a.from - b.from);
    CRANE_JOB_CACHE.set(plan, lanes);
  }
  return lanes[crane];
}
/** One reversible rig clock owns loaded work AND the unloaded return. The
 * small gaps between background jobs are time-lapse; hero gaps are reserved
 * by the plan. No frame-history interpolation or renderer-owned idle pose. */
export function sydneyCraneStateAt(
  crane: 0 | 1,
  t: number,
  plan: SydneyConstructionPlan = SYDNEY_CONSTRUCTION,
): SydneyCraneState {
  const jobs = craneJobs(plan, crane);
  const base = SYDNEY_CRANE_BASES[crane]!;
  const berth = sydneyBuildingToWorld(
    crane === 0 ? 40 : -35,
    crane === 0 ? 118 : 132,
  );
  const parked: Vec3 = [
    berth.x,
    sydneyTerrainHeightAt(berth.x, berth.z) + 9,
    berth.z,
  ];
  const make = (
    hook: Vec3,
    phase: SydneyCranePhase,
    partId: string | null,
    loaded = false,
  ): SydneyCraneState => ({
    ...craneRigForHook(crane, hook),
    phase,
    partId,
    loaded,
  });
  if (!jobs.length) return make(parked, 'parked', null);
  // Locate the most recent pickup in O(log n), independently of seek order.
  let lo = 0,
    hi = jobs.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (jobs[mid]!.from <= t) lo = mid + 1;
    else hi = mid;
  }
  const previous = lo ? jobs[lo - 1]! : undefined;
  const next = jobs[lo];
  if (previous && t < previous.until) {
    const state = sydneyPartStateAt(previous.part, plan.routes[0]!, t);
    return make(
      hookForPart(previous.part, state.position),
      'hoist',
      previous.part.id,
      true,
    );
  }
  const fromTime = previous?.until ?? 0.24;
  const untilTime = next?.from ?? 0.89;
  const from = previous?.seat ?? parked;
  const to = next?.pickup ?? parked;
  if (t < fromTime) return make(from, 'parked', null);
  if (t >= untilTime) return make(to, 'parked', null);
  const u = clamp((t - fromTime) / Math.max(1e-9, untilTime - fromTime));
  const clearY = Math.max(HOUSE_TOP + 16, from[1], to[1]);
  if (u < 0.12)
    return make(
      from,
      previous ? 'release' : 'parked',
      previous?.part.id ?? null,
    );
  if (u < 0.32)
    return make(
      [
        from[0],
        lerp(from[1], clearY, easeInOutQuad((u - 0.12) / 0.2)),
        from[2],
      ],
      'return-lift',
      next?.part.id ?? null,
    );
  if (u < 0.7) {
    const p = easeInOutQuad((u - 0.32) / 0.38);
    const a0 = Math.atan2(from[0] - base[0], from[2] - base[2]);
    const a1 = Math.atan2(to[0] - base[0], to[2] - base[2]);
    const angle = a0 + Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0)) * p;
    const radius = lerp(
      Math.hypot(from[0] - base[0], from[2] - base[2]),
      Math.hypot(to[0] - base[0], to[2] - base[2]),
      p,
    );
    return make(
      [
        base[0] + Math.sin(angle) * radius,
        clearY,
        base[2] + Math.cos(angle) * radius,
      ],
      'return-slew',
      next?.part.id ?? null,
    );
  }
  if (u < 0.9)
    return make(
      [to[0], lerp(clearY, to[1], easeInOutQuad((u - 0.7) / 0.2)), to[2]],
      'return-lower',
      next?.part.id ?? null,
    );
  return make(to, next ? 'attach' : 'parked', next?.part.id ?? null);
}
export function sydneyPartStateAt(
  part: SydneyPart,
  _route: SydneyRoute,
  t: number,
): SydneyPartState {
  const u = clamp((t - part.start) / part.duration);
  const state: SydneyPartState = {
    phase: 'cast',
    visible: t >= part.start,
    position:
      part.graph === 'podium' ? part.finalPosition : sydneySourcePose(part),
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    support: part.graph === 'podium' ? 'masonry' : 'cast-yard',
    mechanism: 'none',
    trolleyLift: 0,
    phaseLocal: 0,
    contactDust: false,
    contactDustAmount: 0,
  };
  if (part.graph === 'podium') {
    state.phase = u >= 1 ? 'seated' : 'cast';
    state.phaseLocal = u;
    return state;
  }
  if (t >= part.start + part.duration * 0.9) {
    state.phase = 'seated';
    state.position = part.finalPosition;
    state.support = 'masonry';
    state.phaseLocal = 1;
  } else if (u >= 0.58) {
    state.phase = 'hoisted';
    state.phaseLocal = (u - 0.58) / 0.32;
    state.position = hoistPose(part, state.phaseLocal);
    state.support = 'crane-hook';
    state.mechanism = 'crane';
  } else if (u >= 0.48) {
    state.phase = 'staged';
    state.phaseLocal = (u - 0.48) / 0.1;
    state.position = sydneyStagingPose(part);
    state.support = 'working-floor';
  } else if (u >= 0.14) {
    state.phase = 'hauled';
    state.phaseLocal = (u - 0.14) / 0.34;
    const haul = haulPose(part, state.phaseLocal);
    state.position = haul.position;
    state.trolleyLift = haul.lift;
    state.support = 'trolley-bed';
    state.mechanism = 'trolley';
  } else state.phaseLocal = u / 0.14;
  return state;
}
export function activeSydneyOperationsAt(
  plan: typeof SYDNEY_CONSTRUCTION,
  t: number,
): ActiveSydneyOperation[] {
  return plan.parts
    .filter((part) => t >= part.start && t < part.start + part.duration)
    .map((part) => ({
      part,
      state: sydneyPartStateAt(part, plan.routes[0]!, t),
    }))
    .filter((op) => op.state.phase !== 'seated');
}
export function seatedSydneyCountAt(
  plan: typeof SYDNEY_CONSTRUCTION,
  t: number,
): number {
  return plan.parts.filter(
    (part) =>
      t >= part.start + part.duration * (part.graph === 'shell' ? 0.9 : 1),
  ).length;
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
export function sydneyFalseworkWindowAt(
  t: number,
): SydneyFalseworkWindow | null {
  if (t < 0.23 || t >= 0.9) return null;
  return {
    kind: t < 0.25 ? 'raising' : t < 0.83 ? 'hold' : 'striking',
    group: 'concert',
    raiseFrom: 0.23,
    raiseUntil: 0.25,
    strikeFrom: 0.83,
    strikeUntil: 0.9,
    rise: 48,
  };
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
  capHeight: number;
  supportY: number;
}
const FALSEWORK_TARGETS = SYDNEY_SAILS.flatMap((sail) =>
  ([-1, 1] as const).flatMap((side, sideIndex) =>
    [0.5, 0.75].flatMap((u, i) => {
      // Mid-fan structural rib: both single-pedestal halves receive support.
      const nominal = sydneyShellPoint(sail, u, 0.6, side, -0.72);
      let point: Vec3 | undefined, footY: number | undefined;
      // Small footing offsets avoid the authored expansion joints. Test every
      // post's circular footprint, rather than only a tower centre on a slab.
      for (const [jx, jz] of [
        [0, 0],
        [0.2, 0],
        [-0.2, 0],
        [0, 0.2],
        [0, -0.2],
        [0.25, 0.25],
        [-0.25, -0.25],
      ]) {
        const p: Vec3 = [nominal[0] + jx!, nominal[1], nominal[2] + jz!];
        let floor: number | undefined,
          supported = true;
        for (const dx of [-2.1, 2.1])
          for (const dz of [-1.4, 1.4])
            for (let angle = -1; angle < 8; angle++) {
              const x =
                  p[0] +
                  dx * Math.cos(sail.yaw) +
                  dz * Math.sin(sail.yaw) +
                  Math.cos((angle * Math.PI) / 4) * (angle < 0 ? 0 : 0.3),
                z =
                  p[2] -
                  dx * Math.sin(sail.yaw) +
                  dz * Math.cos(sail.yaw) +
                  Math.sin((angle * Math.PI) / 4) * (angle < 0 ? 0 : 0.3);
              const at = sydneyPodiumHeightAt(x, z);
              if (
                at === undefined ||
                (floor !== undefined && Math.abs(at - floor) > 0.03)
              )
                supported = false;
              floor = at ?? floor;
            }
        if (supported && floor !== undefined) {
          point = p;
          footY = floor;
          break;
        }
      }
      if (!point || footY === undefined) return [];
      let ceiling = Infinity;
      for (const dx of [-2.6, -1.3, 0, 1.3, 2.6])
        for (const dz of [-1.9, 0, 1.9]) {
          const x =
              point[0] + dx * Math.cos(sail.yaw) + dz * Math.sin(sail.yaw),
            z = point[2] - dx * Math.sin(sail.yaw) + dz * Math.cos(sail.yaw);
          ceiling = Math.min(
            ceiling,
            sydneyRoofUndersideAt(x, z, footY) ?? Infinity,
          );
        }
      // Keep the complete head below the first surface; one edge makes contact.
      let supportY = Infinity;
      // Existing six-sided head: top radius .08 × instance scale2.5 = .2m.
      // Contact follows its actual rotated rim, not a larger imaginary square.
      for (let k = -1; k < 6; k++) {
        const angle = (k * Math.PI) / 3 + sail.yaw,
          radius = k < 0 ? 0 : 0.2;
        supportY = Math.min(
          supportY,
          sydneyRoofUndersideAt(
            point[0] + Math.sin(angle) * radius,
            point[2] + Math.cos(angle) * radius,
            footY,
          ) ?? Infinity,
        );
      }
      if (!Number.isFinite(supportY) || !Number.isFinite(ceiling)) return [];
      return [
        {
          station: sail.id * 4 + sideIndex * 2 + i,
          group: sail.group,
          point: [point[0], supportY, point[2]] as Vec3,
          yaw: sail.yaw,
          footY,
          ceiling: Math.min(ceiling - 2.8, supportY - 3.2),
        },
      ];
    }),
  ),
);

export function sydneyFalseworkAt(t: number): SydneyFalseworkBay[] {
  const window = sydneyFalseworkWindowAt(t);
  if (!window) return [];
  const factor =
    t < 0.25
      ? clamp((t - 0.23) / 0.02)
      : t < 0.83
        ? 1
        : clamp((0.9 - t) / 0.07);
  return FALSEWORK_TARGETS.flatMap((target) => {
    const total = target.point[1] - target.footY - 0.38;
    const maxSegments = Math.max(
      0,
      Math.floor(
        (target.ceiling - target.footY - 0.38) / SYDNEY_FALSEWORK_SEGMENT,
      ),
    );
    const segmentCount = Math.floor(maxSegments * factor);
    if (segmentCount < 1) return [];
    const height = segmentCount * SYDNEY_FALSEWORK_SEGMENT;
    return [
      {
        station: target.station,
        group: target.group,
        segmentCount,
        segmentLength: SYDNEY_FALSEWORK_SEGMENT,
        height,
        footY: target.footY,
        deckY: target.footY + height,
        position: [
          target.point[0],
          target.footY + height,
          target.point[2],
        ] as Vec3,
        yaw: target.yaw,
        capHeight:
          segmentCount === maxSegments ? Math.max(0, total - height) : 0,
        supportY: target.point[1],
      },
    ];
  });
}
export function sydneyFalseworkStackHeightAt(t: number): number {
  return Math.max(0, ...sydneyFalseworkAt(t).map((bay) => bay.height));
}
