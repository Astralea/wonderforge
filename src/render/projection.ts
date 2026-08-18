import type { Vec3 } from './vec';

/** Spec 06 §Projection — orthographic isometric-style. */
export interface IsoCamera {
  /** World orbit angle: the camera sits at (cos θ, sin θ) × radius. */
  azimuth: number;
  /** Camera elevation above the horizon, radians. */
  pitch: number;
  /** Pixels per world unit. */
  scale: number;
  /** Screen px point where the orbit target lands. */
  center: [number, number];
  /** World-space y of the orbit target. */
  targetY: number;
}

export interface Projected {
  x: number;
  y: number;
  /** Camera-axis depth: larger = closer to the camera. */
  depth: number;
}

export function isoProject(p: Vec3, cam: IsoCamera): Projected {
  const y = p[1] - cam.targetY;
  const cosT = Math.cos(cam.azimuth);
  const sinT = Math.sin(cam.azimuth);
  const dh = p[0] * cosT + p[2] * sinT; // horizontal depth toward camera
  const sxr = p[0] * sinT - p[2] * cosT; // screen-right
  const cosP = Math.cos(cam.pitch);
  const sinP = Math.sin(cam.pitch);
  const syr = y * cosP - dh * sinP; // screen-up (before canvas y-flip)
  return {
    x: cam.center[0] + sxr * cam.scale,
    y: cam.center[1] - syr * cam.scale,
    depth: dh * cosP + y * sinP,
  };
}

/** Unit vector from the scene toward the camera (for backface culling). */
export function cameraDirection(cam: Pick<IsoCamera, 'azimuth' | 'pitch'>): Vec3 {
  const cosP = Math.cos(cam.pitch);
  return [
    Math.cos(cam.azimuth) * cosP,
    Math.sin(cam.pitch),
    Math.sin(cam.azimuth) * cosP,
  ];
}
