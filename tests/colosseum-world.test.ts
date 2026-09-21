import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Mesh, PerspectiveCamera, Vector3 } from 'three';
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
  COLOSSEUM_CELESTIAL_ANGULAR_SCALE,
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

  it('uses a gentle west-side arc that settles toward the eastern moonrise', () => {
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
    expect(Math.sin(opening.azimuth)).toBeLessThan(0);
    expect(Math.cos(opening.azimuth)).toBeLessThan(0);
    const angularWidth = (radius: number) =>
      (2 * Math.atan(COLOSSEUM_ENVIRONMENT.monument.major / 2 / radius) * 180) / Math.PI;
    expect(angularWidth(opening.radius)).toBeGreaterThan(28);
    expect(angularWidth(colosseumCinematicShotAt(1, 16 / 9).radius)).toBeGreaterThan(24);
    expect(colosseumCinematicShotAt(0.12, 16 / 9).azimuth).toBeLessThan(opening.azimuth - 0.05);
    const closing = colosseumCinematicShotAt(1, 16 / 9);
    expect(opening.azimuth - closing.azimuth).toBeGreaterThan(.6);
    expect(opening.azimuth - closing.azimuth).toBeLessThan(Math.PI / 2);
    expect(Math.sin(closing.azimuth)).toBeGreaterThan(0);
    expect(Math.cos(closing.azimuth)).toBeLessThan(0);
    expect(closing.pitch).toBeLessThan(colosseumCinematicShotAt(.48).pitch / 2);
    // Bodies move across a settled evening viewpoint; their sky positions do
    // not drive an orbit that pins the rising Moon to the center of the frame.
    expect(colosseumCinematicShotAt(.84).azimuth).toBe(closing.azimuth);
    expect(colosseumCinematicShotAt(.84).pitch).toBe(closing.pitch);
    const closingBearing = (270 - closing.azimuth * 180 / Math.PI + 360) % 360;
    expect(closingBearing).toBeGreaterThan(120);
    expect(closingBearing).toBeLessThan(123);
  });

  it('keeps the complete ellipse inside desktop and narrow portrait frames through the arc', () => {
    for (const aspect of [16 / 9, 1.6, 390 / 844, 320 / 844, 375 / 667, .6, .71]) {
      for (let frame = 0; frame <= 120; frame++) {
        const t = frame / 120, shot = colosseumCinematicShotAt(t, aspect);
        const camera = new PerspectiveCamera(shot.fov, aspect, .1, 4000);
        const horizontal = Math.cos(shot.pitch) * shot.radius;
        camera.position.set(
          shot.target[0] + Math.cos(shot.azimuth) * horizontal,
          shot.target[1] + Math.sin(shot.pitch) * shot.radius,
          -shot.target[2] - Math.sin(shot.azimuth) * horizontal,
        );
        camera.lookAt(shot.target[0], shot.target[1], -shot.target[2]); camera.updateMatrixWorld();
        for (let bay = 0; bay < 80; bay++) {
          const theta = bay * Math.PI * 2 / 80;
          for (const y of [0, 48]) {
            const point = new Vector3(94 * Math.cos(theta), y, -78 * Math.sin(theta)).project(camera);
            expect(Math.abs(point.x), `horizontal t=${t}, aspect=${aspect}, bay=${bay}`).toBeLessThan(.97);
            expect(Math.abs(point.y), `vertical t=${t}, aspect=${aspect}, bay=${bay}`).toBeLessThan(.96);
            expect(point.z).toBeLessThan(1);
          }
        }
      }
    }
  });

  it('keeps the rising lunar disc clear of the actual film letterbox through the close', () => {
    for (const aspect of [16 / 9, 1.6, 390 / 844, 320 / 844, 375 / 667, .6, .71]) {
      for (let frame = 0; frame <= 120; frame++) {
        const t = .88 + .12 * frame / 120, shot = colosseumCinematicShotAt(t, aspect);
        const camera = new PerspectiveCamera(shot.fov, aspect, .1, 4000);
        const horizontal = Math.cos(shot.pitch) * shot.radius;
        camera.position.set(shot.target[0] + Math.cos(shot.azimuth) * horizontal,
          shot.target[1] + Math.sin(shot.pitch) * shot.radius,
          -shot.target[2] - Math.sin(shot.azimuth) * horizontal);
        camera.lookAt(shot.target[0], shot.target[1], -shot.target[2]); camera.updateMatrixWorld();
        const moon = sampleColosseumSky(t).astronomy.moon;
        const direction = new Vector3(moon.direction[0], moon.direction[1], -moon.direction[2]);
        const tangent = new Vector3(0, 1, 0).cross(direction).normalize();
        const bitangent = direction.clone().cross(tangent);
        const radius = moon.angularRadiusDegrees * COLOSSEUM_CELESTIAL_ANGULAR_SCALE * Math.PI / 180;
        for (let rim = 0; rim < 32; rim++) {
          const angle = rim * Math.PI / 16;
          const ray = direction.clone().multiplyScalar(Math.cos(radius))
            .addScaledVector(tangent, Math.sin(radius) * Math.cos(angle))
            .addScaledVector(bitangent, Math.sin(radius) * Math.sin(angle));
          const screen = ray.multiplyScalar(1e6).add(camera.position).project(camera);
          // The production letterbox covers 6vh. Keep a further 1.5vh breathing
          // room, including the enlarged physical limb, not just its centre.
          expect((1 - screen.y) / 2, `top t=${t}, aspect=${aspect}`).toBeGreaterThan(.075);
          expect(Math.abs(screen.x), `side t=${t}, aspect=${aspect}`).toBeLessThan(.98);
        }
      }
    }
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
    expect(houses.geometry.boundingBox!.max.y).toBeGreaterThan(4);
    expect(roofs.geometry.boundingBox!.max.y - roofs.geometry.boundingBox!.min.y).toBeGreaterThan(1);
    const houseBodies = environment.group.children.filter((object): object is InstancedMesh => object instanceof InstancedMesh && !!object.userData.housingVariant && !object.name.endsWith('-roofs'));
    expect(houseBodies).toHaveLength(4);
    expect(houseBodies.reduce((sum, mesh) => sum + mesh.count, 0)).toBeGreaterThan(160);
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
    expect(colosseumRomeLotsOf('pine').length).toBeGreaterThan(100);
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
    expect(new Set(colosseumRomeLotsOf('insula').map(lot => lot.housing)).size).toBe(4);
    environment.dispose();
  });

  it('identifies the former lake site as history while showing the drained valley', () => {
    const beats = captionsFor(getWonder('colosseum'));
    expect(beats[0]!.id).toBe('colosseum-valley');
    expect(beats[0]!.text).toContain("site of Nero's lake");
    expect(beats[0]!.kicker).toBe("Nero's former lake");
    expect(narrationClipFor('colosseum', 'colosseum-valley')?.captionText).toBe(beats[0]!.text);
  });
});
