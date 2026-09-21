import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COLOSSEUM_EPHEMERIS } from '../src/data/colosseumEphemeris';
import {
  colosseumAstronomyAtJulianDay,
  horizontalDirection,
  julianCalendarToJulianDay,
  type CelestialDirection,
} from '../src/engine/colosseumAstronomy';

interface OracleBody {
  calendarUt1: string;
  jd: number;
  azimuthDegrees: number;
  elevationDegrees: number;
  illuminatedFraction: number;
  angularRadiusDegrees: number;
  distanceKm: number;
  phaseAngleDegrees: number;
}

const oracle: { cases: { julianDayUt1: number; sun: OracleBody; moon: OracleBody }[] } = JSON.parse(
  readFileSync(new URL('../artifacts/colosseum-moonrise-2026-09-20/ephemeris/off-grid-oracle.json', import.meta.url), 'utf8'),
);
const day = (hour: number) => COLOSSEUM_EPHEMERIS.startJulianDay + hour / 24;
const dot = (a: CelestialDirection, b: CelestialDirection) => a.reduce((sum, x, i) => sum + x * b[i], 0);
function angleDegrees(a: CelestialDirection, b: CelestialDirection) {
  const cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  return Math.atan2(Math.hypot(...cross), dot(a, b)) * 180 / Math.PI;
}

