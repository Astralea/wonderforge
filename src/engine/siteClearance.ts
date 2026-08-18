import type { GizaConstructionPlan, RampPlan } from '../data/constructionTypes';

/**
 * Site clearance (Spec 08 §Physical plausibility).
 *
 * A construction site is not a field you can sprinkle props over: masonry,
 * earthworks, and haul corridors are occupied ground. Tents, crates, shade
 * frames, survey stakes, and rubble must not grow out of a ramp or stand in a
 * lane the sled teams use, because on screen that reads as geometry clipping,
 * not as a camp.
 *
 * Pure geometry: no Three.js, no DOM. The renderer places props through
 * `pushOutOfSiteWorks` so the layout stays deterministic and testable.
 */

export interface KeepOut {
  id: string;
  /** Center in world XZ. */
  center: [number, number];
  /** Axis-aligned half-extents in world XZ. */
  half: [number, number];
}

/** Straight-line haul corridor (the sled chord between two waypoints). */
export interface Corridor {
  id: string;
  from: [number, number];
  to: [number, number];
}

/**
 * Axis-aligned bounds of a yawed rectangle. Exact for any angle: the rotated
 * rectangle's extent along each axis is the sum of the projected half-extents.
 */
export function rampBounds(ramp: RampPlan): KeepOut {
  const [width, length] = ramp.footprint;
  const cos = Math.abs(Math.cos(ramp.yaw));
  const sin = Math.abs(Math.sin(ramp.yaw));
  return {
    id: ramp.id,
    center: [ramp.center[0], ramp.center[1]],
    half: [
      (cos * width + sin * length) * 0.5,
      (sin * width + cos * length) * 0.5,
    ],
  };
}

/** Every piece of ground the construction itself occupies. */
export function siteKeepOuts(plan: GizaConstructionPlan): KeepOut[] {
  const monuments = Object.values(plan.monuments).map<KeepOut>((monument) => ({
    id: monument.id,
    center: [monument.center[0], monument.center[1]],
    half: [monument.baseWidth * 0.5, monument.baseWidth * 0.5],
  }));
  return [...monuments, ...plan.ramps.map(rampBounds)];
}

/** The queued haul legs, as corridors props must leave open. */
export function haulCorridors(plan: GizaConstructionPlan): Corridor[] {
  const corridors: Corridor[] = [];
  for (const route of plan.routes) {
    const { dressing, roadQueue, rampFoot } = route.waypoints;
    corridors.push(
      { id: `${route.id}:approach`, from: [dressing[0], dressing[2]], to: [roadQueue[0], roadQueue[2]] },
      { id: `${route.id}:queue`, from: [roadQueue[0], roadQueue[2]], to: [rampFoot[0], rampFoot[2]] },
    );
  }
  return corridors;
}

function closestPointOnSegment(
  x: number,
  z: number,
  from: readonly [number, number],
  to: readonly [number, number],
): [number, number] {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared < 1e-9) return [from[0], from[1]];
  const t = Math.max(0, Math.min(1, ((x - from[0]) * dx + (z - from[1]) * dz) / lengthSquared));
  return [from[0] + dx * t, from[1] + dz * t];
}

/**
 * Push a point out of a keep-out along its shallowest axis — the shortest move
 * that frees the prop, so the camp keeps its authored shape instead of
 * collapsing away from the site.
 */
function pushOutOfBox(x: number, z: number, box: KeepOut, margin: number): [number, number] {
  const overlapX = box.half[0] + margin - Math.abs(x - box.center[0]);
  const overlapZ = box.half[1] + margin - Math.abs(z - box.center[1]);
  if (overlapX <= 0 || overlapZ <= 0) return [x, z];

  if (overlapX < overlapZ) {
    const side = x >= box.center[0] ? 1 : -1;
    return [box.center[0] + side * (box.half[0] + margin), z];
  }
  const side = z >= box.center[1] ? 1 : -1;
  return [x, box.center[1] + side * (box.half[1] + margin)];
}

function pushOutOfCorridor(
  x: number,
  z: number,
  corridor: Corridor,
  clearance: number,
): [number, number] {
  const [cx, cz] = closestPointOnSegment(x, z, corridor.from, corridor.to);
  let dx = x - cx;
  let dz = z - cz;
  const distance = Math.hypot(dx, dz);
  if (distance >= clearance) return [x, z];
  if (distance < 1e-6) {
    // Dead on the center line: step off perpendicular to the corridor.
    const ax = corridor.to[0] - corridor.from[0];
    const az = corridor.to[1] - corridor.from[1];
    const length = Math.hypot(ax, az) || 1;
    dx = -az / length;
    dz = ax / length;
  } else {
    dx /= distance;
    dz /= distance;
  }
  return [cx + dx * clearance, cz + dz * clearance];
}

export interface ClearanceOptions {
  /** Extra gap beyond the footprint edge, in world units. */
  margin?: number;
  /** Half-width of the haul lanes to keep open. */
  corridorClearance?: number;
}

/**
 * Move a prop position to the nearest spot clear of all masonry, earthworks,
 * and haul lanes. Idempotent for points that are already clear.
 *
 * Corridors are resolved before footprints on every pass, so solid geometry
 * has the final say: a prop overhanging a ramp reads as clipping, while a prop
 * near a haul lane merely reads as a busy site.
 *
 * Ramps abut the faces they serve, so a prop can be trapped in a zero-width
 * gap between the two. Such a point keeps its last position rather than
 * jittering forever; callers that need a guarantee should reject instead,
 * testing with `isClearOfSiteWorks`.
 */
export function pushOutOfSiteWorks(
  x: number,
  z: number,
  keepOuts: readonly KeepOut[],
  corridors: readonly Corridor[] = [],
  options: ClearanceOptions = {},
): [number, number] {
  const margin = options.margin ?? 0;
  const corridorClearance = options.corridorClearance ?? 0;
  let px = x;
  let pz = z;

  for (let pass = 0; pass < 3; pass += 1) {
    if (corridorClearance > 0) {
      for (const corridor of corridors) {
        [px, pz] = pushOutOfCorridor(px, pz, corridor, corridorClearance);
      }
    }
    for (const box of keepOuts) {
      [px, pz] = pushOutOfBox(px, pz, box, margin);
    }
  }
  return [px, pz];
}

export function isClearOfSiteWorks(
  x: number,
  z: number,
  keepOuts: readonly KeepOut[],
  corridors: readonly Corridor[] = [],
  options: ClearanceOptions = {},
): boolean {
  const margin = options.margin ?? 0;
  const corridorClearance = options.corridorClearance ?? 0;
  for (const box of keepOuts) {
    if (
      Math.abs(x - box.center[0]) < box.half[0] + margin &&
      Math.abs(z - box.center[1]) < box.half[1] + margin
    ) {
      return false;
    }
  }
  if (corridorClearance > 0) {
    for (const corridor of corridors) {
      const [cx, cz] = closestPointOnSegment(x, z, corridor.from, corridor.to);
      if (Math.hypot(x - cx, z - cz) < corridorClearance - 1e-6) return false;
    }
  }
  return true;
}
