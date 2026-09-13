import { describe, expect, it } from 'vitest';
import {
  EIFFEL_SUMMIT_GIN_POLE_CLIMB_DURATION,
  EIFFEL_SUMMIT_GIN_POLE_END_Y,
  EIFFEL_SUMMIT_GIN_POLE_LENGTH,
  EIFFEL_SUMMIT_GIN_POLE_START_Y,
  sampleEiffelSummitGinPoleClimb,
} from '../src/engine/eiffelSummitGinPoleClimb';

const moving = (seconds: number) =>
  (seconds >= 9 && seconds < 14) ||
  (seconds >= 20 && seconds < 27) ||
  (seconds >= 32 && seconds < 60);

describe('Eiffel supported summit gin-pole climb candidate', () => {
  it('uses the authored holds and exact pole endpoints without a relocation jump', () => {
    const expected = [
      [0, 300.9, 'prepare'],
      [5, 300.9, 'open-old-lower'],
      [9, 300.9, 'lift-to-new-upper'],
      [14, 301.3, 'latch-new-upper'],
      [20, 301.3, 'lift-to-old-upper-release'],
      [27, 302, 'open-old-upper'],
      [32, 302, 'final-lift'],
      [60, 305.566667, 'lock-and-unload'],
      [66, 305.566667, 'park'],
      [70, 305.566667, 'park'],
    ] as const;
    for (const [seconds, y, phase] of expected) {
      const sample = sampleEiffelSummitGinPoleClimb(seconds);
      expect(sample.poleBottomY).toBeCloseTo(y, 9);
      expect(sample.phase).toBe(phase);
      expect(sample.polePose.position).toEqual([-0.9, sample.poleBottomY, 0]);
      expect(sample.sourceRootPose.position).toEqual([0, sample.poleBottomY, 0]);
      expect(sample.sourceRootTranslation).toEqual([
        0,
        sample.poleBottomY - EIFFEL_SUMMIT_GIN_POLE_START_Y,
        0,
      ]);
      expect(sample.jibPose.position[1] - sample.polePose.position[1]).toBe(
        EIFFEL_SUMMIT_GIN_POLE_LENGTH,
      );
    }
    expect(sampleEiffelSummitGinPoleClimb(-1).poleBottomY).toBe(
      EIFFEL_SUMMIT_GIN_POLE_START_Y,
    );
    expect(sampleEiffelSummitGinPoleClimb(80).poleBottomY).toBe(
      EIFFEL_SUMMIT_GIN_POLE_END_Y,
    );
  });

  it('keeps at least two installed and positively latched guides engaged during every lift', () => {
    for (let frame = 0; frame <= EIFFEL_SUMMIT_GIN_POLE_CLIMB_DURATION * 240; frame++) {
      const seconds = frame / 240;
      const sample = sampleEiffelSummitGinPoleClimb(seconds);
      if (moving(seconds)) {
        expect(sample.driveLoaded, `${seconds}s drive`).toBe(true);
        expect(sample.engagedGuideCount, `${seconds}s guides`).toBeGreaterThanOrEqual(2);
        for (const id of sample.engagedGuideIds) {
          const guide = sample.guides.find((candidate) => candidate.id === id)!;
          expect(guide.installed).toBe(true);
          expect(guide.latched).toBe(true);
          expect(guide.hingePinInsertion).toBe(1);
          expect(guide.keeperClosure).toBe(1);
        }
      }
    }
    expect(sampleEiffelSummitGinPoleClimb(10).engagedGuideIds).toEqual([
      'old-upper',
      'new-lower',
    ]);
    expect(sampleEiffelSummitGinPoleClimb(33).engagedGuideIds).toEqual([
      'new-lower',
      'new-upper',
    ]);
  });

  it('orders keeper, pin and full-frame motion around stationary holds', () => {
    const guide = (seconds: number, id: string) =>
      sampleEiffelSummitGinPoleClimb(seconds).guides.find((item) => item.id === id)!;
    expect(guide(5, 'old-lower').keeperClosure).toBe(1);
    expect(guide(6, 'old-lower').keeperClosure).toBe(0);
    expect(guide(7, 'old-lower').hingePinInsertion).toBe(0);
    expect(guide(9, 'old-lower').angle).toBeCloseTo(Math.PI / 2, 12);
    expect(guide(14, 'new-upper').angle).toBeCloseTo(Math.PI / 2, 12);
    expect(guide(18, 'new-upper').angle).toBe(0);
    expect(guide(19, 'new-upper').hingePinInsertion).toBe(1);
    expect(guide(20, 'new-upper').keeperClosure).toBe(1);
    expect(guide(32, 'old-upper').angle).toBeCloseTo(Math.PI / 2, 12);
    for (const seconds of [5.5, 6.5, 8, 16, 18.5, 19.5, 28, 29.5, 31]) {
      const sample = sampleEiffelSummitGinPoleClimb(seconds);
      expect(sample.poleBottomY).toBeCloseTo(
        seconds < 14 ? 300.9 : seconds < 27 ? 301.3 : 302,
        9,
      );
    }
  });

  it('keeps guide leaves normalized and symmetrically hinged', () => {
    for (let seconds = 0; seconds <= 70; seconds += 0.125) {
      for (const guide of sampleEiffelSummitGinPoleClimb(seconds).guides) {
        const [a, b] = guide.leafQuaternions;
        expect(Math.hypot(...a)).toBeCloseTo(1, 12);
        expect(Math.hypot(...b)).toBeCloseTo(1, 12);
        expect(a[1]).toBeCloseTo(-b[1], 12);
        expect(a[3]).toBeCloseTo(b[3], 12);
        expect(guide.hinge).toEqual([-0.4, guide.centerY, 0]);
      }
    }
  });

  it('conserves the manual-winch span/takeup identity and respects crank speed', () => {
    const initial = sampleEiffelSummitGinPoleClimb(0);
    let previousTakeup = -Infinity;
    for (let frame = 0; frame <= 70 * 120; frame++) {
      const sample = sampleEiffelSummitGinPoleClimb(frame / 120);
      expect(sample.drive.span + sample.drive.takeup).toBeCloseTo(
        initial.drive.span,
        12,
      );
      expect(sample.drive.crankAngle).toBeCloseTo(
        sample.drive.crankRevolutions * Math.PI * 2,
        12,
      );
      expect(sample.drive.crankSpeedRps).toBeLessThanOrEqual(1 + 1e-12);
      expect(sample.drive.takeup).toBeGreaterThanOrEqual(previousTakeup - 1e-12);
      previousTakeup = sample.drive.takeup;
    }
    expect(sampleEiffelSummitGinPoleClimb(70).drive.takeup).toBeCloseTo(
      EIFFEL_SUMMIT_GIN_POLE_END_Y - EIFFEL_SUMMIT_GIN_POLE_START_Y,
      12,
    );
    expect(sampleEiffelSummitGinPoleClimb(46).drive.crankSpeedRps).toBeCloseTo(
      0.869,
      2,
    );
  });

  it('exposes the complete fixed reeving and variable vertical rope without smoothing its arcs', () => {
    const start = sampleEiffelSummitGinPoleClimb(0).drive;
    const end = sampleEiffelSummitGinPoleClimb(70).drive;
    expect(start.rope.radius).toBe(0.006);
    expect(start.rope.fixedPoints[0]).toEqual([0.25, 306.98, -0.12]);
    expect(start.rope.fixedPoints.at(-1)).toEqual([-1.1, 307.2, 0.34]);
    expect(start.rope.points.at(-1)![0]).toBe(-1.1);
    expect(start.rope.points.at(-1)![1]).toBeCloseTo(300.98, 12);
    expect(start.rope.points.at(-1)![2]).toBe(0.34);
    expect(end.rope.points.at(-1)![0]).toBe(-1.1);
    expect(end.rope.points.at(-1)![1]).toBeCloseTo(305.646667, 12);
    expect(end.rope.points.at(-1)![2]).toBe(0.34);
    expect(end.rope.fixedPoints).toEqual(start.rope.fixedPoints);
    const length = (points: readonly (readonly number[])[]) =>
      points.slice(1).reduce((sum, point, index) => {
        const prior = points[index]!;
        return sum + Math.hypot(point[0]! - prior[0]!, point[1]! - prior[1]!, point[2]! - prior[2]!);
      }, 0);
    expect(length(start.rope.fixedPoints)).toBeCloseTo(start.rope.fixedLength, 12);
    expect(length(start.rope.points)).toBeCloseTo(start.rope.freeLength, 12);
    expect(start.rope.freeLength - end.rope.freeLength).toBeCloseTo(
      EIFFEL_SUMMIT_GIN_POLE_END_Y - EIFFEL_SUMMIT_GIN_POLE_START_Y,
      12,
    );
    expect(start.rope.deployedLength).toBeCloseTo(6.22, 12);
    expect(end.rope.deployedLength).toBeCloseTo(1.553333, 12);
    for (const point of start.rope.fixedPoints.slice(2, 14))
      expect(Math.hypot(point[1] - 307.04, point[2] - 0.28)).toBeCloseTo(0.06, 12);
    for (const point of start.rope.fixedPoints.slice(15, 27))
      expect(Math.hypot(point[0] - 0.19, point[1] - 307.22)).toBeCloseTo(0.06, 12);
    for (const point of start.rope.fixedPoints.slice(-12))
      expect(Math.hypot(point[0] + 1.02, point[1] - 307.2)).toBeCloseTo(0.08, 12);
  });

  it('keeps the independent axial pin out during motion and locks before unloading', () => {
    expect(sampleEiffelSummitGinPoleClimb(0).axialPin).toMatchObject({
      guideId: 'old-upper',
      insertion: 1,
      locked: true,
    });
    expect(sampleEiffelSummitGinPoleClimb(7).axialPin).toMatchObject({
      guideId: null,
      insertion: 0,
      withdrawalZ: 0.24,
      locked: false,
    });
    for (let seconds = 9; seconds < 60; seconds += 0.125) {
      const sample = sampleEiffelSummitGinPoleClimb(seconds);
      expect(sample.axialPin.locked).toBe(false);
      expect(sample.driveLoaded).toBe(true);
    }
    expect(sampleEiffelSummitGinPoleClimb(63).axialPin).toMatchObject({
      guideId: 'new-upper',
      insertion: 1,
      locked: true,
    });
    expect(sampleEiffelSummitGinPoleClimb(66).driveLoaded).toBe(false);
  });

  it('is stateless, exactly reversible and continuous at every phase boundary', () => {
    const times = Array.from({ length: 701 }, (_, index) => index / 10);
    const forward = times.map(sampleEiffelSummitGinPoleClimb);
    const reverse = times.slice().reverse().map(sampleEiffelSummitGinPoleClimb).reverse();
    expect(reverse).toEqual(forward);
    for (const boundary of [5, 7, 9, 14, 20, 27, 32, 60, 63, 66]) {
      const before = sampleEiffelSummitGinPoleClimb(boundary - 1e-7);
      const after = sampleEiffelSummitGinPoleClimb(boundary + 1e-7);
      expect(Math.abs(after.poleBottomY - before.poleBottomY)).toBeLessThan(1e-10);
      expect(Math.abs(after.drive.crankAngle - before.drive.crankAngle)).toBeLessThan(1e-8);
      for (let index = 0; index < 4; index++) {
        expect(Math.abs(after.guides[index]!.angle - before.guides[index]!.angle)).toBeLessThan(1e-6);
      }
    }
    expect(() => sampleEiffelSummitGinPoleClimb(Number.NaN)).toThrow(/finite/);
  });
});
