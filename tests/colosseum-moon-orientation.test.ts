import { describe, expect, it } from 'vitest';
import { COLOSSEUM_EPHEMERIS } from '../src/data/colosseumEphemeris';
import { celestialClockAt } from '../src/engine/colosseumCelestialClock';
import { colosseumAstronomyAtJulianDay, horizontalDirection } from '../src/engine/colosseumAstronomy';
import {
  COLOSSEUM_MOON_SURFACE_POSITION_ANGLE_DEGREES,
  colosseumMoonSurfaceBasisAt,
  type MoonSurfaceRendererDirection,
} from '../src/engine/colosseumMoonSurface';

type V = MoonSurfaceRendererDirection;
const dot = (a: V, b: V) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a: V): V => a.map(value => value / Math.hypot(...a)) as unknown as V;

// Separate Horizons quantity-17 probes, not the production five-minute table.
// AD 0080-Jun-21, Rome, UT1, AIRLESS. Raw request/response and calculation:
// artifacts/colosseum-moon-surface-2026-09-21/research/.
// Roll is clockwise from the local vertical as seen by the observer.
const ORIENTATION_PROBES = [
  { hour: 19, az: 116.058545359, el: -0.339311035, roll: -41.40157575804052 },
  { hour: 19.25, az: 118.518607385, el: 2.065338189, roll: -40.108860343025654 },
  { hour: 19.5, az: 121.037662723, el: 4.415563433, roll: -38.7104025213371 },
  { hour: 19.75, az: 123.623149828, el: 6.705243845, roll: -37.203461360133204 },
  { hour: 20, az: 126.282244799, el: 8.927830630, roll: -35.5850987685986 },
  { hour: 20.15, az: 127.915893416, el: 10.226285230, roll: -34.55934387776014 },
  { hour: 20.25, az: 129.021780173, el: 11.076324446, roll: -33.85222347773484 },
] as const;

function rollDegrees(direction: V, up: V): number {
  const horizonRight = normalize(cross(direction, [0, 1, 0]));
  const horizonUp = cross(horizonRight, direction);
  return Math.atan2(dot(up, horizonRight), dot(up, horizonUp)) * 180 / Math.PI;
}

describe('Colosseum mean-nearside Moon albedo orientation', () => {
  it('forms an unmirrored observer-facing orthonormal basis across the whole film', () => {
    for (let i = 0; i <= 1000; i++) {
      const moon = colosseumAstronomyAtJulianDay(celestialClockAt(i / 1000).julianDayUt1).moon;
      const before = [...moon.direction];
      const { right, up } = colosseumMoonSurfaceBasisAt(moon.direction);
      const facingObserver: V = [-moon.direction[0], -moon.direction[1], moon.direction[2]];
      expect(Math.hypot(...right)).toBeCloseTo(1, 12);
      expect(Math.hypot(...up)).toBeCloseTo(1, 12);
      expect(dot(right, up)).toBeCloseTo(0, 12);
      expect(dot(right, facingObserver)).toBeCloseTo(0, 12);
      expect(dot(up, facingObserver)).toBeCloseTo(0, 12);
      cross(right, up).forEach((value, axis) => expect(value).toBeCloseTo(facingObserver[axis], 12));
      expect(moon.direction).toEqual(before);
    }
  });

  it('matches independently queried true-of-date pole rolls within the stated closing-window bound', () => {
    expect(COLOSSEUM_MOON_SURFACE_POSITION_ANGLE_DEGREES).toBe(-3.85);
    for (const probe of ORIENTATION_PROBES) {
      const authored = horizontalDirection(probe.az, probe.el);
      const direction: V = [authored[0], authored[1], -authored[2]];
      const actual = rollDegrees(direction, colosseumMoonSurfaceBasisAt(authored).up);
      expect(Math.abs(actual - probe.roll)).toBeLessThanOrEqual(0.12300001);
      // This detects leaving the map upright, using the wrong pole, or double
      // reflecting Z: lunar north is markedly left of the horizon vertical.
      expect(actual).toBeLessThan(-33);
      expect(actual).toBeGreaterThan(-42);
    }
  });

  it('ends within the probed interval with a tilted lunar north rather than a horizon-upright map', () => {
    const clock = celestialClockAt(1);
    expect(clock.hoursUt1).toBeGreaterThanOrEqual(19);
    expect(clock.hoursUt1).toBeLessThanOrEqual(20.25);
    const moon = colosseumAstronomyAtJulianDay(clock.julianDayUt1).moon;
    const direction: V = [moon.direction[0], moon.direction[1], -moon.direction[2]];
    const roll = rollDegrees(direction, colosseumMoonSurfaceBasisAt(moon.direction).up);
    expect(roll).toBeGreaterThan(-35);
    expect(roll).toBeLessThan(-34.5);
    // Direct 20:09 Horizons query is off the production five-minute grid.
    expect(Math.abs(roll - ORIENTATION_PROBES[5].roll)).toBeLessThan(0.1);
  });

  it('preserves the spherical map centre, north and increasing-east texture coordinates', () => {
    const moon = colosseumAstronomyAtJulianDay(celestialClockAt(1).julianDayUt1).moon;
    const front: V = [-moon.direction[0], -moon.direction[1], moon.direction[2]];
    const { right, up } = colosseumMoonSurfaceBasisAt(moon.direction);
    // Inverse equirectangular projection, with the default TextureLoader flipY.
    // The central meridian is u=.5; lunar north is high v; east increases u.
    const uv = (normal: V) => [
      0.5 + Math.atan2(dot(normal, right), dot(normal, front)) / (2 * Math.PI),
      0.5 + Math.asin(Math.max(-1, Math.min(1, dot(normal, up)))) / Math.PI,
    ];
    expect(uv(front)[0]).toBeCloseTo(0.5, 12);
    expect(uv(front)[1]).toBeCloseTo(0.5, 12);
    expect(uv(right)[0]).toBeCloseTo(0.75, 12);
    expect(uv(right.map(value => -value) as unknown as V)[0]).toBeCloseTo(0.25, 12);
    expect(uv(up)[1]).toBeCloseTo(1, 7);
    expect(uv(up.map(value => -value) as unknown as V)[1]).toBeCloseTo(0, 7);
  });

  it('gives identical orientations for forward, reverse and repeated seeks', () => {
    const directions = COLOSSEUM_EPHEMERIS.rows.map(row => horizontalDirection(row[4], row[5]));
    const forward = directions.map(colosseumMoonSurfaceBasisAt);
    const reversed = [...directions].reverse().map(colosseumMoonSurfaceBasisAt).reverse();
    expect(reversed).toEqual(forward);
    expect(directions.map(colosseumMoonSurfaceBasisAt)).toEqual(forward);
  });

  it('rejects undefined orientations instead of emitting NaNs', () => {
    for (const invalid of [[0, 0, 0], [NaN, 0, 0], [0, Infinity, 0]] as const) {
      expect(() => colosseumMoonSurfaceBasisAt(invalid)).toThrow(RangeError);
    }
    const latitude = COLOSSEUM_EPHEMERIS.observer.latitudeDegrees * Math.PI / 180;
    expect(() => colosseumMoonSurfaceBasisAt([0, Math.sin(latitude), Math.cos(latitude)])).toThrow(RangeError);
  });
});
