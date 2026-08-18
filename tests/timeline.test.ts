import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PHASES,
  STAGE_OVERLAP,
  SETTLED,
  carveState,
  entranceState,
  partProgress,
  phaseAt,
  stageWindow,
  staggeredProgress,
} from '../src/engine/timeline';
import type { Part } from '../src/data/types';

describe('phaseAt', () => {
  it('returns intro at the very start', () => {
    expect(phaseAt(0)).toBe('intro');
    expect(phaseAt(DEFAULT_PHASES.intro - 0.001)).toBe('intro');
  });

  it('returns build through the middle', () => {
    expect(phaseAt(DEFAULT_PHASES.intro)).toBe('build');
    expect(phaseAt(0.5)).toBe('build');
    expect(phaseAt(DEFAULT_PHASES.buildEnd - 0.001)).toBe('build');
  });

  it('returns reveal at the end', () => {
    expect(phaseAt(DEFAULT_PHASES.buildEnd)).toBe('reveal');
    expect(phaseAt(1)).toBe('reveal');
  });
});

describe('stageWindow', () => {
  it('starts the first stage at build start and ends the last at build end', () => {
    for (const n of [1, 2, 5, 12]) {
      expect(stageWindow(0, n).start).toBeCloseTo(DEFAULT_PHASES.intro, 5);
      expect(stageWindow(n - 1, n).end).toBeCloseTo(DEFAULT_PHASES.buildEnd, 5);
    }
  });

  it('orders windows and overlaps consecutive stages', () => {
    const n = 6;
    for (let i = 0; i < n - 1; i++) {
      const a = stageWindow(i, n);
      const b = stageWindow(i + 1, n);
      expect(b.start).toBeGreaterThan(a.start);
      expect(b.start).toBeLessThan(a.end); // overlap
    }
  });

  it('overlap fraction matches STAGE_OVERLAP', () => {
    expect(STAGE_OVERLAP).toBeGreaterThan(0);
    const n = 4;
    const a = stageWindow(0, n);
    const b = stageWindow(1, n);
    const stageDuration = a.end - a.start;
    const overlap = (a.end - b.start) / stageDuration;
    expect(overlap).toBeCloseTo(STAGE_OVERLAP, 5);
  });

  it('a single stage spans the whole build phase', () => {
    const w = stageWindow(0, 1);
    expect(w.end - w.start).toBeCloseTo(
      DEFAULT_PHASES.buildEnd - DEFAULT_PHASES.intro,
      5,
    );
  });

  it('rhythm: weighted stages linger while bounds and overlap hold', () => {
    // signature stage weighs 3x the repetitive ones
    const weights = [1, 1, 3];
    const w0 = stageWindow(0, 3, DEFAULT_PHASES, weights);
    const w1 = stageWindow(1, 3, DEFAULT_PHASES, weights);
    const w2 = stageWindow(2, 3, DEFAULT_PHASES, weights);
    expect(w0.start).toBeCloseTo(DEFAULT_PHASES.intro, 5);
    expect(w2.end).toBeCloseTo(DEFAULT_PHASES.buildEnd, 5);
    expect(w2.end - w2.start).toBeGreaterThan((w0.end - w0.start) * 2);
    expect(w1.start).toBeLessThan(w0.end); // overlap preserved
    // uniform weights reproduce the unweighted windows exactly
    for (let i = 0; i < 3; i++) {
      const a = stageWindow(i, 3);
      const b = stageWindow(i, 3, DEFAULT_PHASES, [1, 1, 1]);
      expect(a.start).toBeCloseTo(b.start, 8);
      expect(a.end).toBeCloseTo(b.end, 8);
    }
  });
});

describe('partProgress', () => {
  const window = { start: 0.2, end: 0.6 };

  it('clamps to 0 before and 1 after the window', () => {
    expect(partProgress(0, window)).toBe(0);
    expect(partProgress(0.199, window)).toBe(0);
    expect(partProgress(0.6, window)).toBe(1);
    expect(partProgress(1, window)).toBe(1);
  });

  it('is linear inside the window', () => {
    expect(partProgress(0.4, window)).toBeCloseTo(0.5, 5);
  });
});

describe('staggeredProgress', () => {
  it('is identity for order 0', () => {
    expect(staggeredProgress(0.4, 0)).toBeCloseTo(0.4, 5);
  });

  it('higher orders start later (less progress at fixed t)', () => {
    for (const t of [0.2, 0.5, 0.8]) {
      expect(staggeredProgress(t, 2)).toBeLessThan(staggeredProgress(t, 0));
      expect(staggeredProgress(t, 3)).toBeLessThan(staggeredProgress(t, 2));
    }
  });

  it('stays clamped to [0, 1]', () => {
    expect(staggeredProgress(0.05, 4)).toBe(0);
    expect(staggeredProgress(1, 4)).toBe(1);
  });
});

