import type { EiffelKitPart } from '../data/eiffelKitTypes';
import type { RigidPose, RigidVec3 } from './eiffelRigid';
import { eiffelTerrainHeightAt } from './eiffelTerrain';

export type FoundationPoint = readonly [number, number];
export interface FoundationFootprint {
  readonly id: string;
  readonly min: FoundationPoint;
  readonly max: FoundationPoint;
}
interface RouteSegment {
  readonly a: FoundationPoint;
  readonly b: FoundationPoint;
  readonly control?: FoundationPoint;
  readonly length: number;
  readonly arc: readonly number[];
}
export interface EiffelFoundationRoute {
  readonly points: readonly FoundationPoint[];
  readonly segments: readonly RouteSegment[];
  readonly length: number;
  /** Circular envelope contains the entire fixed-orientation cargo and carrier. */
  readonly footprintRadius: number;
  readonly corridorWidth: number;
}
/** Shared yard contract for authored ground/paving; not an extra scene prop. */
export const EIFFEL_FOUNDATION_YARD = {
  pickupX: [82, 86], pickupZ: [72, 75, 78, 81],
  roundRadius: 0.4, clearance: 0.2,
  groundToCargoBottom: 0.6,
} as const;
const distance = (a: FoundationPoint, b: FoundationPoint) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const mix = (a: FoundationPoint, b: FoundationPoint, t: number): FoundationPoint => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Union each complete bearing (including its coping/anchors), independent of time.
 * Routing outside these sixteen envelopes also clears every seated subset.
 */
export function eiffelFoundationFootprints(parts: readonly EiffelKitPart[]): FoundationFootprint[] {
  const map = new Map<string, { min: [number, number]; max: [number, number] }>();
  for (const part of parts) {
    if (part.group !== 'foundation') continue;
    const id = part.sourceGroup;
    const item = map.get(id) ?? { min: [Infinity, Infinity], max: [-Infinity, -Infinity] };
    for (const [i, axis] of [[0, 0], [1, 2]] as const) {
      item.min[i] = Math.min(item.min[i], part.boundsMin[axis]);
      item.max[i] = Math.max(item.max[i], part.boundsMax[axis]);
    }
    map.set(id, item);
  }
  return [...map].map(([id, value]) => ({ id, ...value }));
}

/** Slab intersection with the open rectangle: grazing a padded corner is allowed. */
function crosses(a: FoundationPoint, b: FoundationPoint, rect: FoundationFootprint): boolean {
  let lo = 0, hi = 1;
  for (const axis of [0, 1] as const) {
    const delta = b[axis] - a[axis], min = rect.min[axis] + 1e-7, max = rect.max[axis] - 1e-7;
    if (Math.abs(delta) < 1e-10) {
      if (a[axis] <= min || a[axis] >= max) return false;
    } else {
      const t1 = (min - a[axis]) / delta, t2 = (max - a[axis]) / delta;
      lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2));
      if (hi <= lo) return false;
    }
  }
  return hi > lo && hi > 0 && lo < 1;
}
function pointAt(segment: Pick<RouteSegment, 'a' | 'b' | 'control'>, t: number): FoundationPoint {
  return segment.control ? mix(mix(segment.a, segment.control, t), mix(segment.control, segment.b, t), t) : mix(segment.a, segment.b, t);
}
function segment(a: FoundationPoint, b: FoundationPoint, control?: FoundationPoint): RouteSegment {
  const arc = [0]; let prior = a;
  for (let i = 1; i <= 32; i++) { const p = pointAt({ a, b, control }, i / 32); arc.push(arc[i - 1]! + distance(prior, p)); prior = p; }
  return { a, b, control, arc, length: arc[32]! };
}

