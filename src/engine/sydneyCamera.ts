import type { Vec3 } from '../data/constructionTypes';
import { clamp, easeInOutQuad } from './easing';
import { SYDNEY_CONSTRUCTION } from '../data/sydneyConstruction';
import { sydneyPartStateAt, sydneySourcePose, sydneyStagingPose } from './sydneyConstruction';

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

/** Cross the open northern harbour from Farm Cove to the photographed western
 * elevation. The final north-west view reveals the projecting glass foyers. */
const SHOTS: ShotKeyframe[] = [
  { t: 0, azimuth: -0.25, pitchDeg: 21.4, radius: 540, target: [0, 16, 0] },
  { t: 0.5, azimuth: -1.3, pitchDeg: 23, radius: 500, target: [0, 28, 0] },
  { t: 1, azimuth: -2.35, pitchDeg: 23, radius: 410, target: [0, 25, 0] },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const YARD_HERO = SYDNEY_CONSTRUCTION.parts.find(
  (p) => p.id === 'rib-3--1-4-4',
)!;
export const SYDNEY_YARD_SHOT = {
  from: YARD_HERO.start - 0.13,
  closeFrom: YARD_HERO.start - 0.01,
  closeUntil: YARD_HERO.start + YARD_HERO.duration * 0.25,
  until: YARD_HERO.start + YARD_HERO.duration * 1.9,
};
export function sydneyYardShotWeight(t: number): number {
  const smooth = (u: number) => {
    const v = clamp(u);
    return v * v * v * (v * (v * 6 - 15) + 10);
  };
  return (
    smooth(
      (t - SYDNEY_YARD_SHOT.from) /
        (SYDNEY_YARD_SHOT.closeFrom - SYDNEY_YARD_SHOT.from),
    ) *
    (1 -
      smooth(
        (t - SYDNEY_YARD_SHOT.closeUntil) /
          (SYDNEY_YARD_SHOT.until - SYDNEY_YARD_SHOT.closeUntil),
      ))
  );
}

export function sydneyCinematicShotAt(
  rawT: number,
  aspect = 16 / 9,
): SydneyCameraShot {
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
  const narrow = Math.pow(clamp(1.78 / Math.max(0.3, aspect), 1, 2.05), 0.64);
  const shot = {
    azimuth: lerp(from.azimuth, to.azimuth, from === to ? 1 : span),
    pitch: (lerp(from.pitchDeg, to.pitchDeg, local) * Math.PI) / 180,
    radius: lerp(from.radius, to.radius, local) * narrow,
    target: [
      lerp(from.target[0], to.target[0], local),
      lerp(from.target[1], to.target[1], local),
      lerp(from.target[2], to.target[2], local),
    ] as Vec3,
    fov: aspect < 0.72 ? 42 : 35,
  };
  const weight = sydneyYardShotWeight(t);
  const source = sydneySourcePose(YARD_HERO),
    stage = sydneyStagingPose(YARD_HERO);
  const yard: Vec3 = [
    (source[0] + stage[0]) / 2,
    8,
    (source[2] + stage[2]) / 2,
  ];
  const localHero = (t - YARD_HERO.start) / YARD_HERO.duration;
  const focusU = clamp((localHero - 0.25) / 0.3);
  const focus = focusU * focusU * (3 - 2 * focusU);
  // Anticipate the lift over a symmetric three-second window. Directly locking
  // the lens to a timelapse crane load would reproduce its accelerated jerks.
  const loadTarget: Vec3 = [0, 0, 0];
  for (let i = -10; focus > 0 && weight > 0 && i <= 10; i++) {
    const load = sydneyPartStateAt(YARD_HERO, SYDNEY_CONSTRUCTION.routes[0]!, t + i * 0.0025);
    for (let axis = 0; axis < 3; axis++) loadTarget[axis]! += load.position[axis]! / 21;
  }
  const workTarget = yard.map((v, i) =>
    lerp(v, loadTarget[i]!, focus),
  ) as Vec3;
  const workRadius = aspect < 0.72 ? lerp(165, 280, focus) : lerp(150, 200, focus);
  shot.radius = lerp(shot.radius, workRadius, weight);
  if (aspect < 0.72) shot.fov = lerp(shot.fov, 58, focus * weight);
  // Look across the southern yard from its open east side; a northern close
  // view would put the newly completed podium between the camera and workers.
  shot.azimuth = lerp(shot.azimuth, 0.18, weight);
  shot.pitch = lerp(shot.pitch, (23 * Math.PI) / 180, weight);
  shot.target = shot.target.map((v, i) => lerp(v, workTarget[i]!, weight)) as Vec3;
  return shot;
}
