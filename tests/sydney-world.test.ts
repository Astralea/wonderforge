import { describe, expect, it } from 'vitest';
import { InstancedMesh, Mesh } from 'three';
import { SYDNEY_CONSTRUCTION } from '../src/data/sydneyConstruction';
import {
  SYDNEY_ENVIRONMENT,
  createSydneyEnvironmentPlan,
} from '../src/data/sydneyEnvironment';
import {
  SYDNEY_SKY,
  sampleSydneySky,
  sydneySunStateAt,
} from '../src/data/sydneySky';
import { SYDNEY_SAILS, SYDNEY_SPHERE_RADIUS } from '../src/data/sydneyConstruction';
import type { Wonder } from '../src/data/types';
import { sydneyCinematicShotAt } from '../src/engine/sydneyCamera';
import { createSydneyHarbourLots, sydneyHarbourLotsOf } from '../src/engine/sydneyHarbourLots';
import { SYDNEY_BRIDGE, SYDNEY_WATER_Y, sydneyGroundKindAt, sydneyTerrainHeightAt } from '../src/engine/sydneyTerrain';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import { SydneyEnvironment } from '../src/render/three/SydneyEnvironment';
import { createSydneyPartGeometry, createSailGeometry } from '../src/render/three/SydneyStoneSystem';
import { referenceWorldKindFor } from '../src/render/three/sceneRegistry';
import { trackFor } from '../src/data/soundtrack';

