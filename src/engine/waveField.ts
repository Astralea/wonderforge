// CPU twin of the Nile wave field drawn by the water shader
// (src/render/three/proceduralDetail.ts, the `water` recipe). Boats, wakes,
// and any future floating prop ride THIS field, so hull motion and the
// visible surface are the same waves — same recipe constants, same noise
// math, pure function of playback t. Float64 vs GPU float32 differences are
// far below one pixel of surface detail.

import { materialDetailFor } from '../data/materialDetail';

/** Matches the GLSL wfHash: fract(sin(dot(p, (127.1, 311.7))) * 43758.5453). */
function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/** Matches wfNoise (smoothstep-interpolated value noise). */
function noise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let fx = x - ix;
  let fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Matches wfFbm: two octaves with the shader's octave offset. */
function fbm(x: number, y: number): number {
  return noise(x, y) * 0.65 + noise(x * 2.13 + 7.3, y * 2.13 + 7.3) * 0.35;
}

/**
 * Zero-mean wave height at a world point and playback t — the sum of the
 * water recipe's downstream-advected swell and fine chop octave, exactly as
 * the shader's `wfDetail` water terms.
 */
export function gizaWaveHeightAt(x: number, z: number, t: number): number {
  const recipe = materialDetailFor('water');
  const ripple = recipe.ripple!;
  let height = (fbm(
    x * ripple.scale + t * ripple.speed,
    z * ripple.scale * 0.55 - t * ripple.speed * 0.3,
  ) - 0.5) * ripple.amplitude * 2;
  const chop = recipe.chop;
  if (chop) {
    height += (fbm(
      x * chop.scale + t * chop.speed,
      z * chop.scale * 0.8 - t * chop.speed * 0.45,
    ) - 0.5) * chop.amplitude * 2;
  }
  return height;
}

export interface WaveSample {
  height: number;
  /** dHeight/dx and dHeight/dz — the surface slope boats answer to. */
  slopeX: number;
  slopeZ: number;
}

/** Wave height plus finite-difference slope (one extra evaluation per axis). */
export function gizaWaveSampleAt(x: number, z: number, t: number): WaveSample {
  const step = 0.08;
  const height = gizaWaveHeightAt(x, z, t);
  return {
    height,
    slopeX: (gizaWaveHeightAt(x + step, z, t) - height) / step,
    slopeZ: (gizaWaveHeightAt(x, z + step, t) - height) / step,
  };
}
