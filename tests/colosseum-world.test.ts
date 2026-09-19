import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Mesh, Vector3 } from 'three';
import { COLOSSEUM_CONSTRUCTION } from '../src/data/colosseumConstruction';
import { captionsFor } from '../src/data/captions';
import { getWonder } from '../src/data';
import { narrationClipFor } from '../src/data/narration';
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
import {
  COLOSSEUM_ROME_LOTS,
  colosseumRomeLotsOf,
  createColosseumRomeLots,
} from '../src/engine/colosseumRomeLots';
import {
  colosseumHillCrestHeight,
  colosseumLakeScarWeight,
  colosseumTerrainHeightAt,
  COLOSSEUM_HILLS,
} from '../src/engine/colosseumTerrain';
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
    expect(COLOSSEUM_ENVIRONMENT.terrain.radius).toBeGreaterThan(2000);
    const portraitReveal = colosseumCinematicShotAt(1, 390 / 844);
    expect(COLOSSEUM_ENVIRONMENT.terrain.radius).toBeGreaterThan(portraitReveal.radius * 2.4);
    const library = createMaterialLibrary(fixtureWonder);
    const environment = new ColosseumEnvironment(library);
    const floor = environment.group.getObjectByName('colosseum-valley-floor') as Mesh;
    floor.geometry.computeBoundingBox();
    const half = floor.geometry.boundingBox!.max.x;
    expect(half).toBeGreaterThan(portraitReveal.radius * 2.4);
    environment.dispose();
    expect(COLOSSEUM_ENVIRONMENT.ecology.pines).toBeGreaterThan(200);
    expect(COLOSSEUM_ENVIRONMENT.ecology.cypress).toBeGreaterThan(80);
    expect(COLOSSEUM_ENVIRONMENT.ecology.insulae).toBeGreaterThan(200);
    expect(COLOSSEUM_ENVIRONMENT.ecology.farBlocks).toBeGreaterThan(30);
    expect(COLOSSEUM_ENVIRONMENT.ecology.aqueductPiers).toBeGreaterThan(12);
    expect(COLOSSEUM_ENVIRONMENT.monument.height).toBe(48);
    expect(COLOSSEUM_ENVIRONMENT.monument.bays).toBe(80);
    expect(COLOSSEUM_ENVIRONMENT.exclusions).toContain('modern tourism');
    expect(COLOSSEUM_ENVIRONMENT.exclusions).toContain('standing water in the working oval');
    expect(colosseumLakeScarWeight(0, 0)).toBeGreaterThan(0.8);
    expect(colosseumLakeScarWeight(400, 400)).toBe(0);
    expect(colosseumHillCrestHeight()).toBeLessThan(COLOSSEUM_ENVIRONMENT.monument.height);
    for (const hill of COLOSSEUM_HILLS) {
      expect(Math.hypot(hill.x, hill.z)).toBeGreaterThan(300);
      expect(colosseumTerrainHeightAt(hill.x, hill.z)).toBeLessThan(
        COLOSSEUM_ENVIRONMENT.monument.height,
      );
    }
    expect(Math.abs(colosseumTerrainHeightAt(0, 0))).toBeLessThan(0.05);
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
      expect(shot.radius).toBeGreaterThanOrEqual(280);
      expect(shot.radius).toBeLessThanOrEqual(430);
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
    expect(Math.sin(opening.azimuth)).toBeGreaterThan(0.9);
    const angularWidth = (radius: number) =>
      (2 * Math.atan(COLOSSEUM_ENVIRONMENT.monument.major / 2 / radius) * 180) / Math.PI;
    expect(angularWidth(opening.radius)).toBeGreaterThan(28);
    expect(angularWidth(colosseumCinematicShotAt(1, 16 / 9).radius)).toBeGreaterThan(24);
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

  it('builds arcade bays from extruded arch geometry and cavea from stepped seats', () => {
    const arch = createColosseumPartGeometry('arch');
    const block = createColosseumPartGeometry('block');
    const seat = createColosseumPartGeometry('seat');
    expect(arch.type).toBe('ExtrudeGeometry');
    expect(block.type).toBe('BoxGeometry');
    expect(seat.type).toBe('ExtrudeGeometry');
    arch.computeBoundingBox();
    seat.computeBoundingBox();
    const box = arch.boundingBox!;
    expect(box.max.x - box.min.x).toBeCloseTo(1, 1);
    expect(box.max.y - box.min.y).toBeCloseTo(1, 1);
    expect(box.max.z - box.min.z).toBeCloseTo(1, 1);
    expect(arch.getAttribute('position')!.count).toBeGreaterThan(24);
    expect(seat.getAttribute('position')!.count).toBeGreaterThan(48);
    const seatBox = seat.boundingBox!;
    expect(seatBox.max.x - seatBox.min.x).toBeCloseTo(1, 1);
    expect(seatBox.max.y - seatBox.min.y).toBeCloseTo(1, 1);
    expect(seatBox.max.z - seatBox.min.z).toBeCloseTo(1, 1);
    arch.dispose();
    block.dispose();
    seat.dispose();
  });

  it('keeps standing water out of the valley and dresses the hills', () => {
    const library = createMaterialLibrary(fixtureWonder);
    const environment = new ColosseumEnvironment(library);
    expect(environment.group.getObjectByName('colosseum-nero-lake')).toBeUndefined();
    expect(environment.group.getObjectByName('colosseum-tiber-glint')).toBeUndefined();
    const scar = environment.group.getObjectByName('colosseum-lake-scar') as Mesh;
    expect(scar).toBeTruthy();
    expect(scar.material).not.toBe(library.water);
    const pines = environment.group.getObjectByName('colosseum-umbrella-pines');
    const roofs = environment.group.getObjectByName('colosseum-insulae-roofs') as InstancedMesh;
    const houses = environment.group.getObjectByName('colosseum-insulae') as InstancedMesh;
    const arches = environment.group.getObjectByName('colosseum-aqueduct-arches');
    expect(pines).toBeTruthy();
    expect(roofs).toBeTruthy();
    expect(arches).toBeTruthy();
    expect(roofs.geometry.type).not.toBe('ConeGeometry');
    houses.geometry.computeBoundingBox();
    roofs.geometry.computeBoundingBox();
    expect(houses.geometry.boundingBox!.max.y).toBeGreaterThan(6);
    expect(roofs.geometry.boundingBox!.max.y - roofs.geometry.boundingBox!.min.y).toBeGreaterThan(1.2);
    expect(houses.count).toBeGreaterThan(160);
    houses.geometry.computeBoundingBox();
    expect(houses.geometry.boundingBox!.max.x - houses.geometry.boundingBox!.min.x).toBeGreaterThan(9.5);
    const light = {
      sun: { azimuth: 0, elevation: 20, color: '#fff', intensity: 1 },
      ambient: { skyColor: '#fff', groundColor: '#fff', intensity: 1 },
      sky: '#fff',
      fog: '#fff',
      emissive: 0,
    };
    environment.update(0, light, sampleColosseumSky(0));
    expect((environment.group.getObjectByName('colosseum-arena-sand') as Mesh).visible).toBe(false);
    expect(environment.group.getObjectByName('colosseum-outer-haul-ring')!.visible).toBe(false);
    environment.update(0.8, light, sampleColosseumSky(0.8));
    expect((environment.group.getObjectByName('colosseum-arena-sand') as Mesh).visible).toBe(true);
    environment.dispose();
  });

  it('keeps hill vegetation and the aqueduct below the facade, off the opening lens', () => {
    expect(colosseumHillCrestHeight() + 14).toBeLessThan(COLOSSEUM_ENVIRONMENT.monument.height);
    const opening = colosseumCinematicShotAt(0, 16 / 9);
    const library = createMaterialLibrary(fixtureWonder);
    const environment = new ColosseumEnvironment(library);
    const piers = environment.group.getObjectByName('colosseum-aqueduct-piers') as InstancedMesh;
    const matrix = new Matrix4();
    const position = new Vector3();
    piers.getMatrixAt(0, matrix);
    position.setFromMatrixPosition(matrix);
    const horizontal = Math.cos(opening.pitch) * opening.radius;
    const cameraX = opening.target[0] + Math.cos(opening.azimuth) * horizontal;
    const cameraZ = opening.target[2] + Math.sin(opening.azimuth) * horizontal;
    expect(Math.hypot(position.x - cameraX, position.z - cameraZ)).toBeGreaterThan(280);
    environment.dispose();
  });

  it('authors deterministic street-lot Rome instead of a Monopoly grid', async () => {
    expect(createColosseumRomeLots()).toEqual(createColosseumRomeLots());
    expect(createColosseumRomeLots()).toEqual(COLOSSEUM_ROME_LOTS);
    expect(colosseumRomeLotsOf('insula').length).toBeGreaterThan(160);
    expect(colosseumRomeLotsOf('pine').length).toBeGreaterThan(200);
    expect(colosseumRomeLotsOf('palace').length).toBeGreaterThan(16);
    for (const lot of COLOSSEUM_ROME_LOTS) {
      expect(Math.hypot(lot.x / 94, lot.z / 78)).toBeGreaterThan(2.15);
    }
    const library = createMaterialLibrary(fixtureWonder);
    const environment = new ColosseumEnvironment(library);
    await environment.ready;
    const roofs = environment.group.getObjectByName('colosseum-insulae-roofs') as InstancedMesh;
    const fabric = environment.group.getObjectByName('colosseum-far-fabric') as InstancedMesh;
    expect(roofs.geometry.type).not.toBe('ConeGeometry');
    expect(fabric.geometry.type).not.toBe('BoxGeometry');
    fabric.geometry.computeBoundingBox();
    expect(fabric.geometry.boundingBox!.max.x - fabric.geometry.boundingBox!.min.x).toBeGreaterThan(8);
    const insulae = colosseumRomeLotsOf('insula');
    let packed = 0;
    for (const lot of insulae) {
      const neighbors = insulae.filter(
        (other) => other !== lot && Math.hypot(other.x - lot.x, other.z - lot.z) < 32,
      ).length;
      if (neighbors >= 8) packed += 1;
    }
    expect(packed).toBe(0);
    environment.dispose();
  });

  it('opens on the drained valley, not a spoken lake the viewer cannot see', () => {
    const beats = captionsFor(getWonder('colosseum'));
    expect(beats[0]!.id).toBe('colosseum-valley');
    expect(beats[0]!.text).not.toMatch(/lake/i);
    expect(beats[0]!.kicker).toBe('The valley');
    expect(narrationClipFor('colosseum', 'colosseum-valley')?.captionText).toBe(beats[0]!.text);
  });
});