export function createEiffelFoundationRouter(parts: readonly EiffelKitPart[]) {
  const footprints = eiffelFoundationFootprints(parts);
  const cache = new Map<number, { obstacles: FoundationFootprint[]; corners: FoundationPoint[]; edges: number[][] }>();
  return (part: EiffelKitPart, pickup: RigidPose, staging: RigidPose): EiffelFoundationRoute => {
    // Identity attitude during ground hauling, including the visible carrier's .3 m overhang.
    const carrier = eiffelFoundationCarrierSize(part);
    const footprintRadius = Math.hypot(carrier[0] / 2, carrier[2] / 2);
    const radius = Math.ceil(footprintRadius * 1000) / 1000;
    let graph = cache.get(radius);
    if (!graph) {
      // A rounded corner stays inside the control triangle, at most roundRadius
      // from the certified polyline. Include that entire sweep in obstacle inflation.
      const padding = radius + EIFFEL_FOUNDATION_YARD.clearance + EIFFEL_FOUNDATION_YARD.roundRadius;
      const obstacles = footprints.map(o => ({ id: o.id, min: [o.min[0] - padding, o.min[1] - padding] as FoundationPoint, max: [o.max[0] + padding, o.max[1] + padding] as FoundationPoint }));
      const corners = obstacles.flatMap(o => [[o.min[0], o.min[1]], [o.max[0], o.min[1]], [o.max[0], o.max[1]], [o.min[0], o.max[1]]] as FoundationPoint[]);
      const edges = corners.map((a, i) => corners.map((b, j) => i === j || obstacles.some(o => crosses(a, b, o)) ? Infinity : distance(a, b)));
      graph = { obstacles, corners, edges }; cache.set(radius, graph);
    }
    const start: FoundationPoint = [pickup.position[0], pickup.position[2]], finish: FoundationPoint = [staging.position[0], staging.position[2]];
    const nodes = [...graph.corners, start, finish], n = nodes.length, first = n - 2, last = n - 1;
    const visible = (a: FoundationPoint, b: FoundationPoint) => !graph!.obstacles.some(o => crosses(a, b, o));
    const weights = [...graph.edges.map(row => [...row]), Array(n).fill(Infinity), Array(n).fill(Infinity)];
    for (let i = 0; i < n; i++) for (const j of [first, last]) {
      const w = visible(nodes[i]!, nodes[j]!) ? distance(nodes[i]!, nodes[j]!) : Infinity;
      weights[i]![j] = w; weights[j]![i] = w;
    }
    const best = Array<number>(n).fill(Infinity), previous = Array<number>(n).fill(-1), done = new Set<number>(); best[first] = 0;
    for (let k = 0; k < n; k++) {
      let u = -1; for (let i = 0; i < n; i++) if (!done.has(i) && (u < 0 || best[i]! < best[u]!)) u = i;
      if (u === last || u < 0 || !Number.isFinite(best[u])) break;
      done.add(u);
      for (let v = 0; v < n; v++) { const d = best[u]! + weights[u]![v]!; if (d < best[v]!) { best[v] = d; previous[v] = u; } }
    }
    if (!Number.isFinite(best[last])) throw new Error(`No clear foundation hauling route for ${part.id}`);
    const points: FoundationPoint[] = []; for (let i = last; i >= 0; i = previous[i]!) { points.unshift(nodes[i]!); if (i === first) break; }
    const segments: RouteSegment[] = []; let cursor = points[0]!;
    for (let i = 1; i < points.length - 1; i++) {
      const a = points[i - 1]!, b = points[i]!, c = points[i + 1]!;
      const round = Math.min(EIFFEL_FOUNDATION_YARD.roundRadius, distance(a, b) / 3, distance(b, c) / 3);
      const entry = mix(b, a, round / distance(a, b)), exit = mix(b, c, round / distance(b, c));
      if (distance(cursor, entry) > 1e-8) segments.push(segment(cursor, entry));
      segments.push(segment(entry, exit, b)); cursor = exit;
    }
    if (distance(cursor, finish) > 1e-8) segments.push(segment(cursor, finish));
    return { points, segments, length: segments.reduce((sum, s) => sum + s.length, 0), footprintRadius, corridorWidth: 2 * (footprintRadius + EIFFEL_FOUNDATION_YARD.clearance) };
  };
}

export function sampleEiffelFoundationRoute(route: EiffelFoundationRoute, progress: number, part: EiffelKitPart): RigidPose {
  let target = Math.max(0, Math.min(1, progress)) * route.length;
  let chosen = route.segments[route.segments.length - 1]!;
  for (const s of route.segments) { chosen = s; if (target <= s.length || s === route.segments[route.segments.length - 1]) { target = Math.min(target, s.length); break; } target -= s.length; }
  let i = 1; while (i < chosen.arc.length - 1 && chosen.arc[i]! < target) i++;
  const fraction = (target - chosen.arc[i - 1]!) / Math.max(1e-12, chosen.arc[i]! - chosen.arc[i - 1]!);
  const [x, z] = pointAt(chosen, Math.min(1, (i - 1 + fraction) / 32));
  const position: RigidVec3 = [x, eiffelTerrainHeightAt(x, z) + EIFFEL_FOUNDATION_YARD.groundToCargoBottom - part.localBounds.min[1], z];
  return { position, quaternion: [0, 0, 0, 1] };
}

/** Travel tangent is independent of the fixed cargo attitude. */
export function eiffelFoundationRouteMotion(route: EiffelFoundationRoute, progress: number) {
  const distance = Math.max(0, Math.min(1, progress)) * route.length;
  let remaining = distance, chosen = route.segments[route.segments.length - 1]!;
  for (const s of route.segments) { chosen = s; if (remaining <= s.length || s === route.segments[route.segments.length - 1]) break; remaining -= s.length; }
  // Arc-length inversion matches the position sampler, so orientation follows the actual curve.
  let i = 1; while (i < chosen.arc.length - 1 && chosen.arc[i]! < remaining) i++;
  const fraction = (remaining - chosen.arc[i - 1]!) / Math.max(1e-12, chosen.arc[i]! - chosen.arc[i - 1]!);
  const t = Math.max(0, Math.min(1, (i - 1 + fraction) / 32));
  const dx = chosen.control ? 2 * ((1 - t) * (chosen.control[0] - chosen.a[0]) + t * (chosen.b[0] - chosen.control[0])) : chosen.b[0] - chosen.a[0];
  const dz = chosen.control ? 2 * ((1 - t) * (chosen.control[1] - chosen.a[1]) + t * (chosen.b[1] - chosen.control[1])) : chosen.b[1] - chosen.a[1];
  return { yaw: Math.atan2(dz, dx), distance };
}

/** A square turning deck contains the fixed-attitude cargo for every steering angle. */
export function eiffelFoundationCarrierSize(part: EiffelKitPart): RigidVec3 {
  const half = Math.hypot(Math.max(Math.abs(part.localBounds.min[0]), Math.abs(part.localBounds.max[0])), Math.max(Math.abs(part.localBounds.min[2]), Math.abs(part.localBounds.max[2]))) + .04;
  return [half * 2, .24, half * 2];
}
