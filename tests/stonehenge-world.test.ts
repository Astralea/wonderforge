import { describe, expect, it } from 'vitest';
import { STONEHENGE_CONSTRUCTION } from '../src/data/stonehengeConstruction';
import {
  STONEHENGE_ENVIRONMENT,
  createStonehengeEnvironmentPlan,
} from '../src/data/stonehengeEnvironment';
import {
  sampleStonehengeSky,
  stonehengeSunStateAt,
  STONEHENGE_SKY,
} from '../src/data/stonehengeSky';
import { stonehengeCinematicShotAt } from '../src/engine/stonehengeCamera';
import { createStonehengeStoneGeometry } from '../src/render/three/StonehengeStoneSystem';
import { referenceWorldKindFor } from '../src/render/three/sceneRegistry';

describe('Stonehenge world contract (Spec 10)', () => {
  it('owns a deterministic blue downland sky through the reveal', () => {
    expect(STONEHENGE_SKY.id).toBe('stonehenge-downland-sky');
    for (const t of [0, 0.32, 0.58, 0.78, 0.92, 1]) {
      expect(sampleStonehengeSky(t)).toEqual(sampleStonehengeSky(t));
      const sample = sampleStonehengeSky(t);
      const zenithBlue = parseInt(sample.zenith.slice(5, 7), 16);
      const zenithRed = parseInt(sample.zenith.slice(1, 3), 16);
      expect(zenithBlue).toBeGreaterThan(zenithRed);
      expect(sample.cloudOpacity).toBeGreaterThanOrEqual(0.28);
      expect(sample.fogStretch).toBeGreaterThan(1);
    }
    expect(stonehengeSunStateAt(0.5).elevation).toBeGreaterThan(50);
    expect(stonehengeSunStateAt(0.9).elevation).toBeGreaterThanOrEqual(8);
    expect(stonehengeSunStateAt(0.9).elevation).toBeLessThanOrEqual(12);
    const dawn = sampleStonehengeSky(0.12);
    const reveal = sampleStonehengeSky(0.92);
    expect(dawn.haze).toBeLessThan(0.18);
    expect(reveal.haze).toBeLessThan(0.2);
    expect(parseInt(dawn.horizon.slice(1, 3), 16)).toBeLessThan(220);
    const revealBlue = parseInt(reveal.zenith.slice(5, 7), 16);
    const revealRed = parseInt(reveal.zenith.slice(1, 3), 16);
    const horizonBlue = parseInt(reveal.horizon.slice(5, 7), 16);
    const horizonRed = parseInt(reveal.horizon.slice(1, 3), 16);
    expect(revealBlue - revealRed).toBeGreaterThan(horizonBlue - horizonRed);
  });

  it('declares a deterministic complete near-to-far Salisbury Plain world', () => {
    expect(createStonehengeEnvironmentPlan()).toEqual(createStonehengeEnvironmentPlan());
    expect(createStonehengeEnvironmentPlan()).toEqual(STONEHENGE_ENVIRONMENT);
    expect(STONEHENGE_ENVIRONMENT.layers.map((layer) => layer.id)).toEqual([
      'weather-sky',
      'rolling-downs',
      'open-grassland',
      'henge-earthwork',
      'stone-settings',
      'work-systems',
      'foreground-chalk-cut',
    ]);
    expect(STONEHENGE_ENVIRONMENT.terrain.radius).toBeGreaterThan(400);
    expect(STONEHENGE_ENVIRONMENT.terrain.motion).toBe('static-world-space');
    expect(STONEHENGE_ENVIRONMENT.henge.ditchDiameter).toBe(110);
    expect(STONEHENGE_ENVIRONMENT.henge.aubreyHoles).toBe(56);
    expect(STONEHENGE_ENVIRONMENT.ecology.grassTufts).toBeGreaterThanOrEqual(1000);
    expect(STONEHENGE_ENVIRONMENT.ecology.nearHerbTufts).toBeGreaterThanOrEqual(240);
    expect(STONEHENGE_ENVIRONMENT.site.trampledChips).toBeGreaterThanOrEqual(80);
    expect(STONEHENGE_ENVIRONMENT.ecology.treeClusters).toBeGreaterThanOrEqual(8);
    expect(STONEHENGE_ENVIRONMENT.exclusions).toContain('modern roads');
    expect(STONEHENGE_ENVIRONMENT.exclusions).toContain('woolly modern sheep');
  });

  it('keeps the logistics routes connected from source to each stone setting', () => {
    expect(STONEHENGE_CONSTRUCTION.routes.map((route) => route.id).sort()).toEqual([
      'bluestone-west',
      'heel-northeast',
      'sarsen-north',
    ]);
    for (const route of STONEHENGE_CONSTRUCTION.routes) {
      expect(route.source[2]).toBeGreaterThan(route.queue[2] - 100);
      expect(Math.hypot(
        route.source[0] - route.dressing[0],
        route.source[2] - route.dressing[2],
      )).toBeGreaterThan(8);
      expect(Math.hypot(
        route.dressing[0] - route.queue[0],
        route.dressing[2] - route.queue[2],
      )).toBeGreaterThan(8);
    }
  });

  it('uses a deterministic mechanism-led camera with portrait compensation', () => {
    for (const t of [0, 0.12, 0.32, 0.58, 0.78, 0.92, 1]) {
      expect(stonehengeCinematicShotAt(t, 16 / 9))
        .toEqual(stonehengeCinematicShotAt(t, 16 / 9));
      const shot = stonehengeCinematicShotAt(t, 16 / 9);
      expect(shot.radius).toBeGreaterThanOrEqual(85);
      expect(shot.radius).toBeLessThanOrEqual(140);
      expect(shot.fov).toBe(35);
      expect(shot.target[1]).toBeGreaterThan(1);
      expect(shot.target[1]).toBeLessThan(5);
      // At least the top of the desktop frustum clears the horizontal plane;
      // otherwise the rolling downs erase the sky even when a dome exists.
      expect((shot.pitch * 180) / Math.PI).toBeLessThan(shot.fov / 2);
    }
    const desktop = stonehengeCinematicShotAt(0.78, 16 / 9);
    const portrait = stonehengeCinematicShotAt(0.78, 390 / 844);
    expect(stonehengeCinematicShotAt(0.32, 16 / 9).radius).toBeLessThan(98);
    expect(stonehengeCinematicShotAt(0.32, 16 / 9).radius).toBeGreaterThanOrEqual(88);
    expect(stonehengeCinematicShotAt(0.32, 16 / 9).pitch).toBeGreaterThan((14 * Math.PI) / 180);
    expect(stonehengeCinematicShotAt(0.78, 16 / 9).pitch).toBeGreaterThan((14 * Math.PI) / 180);
    expect(stonehengeCinematicShotAt(0.68, 16 / 9).target[2]).toBeLessThan(-8);
    expect(stonehengeCinematicShotAt(1, 16 / 9).radius).toBeGreaterThanOrEqual(110);
    expect(portrait.radius).toBeGreaterThan(desktop.radius);
    expect(portrait.fov).toBe(42);
  });

  it('dispatches both production scenes without changing remaining fallbacks', () => {
    expect(referenceWorldKindFor('pyramids-of-giza')).toBe('giza');
    expect(referenceWorldKindFor('stonehenge')).toBe('stonehenge');
    expect(referenceWorldKindFor('petra')).toBe('petra');
    expect(referenceWorldKindFor('sydney-opera-house')).toBe('sydney');
    expect(referenceWorldKindFor('eiffel-tower')).toBe('eiffel');
    expect(referenceWorldKindFor('machu-picchu')).toBe('legacy');
  });

  it('tapers uprights toward a weathered shoulder', () => {
    const meanRadius = (role: 'upright' | 'lintel', unworked: boolean, band: 'top' | 'base') => {
      const geometry = createStonehengeStoneGeometry(role, unworked);
      const position = geometry.getAttribute('position');
      let sum = 0;
      let count = 0;
      for (let index = 0; index < position.count; index += 1) {
        const y = position.getY(index);
        if (band === 'top' ? y < 0.42 : y > -0.42) continue;
        sum += Math.hypot(position.getX(index), position.getZ(index));
        count += 1;
      }
      geometry.dispose();
      return sum / count;
    };
    expect(meanRadius('upright', false, 'top')).toBeLessThan(meanRadius('upright', false, 'base') * 0.93);
    expect(meanRadius('upright', true, 'top')).toBeLessThan(meanRadius('upright', false, 'top'));
    expect(meanRadius('lintel', false, 'top')).toBeGreaterThan(meanRadius('upright', false, 'top') * 0.9);
  });

  it('keeps procedural weathering inside the authored load-bearing envelope', () => {
    const upright = createStonehengeStoneGeometry('upright');
    const lintel = createStonehengeStoneGeometry('lintel');
    upright.computeBoundingBox();
    lintel.computeBoundingBox();
    expect(upright.boundingBox!.min.x).toBeCloseTo(-0.5, 6);
    expect(upright.boundingBox!.max.x).toBeCloseTo(0.5, 6);
    expect(lintel.boundingBox!.min.y).toBeCloseTo(-0.5, 6);
    expect(lintel.boundingBox!.max.y).toBeCloseTo(0.5, 6);
    upright.dispose();
    lintel.dispose();
  });
});
