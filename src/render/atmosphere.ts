import { clamp } from '../engine/easing';
import { mulberry32 } from '../engine/random';

/** Spec 08 §Background — drifting clouds, deterministic per wonder. */

export interface CloudSpec {
  x0: number;
  y0: number;
  s: number;
  speed: number;
}

export function cloudSpecs(seed: string, count = 4): CloudSpec[] {
  const rand = mulberry32(`${seed}-clouds`);
  return Array.from({ length: count }, () => ({
    x0: rand(),
    y0: 0.05 + rand() * 0.2,
    s: 0.7 + rand() * 0.9,
    speed: 0.05 + rand() * 0.06,
  }));
}

/** Clouds ride with daylight and fade with the night crossfade. */
export function cloudAlphaAt(lightT: number, emissive: number): number {
  const dayAmount = Math.sin(Math.PI * clamp(lightT));
  const a = 0.5 * Math.max(0, dayAmount) * (1 - clamp(emissive) * 0.85);
  return a < 1e-6 ? 0 : a; // exact 0 at the day edges
}

/** Screen x of a cluster: slow drift across the sky + camera parallax. */
export function cloudXAt(spec: CloudSpec, lightT: number, azimuth: number, width: number): number {
  const drift = (lightT * spec.speed + spec.x0) % 1.3;
  return (drift - 0.15) * width - Math.sin(azimuth) * width * 0.02;
}
