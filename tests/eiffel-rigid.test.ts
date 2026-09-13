import { describe, expect, it } from 'vitest';
import {
  composeRigidPoses,
  interpolateRigidPose,
  invertRigidPose,
  rotateRigidVector,
  transformRigidPoint,
  transformedRigidBounds,
  type RigidPose,
  type RigidVec3,
} from '../src/engine/eiffelRigid';

const SQRT_HALF = Math.SQRT1_2;
const IDENTITY: RigidPose = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
const distance = (a: RigidVec3, b: RigidVec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('Eiffel rigid motion', () => {
  it('preserves exact normalized endpoint poses and clamps outside the route', () => {
    const from: RigidPose = { position: [3, 4, 5], quaternion: [0, 0, 0, 2] };
    const to: RigidPose = { position: [-7, 8, 9], quaternion: [0, SQRT_HALF, 0, SQRT_HALF] };
    expect(interpolateRigidPose(from, to, 0)).toEqual({ ...from, quaternion: [0, 0, 0, 1] });
    const final = interpolateRigidPose(from, to, 1);
    expect(final.position).toEqual(to.position);
    for (let axis = 0; axis < 4; axis += 1) expect(final.quaternion[axis]).toBeCloseTo(to.quaternion[axis]!, 15);
    expect(interpolateRigidPose(from, to, -2)).toEqual(interpolateRigidPose(from, to, 0));
    expect(interpolateRigidPose(from, to, 3)).toEqual(interpolateRigidPose(from, to, 1));
  });

  it('round-trips points and poses through inverse composition', () => {
    const pose: RigidPose = { position: [13, -4, 8], quaternion: [0.2, -0.3, 0.4, 0.7] };
    const point: RigidVec3 = [5, 2, -9];
    expect(distance(transformRigidPoint(invertRigidPose(pose), transformRigidPoint(pose, point)), point)).toBeLessThan(1e-12);
    const identity = composeRigidPoses(pose, invertRigidPose(pose));
    expect(distance(identity.position, [0, 0, 0])).toBeLessThan(1e-12);
    expect(distance(transformRigidPoint(identity, point), point)).toBeLessThan(1e-12);
  });

  it('rotates a beam 90 degrees and updates its bottom/contact extent', () => {
    const pose: RigidPose = { position: [0, 3, 0], quaternion: [0, 0, SQRT_HALF, SQRT_HALF] };
    expect(rotateRigidVector(pose.quaternion, [0, 2, 0])[0]).toBeCloseTo(-2, 12);
    const bounds = transformedRigidBounds(pose, [-0.5, -2, -0.5], [0.5, 2, 0.5]);
    expect(bounds.min[0]).toBeCloseTo(-2, 12);
    expect(bounds.max[0]).toBeCloseTo(2, 12);
    expect(bounds.min[1]).toBeCloseTo(2.5, 12);
    expect(bounds.max[1]).toBeCloseTo(3.5, 12);
  });

  it('preserves rigid distances densely and bounds all independently transformed corners', () => {
    const from: RigidPose = { position: [-12, 1, 8], quaternion: [0, 0, 0, 1] };
    const to: RigidPose = { position: [7, 31, -4], quaternion: [0.31, -0.12, 0.44, 0.83] };
    const min: RigidVec3 = [-2, -0.4, -1];
    const max: RigidVec3 = [3, 0.8, 2];
    for (let sample = 0; sample <= 500; sample += 1) {
      const pose = interpolateRigidPose(from, to, sample / 500);
      const a = transformRigidPoint(pose, [-2, 0, 0]);
      const b = transformRigidPoint(pose, [3, 0, 0]);
      expect(distance(a, b)).toBeCloseTo(5, 11);
      const bounds = transformedRigidBounds(pose, min, max);
      for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
        const corner = transformRigidPoint(pose, [x, y, z]);
        for (let axis = 0; axis < 3; axis += 1) {
          expect(corner[axis]).toBeGreaterThanOrEqual(bounds.min[axis] - 1e-12);
          expect(corner[axis]).toBeLessThanOrEqual(bounds.max[axis] + 1e-12);
        }
      }
    }
  });

  it('is deterministic under backward queries and handles antipodal quaternions without NaN', () => {
    const from: RigidPose = { position: [1, 2, 3], quaternion: [0, SQRT_HALF, 0, SQRT_HALF] };
    const antipodal: RigidPose = { position: [9, 8, 7], quaternion: [0, -SQRT_HALF, 0, -SQRT_HALF] };
    const expected = interpolateRigidPose(from, antipodal, 0.37);
    interpolateRigidPose(from, antipodal, 0.91);
    expect(interpolateRigidPose(from, antipodal, 0.37)).toEqual(expected);
    expect([...expected.position, ...expected.quaternion].every(Number.isFinite)).toBe(true);
    expect(distance(transformRigidPoint(expected, [2, 0, 0]), transformRigidPoint({ ...expected, quaternion: expected.quaternion.map(x => -x) as [number, number, number, number] }, [2, 0, 0]))).toBeLessThan(1e-12);
  });

  it('rejects zero and non-finite quaternions rather than producing invalid transforms', () => {
    expect(() => transformRigidPoint({ ...IDENTITY, quaternion: [0, 0, 0, 0] }, [0, 0, 0])).toThrow(/non-zero/);
    expect(() => transformRigidPoint({ ...IDENTITY, quaternion: [0, 0, 0, Number.NaN] }, [0, 0, 0])).toThrow(/finite/);
  });
});
