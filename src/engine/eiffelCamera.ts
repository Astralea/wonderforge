import type { Vec3 } from '../data/constructionTypes';
import { clamp, easeInOutQuad } from './easing';

export interface EiffelCameraShot {
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

const DEG = Math.PI / 180;
const ORBIT_START = -75 * DEG;
const ORBIT_SWEEP = 125 * DEG;
/** Stage-end times derived from the manifest's 75 sixteen-part waves. */
export const EIFFEL_CAMERA_HEIGHT_MILESTONES = [
  [0, 4],
  [0.15466666666666667, 57], // stage 9: 10 / 75 waves
  [0.3152, 60], // stage 23: 24 / 75 waves
  [0.4298666666666666, 116], // stage 34: 34 / 75 waves
  [0.6477333333333334, 277], // stage 54: 53 / 75 waves
  [0.9, 312],
  [1, 312],
] as const;

/**
 * The camera makes a substantial Seine-to-Champ arc while the look height
 * follows the rising work. Azimuth is a single linear function of movie time:
 * it turns immediately, never reverses, and has no velocity changes at keys.
 */
const SHOTS: ShotKeyframe[] = [
  { t: 0, azimuth: ORBIT_START, pitchDeg: 24, radius: 260, target: [0, 24, 0] },
  { t: 0.15466666666666667, azimuth: ORBIT_START + ORBIT_SWEEP * 0.15466666666666667, pitchDeg: 22, radius: 270, target: [0, 30, 0] },
  { t: 0.3152, azimuth: ORBIT_START + ORBIT_SWEEP * 0.3152, pitchDeg: 20, radius: 300, target: [0, 42, 0] },
  { t: 0.4298666666666666, azimuth: ORBIT_START + ORBIT_SWEEP * 0.4298666666666666, pitchDeg: 17, radius: 350, target: [0, 68, 0] },
  { t: 0.6477333333333334, azimuth: ORBIT_START + ORBIT_SWEEP * 0.6477333333333334, pitchDeg: 13, radius: 570, target: [0, 146, 0] },
  { t: 0.90, azimuth: ORBIT_START + ORBIT_SWEEP * 0.90, pitchDeg: 11.5, radius: 608, target: [0, 158, 0] },
  { t: 1, azimuth: ORBIT_START + ORBIT_SWEEP, pitchDeg: 12, radius: 624, target: [0, 158, 0] },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function eiffelCinematicShotAt(rawT: number, aspect = 16 / 9, orbitT = rawT, azimuthOverride?: number): EiffelCameraShot {
  const t = clamp(rawT);
  const orbit = clamp(orbitT);
  let from = SHOTS[0]!;
  let to = SHOTS.at(-1)!;
  for (let index = 1; index < SHOTS.length; index += 1) {
    if (t <= SHOTS[index]!.t) {
      from = SHOTS[index - 1]!;
      to = SHOTS[index]!;
      break;
    }
  }
  const span = Math.max(1e-6, to.t - from.t);
  const p = (t - from.t) / span;
  const eased = easeInOutQuad(p);
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  // Vary the lens continuously through resize, then fit the actual frustum.
  const portraitBlend = clamp((1 - safeAspect) / 0.54);
  const shot: EiffelCameraShot = {
    azimuth: azimuthOverride ?? ORBIT_START + ORBIT_SWEEP * orbit,
    pitch: (lerp(from.pitchDeg, to.pitchDeg, eased) * Math.PI) / 180,
    radius: lerp(from.radius, to.radius, eased),
    target: [
      lerp(from.target[0], to.target[0], eased),
      lerp(from.target[1], to.target[1], eased),
      lerp(from.target[2], to.target[2], eased),
    ],
    fov: lerp(38, 50, portraitBlend),
  };
  // Follow the actual erection milestones instead of shrinking the opening to
  // fit ironwork that does not yet exist. Fourteen metres covers the active
  // assembly and its creeper crane above the highest built stage.
  let builtHeight: number = EIFFEL_CAMERA_HEIGHT_MILESTONES.at(-1)![1];
  for (let index = 1; index < EIFFEL_CAMERA_HEIGHT_MILESTONES.length; index += 1) {
    const fromHeight = EIFFEL_CAMERA_HEIGHT_MILESTONES[index - 1]!;
    const toHeight = EIFFEL_CAMERA_HEIGHT_MILESTONES[index]!;
    if (t <= toHeight[0]) {
      builtHeight = lerp(
        fromHeight[1],
        toHeight[1],
        (t - fromHeight[0]) / (toHeight[0] - fromHeight[0]),
      );
      break;
    }
  }
  const cosA = Math.cos(shot.azimuth);
  const sinA = Math.sin(shot.azimuth);
  const cosP = Math.cos(shot.pitch);
  const sinP = Math.sin(shot.pitch);
  const tanY = Math.tan((shot.fov * Math.PI) / 360);
  const tanX = tanY * safeAspect;
  for (const x of [-65, 65]) {
    for (const z of [-65, 65]) {
      for (const y of [0, builtHeight + 14]) {
        const dy = y - shot.target[1];
        const radial = cosA * x + sinA * z;
        const depth = cosP * radial + sinP * dy;
        const right = -sinA * x + cosA * z;
        const up = -sinP * radial + cosP * dy;
        shot.radius = Math.max(
          shot.radius,
          depth + Math.abs(right) / (tanX * 0.9),
          depth + Math.abs(up) / (tanY * 0.86),
        );
      }
    }
  }
  return shot;
}
