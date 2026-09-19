import { describe, expect, it } from 'vitest';
import { DirectionalLight, Color, InstancedMesh, Matrix4, MeshStandardMaterial, Vector3 } from 'three';
import { STONEHENGE_CONSTRUCTION } from '../src/data/stonehengeConstruction';
import {
  STONEHENGE_ENVIRONMENT,
  createStonehengeEnvironmentPlan,
} from '../src/data/stonehengeEnvironment';
import {
  sampleStonehengeSky,
  stonehengeShadowGroundDirection,
  stonehengeSunDirectionAt,
  stonehengeSunStateAt,
  STONEHENGE_SKY,
  STONEHENGE_SOLSTICE_AXIS_DEGREES,
  STONEHENGE_SOLSTICE_CAPTION_T,
} from '../src/data/stonehengeSky';
import { stonehenge } from '../src/data/wonders/stonehenge';
import { stonehengeCinematicShotAt } from '../src/engine/stonehengeCamera';
import { stonehengeTerrainHeightAt } from '../src/engine/stonehengeTerrain';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import { StonehengeEnvironment } from '../src/render/three/StonehengeEnvironment';
import { createStonehengeStoneGeometry } from '../src/render/three/StonehengeStoneSystem';
import { applyStonehengeShadow } from '../src/render/three/stonehengeShadow';
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
    expect(stonehengeSunStateAt(0.9).elevation).toBeGreaterThanOrEqual(5);
    expect(stonehengeSunStateAt(0.9).elevation).toBeLessThanOrEqual(6.5);
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
    expect(STONEHENGE_ENVIRONMENT.ecology.treeClusters).toBeGreaterThanOrEqual(20);
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
    expect(stonehengeCinematicShotAt(0.78, 16 / 9).pitch).toBeGreaterThan((8 * Math.PI) / 180);
    expect(stonehengeCinematicShotAt(0.78, 16 / 9).pitch).toBeLessThan((12 * Math.PI) / 180);
    expect(stonehengeCinematicShotAt(0.68, 16 / 9).target[2]).toBeLessThan(-8);
    expect(stonehengeCinematicShotAt(1, 16 / 9).radius).toBeGreaterThanOrEqual(110);
    expect(portrait.radius).toBeGreaterThan(desktop.radius);
    expect(portrait.fov).toBe(42);
  });

  it('puts the sun and stone shadows on the solstitial axis', () => {
    expect(STONEHENGE_SKY.sun.dawnAzimuthDegrees).toBeCloseTo(STONEHENGE_SOLSTICE_AXIS_DEGREES, 5);
    expect(STONEHENGE_SKY.sun.duskAzimuthDegrees).toBeCloseTo(STONEHENGE_SOLSTICE_AXIS_DEGREES - 180, 5);
    expect(STONEHENGE_SKY.sunDisc.angularRadiusDegrees).toBeGreaterThan(1);
    expect(STONEHENGE_SKY.sunDisc.intensity).toBeGreaterThan(1.5);

    const dawn = stonehengeSunStateAt(0);
    expect(dawn.azimuth).toBeCloseTo(STONEHENGE_SOLSTICE_AXIS_DEGREES, 5);
    expect(dawn.elevation).toBeCloseTo(STONEHENGE_SKY.sun.solsticeElevationDegrees, 5);

    const noon = stonehengeSunStateAt(0.5);
    expect(noon.azimuth).toBeCloseTo(-90, 5);
    expect(noon.elevation).toBeGreaterThan(50);

    for (const t of [STONEHENGE_SOLSTICE_CAPTION_T, 0.82, 0.9, 1]) {
      const sun = stonehengeSunStateAt(t);
      expect(sun.azimuth).toBeCloseTo(STONEHENGE_SKY.sun.duskAzimuthDegrees, 5);
      expect(sun.elevation).toBeCloseTo(STONEHENGE_SKY.sun.solsticeElevationDegrees, 5);
    }

    const axisX = Math.cos(STONEHENGE_CONSTRUCTION.axisRadians);
    const axisZ = Math.sin(STONEHENGE_CONSTRUCTION.axisRadians);
    const dawnShadow = stonehengeShadowGroundDirection(0);
    expect(dawnShadow.x * axisX + dawnShadow.z * axisZ).toBeLessThan(-0.97);
    const duskShadow = stonehengeShadowGroundDirection(0.82);
    expect(duskShadow.x * axisX + duskShadow.z * axisZ).toBeGreaterThan(0.97);
  });

  it('looks down the avenue during the solstice caption so the disc can sit on the axis', () => {
    const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
    for (const t of [0.78, 0.82, 0.88, 1]) {
      const shot = stonehengeCinematicShotAt(t, 16 / 9);
      expect(Math.abs(wrap(shot.azimuth - STONEHENGE_CONSTRUCTION.axisRadians))).toBeLessThan(0.04);
      expect(Math.hypot(shot.target[0], shot.target[2])).toBeLessThan(2);
    }
  });

  it('keeps the Heel Stone and the long solstice throw inside the shadow volume', () => {
    const heel = STONEHENGE_CONSTRUCTION.stones.find((stone) => stone.id === 'heel-stone')!;
    const throwLength = 7 / Math.tan((STONEHENGE_SKY.sun.solsticeElevationDegrees * Math.PI) / 180);
    const axisX = Math.cos(STONEHENGE_CONSTRUCTION.axisRadians);
    const axisZ = Math.sin(STONEHENGE_CONSTRUCTION.axisRadians);
    const points: Array<[number, number, number]> = [
      [0, 0, 0],
      [0, 7.2, 0],
      [heel.finalPosition[0], 0, heel.finalPosition[2]],
      [axisX * throwLength, 0, axisZ * throwLength],
      [-axisX * throwLength, 0, -axisZ * throwLength],
    ];
    for (const t of [0, 0.5, 0.82, 0.9]) {
      const sun = new DirectionalLight();
      const [x, y, z] = stonehengeSunDirectionAt(t);
      applyStonehengeShadow(sun, new Vector3(x, y, z));
      sun.target.updateMatrixWorld();
      sun.updateMatrixWorld();
      sun.shadow.updateMatrices(sun);
      const projected = new Vector3();
      let maximum = 0;
      for (const point of points) {
        projected.set(...point).project(sun.shadow.camera);
        maximum = Math.max(maximum, Math.abs(projected.x), Math.abs(projected.y), Math.abs(projected.z));
      }
      expect(maximum).toBeLessThan(1);
    }
  });

  it('dispatches both production scenes without changing remaining fallbacks', () => {
    expect(referenceWorldKindFor('pyramids-of-giza')).toBe('giza');
    expect(referenceWorldKindFor('stonehenge')).toBe('stonehenge');
    expect(referenceWorldKindFor('petra')).toBe('petra');
    expect(referenceWorldKindFor('sydney-opera-house')).toBe('sydney');
    expect(referenceWorldKindFor('eiffel-tower')).toBe('eiffel');
    expect(referenceWorldKindFor('machu-picchu')).toBe('legacy');
  });

  it('keeps the working floor flat and the horizon as offset lobes', () => {
    expect(Math.abs(stonehengeTerrainHeightAt(0, 0))).toBeLessThan(0.05);
    expect(Math.abs(stonehengeTerrainHeightAt(18, -12))).toBeLessThan(0.25);
    expect(stonehengeTerrainHeightAt(-280, -210)).toBeGreaterThan(8);
    expect(stonehengeTerrainHeightAt(250, 250)).toBeGreaterThan(6);
    expect(
      Math.abs(stonehengeTerrainHeightAt(280, 0) - stonehengeTerrainHeightAt(0, 280)),
    ).toBeGreaterThan(2);
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

  it('renders Aubrey holes as recessed pits, not a ring of pale discs', () => {
    const library = createMaterialLibrary(stonehenge);
    const environment = new StonehengeEnvironment(library);
    const holes = environment.group.getObjectByName('stonehenge-aubrey-hole-ring') as InstancedMesh;
    const rims = environment.group.getObjectByName('stonehenge-aubrey-hole-chalk-rims') as InstancedMesh;
    expect(holes.count).toBe(56);
    expect(rims.count).toBe(56);
    const holeColor = (holes.material as MeshStandardMaterial).color;
    const rimColor = (rims.material as MeshStandardMaterial).color;
    const milk = new Color('#d8d2be');
    expect(holeColor.getHSL({ h: 0, s: 0, l: 0 }).l).toBeLessThan(0.42);
    expect(rimColor.getHSL({ h: 0, s: 0, l: 0 }).l).toBeLessThan(milk.getHSL({ h: 0, s: 0, l: 0 }).l);
    environment.dispose();
  });

  it('keeps the tree mosaic on the far downs, not crowding the ring', () => {
    const library = createMaterialLibrary(stonehenge);
    const environment = new StonehengeEnvironment(library);
    const trunks = environment.group.getObjectByName('stonehenge-distant-tree-trunks') as InstancedMesh;
    const matrix = new Matrix4();
    const position = new Vector3();
    expect(trunks.count).toBeGreaterThan(0);
    for (let i = 0; i < trunks.count; i += 1) {
      trunks.getMatrixAt(i, matrix);
      position.setFromMatrixPosition(matrix);
      expect(Math.hypot(position.x, position.z)).toBeGreaterThan(280);
    }
    environment.dispose();
  });
});
