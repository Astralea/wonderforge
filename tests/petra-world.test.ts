import { describe, expect, it } from 'vitest';
import { PETRA_CONSTRUCTION } from '../src/data/petraConstruction';
import {
  PETRA_ENVIRONMENT,
  createPetraEnvironmentPlan,
} from '../src/data/petraEnvironment';
import {
  PETRA_SKY,
  petraSunStateAt,
  samplePetraSky,
} from '../src/data/petraSky';
import { petraCinematicShotAt } from '../src/engine/petraCamera';
import { createPetraMemberGeometry } from '../src/render/three/PetraStoneSystem';
import { referenceWorldKindFor } from '../src/render/three/sceneRegistry';

describe('Petra world contract (Spec 11)', () => {
  it('owns a deterministic dry blue rift sky through the reveal', () => {
    expect(PETRA_SKY.id).toBe('petra-rift-sky');
    for (const t of [0, 0.32, 0.58, 0.78, 0.92, 1]) {
      expect(samplePetraSky(t)).toEqual(samplePetraSky(t));
      const sample = samplePetraSky(t);
      const zenithBlue = parseInt(sample.zenith.slice(5, 7), 16);
      const zenithRed = parseInt(sample.zenith.slice(1, 3), 16);
      expect(zenithBlue).toBeGreaterThan(zenithRed);
      expect(sample.fogStretch).toBeGreaterThan(1);
    }
    expect(petraSunStateAt(0.5).elevation).toBeGreaterThan(50);
    const dawn = samplePetraSky(0.12);
    const reveal = samplePetraSky(0.92);
    expect(dawn.haze).toBeLessThan(0.18);
    expect(reveal.haze).toBeLessThan(0.2);
    const revealBlue = parseInt(reveal.zenith.slice(5, 7), 16);
    const revealRed = parseInt(reveal.zenith.slice(1, 3), 16);
    expect(revealBlue).toBeGreaterThan(revealRed);
  });

  it('declares a deterministic Siq-to-massif world', () => {
    expect(createPetraEnvironmentPlan()).toEqual(createPetraEnvironmentPlan());
    expect(createPetraEnvironmentPlan()).toEqual(PETRA_ENVIRONMENT);
    expect(PETRA_ENVIRONMENT.layers.map((layer) => layer.id)).toEqual([
      'dry-rift-sky',
      'sandstone-massif',
      'siq-gorge',
      'treasury-facade',
      'work-systems',
      'foreground-siq-floor',
    ]);
    expect(PETRA_ENVIRONMENT.terrain.radius).toBeGreaterThan(120);
    expect(PETRA_ENVIRONMENT.facade.height).toBe(38.8);
    expect(PETRA_ENVIRONMENT.ecology.floorTufts).toBeGreaterThanOrEqual(120);
    expect(PETRA_ENVIRONMENT.exclusions).toContain('modern tourism');
    expect(PETRA_ENVIRONMENT.exclusions).toContain('Roman concrete vaults');
  });

  it('keeps the Siq haul route connected from the cliff to the dump', () => {
    expect(PETRA_CONSTRUCTION.routes.map((route) => route.id)).toEqual(['siq-south']);
    const route = PETRA_CONSTRUCTION.routes[0]!;
    expect(route.plaza[2]).toBeLessThan(route.ledge[2]);
    expect(route.siq[2]).toBeLessThan(route.plaza[2]);
    expect(route.dump[2]).toBeLessThan(route.siq[2]);
    expect(Math.abs(route.dump[0])).toBeGreaterThan(8);
  });

  it('uses a deterministic Siq-mouth camera with portrait compensation', () => {
    for (const t of [0, 0.16, 0.38, 0.58, 0.78, 0.92, 1]) {
      expect(petraCinematicShotAt(t, 16 / 9)).toEqual(petraCinematicShotAt(t, 16 / 9));
      const shot = petraCinematicShotAt(t, 16 / 9);
      expect(shot.radius).toBeGreaterThanOrEqual(38);
      expect(shot.radius).toBeLessThanOrEqual(70);
      expect(shot.fov).toBe(35);
      expect((shot.pitch * 180) / Math.PI).toBeLessThan(shot.fov / 2);
    }
    const desktop = petraCinematicShotAt(0.58, 16 / 9);
    const portrait = petraCinematicShotAt(0.58, 390 / 844);
    expect(portrait.radius).toBeGreaterThan(desktop.radius);
    expect(portrait.fov).toBe(42);
    expect(petraCinematicShotAt(1, 16 / 9).radius).toBeGreaterThan(
      petraCinematicShotAt(0.16, 16 / 9).radius,
    );
  });

  it('dispatches Petra without changing Giza, Stonehenge, or remaining fallbacks', () => {
    expect(referenceWorldKindFor('pyramids-of-giza')).toBe('giza');
    expect(referenceWorldKindFor('stonehenge')).toBe('stonehenge');
    expect(referenceWorldKindFor('petra')).toBe('petra');
    expect(referenceWorldKindFor('colosseum')).toBe('colosseum');
    expect(referenceWorldKindFor('sydney-opera-house')).toBe('sydney');
    expect(referenceWorldKindFor('eiffel-tower')).toBe('eiffel');
    expect(referenceWorldKindFor('machu-picchu')).toBe('legacy');
  });

  it('builds column and cone members from dedicated geometries', () => {
    const column = createPetraMemberGeometry('column');
    const cone = createPetraMemberGeometry('cone');
    const block = createPetraMemberGeometry('block');
    expect(column.type).toBe('CylinderGeometry');
    expect(cone.type).toBe('ConeGeometry');
    expect(block.type).toBe('BoxGeometry');
    column.dispose();
    cone.dispose();
    block.dispose();
  });
});