describe('Colosseum apparent Sun and Moon (Spec 12)', () => {
  it('uses an explicitly ancient Julian date and UT1, without the 0–99 Date year trap', () => {
    expect(julianCalendarToJulianDay(80, 6, 21)).toBe(1_750_449.5);
    expect(julianCalendarToJulianDay(80, 6, 23, 6)).toBe(COLOSSEUM_EPHEMERIS.endJulianDay);
    // Standard last Julian-calendar day before the historical Gregorian reform.
    expect(julianCalendarToJulianDay(1582, 10, 4)).toBe(2_299_159.5);
    expect(julianCalendarToJulianDay(100, 3, 1) - julianCalendarToJulianDay(100, 2, 28)).toBe(2);
    expect(julianCalendarToJulianDay(80, 6, 21, 20, 2, 30)).toBeCloseTo(day(20 + 2.5 / 60), 9);
    expect(() => julianCalendarToJulianDay(81, 2, 29)).toThrow(RangeError);
    expect(() => julianCalendarToJulianDay(80, 6, 21, 24)).toThrow(RangeError);
    expect(COLOSSEUM_EPHEMERIS.calendar).toBe('Julian');
    expect(COLOSSEUM_EPHEMERIS.timeScale).toBe('UT1');
    expect(COLOSSEUM_EPHEMERIS.apparentCoordinates).toBe('AIRLESS');
    expect(COLOSSEUM_EPHEMERIS.observer).toEqual({ latitudeDegrees: 41.8902, longitudeDegrees: 12.4922, altitudeMetres: 25 });
  });

  it('maps the observer compass onto east/up/north without mirroring the sky', () => {
    for (const [az, expected] of [[0, [0, 0, 1]], [90, [1, 0, 0]], [180, [0, 0, -1]], [270, [-1, 0, 0]]] as const) {
      horizontalDirection(az, 0).forEach((component, index) => expect(component).toBeCloseTo(expected[index], 12));
    }
    expect(horizontalDirection(27, 90)[1]).toBe(1);
    for (const hour of [4, 11, 18, 20, 23]) {
      const sample = colosseumAstronomyAtJulianDay(day(hour));
      for (const body of [sample.sun, sample.moon]) {
        const az = body.authoringAzimuthDegrees * Math.PI / 180;
        const el = body.elevationDegrees * Math.PI / 180;
        expect(Math.cos(az) * Math.cos(el)).toBeCloseTo(body.direction[0], 12);
        expect(Math.sin(az) * Math.cos(el)).toBeCloseTo(body.direction[2], 12);
      }
    }
  });

  it('agrees with 191 independently requested JPL off-grid positions and lunar phases', () => {
    expect(oracle.cases).toHaveLength(191);
    for (const reference of oracle.cases) {
      // The off-grid request is offset2.5minutes, with17minute stepping. No knot can match.
      const minutesFromStart = (reference.julianDayUt1 - COLOSSEUM_EPHEMERIS.startJulianDay) * 1440;
      expect(Math.abs(minutesFromStart / 5 - Math.round(minutesFromStart / 5))).toBeGreaterThan(0.09);
      expect(reference.sun.calendarUt1).toMatch(/^0080-Jun-/);
      const actual = colosseumAstronomyAtJulianDay(reference.julianDayUt1);
      expect(angleDegrees(actual.sun.direction, horizontalDirection(reference.sun.azimuthDegrees, reference.sun.elevationDegrees))).toBeLessThan(0.002);
      expect(angleDegrees(actual.moon.direction, horizontalDirection(reference.moon.azimuthDegrees, reference.moon.elevationDegrees))).toBeLessThan(0.003);
      expect(Math.abs(actual.moon.illuminatedFraction - reference.moon.illuminatedFraction)).toBeLessThan(0.0001);
      expect(Math.abs(actual.moon.phaseAngleDegrees - reference.moon.phaseAngleDegrees)).toBeLessThan(0.015);
      expect(Math.abs(actual.moon.distanceKm - reference.moon.distanceKm)).toBeLessThan(0.4);
      expect(Math.abs(actual.sun.distanceKm - reference.sun.distanceKm)).toBeLessThan(0.4);
    }
  });

  it('shows the nearly full waning Moon rising after sunset, with illumination from the real Sun', () => {
    const daylight = colosseumAstronomyAtJulianDay(day(12));
    expect(daylight.sun.aboveHorizon).toBe(true);
    expect(daylight.moon.aboveHorizon).toBe(false);
    const dusk = colosseumAstronomyAtJulianDay(day(20));
    expect(dusk.sun.elevationDegrees).toBeCloseTo(-11.475605586, 6);
    expect(dusk.moon.elevationDegrees).toBeCloseTo(8.927830630, 6);
    expect(dusk.moon.azimuthDegrees).toBeCloseTo(126.282244799, 6);
    expect(dusk.moon.illuminatedFraction).toBeCloseTo(0.9909966, 4);
    expect(dusk.moon.waxing).toBe(false);
    expect(dusk.moon.elongationDegrees).toBeGreaterThan(168);
    expect(dusk.moon.elongationDegrees).toBeLessThan(170); // Close to full, but not an invented antipode.
    const nearSide: CelestialDirection = [-dusk.moon.direction[0], -dusk.moon.direction[1], -dusk.moon.direction[2]];
    expect(dot(nearSide, dusk.moon.lightDirection)).toBeGreaterThan(0.97); // The gibbous disc centre is lit.
    // Project the incident light onto the observer's tangent plane. It must point
    // toward the Sun's sky position, rather than using a fixed left/right crescent.
    const projectedSun = dusk.sun.direction.map((x, i) => x - dot(dusk.sun.direction, dusk.moon.direction) * dusk.moon.direction[i]);
    expect(dot([projectedSun[0], projectedSun[1], projectedSun[2]], dusk.moon.lightDirection)).toBeGreaterThan(0.03);
    expect(colosseumAstronomyAtJulianDay(day(3)).moon.illuminatedFraction).toBeGreaterThan(dusk.moon.illuminatedFraction);
    const afterSunsetBeforeMoonrise = colosseumAstronomyAtJulianDay(day(18.8));
    expect(afterSunsetBeforeMoonrise.sun.aboveHorizon).toBe(false);
    expect(afterSunsetBeforeMoonrise.moon.aboveHorizon).toBe(false);
    expect(colosseumAstronomyAtJulianDay(day(19.2)).moon.aboveHorizon).toBe(true);
  });

  it('crosses the correct horizons in sequence and keeps physical disc sizes', () => {
    // Independent Horizons-derived crossing brackets, in UT1, for Jun21.
    for (const [name, before, after, rising] of [
      ['sun', 3 + 34 / 60, 3 + 35 / 60, true],
      ['moon', 4 + 1 / 60, 4 + 2 / 60, false],
      ['sun', 18 + 39 / 60, 18 + 40 / 60, false],
      ['moon', 19 + 2 / 60, 19 + 3 / 60, true],
    ] as const) {
      expect(colosseumAstronomyAtJulianDay(day(before))[name].aboveHorizon).toBe(!rising);
      expect(colosseumAstronomyAtJulianDay(day(after))[name].aboveHorizon).toBe(rising);
    }
    const partlyRisen = colosseumAstronomyAtJulianDay(day(3 + 34 / 60)).sun;
    expect(partlyRisen.horizonVisibility).toBeGreaterThan(0);
    expect(partlyRisen.horizonVisibility).toBeLessThan(1);
    expect(partlyRisen.upperLimbAboveHorizon).toBe(true);
    const noon = colosseumAstronomyAtJulianDay(day(11));
    expect(noon.sun.elevationDegrees).toBeGreaterThan(70);
    expect(noon.sun.azimuthDegrees).toBeCloseTo(174.865978916, 6);
    expect(noon.sun.angularRadiusDegrees).toBeCloseTo(1887.228 / 7200, 8);
    expect(noon.moon.angularRadiusDegrees).toBeGreaterThan(0.24);
    expect(noon.moon.angularRadiusDegrees).toBeLessThan(0.25);
    expect(colosseumAstronomyAtJulianDay(day(23)).moon.horizonVisibility).toBe(1);
    expect(noon.deltaTSeconds).toBeGreaterThan(9600);
    expect(noon.deltaTSeconds).toBeLessThan(9700);
  });

  it('is continuous across north, normalized, and independent of sampling order', () => {
    const beforeNorth = colosseumAstronomyAtJulianDay(day(23 + 6 / 60));
    const afterNorth = colosseumAstronomyAtJulianDay(day(23 + 8 / 60));
    expect(beforeNorth.sun.azimuthDegrees).toBeGreaterThan(359);
    expect(afterNorth.sun.azimuthDegrees).toBeLessThan(1);
    expect(angleDegrees(beforeNorth.sun.direction, afterNorth.sun.direction)).toBeLessThan(0.6);
    const forward = Array.from({ length: 109 }, (_, i) => colosseumAstronomyAtJulianDay(day(i / 2)));
    for (let i = forward.length - 1; i >= 0; i--) {
      const sample = colosseumAstronomyAtJulianDay(day(i / 2));
      expect(sample).toEqual(forward[i]);
      for (const vector of [sample.sun.direction, sample.moon.direction, sample.moon.lightDirection]) {
        expect(Math.hypot(...vector)).toBeCloseTo(1, 12);
        expect(vector.every(Number.isFinite)).toBe(true);
      }
    }
  });

  it('reports the bounded table explicitly rather than extrapolating invented ancient skies', () => {
    const before = colosseumAstronomyAtJulianDay(day(-1));
    const after = colosseumAstronomyAtJulianDay(day(55));
    expect(before.clamped).toBe(true);
    expect(after.clamped).toBe(true);
    expect(before.julianDayUt1).toBe(COLOSSEUM_EPHEMERIS.startJulianDay);
    expect(after.julianDayUt1).toBe(COLOSSEUM_EPHEMERIS.endJulianDay);
    expect(after.sun).toEqual(colosseumAstronomyAtJulianDay(day(54)).sun);
    expect(() => colosseumAstronomyAtJulianDay(NaN)).toThrow(RangeError);
    expect(() => colosseumAstronomyAtJulianDay(Infinity)).toThrow(RangeError);
  });
});
