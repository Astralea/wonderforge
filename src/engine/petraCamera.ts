import type { Vec3 } from '../data/constructionTypes';
import { clamp, easeInOutQuad } from './easing';

export interface PetraCameraShot {
  azimuth: number;
  pitch: number;
  radius: number;
  target: Vec3;
  fov: number;
}

interface ShotKeyframe {
  t: number;
  azimuth: number;
  pitchDeg: number;
  radius: number;
  target: Vec3;
}

/** Looking out of the Siq (+Z toward the west-facing facade at the origin). */
const SHOTS: ShotKeyframe[] = [
  // Wide Siq stand-off with pitch just under half-FOV so the dry blue zenith
  // remains readable above the gorge walls.
  { t: 0, azimuth: -1.42, pitchDeg: 16.8, radius: 56, target: [0.4, 16.5, -2.0] },
  { t: 0.16, azimuth: -1.44, pitchDeg: 16.6, radius: 58, target: [0.3, 15.8, -1.5] },
  { t: 0.38, azimuth: -1.46, pitchDeg: 16.4, radius: 60, target: [0.1, 15.0, -1.0] },
  { t: 0.58, azimuth: -1.44, pitchDeg: 16.2, radius: 62, target: [0.0, 14.6, -0.6] },
  { t: 0.78, azimuth: -1.40, pitchDeg: 15.8, radius: 64, target: [0.2, 15.0, -0.2] },
  { t: 0.92, azimuth: -1.36, pitchDeg: 15.4, radius: 66, target: [0.0, 15.6, 0.2] },
  { t: 1, azimuth: -1.32, pitchDeg: 15.0, radius: 68, target: [0.0, 16.2, 0.4] },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function petraCinematicShotAt(rawT: number, aspect = 16 / 9): PetraCameraShot {
  const t = clamp(rawT);
  let from = SHOTS[0]!;
  let to = SHOTS.at(-1)!;
  for (let index = 1; index < SHOTS.length; index += 1) {
    if (t <= SHOTS[index]!.t) {
      from = SHOTS[index - 1]!;
      to = SHOTS[index]!;
      break;
    }
  }
  const local = from === to ? 1 : easeInOutQuad((t - from.t) / (to.t - from.t));
  const narrow = Math.pow(clamp(1.78 / Math.max(0.3, aspect), 1, 2.05), 0.38);
  return {
    azimuth: lerp(from.azimuth, to.azimuth, local),
    pitch: (lerp(from.pitchDeg, to.pitchDeg, local) * Math.PI) / 180,
    radius: lerp(from.radius, to.radius, local) * narrow,
    target: [
      lerp(from.target[0], to.target[0], local),
      lerp(from.target[1], to.target[1], local),
      lerp(from.target[2], to.target[2], local),
    ],
    fov: aspect < 0.72 ? 42 : 35,
  };
}
