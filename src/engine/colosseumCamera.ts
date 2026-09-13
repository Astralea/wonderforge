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
  { t: 0, azimuth: 0.08, pitchDeg: 12, radius: 492, target: [14, 16, 2] },
  { t: 0.16, azimuth: 0.26, pitchDeg: 12, radius: 500, target: [11, 17, 1] },
  { t: 0.32, azimuth: 0.42, pitchDeg: 12.1, radius: 512, target: [7, 19, -1] },
  { t: 0.48, azimuth: 0.58, pitchDeg: 12, radius: 528, target: [3, 21, -2] },
  { t: 0.62, azimuth: 0.74, pitchDeg: 11.7, radius: 546, target: [1, 22, -1] },
  { t: 0.78, azimuth: 0.96, pitchDeg: 11.3, radius: 568, target: [0, 24, 0] },
  { t: 0.9, azimuth: 1.1, pitchDeg: 11, radius: 588, target: [0, 26, 0] },
  { t: 1, azimuth: 1.22, pitchDeg: 10.8, radius: 608, target: [0, 27, 0] },
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
