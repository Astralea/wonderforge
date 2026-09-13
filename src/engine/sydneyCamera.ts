import type { Vec3 } from '../data/constructionTypes';
import { clamp, easeInOutQuad } from './easing';

export interface SydneyCameraShot {
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

/** Giza-like harbour panorama; east Farm Cove opening; linear azimuth. */
const SHOTS: ShotKeyframe[] = [
  { t: 0, azimuth: 0.06, pitchDeg: 22.8, radius: 528, target: [2, 8, 16] },
  { t: 0.16, azimuth: 0.22, pitchDeg: 22.4, radius: 552, target: [2, 9, 12] },
  { t: 0.32, azimuth: 0.4, pitchDeg: 22.0, radius: 578, target: [1, 10, 8] },
  { t: 0.48, azimuth: 0.58, pitchDeg: 21.6, radius: 604, target: [1, 11, 5] },
  { t: 0.64, azimuth: 0.76, pitchDeg: 21.2, radius: 632, target: [0, 12, 3] },
  { t: 0.8, azimuth: 0.94, pitchDeg: 20.8, radius: 658, target: [0, 13, 2] },
  { t: 0.92, azimuth: 1.06, pitchDeg: 20.4, radius: 682, target: [0, 14, 1] },
  { t: 1, azimuth: 1.14, pitchDeg: 20.0, radius: 698, target: [0, 14, 0] },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function sydneyCinematicShotAt(rawT: number, aspect = 16 / 9): SydneyCameraShot {
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
  const span = (t - from.t) / (to.t - from.t);
  const local = from === to ? 1 : easeInOutQuad(span);
  const narrow = Math.pow(clamp(1.78 / Math.max(0.3, aspect), 1, 2.05), 0.38);
  return {
    azimuth: lerp(from.azimuth, to.azimuth, from === to ? 1 : span),
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
