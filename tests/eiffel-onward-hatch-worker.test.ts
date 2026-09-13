import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import design from '../artifacts/eiffel-long-load-onward-2026-09-08/design.json';
import { sampleEiffelOnwardHatchWorker } from '../src/engine/eiffelOnwardHatchWorker';
import { eiffelLongLoadWorkerRig, eiffelLongLoadWorkerRoles } from '../src/engine/eiffelLongLoadWorkerPose';
const F = design.floorY;
const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(...a.map((v, i) => v - b[i]!));
const angleAt = (seconds: number) => { const t = Math.max(0, Math.min(1, (seconds - 198) / 8)); return Math.PI / 2 * (1 - t * t * (3 - 2 * t)); };

describe('continuous hatch operator on the actual handle arc', () => {
  it('keeps both hands on the separately transformed physical handle grips', () => {
    for (let seconds = 0; seconds <= 280; seconds += .1) {
      const worker = sampleEiffelOnwardHatchWorker(seconds);
      for (let i = 0; i < 2; i++) {
        const local = new Vector3(...design.hatch.handleCenter as [number, number, number]);
        local.z += (i === 0 ? -1 : 1) * .10;
        local.applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angleAt(seconds)));
        local.add(new Vector3(...design.hatch.pivot as [number, number, number]));
        expect(distance(worker.hands[i]!, local.toArray())).toBeLessThan(1e-10);
        expect(worker.contacts[i]!.active).toBe(true);
      }
    }
  });
  it('alternates real foot swings while at least one sole remains planted and stationary', () => {
    let previous = sampleEiffelOnwardHatchWorker(198);
    const swung = new Set<number>();
    for (let i = 1; i <= 1600; i++) {
      const worker = sampleEiffelOnwardHatchWorker(198 + i / 200);
      expect(worker.feet.some(foot => Math.abs(foot[1] - F) < 1e-12)).toBe(true);
      worker.feet.forEach((foot, index) => {
        expect(foot[1]).toBeGreaterThanOrEqual(F);
        if (foot[1] > F + 1e-8) swung.add(index);
        if (Math.abs(foot[1] - F) < 1e-12 && Math.abs(previous.feet[index]![1] - F) < 1e-12)
          expect(distance(foot, previous.feet[index]!)).toBeLessThan(1e-10);
      });
      previous = worker;
    }
    expect([...swung].sort()).toEqual([0, 1]);
    for (const foot of previous.feet) expect(foot[1]).toBe(F);
  });
  it('has a connected fixed-size rig at every film time and throughout dense hatch motion', () => {
    const times = [...Array.from({ length: 561 }, (_, i) => i / 2), ...Array.from({ length: 1601 }, (_, i) => 198 + i / 200)];
    for (const seconds of times) {
      const worker = sampleEiffelOnwardHatchWorker(seconds), rig = eiffelLongLoadWorkerRig(worker);
      const roles = eiffelLongLoadWorkerRoles('hatch-worker', worker);
      expect(roles).toHaveLength(18);
      for (let i = 0; i < 2; i++) {
        expect(distance(rig.shoulders[i]!, rig.elbows[i]!)).toBeCloseTo(.31, 9);
        expect(distance(rig.elbows[i]!, worker.hands[i]!)).toBeCloseTo(.31, 9);
        expect(distance(rig.ankles[i]!, rig.knees[i]!)).toBeCloseTo(.43, 9);
        expect(distance(rig.knees[i]!, rig.hips[i]!)).toBeCloseTo(.44, 9);
      }
    }
  });
  it('keeps targets and connected body poses continuous through all step and phase joins', () => {
    for (let seconds = 198; seconds <= 206; seconds++) {
      const a = sampleEiffelOnwardHatchWorker(seconds - 1e-5), b = sampleEiffelOnwardHatchWorker(seconds + 1e-5);
      for (const field of ['feet', 'hands'] as const) a[field].forEach((point, i) => expect(distance(point, b[field][i]!)).toBeLessThan(1e-4));
      const left = eiffelLongLoadWorkerRoles('hatch-worker', a), right = eiffelLongLoadWorkerRoles('hatch-worker', b);
      left.forEach((part, i) => expect(distance(part.position, right[i]!.position), part.role).toBeLessThan(.001));
    }
    let previous = eiffelLongLoadWorkerRoles('hatch-worker', sampleEiffelOnwardHatchWorker(198));
    for (let i = 1; i <= 1600; i++) {
      const next = eiffelLongLoadWorkerRoles('hatch-worker', sampleEiffelOnwardHatchWorker(198 + i / 200));
      next.forEach((part, j) => expect(distance(part.position, previous[j]!.position), `${i}:${part.role}`).toBeLessThan(.025));
      previous = next;
    }
  });
  it('preserves waiting and finished poses instead of resetting and is deterministic on reverse seeks', () => {
    const start = sampleEiffelOnwardHatchWorker(198), end = sampleEiffelOnwardHatchWorker(206);
    for (const seconds of [0, 128, 190, 197.99]) {
      const worker = sampleEiffelOnwardHatchWorker(seconds);
      expect(worker.feet).toEqual(start.feet); expect(worker.hands).toEqual(start.hands);
    }
    for (const seconds of [206, 212, 242, 280, 500]) expect(sampleEiffelOnwardHatchWorker(seconds)).toEqual(end);
    const middle = sampleEiffelOnwardHatchWorker(202.3);
    sampleEiffelOnwardHatchWorker(280); sampleEiffelOnwardHatchWorker(0);
    expect(sampleEiffelOnwardHatchWorker(202.3)).toEqual(middle);
    for (const bad of [NaN, Infinity, -Infinity]) expect(() => sampleEiffelOnwardHatchWorker(bad)).toThrow(/finite/);
  });
});
