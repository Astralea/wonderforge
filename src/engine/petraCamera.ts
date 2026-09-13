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
  { t: 0, azimuth: -1.52, pitchDeg: 12, radius: 40, target: [0.2, 20.5, 1.0] },
  { t: 0.16, azimuth: -1.55, pitchDeg: 11.5, radius: 42, target: [0.4, 19.2, 0.9] },
  { t: 0.38, azimuth: -1.58, pitchDeg: 11, radius: 44, target: [0.1, 16.4, 0.8] },
  { t: 0.58, azimuth: -1.56, pitchDeg: 10.5, radius: 46, target: [-0.2, 14.2, 0.7] },
  { t: 0.78, azimuth: -1.53, pitchDeg: 10, radius: 50, target: [0.2, 13.4, 0.6] },
  { t: 0.92, azimuth: -1.5, pitchDeg: 9.5, radius: 54, target: [0, 14.6, 0.7] },
  { t: 1, azimuth: -1.48, pitchDeg: 9, radius: 58, target: [0, 15.2, 0.8] },
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
