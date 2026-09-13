import { describe, expect, it } from 'vitest';
import { Mesh } from 'three';
import { COLOSSEUM_CONSTRUCTION } from '../src/data/colosseumConstruction';
import {
  COLOSSEUM_ENVIRONMENT,
  createColosseumEnvironmentPlan,
} from '../src/data/colosseumEnvironment';
import {
  COLOSSEUM_SKY,
  colosseumSunStateAt,
  sampleColosseumSky,
} from '../src/data/colosseumSky';
import type { Wonder } from '../src/data/types';
import { colosseumCinematicShotAt } from '../src/engine/colosseumCamera';
import { ColosseumEnvironment } from '../src/render/three/ColosseumEnvironment';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import { createColosseumPartGeometry } from '../src/render/three/ColosseumStoneSystem';
import { referenceWorldKindFor } from '../src/render/three/sceneRegistry';

const fixtureWonder: Wonder = {
  id: 'colosseum-water-fixture',
  name: 'Fixture',
  location: 'Nowhere',
  region: 'Testland',
  era: 'ancient',
  completedYear: 1,
  endsAtNight: false,
  quote: { text: 'q', author: 'a' },
  description: 'd',
  facts: ['a', 'b', 'c'],
  palette: { ground: '#7a6a55', primary: '#c9b18a', accent: '#8a6f4d', sky: '#87b5d6' },
  structure: { stages: [{ name: 's', parts: [] }] },
};

