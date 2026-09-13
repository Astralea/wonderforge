import { describe, expect, it } from 'vitest';
import { sampleEiffelGroundLiftPilot } from '../src/engine/eiffelGroundLiftPilot';
import { sampleEiffelGroundRiggers, type EiffelGroundRiggerArm } from '../src/engine/eiffelGroundRiggers';
import { eiffelTerrainHeightAt } from '../src/engine/eiffelTerrain';
import type { RigidVec3 as V } from '../src/engine/eiffelRigid';

const distance = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const mix = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const workingArm = (index: number, arms: { left: EiffelGroundRiggerArm; right: EiffelGroundRiggerArm }) => index === 0 ? arms.left : arms.right;

describe('Eiffel ground slingers', () => {
  it('plants two persistent workers at the pickup station rather than following the lifted member', () => {
    const anchor = sampleEiffelGroundRiggers(0);
    for (const seconds of [0, 8, 12, 14, 14.4, 20, 40, 55]) {
      const sample = sampleEiffelGroundRiggers(seconds);
      expect(sample.workers.map(worker => worker.id)).toEqual(['ground-slinger-north', 'ground-slinger-south']);
      sample.workers.forEach((worker, index) => {
        expect(worker.leftFoot.center[0]).toBe(anchor.workers[index]!.leftFoot.center[0]);
        expect(worker.leftFoot.center[2]).toBe(anchor.workers[index]!.leftFoot.center[2]);
        expect(worker.rightFoot.center[2]).toBe(anchor.workers[index]!.rightFoot.center[2]);
      });
    }
  });

  it('keeps human-scale limb lengths and foot bottoms on sampled terrain', () => {
    for (let seconds = 0; seconds <= 55; seconds += .05) for (const worker of sampleEiffelGroundRiggers(seconds).workers) {
      for (const arm of [worker.arms.left, worker.arms.right]) {
        expect(distance(arm.shoulder, arm.elbow)).toBeCloseTo(.38, 9);
        expect(distance(arm.elbow, arm.hand)).toBeCloseTo(.4, 9);
      }
      for (const foot of [worker.leftFoot, worker.rightFoot]) expect(foot.center[1] - foot.size[1] / 2).toBeCloseTo(eiffelTerrainHeightAt(foot.center[0], foot.center[2]), 10);
      expect(Math.abs(worker.leftFoot.center[2] - worker.rightFoot.center[2])).toBeGreaterThan((worker.leftFoot.size[2] + worker.rightFoot.size[2]) / 2);
      for (const leg of [worker.leftLeg, worker.rightLeg]) expect(leg.start.every(Number.isFinite) && leg.joint.every(Number.isFinite) && leg.end.every(Number.isFinite)).toBe(true);
    }
  });

  it('puts actual hands on the loose ends and pickup lugs without label-only residuals', () => {
    for (const seconds of [13, 13.25, 13.5, 13.75, 13.9, 13.999]) {
      const crew = sampleEiffelGroundRiggers(seconds), lift = sampleEiffelGroundLiftPilot(seconds);
      crew.workers.forEach((worker, index) => {
        const hand = workingArm(index, worker.arms).hand, looseEnd = lift.rigging.slings[index]!.points[2];
        expect(worker.contact.kind).toBe('loose-sling-end');
        expect(distance(hand, looseEnd)).toBeLessThan(1e-10);
        expect(distance(hand, worker.contact.target!)).toBeLessThan(1e-10);
        expect(worker.contact.residual).toBe(0);
      });
    }
    const crew = sampleEiffelGroundRiggers(14), lift = sampleEiffelGroundLiftPilot(14);
    crew.workers.forEach((worker, index) => {
      expect(worker.contact.kind).toBe('pickup-lug');
      expect(distance(workingArm(index, worker.arms).hand, lift.rigging.lugs[index]!)).toBeLessThan(1e-10);
    });
  });

  it('approaches and releases continuously, then remains visibly clear beside the cart', () => {
    for (const boundary of [12, 13, 14, 14.6, 14.8]) {
      const before = sampleEiffelGroundRiggers(boundary - 1e-5), after = sampleEiffelGroundRiggers(boundary + 1e-5);
      before.workers.forEach((worker, index) => {
        expect(distance(workingArm(index, worker.arms).hand, workingArm(index, after.workers[index]!.arms).hand)).toBeLessThan(1e-3);
        expect(distance(worker.shoulderCenter, after.workers[index]!.shoulderCenter)).toBeLessThan(1e-3);
      });
    }
    for (const seconds of [14.01, 14.3, 14.59, 14.8, 20, 55]) expect(sampleEiffelGroundRiggers(seconds).workers.every(worker => worker.contact.kind === 'none')).toBe(true);
  });

  it('keeps rendered bodies and non-contact limbs out of the carrier bed', () => {
    const bed = sampleEiffelGroundLiftPilot(14).carrier;
    const min: V = [bed.bedPose.position[0] - bed.bedSize[0] / 2, bed.bedPose.position[1] - bed.bedSize[1] / 2, bed.bedPose.position[2] - bed.bedSize[2] / 2];
    const max: V = [bed.bedPose.position[0] + bed.bedSize[0] / 2, bed.bedTopY, bed.bedPose.position[2] + bed.bedSize[2] / 2];
    const outsideBed = (point: V, radius: number) => point[0] - radius >= max[0] || point[0] + radius <= min[0] || point[1] - radius >= max[1] || point[1] + radius <= min[1] || point[2] - radius >= max[2] || point[2] + radius <= min[2];
    for (let seconds = 0; seconds <= 55; seconds += .025) sampleEiffelGroundRiggers(seconds).workers.forEach((worker, index) => {
      for (let i = 0; i <= 40; i++) expect(outsideBed(mix(worker.torso[0], worker.torso[1], i / 40), .16)).toBe(true);
      expect(outsideBed(worker.head.center, .12)).toBe(true);
      for (const leg of [worker.leftLeg, worker.rightLeg]) for (const segment of [[leg.start, leg.joint], [leg.joint, leg.end]] as const) for (let i = 0; i <= 20; i++) expect(outsideBed(mix(segment[0], segment[1], i / 20), .055)).toBe(true);
      const idle = index === 0 ? worker.arms.right : worker.arms.left;
      for (const segment of [[idle.shoulder, idle.elbow], [idle.elbow, idle.hand]] as const) for (let i = 0; i <= 20; i++) expect(outsideBed(mix(segment[0], segment[1], i / 20), .045)).toBe(true);
      const active = workingArm(index, worker.arms);
      for (const segment of [[active.shoulder, active.elbow], [active.elbow, active.hand]] as const) for (let i = 0; i <= 20; i++) {
        const point = mix(segment[0], segment[1], i / 20);
        expect(outsideBed(point, .045) || point[1] - .045 >= bed.bedTopY).toBe(true);
      }
    });
  }, 15000);

  it('is deterministic for backward queries and rejects non-finite time', () => {
    const later = sampleEiffelGroundRiggers(14.3), earlier = sampleEiffelGroundRiggers(13.4);
    expect(sampleEiffelGroundRiggers(14.3)).toEqual(later);
    expect(sampleEiffelGroundRiggers(13.4)).toEqual(earlier);
    expect(() => sampleEiffelGroundRiggers(Number.NaN)).toThrow(/finite/);
  }, 15_000);
});
