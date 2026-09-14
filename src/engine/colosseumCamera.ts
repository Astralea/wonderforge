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
  { t: 0, azimuth: 0.08, pitchDeg: 12, radius: 492, target: [14, 14, 2] },
  { t: 0.16, azimuth: 0.26, pitchDeg: 12.8, radius: 478, target: [11, 18, 1] },
  { t: 0.32, azimuth: 0.42, pitchDeg: 13.4, radius: 470, target: [7, 24, -1] },
  { t: 0.48, azimuth: 0.58, pitchDeg: 14.2, radius: 488, target: [3, 30, -2] },
  { t: 0.62, azimuth: 0.74, pitchDeg: 14.6, radius: 520, target: [1, 36, -1] },
  { t: 0.78, azimuth: 0.96, pitchDeg: 13.8, radius: 560, target: [0, 40, 0] },
  { t: 0.9, azimuth: 1.1, pitchDeg: 12.6, radius: 588, target: [0, 43, 0] },
  { t: 1, azimuth: 1.22, pitchDeg: 12, radius: 608, target: [0, 45, 0] },
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
