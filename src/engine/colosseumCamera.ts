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

// Authoring coordinates remain +X east / +Z north; the renderer converts this
// plan into its physical compass. Open southwest in morning light, travel
// around the west side, then settle northwest toward the eastern moonrise.
// The final viewing bearing is fixed during a gentle pullback; it never tracks a body.
// The low closing pitch keeps the rising disc below the film's top letterbox.
const SHOTS: ShotKeyframe[] = [
  { t: 0, azimuth: 3.55, pitchDeg: 10, radius: 336, target: [0, 6, 0] },
  { t: 0.16, azimuth: 3.42, pitchDeg: 14.4, radius: 322, target: [2, 10, 0] },
  { t: 0.32, azimuth: 3.28, pitchDeg: 15.2, radius: 308, target: [2, 16, 0] },
  { t: 0.48, azimuth: 3.12, pitchDeg: 16, radius: 318, target: [1, 22, 0] },
  { t: 0.62, azimuth: 2.94, pitchDeg: 13, radius: 338, target: [0, 26, 0] },
  { t: 0.70, azimuth: 2.78, pitchDeg: 9, radius: 350, target: [0, 27, 0] },
  { t: 0.78, azimuth: 2.66, pitchDeg: 5, radius: 358, target: [0, 27, 0] },
  { t: 0.84, azimuth: 2.59, pitchDeg: 4, radius: 370, target: [0, 25, 0] },
  { t: 1, azimuth: 2.59, pitchDeg: 4, radius: 392, target: [0, 24, 0] },
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
  const azimuth = lerp(from.azimuth, to.azimuth, from === to ? 1 : span);
  const fov = aspect < 0.72 ? 42 : 35;
  // Fit the projected ellipse to the real horizontal FOV. A capped scalar
  // compensation cropped the late west arcade on tall phone viewports.
  const projectedHalfWidth = Math.hypot(94 * Math.sin(azimuth), 78 * Math.cos(azimuth));
  const portraitFit = aspect < .72
    ? projectedHalfWidth * 1.16 / (Math.tan(fov * Math.PI / 360) * Math.max(.3, aspect))
    : 0;
  return {
    azimuth,
    pitch: (lerp(from.pitchDeg, to.pitchDeg, local) * Math.PI) / 180,
    radius: Math.max(lerp(from.radius, to.radius, local) * narrow, portraitFit),
    target: [
      lerp(from.target[0], to.target[0], local),
      lerp(from.target[1], to.target[1], local),
      lerp(from.target[2], to.target[2], local),
    ],
    fov,
  };
}
