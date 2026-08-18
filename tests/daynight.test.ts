import { describe, expect, it } from 'vitest';
import { lerpColor, lightStateAt } from '../src/engine/daynight';
import type { Wonder } from '../src/data/types';

const baseWonder: Wonder = {
  id: 'test-wonder',
  name: 'Test Wonder',
  location: 'Nowhere',
  region: 'Testland',
  era: 'ancient',
  completedYear: 1,
  endsAtNight: false,
  quote: { text: 'q', author: 'a' },
  description: 'd',
  facts: ['a', 'b', 'c'],
  palette: { ground: '#7a6a55', primary: '#c9b18a', accent: '#8a6f4d', sky: '#87b5d6' },
  structure: {
    stages: [
      {
        name: 's',
        parts: [
          { shape: 'box', material: 'primary', position: [0, 0, 0], scale: [2, 2, 2] },
        ],
      },
    ],
  },
};

const nightWonder: Wonder = { ...baseWonder, id: 'night-wonder', endsAtNight: true };

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

describe('lerpColor', () => {
  it('hits exact endpoints', () => {
    expect(lerpColor('#000000', '#ffffff', 0)).toBe('#000000');
    expect(lerpColor('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('interpolates the midpoint channel-wise', () => {
    expect(lerpColor('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(lerpColor('#ff0000', '#0000ff', 0.5)).toBe('#800080');
  });
});

describe('lightStateAt — sun arc', () => {
  it('sun elevation peaks at midday (t = 0.5)', () => {
    const e = (t: number) => lightStateAt(t, baseWonder).sun.elevation;
    expect(e(0.25)).toBeLessThan(e(0.5));
    expect(e(0.75)).toBeLessThan(e(0.5));
    expect(e(0.1)).toBeLessThan(e(0.3));
    expect(e(0.9)).toBeLessThan(e(0.7));
  });

  it('warms the key light at dawn and dusk', () => {
    const dawn = rgb(lightStateAt(0.05, baseWonder).sun.color);
    const dusk = rgb(lightStateAt(0.95, baseWonder).sun.color);
    expect(dawn.r).toBeGreaterThan(dawn.b);
    expect(dusk.r).toBeGreaterThan(dusk.b);
  });

  it('is near-white at noon', () => {
    const noon = rgb(lightStateAt(0.5, baseWonder).sun.color);
    expect(Math.min(noon.r, noon.g, noon.b)).toBeGreaterThan(215);
    expect(noon.r - noon.b).toBeLessThan(40);
  });

  it('ambient intensity is never negative across the movie', () => {
    for (let t = 0; t <= 1; t += 0.02) {
      expect(
        lightStateAt(t, baseWonder).ambient.intensity,
      ).toBeGreaterThanOrEqual(0);
      expect(
        lightStateAt(t, nightWonder).ambient.intensity,
      ).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('lightStateAt — endings', () => {
  it('a daylit wonder ends at golden dusk with no emissives', () => {
    const s = lightStateAt(1, baseWonder);
    expect(s.emissive).toBe(0);
    const sky = rgb(s.sky);
    expect(sky.r).toBeGreaterThan(sky.b); // warm horizon
  });

  it('a night wonder ends dark, moonlit, and fully lit from within', () => {
    const s = lightStateAt(1, nightWonder);
    expect(s.sky).toBe('#0b1026');
    expect(s.emissive).toBe(1);
    expect(s.sun.intensity).toBeLessThan(
      lightStateAt(0.5, nightWonder).sun.intensity,
    );
  });

  it('emissive ramps only inside the final stretch', () => {
    expect(lightStateAt(0, nightWonder).emissive).toBe(0);
    expect(lightStateAt(0.5, nightWonder).emissive).toBe(0);
    const mid = lightStateAt(0.9, nightWonder).emissive;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});
