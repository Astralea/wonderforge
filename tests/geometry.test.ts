import { describe, expect, it } from 'vitest';
import { WONDERS } from '../src/data';
import { boundingCylinder, expandRecipe } from '../src/engine/geometry';
import type { MaterialKey, ShapeKind } from '../src/data/types';

const SHAPES: ShapeKind[] = [
  'box',
  'cylinder',
  'cone',
  'pyramid',
  'prism',
  'sphere',
  'torus',
  'sail',
  'ramp',
];
const MATERIALS: MaterialKey[] = [
  'primary',
  'accent',
  'ground',
  'foliage',
  'water',
  'light',
  'shadow',
  'casing',
];

describe('expandRecipe', () => {
  it('produces only known shapes and materials', () => {
    for (const w of WONDERS) {
      for (const part of expandRecipe(w)) {
        expect(SHAPES).toContain(part.shape);
        expect(MATERIALS).toContain(part.material);
      }
    }
  });

  it('every expanded part has finite transform numbers', () => {
    for (const w of WONDERS) {
      for (const part of expandRecipe(w)) {
        for (const v of [...part.position, ...part.scale]) {
          expect(Number.isFinite(v)).toBe(true);
        }
        if (part.rotation) {
          for (const v of part.rotation) expect(Number.isFinite(v)).toBe(true);
        }
      }
    }
  });

  it('applies jitter deterministically (seeded by wonder id)', () => {
    const jittered = WONDERS.filter((w) =>
      expandRecipe(w).some((p) => p.jitter),
    );
    expect(jittered.length).toBeGreaterThan(0); // at least one wonder uses jitter
    for (const w of jittered) {
      const a = expandRecipe(w).map((p) => p.position);
      const b = expandRecipe(w).map((p) => p.position);
      expect(a).toEqual(b);
    }
  });
});

describe('boundingCylinder', () => {
  it('contains every part of every wonder', () => {
    for (const w of WONDERS) {
      const parts = expandRecipe(w);
      const { radius, height } = boundingCylinder(parts);
      for (const p of parts) {
        const horizontal =
          Math.hypot(p.position[0], p.position[2]) +
          Math.max(p.scale[0], p.scale[2]) / 2;
        expect(horizontal).toBeLessThanOrEqual(radius + 1e-6);
        expect(p.position[1] + p.scale[1]).toBeLessThanOrEqual(height + 1e-6);
      }
    }
  });

  it('reports positive, finite dimensions', () => {
    for (const w of WONDERS) {
      const { radius, height } = boundingCylinder(expandRecipe(w));
      expect(radius).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
      expect(Number.isFinite(radius) && Number.isFinite(height)).toBe(true);
    }
  });
});