describe('entranceState — construction truth (no scaling solids)', () => {
  const part: Part = {
    shape: 'box',
    material: 'primary',
    position: [0, 0, 0],
    scale: [2, 4, 2],
    entrance: 'place',
  };

  it('is invisible at progress 0', () => {
    const s = entranceState(part, 0);
    expect(s.visible).toBe(false);
    expect(s.opacity).toBe(0);
  });

  it('is fully settled at progress 1 for additive entrances', () => {
    for (const entrance of ['place', 'stack', 'fade'] as const) {
      const s = entranceState({ ...part, entrance }, 1);
      expect(s.visible).toBe(true);
      expect(s.yOffset).toBeCloseTo(0, 5);
      expect(s.scale).toBe(1);
      expect(s.opacity).toBeCloseTo(1, 5);
    }
  });

  it('NEVER scales a solid: scale is 1 at every visible progress', () => {
    for (const entrance of ['place', 'stack'] as const) {
      for (let p = 0.02; p <= 1; p += 0.03) {
        const s = entranceState({ ...part, entrance }, p);
        if (s.visible) expect(s.scale).toBe(1);
      }
    }
  });

  it('place: descends from just above the seat during the short placement beat', () => {
    let prev = Infinity;
    for (const p of [0.01, 0.04, 0.08, 0.12]) {
      const y = entranceState(part, p).yOffset;
      expect(y).toBeLessThan(prev);
      prev = y;
    }
    expect(entranceState(part, 0.18).yOffset).toBeCloseTo(0, 5);
  });

  it('place: starts above the seat, never rising out of the ground', () => {
    expect(entranceState(part, 0.01).yOffset).toBeGreaterThan(0);
  });

  it('place: makes a small contact dip before settling (translation, not scale)', () => {
    const at = (p: number) => entranceState(part, p).yOffset;
    let dipped = false;
    for (let p = 0.13; p < 0.18; p += 0.005) {
      if (at(p) < -0.02) dipped = true;
    }
    expect(dipped).toBe(true);
    expect(at(1)).toBeCloseTo(0, 5);
  });

  it('fade: non-solids only — pure opacity ramp, no translation, no scale', () => {
    const fadePart: Part = { ...part, entrance: 'fade' };
    for (const p of [0.2, 0.5, 0.8]) {
      const s = entranceState(fadePart, p);
      expect(s.yOffset).toBe(0);
      expect(s.scale).toBe(1);
      expect(s.opacity).toBeGreaterThan(0);
      expect(s.opacity).toBeLessThan(1);
    }
  });

  it('none: site features are settled from the first frame', () => {
    expect(entranceState({ ...part, entrance: 'none' }, 0)).toEqual(SETTLED);
  });

  it('stack: higher orders lag behind (less risen mid-window)', () => {
    const low = entranceState({ ...part, entrance: 'stack', order: 0 }, 0.3);
    const high = entranceState({ ...part, entrance: 'stack', order: 3 }, 0.3);
    expect(high.yOffset).toBeGreaterThan(low.yOffset); // still above its seat
  });
});

describe('carveState — subtractive carving', () => {
  const window = { start: 0.3, end: 0.7 };
  const chunk: Part = {
    shape: 'box',
    material: 'accent',
    position: [0, 4, 0],
    scale: [4, 4, 2],
    entrance: 'carve',
    order: 0,
  };

  it('is present (settled) before its stage window', () => {
    expect(carveState(chunk, 0, window)).toEqual(SETTLED);
    expect(carveState(chunk, 0.29, window)).toEqual(SETTLED);
  });

  it('is gone well after its exit', () => {
    expect(carveState(chunk, 0.71, window).visible).toBe(false);
    expect(carveState(chunk, 1, window).visible).toBe(false);
  });

  it('chunks drop with accelerating fall and never scale', () => {
    // order 0 chunk exits around the middle of the window
    const early = carveState(chunk, 0.56, window);
    const late = carveState(chunk, 0.62, window);
    if (early.visible && late.visible) {
      expect(late.yOffset).toBeLessThan(early.yOffset); // sinking
    }
    for (const t of [0.4, 0.5, 0.55, 0.6, 0.65]) {
      expect(carveState(chunk, t, window).scale).toBe(1);
    }
    // at some point mid-exit it must be sinking below its seat
    let sunk = false;
    for (let t = window.start; t <= window.end; t += 0.01) {
      if (carveState(chunk, t, window).yOffset < -0.5) sunk = true;
    }
    expect(sunk).toBe(true);
  });

  it('higher orders are carved later (top-down control)', () => {
    const first = { ...chunk, order: 0 };
    const last = { ...chunk, order: 4 };
    // mid-window: first chunk is dropping, last is still in place
    const midT = 0.52;
    const a = carveState(first, midT, window);
    const b = carveState(last, midT, window);
    expect(Math.abs(a.yOffset)).toBeGreaterThanOrEqual(Math.abs(b.yOffset));
  });
});
