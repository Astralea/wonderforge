import type { EiffelCameraShot } from './eiffelCamera';
import type { RigidVec3 as V } from './eiffelRigid';
import { EIFFEL_RELAY_HANDOFF_SEQUENCE_DURATION as HANDOFF } from './eiffelRelayHandoffSequence';
import { sampleEiffelSecondFloorRelaySequence } from './eiffelSecondFloorRelaySequence';

type Frame = 'whole' | 'connection' | 'fastening' | 'load' | 'receiver' | 'landing';
type Bounds = { min: V; max: V };
const FLOOR = 57.94000244140625;
const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
const keys: readonly { seconds: number; frame: Frame }[] = [
  { seconds: 0, frame: 'whole' }, { seconds: 38, frame: 'whole' },
  { seconds: 46, frame: 'connection' }, { seconds: 64, frame: 'connection' },
  { seconds: 74, frame: 'whole' }, { seconds: 104, frame: 'whole' },
  { seconds: 116, frame: 'fastening' }, { seconds: HANDOFF - 12, frame: 'fastening' },
  { seconds: HANDOFF, frame: 'load' }, { seconds: HANDOFF + 90, frame: 'load' },
  { seconds: HANDOFF + 106, frame: 'receiver' }, { seconds: HANDOFF + 114, frame: 'receiver' },
  { seconds: HANDOFF + 120, frame: 'landing' }, { seconds: HANDOFF + 126, frame: 'landing' },
];

/** Follow the actual retained load, with readable views of the two handoffs. */
export function eiffelSecondFloorRelayCameraPointsAt(rawSeconds: number): readonly V[] {
  if (!Number.isFinite(rawSeconds)) throw Error('Relay camera time must be finite');
  const seconds = Math.max(0, Math.min(HANDOFF + 126, rawSeconds));
  const sample = sampleEiffelSecondFloorRelaySequence(seconds);
  const [x, y, z] = sample.carrierPose.position;
  const box = (frame: Frame): Bounds => {
    if (frame === 'whole') return { min: [-10.3, FLOOR - .15, -5.1], max: [-6.4, FLOOR + 8.5, -2.9] };
    if (frame === 'connection') return { min: [-9.1, FLOOR + 5.5, -5.1], max: [-6.7, FLOOR + 8.3, -2.9] };
    if (frame === 'fastening') return { min: [-10.15, FLOOR - .15, -5.0], max: [-7.65, FLOOR + 2.25, -3.08] };
    if (frame === 'landing') return { min: [-16.8, 116.0, -3.4], max: [-13.2, 118.4, -.2] };
    if (frame === 'receiver') return { min: [-19.5, Math.min(y - .2, 116.0), -6.0], max: [-7, 126.7, 2.0] };
    return { min: [x - 1.2, y - .2, z - 1.2], max: [x + 1.2, y + 8.5, z + 1.2] };
  };
  let a = keys[0]!, b = keys.at(-1)!;
  for (let i = 1; i < keys.length; i++) if (seconds <= keys[i]!.seconds) { a = keys[i - 1]!; b = keys[i]!; break; }
  const t = smooth((seconds - a.seconds) / Math.max(1e-9, b.seconds - a.seconds));
  const left = box(a.frame), right = box(b.frame);
  const mix = (a: V, b: V): V => a.map((v, i) => v + (b[i]! - v) * t) as unknown as V;
  const min = mix(left.min, right.min), max = mix(left.max, right.max), points: V[] = [];
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) points.push([x, y, z]);
  return points;
}

export function eiffelSecondFloorRelayFilmShotAt(seconds: number, aspect = 16 / 9, azimuth = 95 * Math.PI / 180): EiffelCameraShot {
  const points = eiffelSecondFloorRelayCameraPointsAt(seconds);
  const target = [0, 1, 2].map(i => (Math.min(...points.map(p => p[i]!)) + Math.max(...points.map(p => p[i]!))) / 2) as [number, number, number];
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const landing = smooth((seconds - (HANDOFF + 114)) / 6);
  const radius = 62 - 36 * landing, pitch = (10 + 35 * landing) * Math.PI / 180;
  const ca = Math.cos(azimuth), sa = Math.sin(azimuth), cp = Math.cos(pitch), sp = Math.sin(pitch);
  let tangent = Math.tan(2 * Math.PI / 360);
  for (const p of points) {
    const dx = p[0] - target[0], dy = p[1] - target[1], dz = p[2] - target[2];
    const radial = ca * dx + sa * dz, depth = cp * radial + sp * dy;
    tangent = Math.max(tangent, Math.abs(-sa * dx + ca * dz) / ((radius - depth) * safeAspect * .80), Math.abs(-sp * radial + cp * dy) / ((radius - depth) * .80));
  }
  return { target, radius, pitch, azimuth, fov: 2 * Math.atan(tangent) * 180 / Math.PI };
}