const fixtureWonder: Wonder = {
  id: 'sydney-water-fixture',
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

describe('Sydney Opera House world contract (Spec 13)', () => {
  it('owns a deterministic harbour sky through the night reveal', () => {
    expect(SYDNEY_SKY.id).toBe('sydney-harbour-sky');
    for (const t of [0, 0.32, 0.58, 0.78, 0.92, 1]) {
      expect(sampleSydneySky(t)).toEqual(sampleSydneySky(t));
      const sample = sampleSydneySky(t);
      const zenithBlue = parseInt(sample.zenith.slice(5, 7), 16);
      const zenithRed = parseInt(sample.zenith.slice(1, 3), 16);
      expect(zenithBlue).toBeGreaterThan(zenithRed);
      expect(sample.fogStretch).toBeGreaterThan(1);
    }
    expect(sydneySunStateAt(0.5).elevation).toBeGreaterThan(45);
    const dawn = sampleSydneySky(0.12);
    const night = sampleSydneySky(1);
    expect(dawn.haze).toBeLessThan(0.18);
    expect(parseInt(night.zenith.slice(1, 3), 16)).toBeLessThan(parseInt(dawn.zenith.slice(1, 3), 16));
  });

  it('declares a deterministic harbour-to-point world', () => {
    expect(createSydneyEnvironmentPlan()).toEqual(createSydneyEnvironmentPlan());
    expect(createSydneyEnvironmentPlan()).toEqual(SYDNEY_ENVIRONMENT);
    expect(SYDNEY_ENVIRONMENT.layers.map((layer) => layer.id)).toEqual([
      'harbour-sky',
      'harbour-water',
      'bennelong-point',
      'shells',
      'work-systems',
      'foreground-yard',
    ]);
    expect(SYDNEY_ENVIRONMENT.terrain.radius).toBeGreaterThan(500);
    expect(SYDNEY_ENVIRONMENT.ecology.figs).toBeGreaterThan(20);
    expect(SYDNEY_ENVIRONMENT.ecology.quaySheds).toBeGreaterThan(6);
    expect(SYDNEY_ENVIRONMENT.monument.height).toBe(67);
    expect(SYDNEY_ENVIRONMENT.monument.sails).toBe(9);
    expect(SYDNEY_ENVIRONMENT.site.towerCranes).toBe(2);
    expect(SYDNEY_ENVIRONMENT.site.dozers).toBe(3);
    expect(SYDNEY_ENVIRONMENT.site.dumpTrucks).toBe(3);
    expect(SYDNEY_ENVIRONMENT.exclusions).toContain('Giza ramps');
    expect(SYDNEY_ENVIRONMENT.exclusions).toContain('Anno or other commercial meshes');
  });

  it('keeps the on-site yard south of the podium', () => {
    expect(SYDNEY_CONSTRUCTION.routes.map((route) => route.id)).toEqual(['point-yard']);
    const route = SYDNEY_CONSTRUCTION.routes[0]!;
    expect(route.yard[2]).toBeGreaterThan(route.road[2]);
    expect(route.road[2]).toBeGreaterThan(route.staging[2]);
  });

  it('uses a deterministic high-angle camera with portrait compensation', () => {
    for (const t of [0, 0.14, 0.34, 0.54, 0.72, 0.9, 1]) {
      expect(sydneyCinematicShotAt(t, 16 / 9)).toEqual(sydneyCinematicShotAt(t, 16 / 9));
      const shot = sydneyCinematicShotAt(t, 16 / 9);
      const pitchDeg = (shot.pitch * 180) / Math.PI;
      expect(shot.radius).toBeGreaterThanOrEqual(500);
      expect(shot.radius).toBeLessThanOrEqual(820);
      expect(shot.fov).toBe(35);
      expect(pitchDeg).toBeGreaterThan(19);
      expect(pitchDeg).toBeLessThan(24);
    }
    const desktop = sydneyCinematicShotAt(0.54, 16 / 9);
    const portrait = sydneyCinematicShotAt(0.54, 390 / 844);
    expect(portrait.radius).toBeGreaterThan(desktop.radius);
    expect(portrait.fov).toBe(42);
    const opening = sydneyCinematicShotAt(0, 16 / 9);
    expect(Math.cos(opening.azimuth)).toBeGreaterThan(0.9);
    expect(sydneyCinematicShotAt(0.12, 16 / 9).azimuth).toBeGreaterThan(opening.azimuth + 0.05);
    expect(sydneyCinematicShotAt(1, 16 / 9).azimuth - opening.azimuth).toBeGreaterThan(0.7);
    expect(sydneyCinematicShotAt(1, 16 / 9).azimuth - opening.azimuth).toBeLessThan(1.4);
  });

  it('dispatches Sydney without changing Giza, Stonehenge, Petra, Colosseum, or remaining fallbacks', () => {
    expect(referenceWorldKindFor('pyramids-of-giza')).toBe('giza');
    expect(referenceWorldKindFor('stonehenge')).toBe('stonehenge');
    expect(referenceWorldKindFor('petra')).toBe('petra');
    expect(referenceWorldKindFor('colosseum')).toBe('colosseum');
    expect(referenceWorldKindFor('sydney-opera-house')).toBe('sydney');
    expect(referenceWorldKindFor('eiffel-tower')).toBe('eiffel');
    expect(referenceWorldKindFor('machu-picchu')).toBe('legacy');
  });

  it('builds sail skins from spherical patches and owns a harbour score', () => {
    const sail = createSydneyPartGeometry('sail');
    const rib = createSydneyPartGeometry('rib');
    expect(sail.type).toBe('SphereGeometry');
    expect(rib.type).toBe('BoxGeometry');
    sail.computeBoundingBox();
    const box = sail.boundingBox!;
    expect(box.max.x - box.min.x).toBeCloseTo(1, 1);
    expect(box.max.y - box.min.y).toBeCloseTo(1, 1);
    expect(box.max.z - box.min.z).toBeCloseTo(1, 1);
    expect(sail.getAttribute('position')!.count).toBeGreaterThan(24);
    sail.dispose();
    rib.dispose();
    expect(trackFor('sydney-opera-house', 'cinematic')?.src).toBe('/audio/sydney-opera-house-cinematic.mp3');
    expect(trackFor('sydney-opera-house', 'ambient')?.src).toBe('/audio/sydney-opera-house-ambient-loop.mp3');
  });

  it('loads Blender-authored sail skins from the harbour kit', async () => {
    const { loadSydneySailGeometries } = await import('../src/render/three/sydneyKit');
    const sails = await loadSydneySailGeometries();
    expect(sails).toHaveLength(9);
    for (const geom of sails) {
      expect(geom.getAttribute('position')!.count).toBeGreaterThan(80);
      geom.computeBoundingBox();
      const box = geom.boundingBox!;
      const h = box.max.y - box.min.y;
      expect(h).toBeGreaterThan(12);
      expect(h).toBeLessThan(90);
      geom.dispose();
    }
  });

  it('creates per-sail full-size Utzon vaults from the 75 m sphere, never a stretched unit shape', () => {
    for (const def of SYDNEY_SAILS) {
      const geom = createSailGeometry(def);
      expect(geom.getAttribute('position')!.count).toBeGreaterThan(80);
      geom.computeBoundingBox();
      const box = geom.boundingBox!;
      const w = box.max.x - box.min.x;
      const h = box.max.y - box.min.y;
      const d = box.max.z - box.min.z;
      expect(Math.max(w, h, d)).toBeGreaterThan(SYDNEY_SPHERE_RADIUS * 0.1);
      expect(Math.max(w, h, d)).toBeLessThan(SYDNEY_SPHERE_RADIUS * 2.1);
      const dims = [w, h, d].sort((a, b) => a - b);
      expect(dims[2]! / Math.max(1, dims[0]!)).toBeLessThan(8);
      geom.dispose();
    }
  });

  it('uses the shared Giza water recipe and peninsula foam, never a tinted clone', () => {
    const library = createMaterialLibrary(fixtureWonder);
    const environment = new SydneyEnvironment(library);
    const water = environment.group.getObjectByName('sydney-harbour-water') as Mesh;
    const foam = environment.group.getObjectByName('sydney-harbour-foam') as InstancedMesh;
    expect(water.material).toBe(library.water);
    expect(foam).toBeInstanceOf(InstancedMesh);
    expect(foam.count).toBeGreaterThan(24);
    expect(environment.group.getObjectByName('sydney-harbour-bridge-arch')).toBeTruthy();
    expect(environment.group.getObjectByName('sydney-harbour-bridge-pylon-south')).toBeTruthy();
    expect(environment.group.getObjectByName('sydney-harbour-hulls')).toBeTruthy();
    environment.dispose();
  });

  it('keeps harbour water under the Bridge span and land only on the pylon abutments', () => {
    expect(createSydneyHarbourLots()).toEqual(createSydneyHarbourLots());
    expect(sydneyHarbourLotsOf('office').length).toBeGreaterThan(12);
    expect(sydneyHarbourLotsOf('shed').length).toBeGreaterThan(6);
    expect(sydneyHarbourLotsOf('terrace').length).toBeGreaterThan(8);
    expect(sydneyHarbourLotsOf('fig').length).toBeGreaterThan(20);
    expect(sydneyTerrainHeightAt(SYDNEY_BRIDGE.x, (SYDNEY_BRIDGE.northZ + SYDNEY_BRIDGE.southZ) / 2)).toBe(SYDNEY_WATER_Y);
    expect(sydneyTerrainHeightAt(SYDNEY_BRIDGE.x, SYDNEY_BRIDGE.southZ)).toBeGreaterThan(2);
    expect(sydneyTerrainHeightAt(SYDNEY_BRIDGE.x, SYDNEY_BRIDGE.northZ)).toBeGreaterThan(2);
    expect(sydneyTerrainHeightAt(520, 520)).toBe(SYDNEY_WATER_Y);
    expect(sydneyGroundKindAt(0, 0)).toBe('point');
    expect(sydneyGroundKindAt(8, 230)).toBe('city');
  });
});
