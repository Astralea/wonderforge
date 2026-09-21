import type { ConstructionRoute, GizaRampSurface, Vec3 } from '../data/constructionTypes';
import { clamp, smoothstep } from './easing';

/** Normalized along-route knots, including grounded foot and crew landing. */
export function gizaRampKnots(surface: GizaRampSurface): number[] {
  const length = Math.hypot(surface.crest[0] - surface.foot[0], surface.crest[2] - surface.foot[2]);
  return [-1.3 / length, 0, 1.4 / length, 1 - 1.4 / length, 1, 1 + 4.5 / length];
}

export function gizaRampProfileAt(surface: GizaRampSurface, u: number): number {
  const length = Math.hypot(surface.crest[0] - surface.foot[0], surface.crest[2] - surface.foot[2]);
  return clamp((u * length - 1.4) / (length - 2.8));
}

export function gizaRampHeightAt(surface: GizaRampSurface, t: number): number {
  let low = 0;
  let high = surface.courses.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (surface.courses[mid]!.start <= t) low = mid + 1;
    else high = mid;
  }
  if (low === 0) return 0;
  const course = surface.courses[low - 1]!;
  const previous = surface.courses[low - 2]?.height ?? 0;
  return previous + (course.height - previous)
    * smoothstep((t - course.start) / (course.readyAt - course.start));
}

export function gizaRampSurfaceYAt(surface: GizaRampSurface, x: number, z: number, t: number): number {
  const dx = surface.crest[0] - surface.foot[0];
  const dz = surface.crest[2] - surface.foot[2];
  const u = ((x - surface.foot[0]) * dx + (z - surface.foot[2]) * dz) / (dx * dx + dz * dz);
  return surface.foot[1] + gizaRampHeightAt(surface, t) * gizaRampProfileAt(surface, u);
}

/** Two runner ends define a rigid sled resting on the same visible surface. */
export function gizaSledPoseAt(
  route: ConstructionRoute,
  x: number,
  z: number,
  yaw: number,
  runnerLength: number,
  t: number,
): { pitch: number; ground: Vec3 } {
  const surface = route.rampSurface!;
  const dx = Math.sin(yaw);
  const dz = Math.cos(yaw);
  const half = runnerLength / 2;
  // The bounded monotone solve preserves the runner's actual fixed length,
  // including when its ends straddle a level-landing / incline boundary.
  let low = -Math.PI / 2 + 0.001;
  let high = Math.PI / 2 - 0.001;
  for (let i = 0; i < 36; i += 1) {
    const angle = (low + high) / 2;
    const horizontal = Math.cos(angle) * half;
    const front = gizaRampSurfaceYAt(surface, x + dx * horizontal, z + dz * horizontal, t);
    const rear = gizaRampSurfaceYAt(surface, x - dx * horizontal, z - dz * horizontal, t);
    if (front - rear > Math.sin(angle) * runnerLength) low = angle;
    else high = angle;
  }
  const angle = (low + high) / 2;
  const horizontal = Math.cos(angle) * half;
  const front = gizaRampSurfaceYAt(surface, x + dx * horizontal, z + dz * horizontal, t);
  const rear = gizaRampSurfaceYAt(surface, x - dx * horizontal, z - dz * horizontal, t);
  let groundY = (front + rear) / 2;
  // At the convex crest a rigid runner rocks over the break in slope: its
  // middle bears while an end lifts clear. Never force both ends down by
  // burying the middle. Test all exact piecewise-linear profile breaks.
  const routeDx = surface.crest[0] - surface.foot[0];
  const routeDz = surface.crest[2] - surface.foot[2];
  const routeLengthSquared = routeDx * routeDx + routeDz * routeDz;
  const u = ((x - surface.foot[0]) * routeDx + (z - surface.foot[2]) * routeDz) / routeLengthSquared;
  const du = Math.cos(angle) * (dx * routeDx + dz * routeDz) / routeLengthSquared;
  for (const knot of gizaRampKnots(surface)) {
    const along = (knot - u) / du;
    if (Math.abs(along) > half) continue;
    const contactX = x + dx * Math.cos(angle) * along;
    const contactZ = z + dz * Math.cos(angle) * along;
    groundY = Math.max(groundY, gizaRampSurfaceYAt(surface, contactX, contactZ, t) - Math.sin(angle) * along);
  }
  return { pitch: -angle, ground: [x, groundY, z] };
}

/** Apply the local vertical offset of a rigid YXZ sled/stone assembly. */
export function gizaCarrierPoint(ground: Vec3, yaw: number, pitch: number, height: number): Vec3 {
  const forwardOffset = Math.sin(pitch) * height;
  return [
    ground[0] + Math.sin(yaw) * forwardOffset,
    ground[1] + Math.cos(pitch) * height,
    ground[2] + Math.cos(yaw) * forwardOffset,
  ];
}
