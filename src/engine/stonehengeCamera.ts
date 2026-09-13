import type { Vec3 } from '../data/constructionTypes';
import { clamp, easeInOutQuad } from './easing';

export interface StonehengeCameraShot {
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
  { t: 0, azimuth: 0.78, pitchDeg: 16, radius: 124, target: [5, 1.8, 14] },
  { t: 0.12, azimuth: 1.62, pitchDeg: 16, radius: 100, target: [4, 1.6, 17] },
  { t: 0.32, azimuth: 2.62, pitchDeg: 16.5, radius: 94, target: [1, 2.5, 2] },
  { t: 0.58, azimuth: 3.82, pitchDeg: 16, radius: 96, target: [8, 2.4, 4] },
  { t: 0.68, azimuth: 4.03, pitchDeg: 16.5, radius: 92, target: [-10, 2.9, -13] },
  { t: 0.78, azimuth: 5.28, pitchDeg: 16.5, radius: 94, target: [-2, 3.2, -2] },
  { t: 0.92, azimuth: 6.53, pitchDeg: 14, radius: 114, target: [0, 2.9, 0] },
  { t: 1, azimuth: Math.PI * 2 + Math.PI / 4, pitchDeg: 13, radius: 120, target: [0, 2.8, 0] },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function stonehengeCinematicShotAt(rawT: number, aspect = 16 / 9): StonehengeCameraShot {
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
