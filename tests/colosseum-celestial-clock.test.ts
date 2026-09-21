import { describe, expect, it } from 'vitest';
import {
  COLOSSEUM_CELESTIAL_ANGULAR_SCALE,
  COLOSSEUM_FOG_NEUTRALIZER,
  COLOSSEUM_SKY,
  colosseumSunStateAt,
  sampleColosseumSky,
} from '../src/data/colosseumSky';
import { COLOSSEUM_EPHEMERIS } from '../src/data/colosseumEphemeris';
import { colosseumAstronomyAtJulianDay, julianCalendarToJulianDay } from '../src/engine/colosseumAstronomy';
import { celestialClockAt, COLOSSEUM_CELESTIAL_CLOCK } from '../src/engine/colosseumCelestialClock';

function timeAtAltitude(altitude: number, rising: boolean): number {
  let a = rising ? 0 : 0.47, b = rising ? 0.47 : 1;
  for (let i = 0; i < 40; i++) {
    const mid = (a + b) / 2;
    if ((sampleColosseumSky(mid).astronomy.sun.elevationDegrees < altitude) === rising) a = mid;
    else b = mid;
  }
  return (a + b) / 2;
}

function rgb(hex: string): number[] {
  return [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16));
}

describe('Colosseum continuous celestial clock and altitude-driven atmosphere', () => {
  it('maps the intended construction/reveal beats onto one Julian day without restarting time', () => {
    for (const [t, hour] of [[0, 4], [0.4, 12], [0.76, 18.1], [0.84, 18.8], [0.88, 19.05], [1, 20.15]]) {
      const actual = celestialClockAt(t);
      expect(actual.hoursUt1).toBeCloseTo(hour, 12);
      expect(actual.julianDayUt1).toBeCloseTo(julianCalendarToJulianDay(80, 6, 21) + hour / 24, 10);
    }
    expect(celestialClockAt(-1)).toEqual({ ...celestialClockAt(0), hoursPerFilmUnit: 0 });
    expect(celestialClockAt(2)).toEqual({ ...celestialClockAt(1), hoursPerFilmUnit: 0 });
    expect(() => celestialClockAt(NaN)).toThrow(RangeError);
  });

  it('is monotone and bounded throughout the daylight work and evening moonrise', () => {
    let previous = celestialClockAt(0);
    for (let i = 1; i <= 6000; i++) {
      const sample = celestialClockAt(i / 6000);
      expect(sample.hoursUt1).toBeGreaterThanOrEqual(previous.hoursUt1);
      expect(sample.hoursUt1).toBeGreaterThanOrEqual(4);
      expect(sample.hoursUt1).toBeLessThanOrEqual(20.15);
      expect(sample.hoursPerFilmUnit).toBeGreaterThanOrEqual(0);
      expect(sample.hoursPerFilmUnit).toBeLessThan(40);
      previous = sample;
    }
    expect(celestialClockAt(0.88).hoursPerFilmUnit).toBeLessThan(celestialClockAt(0.4).hoursPerFilmUnit);
    expect(celestialClockAt(1).hoursPerFilmUnit).toBeGreaterThan(0);
  });

  it('shares a continuous first derivative at every interior speed-change knot', () => {
    const epsilon = 1e-7;
    for (const [knot] of COLOSSEUM_CELESTIAL_CLOCK.knots.slice(1, -1)) {
      const left = celestialClockAt(knot - epsilon);
      const centre = celestialClockAt(knot);
      const right = celestialClockAt(knot + epsilon);
      expect(Math.abs(left.hoursPerFilmUnit - right.hoursPerFilmUnit)).toBeLessThan(0.0001);
      const leftSlope = (centre.hoursUt1 - left.hoursUt1) / epsilon;
      const rightSlope = (right.hoursUt1 - centre.hoursUt1) / epsilon;
      expect(Math.abs(leftSlope - rightSlope)).toBeLessThan(0.0001);
      expect(leftSlope).toBeCloseTo(centre.hoursPerFilmUnit, 4);
    }
  });

  it('uses the same ephemeris time for sky and light and reflects north only at the renderer boundary', () => {
    for (const t of [1, 0.47, 0, 0.72, 0.83, 0.99, 0.1, 1]) {
      const sample = sampleColosseumSky(t);
      const astronomy = colosseumAstronomyAtJulianDay(celestialClockAt(t).julianDayUt1);
      expect(sample.astronomy).toEqual(astronomy);
      const rendered = colosseumSunStateAt(t);
      const az = rendered.azimuth * Math.PI / 180, el = rendered.elevation * Math.PI / 180;
      expect(Math.cos(az) * Math.cos(el)).toBeCloseTo(astronomy.sun.direction[0], 12);
      expect(Math.sin(el)).toBeCloseTo(astronomy.sun.direction[1], 12);
      expect(Math.sin(az) * Math.cos(el)).toBeCloseTo(-astronomy.sun.direction[2], 12);
    }
    expect(colosseumSunStateAt(1)).not.toEqual(colosseumSunStateAt(0.9));
    expect(colosseumSunStateAt(0).elevation).toBeGreaterThan(0);
    expect(colosseumSunStateAt(0.4).elevation).toBeGreaterThan(65);
    expect(colosseumSunStateAt(1).elevation).toBeLessThan(-12);
  });

  it('gives matching solar altitudes matching atmosphere on both sides of noon', () => {
    for (const altitude of [5, 20, 40]) {
      const dawn = sampleColosseumSky(timeAtAltitude(altitude, true));
      const dusk = sampleColosseumSky(timeAtAltitude(altitude, false));
      expect(dawn.astronomy.sun.elevationDegrees).toBeCloseTo(altitude, 6);
      expect(dusk.astronomy.sun.elevationDegrees).toBeCloseTo(altitude, 6);
      for (const key of ['zenith', 'horizon', 'cloudTint', 'cloudShadow', 'fogNeutralizer', 'sunTint'] as const) {
        expect(dawn[key]).toBe(dusk[key]);
      }
      expect(dawn.fogStretch).toBeCloseTo(dusk.fogStretch, 8);
    }
  });

  it('reaches readable blue evening with matching fog and physical ephemeris radii', () => {
    expect(COLOSSEUM_SKY.id).toBe('colosseum-valley-sky');
    expect(COLOSSEUM_SKY.domeRadius).toBe(2200);
    expect(COLOSSEUM_CELESTIAL_ANGULAR_SCALE).toBe(2.4);
    const daylight = sampleColosseumSky(0.47), night = sampleColosseumSky(1);
    expect(daylight.daylight).toBe(1);
    expect(night.night).toBeGreaterThan(0.5); // Actual nautical twilight, not an invented midnight sky.
    expect(night.daylight).toBe(0);
    expect(night.fogNeutralizer).not.toBe(COLOSSEUM_FOG_NEUTRALIZER);
    expect(rgb(night.horizon)[2]).toBeGreaterThan(rgb(night.horizon)[0]);
    expect(Math.min(...rgb(night.horizon))).toBeGreaterThan(25);
    expect(Math.max(...rgb(night.horizon))).toBeLessThan(120);
    expect(night.astronomy.sun.angularRadiusDegrees).toBeLessThan(0.3);
    expect(night.astronomy.moon.angularRadiusDegrees).toBeLessThan(0.3);
    expect(COLOSSEUM_EPHEMERIS.rows[0][3]).toBeLessThan(0.3);
    for (let i = 0; i <= 100; i++) {
      const sky = sampleColosseumSky(i / 100);
      expect(sky.daylight + sky.twilight + sky.night).toBeCloseTo(1, 12);
      expect(sky.fogStretch).toBeGreaterThanOrEqual(1.2);
      expect(sky.fogStretch).toBeLessThanOrEqual(1.42);
    }
  });

  it('shows gradual waning and a real evening moonrise, with deterministic reverse seeking', () => {
    const earlier = sampleColosseumSky(0).astronomy.moon;
    const later = sampleColosseumSky(1).astronomy.moon;
    expect(earlier.illuminatedFraction - later.illuminatedFraction).toBeGreaterThan(0.005);
    expect(earlier.illuminatedFraction - later.illuminatedFraction).toBeLessThan(0.01);
    expect(later.waxing).toBe(false);
    expect(later.illuminatedFraction).toBeGreaterThan(0.99);
    expect(sampleColosseumSky(0.84).astronomy.moon.elevationDegrees).toBeLessThan(0);
    expect(sampleColosseumSky(0.88).astronomy.moon.elevationDegrees).toBeGreaterThan(0);
    expect(later.elevationDegrees).toBeGreaterThan(9);
    expect(later.elevationDegrees).toBeLessThan(11);
    const forward = Array.from({ length: 41 }, (_, i) => sampleColosseumSky(i / 40));
    for (let i = 40; i >= 0; i--) expect(sampleColosseumSky(i / 40)).toEqual(forward[i]);
  });
});
