import type { Vec3 } from '../data/constructionTypes';
import { EIFFEL_CAMERA_HEIGHT_MILESTONES, type EiffelCameraShot } from './eiffelCamera';

export interface EiffelShadowFrame {
  target: Vec3;
  lightPosition: Vec3;
  left: number;
  right: number;
  bottom: number;
  top: number;
  near: number;
  far: number;
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Current kit bounds per vertical band, rounded outward plus >=4m of support
 * context. The broad foot retains 5.5m; summit allowance includes apparatus.
 * A manifest-backed test must pass when authored structural geometry changes. */
const TOWER_SHADOW_BANDS = [
  [-5, 8, 68], [8, 24, 64], [24, 40, 54], [40, 60, 46],
  [60, 90, 36], [90, 120, 28], [120, 180, 22], [180, 240, 13],
  [240, 280, 12], [280, 300, 12], [300, 332, 12],
] as const;

/** Conservative current erection envelope, narrowed only during operation views. */
export function eiffelShadowEnvelope(productionT: number, shot: EiffelCameraShot): Vec3[] {
  const t = clamp(productionT, 0, 1);
  const keys = EIFFEL_CAMERA_HEIGHT_MILESTONES;
  let height: number = keys.at(-1)![1];
  for (let i = 1; i < keys.length; i += 1) {
    const a = keys[i - 1]!, b = keys[i]!;
    if (t <= b[0]) { height = mix(a[1], b[1], (t - a[0]) / (b[0] - a[0])); break; }
  }
  const top = height + 20;
  const p = clamp((shot.radius - 90) / 130, 0, 1);
  const wide = p * p * (3 - 2 * p);
  const context = clamp(shot.radius * .45, 24, 90);
  const [x, y, z] = shot.target;
  // The focus box includes contact/support below the camera target, not just
  // the carried part. Wide views additionally retain the whole ground footprint.
  const low = Math.max(-5, y - context * 1.3);
  const high = Math.max(low + 1, Math.min(top, y + context));
  const points: Vec3[] = [];
  // Tiered corners avoid fitting empty full-footprint upper-tower corners, which
  // otherwise admit unrelated city and tree casters into the sun frustum.
  for (const [bottom, bandTop, halfWidth] of TOWER_SHADOW_BANDS) {
    if (bottom >= top) break;
    for (const sx of [-1, 1]) for (const py of [bottom, Math.min(top, bandTop)]) for (const sz of [-1, 1]) {
      const closeY = mix(low, high, (py + 5) / (top + 5));
      points.push([mix(x + sx * context, sx * halfWidth, wide), mix(closeY, py, wide), mix(z + sz * context, sz * halfWidth, wide)]);
    }
  }
  return points;
}

/** Fit absolute world-space points; no wall clock, renderer or mutable history. */
export function fitEiffelShadow(points: readonly Vec3[], sunDirection: Vec3, mapSize: number): EiffelShadowFrame {
  if (!points.length || !points.every(point => point.every(Number.isFinite)) || !sunDirection.every(Number.isFinite) || !Number.isFinite(mapSize) || mapSize < 1) throw new Error('Invalid Eiffel shadow envelope');
  const length = Math.hypot(...sunDirection);
  if (length < 1e-8) throw new Error('Eiffel shadow sun direction is zero');
  const direction = sunDirection.map(v => v / length) as Vec3;
  const horizontal = Math.hypot(direction[0], direction[2]);
  if (horizontal < 1e-6) throw new Error('Eiffel shadow sun must remain below the zenith');
  const right: Vec3 = [direction[2] / horizontal, 0, -direction[0] / horizontal];
  const up: Vec3 = [-direction[1] * direction[0] / horizontal, horizontal, -direction[1] * direction[2] / horizontal];
  const ranges = [right, up, direction].map(axis => {
    const values = points.map(point => dot(point, axis));
    return [Math.min(...values), Math.max(...values)] as const;
  });
  const [xr, yr, zr] = ranges as [readonly [number, number], readonly [number, number], readonly [number, number]];
  // Four-metre half-extent buckets avoid rescaling the map for sub-metre
  // movements. Four metres beyond the support envelope absorbs half-texel
  // snapping without admitting a second unnecessarily broad ring of casters.
  const halfX = Math.ceil(((xr[1] - xr[0]) / 2 + 4) / 4) * 4;
  const halfY = Math.ceil(((yr[1] - yr[0]) / 2 + 4) / 4) * 4;
  const snap = (center: number, halfExtent: number) => Math.round(center / (2 * halfExtent / mapSize)) * (2 * halfExtent / mapSize);
  const cx = snap((xr[0] + xr[1]) / 2, halfX);
  const cy = snap((yr[0] + yr[1]) / 2, halfY);
  const cz = (zr[0] + zr[1]) / 2;
  const target = right.map((v, i) => v * cx + up[i]! * cy + direction[i]! * cz) as Vec3;
  const distance = (zr[1] - zr[0]) / 2 + 16;
  return {
    target,
    lightPosition: target.map((v, i) => v + direction[i]! * distance) as Vec3,
    left: -halfX, right: halfX, bottom: -halfY, top: halfY,
    near: 1, far: 2 * distance,
  };
}
