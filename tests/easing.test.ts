import { describe, expect, it } from 'vitest';
import { clamp, easeInOutQuad, easeOutCubic, overshoot } from '../src/engine/easing';

describe('clamp', () => {
  it('keeps values inside [0, 1] by default', () => {
    expect(clamp(-0.5)).toBe(0);
    expect(clamp(0.5)).toBe(0.5);
    expect(clamp(1.5)).toBe(1);
  });

  it('respects custom bounds', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-5, 0, 3)).toBe(0);
  });
});

describe('easing endpoints', () => {
  const fns = { easeOutCubic, easeInOutQuad, overshoot };

  for (const [name, fn] of Object.entries(fns)) {
    it(`${name}: f(0) = 0 and f(1) = 1`, () => {
      expect(fn(0)).toBe(0);
      expect(fn(1)).toBe(1);
    });
  }
});

describe('easeOutCubic', () => {
  it('is front-loaded (fast start)', () => {
    expect(easeOutCubic(0.25)).toBeGreaterThan(0.25);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.8);
  });

  it('is monotonically increasing', () => {
    let prev = -1;
    for (let t = 0; t <= 1; t += 0.05) {
      const v = easeOutCubic(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('easeInOutQuad', () => {
  it('is symmetric around 0.5', () => {
    for (const t of [0.1, 0.25, 0.4]) {
      expect(easeInOutQuad(t)).toBeCloseTo(1 - easeInOutQuad(1 - t), 5);
    }
    expect(easeInOutQuad(0.5)).toBe(0.5);
  });
});

describe('overshoot', () => {
  it('exceeds 1 somewhere in (0, 1)', () => {
    let peaked = false;
    for (let t = 0.05; t < 1; t += 0.05) {
      if (overshoot(t) > 1) peaked = true;
    }
    expect(peaked).toBe(true);
  });

  it('peaks in the back half of the motion (settle at the end of a rise)', () => {
    let peakT = 0;
    let peakV = -Infinity;
    for (let t = 0; t <= 1; t += 0.01) {
      const v = overshoot(t);
      if (v > peakV) {
        peakV = v;
        peakT = t;
      }
    }
    expect(peakT).toBeGreaterThan(0.5);
  });
});