describe('Colosseum world contract (Spec 12)', () => {
  it('owns a deterministic Tyrrhenian blue valley sky through the reveal', () => {
    expect(COLOSSEUM_SKY.id).toBe('colosseum-valley-sky');
    for (const t of [0, 0.32, 0.58, 0.78, 0.92, 1]) {
      expect(sampleColosseumSky(t)).toEqual(sampleColosseumSky(t));
      const sample = sampleColosseumSky(t);
      const zenithBlue = parseInt(sample.zenith.slice(5, 7), 16);
      const zenithRed = parseInt(sample.zenith.slice(1, 3), 16);
      expect(zenithBlue).toBeGreaterThan(zenithRed);
      expect(sample.fogStretch).toBeGreaterThan(1);
    }
    expect(colosseumSunStateAt(0.5).elevation).toBeGreaterThan(45);
    const dawn = sampleColosseumSky(0.12);
    const reveal = sampleColosseumSky(0.92);
    expect(dawn.haze).toBeLessThan(0.18);
    expect(reveal.haze).toBeLessThan(0.2);
  });

  it('declares a deterministic valley-to-hills world', () => {
    expect(createColosseumEnvironmentPlan()).toEqual(createColosseumEnvironmentPlan());
    expect(createColosseumEnvironmentPlan()).toEqual(COLOSSEUM_ENVIRONMENT);
    expect(COLOSSEUM_ENVIRONMENT.layers.map((layer) => layer.id)).toEqual([
      'roman-valley-sky',
      'palatine-caelian',
      'drained-valley',
      'amphitheatre',
      'work-systems',
      'foreground-road',
    ]);
    expect(COLOSSEUM_ENVIRONMENT.terrain.radius).toBeGreaterThan(500);
    expect(COLOSSEUM_ENVIRONMENT.ecology.pines).toBeGreaterThan(100);
    expect(COLOSSEUM_ENVIRONMENT.ecology.insulae).toBeGreaterThan(120);
    expect(COLOSSEUM_ENVIRONMENT.ecology.aqueductPiers).toBeGreaterThan(12);
    expect(COLOSSEUM_ENVIRONMENT.monument.height).toBe(48);
    expect(COLOSSEUM_ENVIRONMENT.monument.bays).toBe(80);
    expect(COLOSSEUM_ENVIRONMENT.exclusions).toContain('modern tourism');
    expect(COLOSSEUM_ENVIRONMENT.exclusions).toContain('Giza ramps');
  });

  it('keeps the Tivoli haul route east of the ellipse', () => {
    expect(COLOSSEUM_CONSTRUCTION.routes.map((route) => route.id)).toEqual(['tivoli-east']);
    const route = COLOSSEUM_CONSTRUCTION.routes[0]!;
    expect(route.quarry[0]).toBeGreaterThan(route.road[0]);
    expect(route.road[0]).toBeGreaterThan(route.staging[0]);
    expect(route.staging[0]).toBeGreaterThan(90);
  });

  it('uses a deterministic high-angle camera with portrait compensation', () => {
    for (const t of [0, 0.14, 0.34, 0.54, 0.72, 0.9, 1]) {
      expect(colosseumCinematicShotAt(t, 16 / 9)).toEqual(colosseumCinematicShotAt(t, 16 / 9));
      const shot = colosseumCinematicShotAt(t, 16 / 9);
      expect(shot.radius).toBeGreaterThanOrEqual(470);
      expect(shot.radius).toBeLessThanOrEqual(700);
      expect(shot.fov).toBe(35);
      expect((shot.pitch * 180) / Math.PI).toBeLessThan(shot.fov / 2);
    }
    const desktop = colosseumCinematicShotAt(0.54, 16 / 9);
    const portrait = colosseumCinematicShotAt(0.54, 390 / 844);
    expect(portrait.radius).toBeGreaterThan(desktop.radius);
    expect(portrait.fov).toBe(42);
    expect(colosseumCinematicShotAt(1, 16 / 9).radius).toBeGreaterThan(
      colosseumCinematicShotAt(0.18, 16 / 9).radius,
    );
    const opening = colosseumCinematicShotAt(0, 16 / 9);
    expect(Math.cos(opening.azimuth)).toBeGreaterThan(0.9);
    expect(colosseumCinematicShotAt(0.12, 16 / 9).azimuth).toBeGreaterThan(opening.azimuth + 0.05);
    expect(colosseumCinematicShotAt(1, 16 / 9).azimuth - opening.azimuth).toBeGreaterThan(0.7);
    expect(colosseumCinematicShotAt(1, 16 / 9).azimuth - opening.azimuth).toBeLessThan(1.4);
  });

  it('dispatches Colosseum without changing Giza, Stonehenge, Petra, or remaining fallbacks', () => {
    expect(referenceWorldKindFor('pyramids-of-giza')).toBe('giza');
    expect(referenceWorldKindFor('stonehenge')).toBe('stonehenge');
    expect(referenceWorldKindFor('petra')).toBe('petra');
    expect(referenceWorldKindFor('colosseum')).toBe('colosseum');
    expect(referenceWorldKindFor('sydney-opera-house')).toBe('sydney');
    expect(referenceWorldKindFor('eiffel-tower')).toBe('eiffel');
    expect(referenceWorldKindFor('machu-picchu')).toBe('legacy');
  });

  it('builds arcade bays from extruded arch geometry', () => {
    const arch = createColosseumPartGeometry('arch');
    const block = createColosseumPartGeometry('block');
    expect(arch.type).toBe('ExtrudeGeometry');
    expect(block.type).toBe('BoxGeometry');
    arch.computeBoundingBox();
    const box = arch.boundingBox!;
    expect(box.max.x - box.min.x).toBeCloseTo(1, 1);
    expect(box.max.y - box.min.y).toBeCloseTo(1, 1);
    expect(box.max.z - box.min.z).toBeCloseTo(1, 1);
    expect(arch.getAttribute('position')!.count).toBeGreaterThan(24);
    arch.dispose();
    block.dispose();
  });

  it('uses the shared Giza water recipe for the remaining lake and Tiber', () => {
    const library = createMaterialLibrary(fixtureWonder);
    const environment = new ColosseumEnvironment(library);
    const lake = environment.group.getObjectByName('colosseum-nero-lake') as Mesh;
    const tiber = environment.group.getObjectByName('colosseum-tiber-glint') as Mesh;
    expect(lake.material).toBe(library.water);
    expect(tiber.material).toBe(library.water);
    environment.dispose();
  });
});
