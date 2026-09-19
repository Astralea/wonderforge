import type { Vec3 } from '../data/constructionTypes';
import { clamp, easeInOutQuad } from './easing';

export interface ColosseumCameraShot {
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

const SHOTS: ShotKeyframe[] = [
  { t: 0, azimuth: 1.52, pitchDeg: 13.8, radius: 336, target: [0, 6, 0] },
  { t: 0.16, azimuth: 1.68, pitchDeg: 14.4, radius: 322, target: [2, 10, 0] },
  { t: 0.32, azimuth: 1.86, pitchDeg: 15.2, radius: 308, target: [2, 16, 0] },
  { t: 0.48, azimuth: 2.04, pitchDeg: 16, radius: 318, target: [1, 22, 0] },
  { t: 0.62, azimuth: 2.22, pitchDeg: 16.2, radius: 338, target: [0, 26, 0] },
  { t: 0.78, azimuth: 2.42, pitchDeg: 15.4, radius: 358, target: [0, 28, 0] },
  { t: 0.9, azimuth: 2.54, pitchDeg: 14.2, radius: 376, target: [0, 30, 0] },
  { t: 1, azimuth: 2.64, pitchDeg: 13.6, radius: 392, target: [0, 32, 0] },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function colosseumCinematicShotAt(rawT: number, aspect = 16 / 9): ColosseumCameraShot {
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
