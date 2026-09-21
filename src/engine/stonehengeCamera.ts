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
  { t: 0, azimuth: 0.78, pitchDeg: 16, radius: 100, target: [5, 1.8, 14] },
  { t: 0.075, azimuth: 1.35, pitchDeg: 16, radius: 78, target: [1, 2.3, -2] },
  { t: 0.12, azimuth: 1.62, pitchDeg: 16, radius: 82, target: [0, 2.4, 1] },
  { t: 0.20, azimuth: 2.10, pitchDeg: 16.5, radius: 80, target: [3, 3.2, -3] },
  { t: 0.32, azimuth: 2.62, pitchDeg: 16.5, radius: 94, target: [1, 2.5, 2] },
  { t: 0.58, azimuth: 3.82, pitchDeg: 16, radius: 96, target: [8, 2.4, 4] },
  { t: 0.68, azimuth: 4.03, pitchDeg: 16.5, radius: 92, target: [-10, 2.9, -13] },
  { t: 0.78, azimuth: Math.PI * 2 + Math.PI / 4, pitchDeg: 10.2, radius: 112, target: [0, 2.55, 0] },
  { t: 0.92, azimuth: Math.PI * 2 + Math.PI / 4, pitchDeg: 9.6, radius: 116, target: [0, 2.45, 0] },
  { t: 1, azimuth: Math.PI * 2 + Math.PI / 4, pitchDeg: 9.2, radius: 122, target: [0, 2.35, 0] },
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
  // The 35° view needs more sky below the permanent 6vh letterbox. Ease this
  // camera-only correction into the existing approach; the accepted 42°
  // portrait composition and the solstice direction remain unchanged.
  const letterboxPitchCorrection = aspect < 0.72 ? 0
    : 2.3 * easeInOutQuad((t - 0.68) / (0.78 - 0.68));
  return {
    azimuth: lerp(from.azimuth, to.azimuth, local),
    pitch: ((lerp(from.pitchDeg, to.pitchDeg, local) - letterboxPitchCorrection) * Math.PI) / 180,
    radius: lerp(from.radius, to.radius, local) * narrow,
    target: [
      lerp(from.target[0], to.target[0], local),
      lerp(from.target[1], to.target[1], local),
      lerp(from.target[2], to.target[2], local),
    ],
    fov: aspect < 0.72 ? 42 : 35,
  };
}
