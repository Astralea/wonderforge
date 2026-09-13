import type { EiffelCameraShot } from './eiffelCamera';
import { EIFFEL_FIRST_FLOOR_Y } from './eiffelFirstFloorSupply';
import { EIFFEL_LONG_LOAD_FILM_DURATION, sampleEiffelLongLoadFilm } from './eiffelLongLoadFilm';
import type { RigidVec3 } from './eiffelRigid';

type Frame = 'load' | 'receiver' | 'fastening' | 'whole' | 'release' | 'hatch' | 'cart';
type Bounds = { min: RigidVec3; max: RigidVec3 };
const keys: readonly { seconds: number; frame: Frame }[] = [
  { seconds: 0, frame: 'load' }, { seconds: 104, frame: 'load' },
  { seconds: 112, frame: 'receiver' }, { seconds: 124, frame: 'receiver' },
  { seconds: 132, frame: 'fastening' }, { seconds: 152, frame: 'fastening' },
  { seconds: 158, frame: 'whole' }, { seconds: 166, frame: 'whole' },
  { seconds: 171, frame: 'release' }, { seconds: 182, frame: 'release' },
  { seconds: 188, frame: 'whole' }, { seconds: 196, frame: 'whole' },
  { seconds: 200, frame: 'hatch' }, { seconds: 206, frame: 'hatch' },
  { seconds: 212, frame: 'cart' }, { seconds: 280, frame: 'cart' },
];
const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
function frameAt(rawSeconds: number) {
  if (!Number.isFinite(rawSeconds)) throw new Error('Long-load camera time must be finite');
  const seconds = Math.max(0, Math.min(EIFFEL_LONG_LOAD_FILM_DURATION, rawSeconds));
  let a = keys[0]!, b = keys.at(-1)!;
  for (let i = 1; i < keys.length; i++) if (seconds <= keys[i]!.seconds) { a = keys[i - 1]!; b = keys[i]!; break; }
  return { seconds, a, b, progress: smooth((seconds - a.seconds) / Math.max(1e-9, b.seconds - a.seconds)) };
}

/** Deliberate work views: fastening and release show the relevant end of the
 * already established load; climbing and transport restore its whole height.
 * Blending the finite world boxes avoids a zoom jump when an actor changes role.
 */
export function eiffelLongLoadCameraBoundsAt(rawSeconds: number): Bounds {
  const { seconds, a, b, progress } = frameAt(rawSeconds);
  const sample = sampleEiffelLongLoadFilm(seconds);
  const [x, y, z] = sample.carrierOrigin;
  const floor = EIFFEL_FIRST_FLOOR_Y;
  const frameBounds = (frame: Frame): Bounds => {
    if (frame === 'load') return { min: [x - .7, y - .2, z - .7], max: [x + .7, y + 9.4, z + .7] };
    if (frame === 'receiver') return { min: [-25.7, floor - .15, -5.75], max: [-20, floor + 9.2, -2.25] };
    if (frame === 'fastening') return { min: [x - .85, floor - .15, z - 1.15], max: [x + .85, floor + 2.3, z + .85] };
    if (frame === 'release') return { min: [x - 1.45, floor + 5.45, z - 1.05], max: [x + .65, floor + 8.6, z + 1.05] };
    if (frame === 'hatch') return { min: [-22.6, floor - .15, -5.4], max: [-18.9, floor + 2.55, -2.4] };
    if (frame === 'cart') return { min: [x - 2.2, floor - 1.35, z - 1.1], max: [x + 2.9, floor + 7.8, z + 1.1] };
    return { min: [x - 2.2, floor - .15, z - 1.1], max: [x + 2.9, floor + 8.6, z + 1.1] };
  };
  const from = frameBounds(a.frame), to = frameBounds(b.frame);
  const blend = (left: RigidVec3, right: RigidVec3): RigidVec3 => [
    left[0] + (right[0] - left[0]) * progress,
    left[1] + (right[1] - left[1]) * progress,
    left[2] + (right[2] - left[2]) * progress,
  ];
  return { min: blend(from.min, to.min), max: blend(from.max, to.max) };
}

export function eiffelLongLoadCameraPointsAt(seconds: number): readonly RigidVec3[] {
  const { min, max } = eiffelLongLoadCameraBoundsAt(seconds);
  const points: RigidVec3[] = [];
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) points.push([x, y, z]);
  return points;
}

/** Keep the camera on the checked path through the tower's open interior, and
 * use the lens for work details instead of dollying through iron. The caller supplies
 * the same monotone global azimuth used by every other film chapter.
 */
export function eiffelLongLoadFilmShotAt(seconds: number, aspect = 16 / 9, azimuth = -42 * Math.PI / 180): EiffelCameraShot {
  const bounds = eiffelLongLoadCameraBoundsAt(seconds);
  const target: [number, number, number] = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const { a, b, progress } = frameAt(seconds);
  const pitchOf = (frame: Frame) => frame === 'fastening' || frame === 'hatch' ? 40 : frame === 'cart' ? 20 : 12;
  const radius = 16, pitch = (pitchOf(a.frame) + (pitchOf(b.frame) - pitchOf(a.frame)) * progress) * Math.PI / 180;
  const ca = Math.cos(azimuth), sa = Math.sin(azimuth), cp = Math.cos(pitch), sp = Math.sin(pitch);
  let tangent = Math.tan(6.5 * Math.PI / 360);
  for (const point of eiffelLongLoadCameraPointsAt(seconds)) {
    const dx = point[0] - target[0], dy = point[1] - target[1], dz = point[2] - target[2];
    const radial = ca * dx + sa * dz, depth = cp * radial + sp * dy;
    const right = -sa * dx + ca * dz, up = -sp * radial + cp * dy;
    tangent = Math.max(tangent, Math.abs(right) / ((radius - depth) * safeAspect * .82), Math.abs(up) / ((radius - depth) * .80));
  }
  return { target, azimuth, pitch, radius, fov: 2 * Math.atan(tangent) * 180 / Math.PI };
}
