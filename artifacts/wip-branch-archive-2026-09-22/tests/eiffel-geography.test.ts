import { expect, it } from 'vitest';
import {
  EIFFEL_SITE_GEOGRAPHY,
  eiffelAzimuthToGeographicBearing,
  eiffelCodaSunAtElevation,
  eiffelGroundShadowDirection,
  eiffelSunDirection,
  geographicBearingToEiffelAzimuth,
} from '../src/engine/eiffelGeography';

it('maps the exposition axis southeast and Trocadéro northwest without rotating authored meshes', () => {
  expect(EIFFEL_SITE_GEOGRAPHY.positiveZBearing).toBe(135);
  expect(eiffelAzimuthToGeographicBearing(90)).toBe(135);
  expect(eiffelAzimuthToGeographicBearing(-90)).toBe(315);
  expect(eiffelAzimuthToGeographicBearing(0)).toBe(45);
  expect(eiffelAzimuthToGeographicBearing(180)).toBe(225);
  expect(eiffelAzimuthToGeographicBearing(-30)).toBe(15); // Previous NNE ending key.
  for (let bearing = 0; bearing < 360; bearing += 5) {
    expect(eiffelAzimuthToGeographicBearing(geographicBearingToEiffelAzimuth(bearing))).toBeCloseTo(bearing, 10);
  }
});

it('places the illustrative late-autumn sunrise in ESE then SE with its sunset mirrored west', () => {
  // Independent numerical checks for phi=48.858°, delta=-14°, geometric h.
  expect(eiffelCodaSunAtElevation(0, 'rising').bearing).toBeCloseTo(111.5740244, 5);
  expect(eiffelCodaSunAtElevation(14, 'rising').bearing).toBeCloseTo(131.6322633, 5);
  let previous = 0;
  for (let h = -8; h <= 14; h += 0.1) {
    const morning = eiffelCodaSunAtElevation(h, 'rising');
    const evening = eiffelCodaSunAtElevation(h, 'setting');
    expect(morning.bearing).toBeGreaterThan(previous);
    expect(morning.bearing).toBeGreaterThan(90);
    expect(morning.bearing).toBeLessThan(135);
    expect(evening.bearing + morning.bearing).toBeCloseTo(360, 10);
    expect(evening.bearing).toBeGreaterThan(225);
    expect(evening.bearing).toBeLessThan(270);
    previous = morning.bearing;
  }
});

it('casts a raised point toward Seine/Trocadéro, opposite the shared sun direction', () => {
  for (const elevation of [0.5, 4, 8, 14]) {
    const sun = eiffelCodaSunAtElevation(elevation, 'rising');
    const towardSun = eiffelSunDirection(sun.azimuth, sun.elevation);
    const shadow = eiffelGroundShadowDirection(sun.azimuth);
    expect(Math.hypot(...towardSun)).toBeCloseTo(1, 12);
    expect(Math.hypot(...shadow)).toBeCloseTo(1, 12);
    expect(towardSun[1]).toBeGreaterThan(0);
    expect(towardSun[2]).toBeGreaterThan(0); // Fairground side.
    expect(shadow[2]).toBeLessThan(0); // River side.
    // Intersect the sunlight ray from an independent 20m test point with y=0.
    const rayGround = [-20 * towardSun[0] / towardSun[1], -20 * towardSun[2] / towardSun[1]];
    const length = Math.hypot(...rayGround);
    expect(rayGround[0]! / length).toBeCloseTo(shadow[0], 12);
    expect(rayGround[1]! / length).toBeCloseTo(shadow[2], 12);
    const shadowBearing = eiffelAzimuthToGeographicBearing(Math.atan2(shadow[2], shadow[0]) * 180 / Math.PI);
    expect(shadowBearing).toBeCloseTo(sun.bearing + 180, 10);
    expect(shadowBearing).toBeGreaterThan(290);
    expect(shadowBearing).toBeLessThan(315);
  }
});

it('keeps coda helper outputs finite and deterministic outside their supported twilight range', () => {
  expect(eiffelCodaSunAtElevation(-90, 'rising')).toEqual(eiffelCodaSunAtElevation(-8, 'rising'));
  expect(eiffelCodaSunAtElevation(90, 'rising')).toEqual(eiffelCodaSunAtElevation(14, 'rising'));
  for (const input of [NaN, Infinity, -Infinity]) {
    expect(eiffelCodaSunAtElevation(input, 'rising')).toEqual(eiffelCodaSunAtElevation(0, 'rising'));
    expect(eiffelSunDirection(input, input).every(Number.isFinite)).toBe(true);
    expect(eiffelGroundShadowDirection(input).every(Number.isFinite)).toBe(true);
  }
});
