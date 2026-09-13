import { expect, it } from 'vitest';
import { eiffelSunStateAt, sampleEiffelSky } from '../src/data/eiffelSky';
import { eiffelTower } from '../src/data/wonders/eiffel-tower';
import { lightStateAt } from '../src/engine/daynight';
import { sampleEiffelCinematicAtmosphere } from '../src/engine/eiffelCinematicAtmosphere';
import { sampleEiffelFilmEdit } from '../src/engine/eiffelFilmEdit';

const at = (seconds: number) => sampleEiffelCinematicAtmosphere(sampleEiffelFilmEdit('cinematic', seconds / 180).productionT, seconds, eiffelTower);
const rgb = (color: string) => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));

it('preserves the existing Eiffel construction light and sky until the coda', () => {
  for (const seconds of [0, 12, 40, 75, 110, 150, 162]) {
    const productionT = sampleEiffelFilmEdit('cinematic', seconds / 180).productionT;
    const old = lightStateAt(productionT, eiffelTower);
    const sky = sampleEiffelSky(productionT);
    Object.assign(old.sun, eiffelSunStateAt(productionT), { color: sky.sunTint });
    old.sky = old.fog = sky.horizon;
    old.ambient.skyColor = '#c6ccd0';
    old.ambient.intensity = Math.min(0.76, old.ambient.intensity + 0.24);
    if (old.sun.elevation < 18 || old.emissive > 0) {
      const dusk = Math.min(1, Math.max((18 - old.sun.elevation) / 14, old.emissive));
      old.ambient.intensity = Math.min(0.84, old.ambient.intensity + dusk * 0.14);
      old.sun.intensity *= 1 - dusk * 0.06;
      if (dusk > 0.6) old.sun.color = '#c8d0e8';
    }
    expect(at(seconds).light).toEqual(old);
    expect(at(seconds).sky).toEqual(sky);
  }
});

it('moves the hidden night key east without a visible disc, halo or direct-light flash', () => {
  for (let seconds = 170; seconds <= 172; seconds += 0.025) {
    const { light, sky, nightAmount } = at(seconds);
    expect(light.sun.intensity).toBe(0);
    expect(light.sun.visibility).toBe(0);
    expect(light.sun.elevation).toBe(-8);
    expect(sky.sunTint).toBe('#000000');
    expect(nightAmount).toBe(1);
  }
  expect(at(170).light.sun.azimuth).toBe(154);
  expect(at(172).light.sun.azimuth).toBe(-30);
});

it('raises a new eastern sun and fades lamps into a bright warm final morning', () => {
  let previous = at(172);
  for (let i = 1; i <= 360; i++) {
    const sample = at(172 + i / 60);
    expect(sample.light.sun.azimuth).toBe(-30);
    expect(sample.light.sun.elevation).toBeGreaterThanOrEqual(previous.light.sun.elevation);
    expect(sample.light.sun.intensity).toBeGreaterThanOrEqual(previous.light.sun.intensity);
    expect(sample.light.ambient.intensity).toBeGreaterThanOrEqual(previous.light.ambient.intensity);
    expect(sample.nightAmount).toBeLessThanOrEqual(previous.nightAmount);
    if (sample.light.sun.elevation <= 0) expect(sample.light.sun.intensity).toBe(0);
    previous = sample;
  }
  const final = at(180);
  expect(final).toEqual(at(178));
  expect(final.phase).toBe('morning');
  expect(final.sky.t).toBeCloseTo(0.12);
  expect(final.light.sun.elevation).toBe(14);
  expect(final.light.sun.intensity).toBeGreaterThan(0.9);
  expect(final.light.ambient.intensity).toBeGreaterThan(0.7);
  expect(final.light.emissive).toBe(0);
  expect(rgb(final.light.sun.color)[0]).toBeGreaterThan(rgb(final.light.sun.color)[2]!);
  expect(rgb(final.sky.horizon).reduce((a, b) => a + b)).toBeGreaterThan(2 * rgb(at(171).sky.horizon).reduce((a, b) => a + b));
});

it('keeps light, fog, water sky and glow coherent, continuous and seek-deterministic', () => {
  const samples = Array.from({ length: 1081 }, (_, i) => at(162 + i / 60));
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    expect(s.light.sky).toBe(s.sky.horizon);
    expect(s.light.fog).toBe(s.sky.horizon);
    expect(s.light.emissive).toBe(s.nightAmount);
    expect(s.nightAmount).toBeGreaterThanOrEqual(0);
    expect(s.nightAmount).toBeLessThanOrEqual(1);
    expect(s.light.sun.intensity).toBeGreaterThanOrEqual(0);
    if (i) {
      const prev = samples[i - 1]!;
      expect(Math.abs(s.light.sun.elevation - prev.light.sun.elevation)).toBeLessThan(0.2);
      expect(Math.abs(s.light.sun.intensity - prev.light.sun.intensity)).toBeLessThan(0.015);
      expect(Math.abs(s.light.ambient.intensity - prev.light.ambient.intensity)).toBeLessThan(0.01);
      for (const field of ['horizon', 'zenith', 'cloudTint', 'sunTint'] as const) {
        const a = rgb(s.sky[field]), b = rgb(prev.sky[field]);
        expect(Math.max(...a.map((c, j) => Math.abs(c - b[j]!)))).toBeLessThanOrEqual(3);
      }
    }
  }
  for (let i = samples.length - 1; i >= 0; i -= 13) expect(at(162 + i / 60)).toEqual(samples[i]);
  for (const boundary of [162, 170, 172, 178]) {
    const before = at(boundary - 1e-6), after = at(boundary + 1e-6);
    expect(Math.abs(after.light.sun.intensity - before.light.sun.intensity)).toBeLessThan(1e-5);
    expect(Math.abs(after.light.sun.azimuth - before.light.sun.azimuth)).toBeLessThan(1e-3);
  }
});
