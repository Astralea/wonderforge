import { describe, expect, it } from 'vitest';
import { sampleEiffelCrane, type EiffelCraneStation } from '../src/engine/eiffelCrane';
import { interpolateRigidPose, transformRigidPoint, type RigidPose, type RigidVec3 } from '../src/engine/eiffelRigid';

const STATION: EiffelCraneStation = { base: [2, 4, -3], mastHeight: 20, boomLength: 8 };
const LUGS: readonly RigidVec3[] = [[-1.5, 0.5, 0], [1.5, 0.5, 0]];

describe('bounded Eiffel creeper crane', () => {
  it('keeps fixed station geometry and exact sling endpoints during dense rigid motion', () => {
    const from: RigidPose = { position: [4, 6, -2], quaternion: [0, 0, 0, 1] };
    const to: RigidPose = { position: [6, 13, 0], quaternion: [0, Math.SQRT1_2, 0, Math.SQRT1_2] };
    for (let index = 0; index <= 500; index += 1) {
      const pose = interpolateRigidPose(from, to, index / 500);
      const sample = sampleEiffelCrane(STATION, pose, LUGS);
      const expectedLugs = LUGS.map(lug => transformRigidPoint(pose, lug));
      expect(sample.base).toEqual(STATION.base);
      expect(sample.pivot).toEqual([2, 24, -3]);
      expect(sample.lugs).toEqual(expectedLugs);
      expect(sample.hook[0]).toBeCloseTo((expectedLugs[0]![0] + expectedLugs[1]![0]) / 2, 12);
      expect(sample.hook[1]).toBeCloseTo(Math.max(expectedLugs[0]![1], expectedLugs[1]![1]) + 1.5, 12);
      expect(sample.hook[2]).toBeCloseTo((expectedLugs[0]![2] + expectedLugs[1]![2]) / 2, 12);
      const measuredBoom = Math.hypot(
        sample.boomTip[0] - sample.pivot[0],
        sample.boomTip[1] - sample.pivot[1],
        sample.boomTip[2] - sample.pivot[2],
      );
      expect(measuredBoom).toBeCloseTo(STATION.boomLength, 11);
      expect(sample.ropeLength).toBeGreaterThan(0);
      expect(sample.ropeLength).toBeCloseTo(sample.boomTip[1] - sample.hook[1], 12);
    }
  });

  it('is deterministic under backward queries', () => {
    const from: RigidPose = { position: [3, 7, -1], quaternion: [0, 0, 0, 1] };
    const to: RigidPose = { position: [6, 12, 1], quaternion: [0, 0.5, 0, 0.5] };
    const pose = interpolateRigidPose(from, to, 0.38);
    const expected = sampleEiffelCrane(STATION, pose, LUGS);
    sampleEiffelCrane(STATION, interpolateRigidPose(from, to, 0.91), LUGS);
    expect(sampleEiffelCrane(STATION, pose, LUGS)).toEqual(expected);
  });

  it('rejects the legacy 174m reach instead of clamping it', () => {
    const cargo: RigidPose = { position: [176, 5, -3], quaternion: [0, 0, 0, 1] };
    expect(() => sampleEiffelCrane(STATION, cargo, [[0, 0, 0]])).toThrow(/174\.000 m reach exceeds 8\.000 m boom/);
  });

  it('rejects a hook at or above the boom tip', () => {
    const cargo: RigidPose = { position: [2, 31, -3], quaternion: [0, 0, 0, 1] };
    expect(() => sampleEiffelCrane(STATION, cargo, [[0, 0, 0]], 1)).toThrow(/below the boom tip.*positive cable/);
  });

  it('rejects invalid stations, lugs and sling inputs explicitly', () => {
    const cargo: RigidPose = { position: [2, 5, -3], quaternion: [0, 0, 0, 1] };
    expect(() => sampleEiffelCrane({ ...STATION, mastHeight: 22.01 }, cargo, LUGS)).toThrow(/exceeds 22 m/);
    expect(() => sampleEiffelCrane({ ...STATION, boomLength: 8.41 }, cargo, LUGS)).toThrow(/exceeds 8.4 m/);
    expect(() => sampleEiffelCrane({ ...STATION, boomLength: 0 }, cargo, LUGS)).toThrow(/positive/);
    expect(() => sampleEiffelCrane(STATION, cargo, [])).toThrow(/at least one lift lug/);
    expect(() => sampleEiffelCrane(STATION, cargo, [[Number.NaN, 0, 0]])).toThrow(/lugs must be finite/);
    expect(() => sampleEiffelCrane(STATION, cargo, LUGS, 0)).toThrow(/sling rise.*positive/);
  });
});
