import { describe, expect, it } from 'vitest';
import { Box3, Color, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import { EIFFEL_CONSTRUCTION } from '../src/data/eiffelConstruction';
import {
  EIFFEL_ENVIRONMENT,
  createEiffelEnvironmentPlan,
} from '../src/data/eiffelEnvironment';
import {
  EIFFEL_SKY,
  EIFFEL_SKY_MIX,
  eiffelSunStateAt,
  sampleEiffelSky,
} from '../src/data/eiffelSky';
import type { Wonder } from '../src/data/types';
import { activeEiffelOperationsAt } from '../src/engine/eiffelConstruction';
import { EiffelEnvironment } from '../src/render/three/EiffelEnvironment';
import { createEiffelPartGeometry, EiffelStoneSystem, EIFFEL_BRACE_IRON, EIFFEL_BRACE_WEB, EIFFEL_BRACE_WEB_CLIMB, EIFFEL_CHORD_LACE, EIFFEL_CHORD_LACE_CLIMB, EIFFEL_DARK_IRON, EIFFEL_FAR_IRON } from '../src/render/three/EiffelStoneSystem';
import { EiffelWorkSystem } from '../src/render/three/EiffelWorkSystem';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import { referenceWorldKindFor } from '../src/render/three/sceneRegistry';

const worldSize = (obj: Object3D) => {
  obj.updateWorldMatrix(true, true);
  return new Box3().setFromObject(obj).getSize(new Vector3());
};

const fixtureWonder: Wonder = {
  id: 'eiffel-water-fixture',
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

describe('Eiffel Tower world contract (Spec 14)', () => {
  it('owns a deterministic Paris sky through the night reveal', () => {
    expect(EIFFEL_SKY.id).toBe('paris-champ-sky');
    for (const t of [0, 0.32, 0.58, 0.78, 0.92, 1]) {
      expect(sampleEiffelSky(t)).toEqual(sampleEiffelSky(t));
      const sample = sampleEiffelSky(t);
      const zenithBlue = parseInt(sample.zenith.slice(5, 7), 16);
      const zenithRed = parseInt(sample.zenith.slice(1, 3), 16);
      expect(zenithBlue).toBeGreaterThan(zenithRed);
      expect(sample.fogStretch).toBeGreaterThan(1);
    }
    expect(eiffelSunStateAt(0.5).elevation).toBeGreaterThan(40);
    expect(sampleEiffelSky(0.12).haze).toBeLessThan(0.18);
    expect(EIFFEL_SKY_MIX.horizonHi).toBeGreaterThan(0.06);
    expect(EIFFEL_SKY_MIX.horizonHi).toBeLessThan(0.12);
    expect(EIFFEL_SKY_MIX.warmFalloff).toBeGreaterThan(24);
    const dawnAz = (eiffelSunStateAt(0).azimuth * Math.PI) / 180;
    expect(Math.abs(Math.cos(dawnAz))).toBeGreaterThan(Math.abs(Math.sin(dawnAz)));
    expect(eiffelSunStateAt(0).azimuth).toBeGreaterThan(-40);
    expect(eiffelSunStateAt(0).azimuth).toBeLessThan(-20);
    const buildAz = (eiffelSunStateAt(0.58).azimuth * Math.PI) / 180;
    expect(Math.abs(Math.cos(buildAz))).toBeGreaterThan(Math.abs(Math.sin(buildAz)));
    expect(eiffelSunStateAt(0.12).azimuth).toBeGreaterThan(-12);
    expect(eiffelSunStateAt(0.12).azimuth).toBeLessThan(-4);
    expect(eiffelSunStateAt(0.58).azimuth).toBeLessThan(25);
    expect(eiffelSunStateAt(0.78).azimuth).toBeGreaterThan(70);
    expect(eiffelSunStateAt(0.78).azimuth).toBeLessThan(120);
    expect(eiffelSunStateAt(0.9).azimuth).toBeGreaterThan(140);
  });

  it('declares a deterministic Champ de Mars world', () => {
    expect(createEiffelEnvironmentPlan()).toEqual(createEiffelEnvironmentPlan());
    expect(createEiffelEnvironmentPlan()).toEqual(EIFFEL_ENVIRONMENT);
    expect(EIFFEL_ENVIRONMENT.layers.map((layer) => layer.id)).toEqual([
      'paris-champ-sky',
      'seine-trocadero',
      'champ-de-mars',
      'tower',
      'work-systems',
      'foreground-yard',
    ]);
    expect(EIFFEL_ENVIRONMENT.terrain.radius).toBeGreaterThan(500);
    expect(EIFFEL_ENVIRONMENT.ecology.trees).toBeGreaterThan(350);
    expect(EIFFEL_ENVIRONMENT.ecology.trees).toBeLessThan(600);
    expect(EIFFEL_ENVIRONMENT.ecology.roofs).toBeGreaterThan(200);
    expect(EIFFEL_ENVIRONMENT.ecology.roofs).toBeLessThan(400);
    expect(EIFFEL_ENVIRONMENT.site.stocks).toBeGreaterThanOrEqual(36);
    expect(EIFFEL_ENVIRONMENT.site.forges).toBeGreaterThanOrEqual(12);
    expect(EIFFEL_ENVIRONMENT.monument.height).toBe(312);
    expect(EIFFEL_ENVIRONMENT.exclusions).toContain('Giza ramps');
    expect(EIFFEL_ENVIRONMENT.exclusions).toContain('1937 Trocadéro');
  });

  it('keeps the Levallois haul route east of the Champ', () => {
    expect(EIFFEL_CONSTRUCTION.routes.map((route) => route.id)).toEqual(['levallois-east']);
    const route = EIFFEL_CONSTRUCTION.routes[0]!;
    expect(route.yard[0]).toBeGreaterThan(route.road[0]);
    expect(route.road[0]).toBeGreaterThan(route.staging[0]);
    expect(route.staging[0]).toBeGreaterThan(50);
  });

  it('dispatches Eiffel without changing Giza, prior replications, or remaining fallbacks', () => {
    expect(referenceWorldKindFor('pyramids-of-giza')).toBe('giza');
    expect(referenceWorldKindFor('stonehenge')).toBe('stonehenge');
    expect(referenceWorldKindFor('petra')).toBe('petra');
    expect(referenceWorldKindFor('colosseum')).toBe('colosseum');
    expect(referenceWorldKindFor('sydney-opera-house')).toBe('sydney');
    expect(referenceWorldKindFor('eiffel-tower')).toBe('eiffel');
    expect(referenceWorldKindFor('machu-picchu')).toBe('legacy');
  });

  it('builds lattice-column chords and flanged-bar braces at authored size', () => {
    const chord = createEiffelPartGeometry('chord');
    const brace = createEiffelPartGeometry('brace');
    const pier = createEiffelPartGeometry('pier');
    const lattice = createEiffelPartGeometry('lattice');
    const arch = createEiffelPartGeometry('arch');
    expect(chord.type).not.toBe('CylinderGeometry');
    expect(chord.getAttribute('position').count).toBeGreaterThan(120);
    expect(brace.type).not.toBe('CylinderGeometry');
    expect(brace.getAttribute('position').count).toBeGreaterThan(40);
    expect(pier.type).toBe('BoxGeometry');
    expect(arch.type).not.toBe('CylinderGeometry');
    expect(arch.getAttribute('position').count).toBeGreaterThan(80);
    expect(lattice.getAttribute('position').count).toBeGreaterThan(200);
    brace.computeBoundingBox();
    expect(brace.boundingBox!.max.x - brace.boundingBox!.min.x).toBeGreaterThan(0.8);
    expect(brace.boundingBox!.max.z - brace.boundingBox!.min.z).toBeGreaterThan(0.8);
    expect(EIFFEL_BRACE_WEB.wall).toBeLessThan(0.48);
    expect(EIFFEL_BRACE_WEB.wall).toBeGreaterThan(0.32);
    expect(EIFFEL_BRACE_WEB.depth).toBeLessThan(0.32);
    expect(EIFFEL_BRACE_WEB.depth).toBeGreaterThan(0.22);
    expect(EIFFEL_BRACE_WEB_CLIMB.wall).toBeGreaterThan(EIFFEL_BRACE_WEB.wall + 0.12);
    expect(EIFFEL_BRACE_WEB_CLIMB.wall).toBeLessThan(0.64);
    expect(EIFFEL_BRACE_WEB_CLIMB.wall).not.toBe(0.55);
    chord.computeBoundingBox();
    expect(chord.boundingBox!.max.x - chord.boundingBox!.min.x).toBeGreaterThan(0.9);
    expect(chord.boundingBox!.max.z - chord.boundingBox!.min.z).toBeGreaterThan(0.9);
    expect(EIFFEL_CHORD_LACE.post).toBeLessThan(0.28);
    expect(EIFFEL_CHORD_LACE.post).toBeGreaterThan(0.18);
    expect(EIFFEL_CHORD_LACE.inset).toBeGreaterThan(0.34);
    expect(EIFFEL_CHORD_LACE.lace).toBeLessThan(0.06);
    expect(EIFFEL_CHORD_LACE_CLIMB.post).toBeGreaterThan(EIFFEL_CHORD_LACE.post + 0.05);
    expect(EIFFEL_CHORD_LACE_CLIMB.post).toBeLessThan(0.32);
    expect(EIFFEL_CHORD_LACE_CLIMB.post).toBeLessThan(0.34);
    chord.dispose();
    brace.dispose();
    pier.dispose();
    arch.dispose();
    lattice.dispose();
  });

  it('models puddled-iron as a metal so flanges catch the key', () => {
    const materials = createMaterialLibrary(fixtureWonder);
    const stones = new EiffelStoneSystem(EIFFEL_CONSTRUCTION, materials);
    const brace = stones.group.getObjectByName('eiffel-parts-brace') as InstancedMesh;
    const mat = brace.material as MeshStandardMaterial;
    expect(mat.metalness).toBeGreaterThan(0.64);
    expect(mat.roughness).toBeLessThan(0.3);
    expect(mat.roughness).toBeGreaterThan(0.22);
    expect(EIFFEL_DARK_IRON).toBe('#5a3824');
    expect(EIFFEL_DARK_IRON).not.toBe('#5c4330');
    expect(EIFFEL_DARK_IRON).not.toBe('#6a4a32');
    expect(EIFFEL_BRACE_IRON).toBe('#8a5a36');
    expect(EIFFEL_BRACE_IRON).not.toBe(EIFFEL_DARK_IRON);
    expect(EIFFEL_BRACE_IRON).not.toBe('#6a4a32');
    expect(EIFFEL_FAR_IRON).toBe('#b88858');
    expect(EIFFEL_FAR_IRON).not.toBe(EIFFEL_DARK_IRON);
    expect(EIFFEL_FAR_IRON).not.toBe(EIFFEL_BRACE_IRON);
    const postTone = new Color(EIFFEL_DARK_IRON).getHSL({ h: 0, s: 0, l: 0 });
    const braceTone = new Color(EIFFEL_BRACE_IRON).getHSL({ h: 0, s: 0, l: 0 });
    const farTone = new Color(EIFFEL_FAR_IRON).getHSL({ h: 0, s: 0, l: 0 });
    expect(braceTone.l).toBeGreaterThan(postTone.l + 0.08);
    expect(farTone.l).toBeGreaterThan(braceTone.l + 0.06);
    stones.update(0.32);
    const chord = stones.group.getObjectByName('eiffel-parts-chord') as InstancedMesh;
    const seatedChords = EIFFEL_CONSTRUCTION.parts.filter(
      (part) =>
        part.kind === 'chord'
        && part.group === 'leg'
        && part.storey < 8
        && part.start + part.duration <= 0.32,
    );
    const nearColor = new Color();
    const farColor = new Color();
    let nearIndex = -1;
    let farIndex = -1;
    seatedChords.forEach((part, index) => {
      if (nearIndex < 0 && (part.leg === 'se' || part.leg === 'sw')) nearIndex = index;
      if (farIndex < 0 && (part.leg === 'ne' || part.leg === 'nw')) farIndex = index;
    });
    expect(nearIndex).toBeGreaterThanOrEqual(0);
    expect(farIndex).toBeGreaterThanOrEqual(0);
    chord.getColorAt(nearIndex, nearColor);
    chord.getColorAt(farIndex, farColor);
    expect(farColor.getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThan(
      nearColor.getHSL({ h: 0, s: 0, l: 0 }).l + 0.08,
    );
    const climb = stones.group.getObjectByName('eiffel-parts-brace-climb') as InstancedMesh;
    const climbChord = stones.group.getObjectByName('eiffel-parts-chord-climb') as InstancedMesh;
    expect(climb).toBeTruthy();
    expect(climbChord).toBeTruthy();
    expect(climb.count).toBeGreaterThan(20);
    expect(climbChord.count).toBeGreaterThan(20);
    stones.update(0.12);
    expect(brace.count).toBeGreaterThan(20);
    expect(climb.count).toBe(0);
    expect(chord.count).toBeGreaterThan(20);
    expect(climbChord.count).toBe(0);
    stones.dispose();
  });

  it('uses the shared Giza water recipe for the Seine', async () => {
    const library = createMaterialLibrary(fixtureWonder);
    const environment = new EiffelEnvironment(library);
    await environment.ready;
    expect(environment.palaisSource).toBe('blender');
    const seine = environment.group.getObjectByName('eiffel-seine') as Mesh;
    expect(seine.material).toBe(library.water);
    expect(environment.group.getObjectByName('eiffel-seine-foam')).toBeTruthy();
    expect(environment.group.getObjectByName('eiffel-champ-allees')).toBeTruthy();
    const planeTrees = environment.group.getObjectByName('eiffel-plane-trees') as InstancedMesh;
    expect(planeTrees).toBeTruthy();
    const treeMatrix = new Matrix4();
    const treePos = new Vector3();
    for (let i = 0; i < planeTrees.count; i += 1) {
      planeTrees.getMatrixAt(i, treeMatrix);
      treePos.setFromMatrixPosition(treeMatrix);
      const onApproach = treePos.z < -118 && treePos.z > -175;
      if (onApproach) expect(Math.abs(treePos.x)).toBeGreaterThan(80);
      const inNorthSquare = Math.abs(treePos.x) < 70 && treePos.z < -40 && treePos.z > -80;
      expect(inNorthSquare).toBe(false);
    }
    expect(environment.group.getObjectByName('eiffel-seine-barges')).toBeTruthy();
    expect(environment.group.getObjectByName('eiffel-haussmann-chimneys')).toBeTruthy();
    const haussmannWindows = environment.group.getObjectByName('eiffel-haussmann-windows') as InstancedMesh;
    const haussmannPlinths = environment.group.getObjectByName('eiffel-haussmann-plinths') as InstancedMesh;
    const houseCount = (environment.group.getObjectByName('eiffel-haussmann-chimneys') as InstancedMesh).count;
    expect(haussmannWindows.count).toBeGreaterThan(houseCount * 8);
    expect(haussmannPlinths.count).toBe(houseCount);
    expect(haussmannPlinths.count).toBeGreaterThan(100);
    const haussmannCornices = environment.group.getObjectByName('eiffel-haussmann-cornices') as InstancedMesh;
    expect(haussmannCornices.count).toBe(houseCount);
    expect(haussmannCornices.count).toBeGreaterThan(100);
    const haussmannBalconies = environment.group.getObjectByName('eiffel-haussmann-balconies') as InstancedMesh;
    expect(haussmannBalconies.count).toBe(houseCount);
    const mansards = environment.group.getObjectByName('eiffel-haussmann-mansards') as InstancedMesh;
    expect(mansards.count).toBe(houseCount);
    const zincTone = new Color();
    mansards.getColorAt(0, zincTone);
    expect(zincTone.getHSL({ h: 0, s: 0, l: 0 }).l).toBeLessThan(0.42);
    expect(zincTone.getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThan(0.18);
    const dormers = environment.group.getObjectByName('eiffel-haussmann-dormers') as InstancedMesh;
    expect(dormers.count).toBeGreaterThan(houseCount * 1.5);
    expect(environment.group.getObjectByName('eiffel-arch-falsework')).toBeTruthy();
    const terrace = environment.group.getObjectByName('eiffel-trocadero-terrace') as Mesh;
    expect(terrace).toBeTruthy();
    expect(terrace.position.z).toBeGreaterThan(-240);
    expect(terrace.position.z).toBeLessThan(-210);
    expect(Math.abs(terrace.position.x)).toBeLessThan(8);
    expect(worldSize(terrace).x).toBeLessThan(55);
    expect(worldSize(terrace).y).toBeLessThan(5);
    const towerL = environment.group.getObjectByName('eiffel-trocadero-tower-l') as Mesh;
    const towerSize = worldSize(towerL);
    expect(towerSize.y).toBeGreaterThan(16);
    expect(towerSize.y).toBeLessThan(28);
    expect(Math.abs(towerSize.x - towerSize.z)).toBeLessThan(2);
    expect(Math.abs(towerL.position.x)).toBeGreaterThan(58);
    expect(Math.abs(towerL.position.x)).toBeLessThan(70);
    const wingL = environment.group.getObjectByName('eiffel-trocadero-wing-l') as Mesh;
    const wingR = environment.group.getObjectByName('eiffel-trocadero-wing-r') as Mesh;
    const wingSize = worldSize(wingL);
    expect(Math.abs(wingL.position.x)).toBeGreaterThan(68);
    expect(Math.abs(wingL.position.x)).toBeLessThan(80);
    expect(wingSize.x).toBeGreaterThan(24);
    expect(wingSize.y).toBeGreaterThan(16);
    expect(wingSize.y).toBeLessThan(24);
    expect(wingL.rotation.y).toBeLessThan(-0.18);
    expect(wingL.rotation.y).toBeGreaterThan(-0.45);
    expect(wingR.rotation.y).toBeGreaterThan(0.18);
    expect(wingR.rotation.y).toBeLessThan(0.45);
    const palaisTone = (wingL.material as MeshStandardMaterial).color.getHSL({ h: 0, s: 0, l: 0 });
    expect(palaisTone.l).toBeLessThan(0.42);
    expect(palaisTone.l).toBeGreaterThan(0.22);
    expect((wingL.material as MeshStandardMaterial).color.getHexString()).toBe('a89070');
    const wingRoofL = environment.group.getObjectByName('eiffel-trocadero-wing-roof-l') as Mesh;
    expect(worldSize(wingRoofL).y).toBeGreaterThan(6);
    expect(worldSize(wingRoofL).y).toBeLessThan(12);
    const turretL = environment.group.getObjectByName('eiffel-trocadero-turret-l') as Mesh;
    expect(turretL).toBeTruthy();
    const turretSize = worldSize(turretL);
    expect(turretSize.y).toBeGreaterThan(10);
    expect(turretSize.y).toBeLessThan(16);
    expect(Math.abs(turretSize.x - turretSize.z)).toBeLessThan(2);
    expect(environment.group.getObjectByName('eiffel-trocadero-turret-cap-l')).toBeTruthy();
    const wingArch = environment.group.getObjectByName('eiffel-trocadero-wing-arch') as Mesh;
    expect(wingArch).toBeTruthy();
    expect(environment.group.getObjectByName('eiffel-trocadero-colonnade')).toBeTruthy();
    const lintel = environment.group.getObjectByName('eiffel-trocadero-colonnade') as Mesh;
    const palaisWindows = environment.group.getObjectByName('eiffel-trocadero-windows') as Group;
    expect(palaisWindows.children.length).toBeGreaterThanOrEqual(10);
    const arcade = environment.group.getObjectByName('eiffel-trocadero-arcade') as Group;
    expect(arcade.children.length).toBeGreaterThanOrEqual(8);
    const roundArch = environment.group.getObjectByName('eiffel-trocadero-arch') as Mesh;
    expect(roundArch).toBeTruthy();
    roundArch.geometry.computeBoundingBox();
    const archBox = roundArch.geometry.boundingBox!;
    const archSpan = Math.max(
      archBox.max.x - archBox.min.x,
      archBox.max.y - archBox.min.y,
      archBox.max.z - archBox.min.z,
    );
    expect(archSpan).toBeGreaterThan(6);
    expect(lintel.position.y).toBeGreaterThan(roundArch.position.y + 2);
    expect(environment.group.getObjectByName('eiffel-trocadero-arch-glass')).toBeTruthy();
    const palaisPlinth = environment.group.getObjectByName('eiffel-trocadero-plinth-l') as Mesh;
    expect(palaisPlinth).toBeTruthy();
    expect(worldSize(palaisPlinth).y).toBeGreaterThan(3);
    expect(worldSize(palaisPlinth).y).toBeLessThan(8);
    const statues = environment.group.getObjectByName('eiffel-trocadero-statues') as Group;
    expect(statues).toBeTruthy();
    expect(statues.children.length).toBeGreaterThanOrEqual(14);
    const statue = environment.group.getObjectByName('eiffel-trocadero-statue') as Mesh;
    expect(statue).toBeTruthy();
    expect(worldSize(statue).y).toBeGreaterThan(3);
    expect(worldSize(statue).y).toBeLessThan(7);
    const domeL = environment.group.getObjectByName('eiffel-trocadero-dome-l') as Mesh;
    expect(domeL).toBeTruthy();
    expect(worldSize(domeL).y).toBeGreaterThan(4);
    expect(worldSize(domeL).y).toBeLessThan(12);
    expect(environment.group.getObjectByName('eiffel-trocadero-hall')).toBeTruthy();
    const hall = environment.group.getObjectByName('eiffel-trocadero-hall') as Mesh;
    const hallSize = worldSize(hall);
    expect(hallSize.x).toBeLessThan(22);
    expect(hallSize.y).toBeLessThan(12);
    expect(hallSize.y).toBeLessThan(wingSize.y);
    expect(hall.position.z).toBeLessThan(wingL.position.z);
    expect(roundArch.position.z).toBeLessThan(hall.position.z);
    expect(roundArch.position.z).toBeLessThan(-270);
    expect(lintel.position.z).toBeLessThan(hall.position.z);
    const esplanade = environment.group.getObjectByName('eiffel-trocadero-esplanade') as Mesh;
    expect(worldSize(esplanade).x).toBeGreaterThan(80);
    expect(worldSize(esplanade).x).toBeLessThan(110);
    expect(worldSize(esplanade).y).toBeLessThan(4);
    expect(worldSize(esplanade).z).toBeLessThan(18);
    const chapel = environment.group.getObjectByName('eiffel-chapel') as Group;
    expect(chapel).toBeTruthy();
    const spire = environment.group.getObjectByName('eiffel-chapel-spire') as Mesh;
    expect(spire.scale.y).toBeGreaterThan(28);
    expect(spire.position.x).toBeGreaterThan(100);
    expect(spire.position.x).toBeLessThan(140);
    const chimneys = environment.group.getObjectByName('eiffel-haussmann-chimneys') as InstancedMesh;
    const houseMatrix = new Matrix4();
    const housePos = new Vector3();
    let flankInner = Infinity;
    let flankHouses = 0;
    for (let i = 0; i < chimneys.count; i += 1) {
      chimneys.getMatrixAt(i, houseMatrix);
      housePos.setFromMatrixPosition(houseMatrix);
      const onParade = Math.abs(housePos.x) < 175 && housePos.z > -10 && housePos.z < 220;
      expect(onParade).toBe(false);
      const onNorthApproach = housePos.z < 30 && housePos.z > -100 && Math.abs(housePos.x) < 210;
      expect(onNorthApproach).toBe(false);
      const inEastYard = housePos.x > 128 && housePos.x < 198 && housePos.z > 12 && housePos.z < 58;
      expect(inEastYard).toBe(false);
      if (housePos.z > 40 && housePos.z < 200) {
        flankInner = Math.min(flankInner, Math.abs(housePos.x));
        flankHouses += 1;
      }
    }
    expect(flankHouses).toBeGreaterThan(40);
    expect(flankInner).toBeGreaterThan(185);
    expect(flankInner).toBeLessThan(250);
    const falsework = environment.group.getObjectByName('eiffel-arch-falsework') as InstancedMesh;
    environment.update(0.12, sampleEiffelSky(0.12) as never, sampleEiffelSky(0.12));
    expect(falsework.visible).toBe(false);
    environment.update(0.22, sampleEiffelSky(0.22) as never, sampleEiffelSky(0.22));
    expect(falsework.visible).toBe(true);
    environment.update(0.32, sampleEiffelSky(0.32) as never, sampleEiffelSky(0.32));
    expect(falsework.visible).toBe(false);
    const work = new EiffelWorkSystem(library, EIFFEL_CONSTRUCTION);
    work.update(activeEiffelOperationsAt(EIFFEL_CONSTRUCTION, 0.12), 0.12);
    const masts = work.group.getObjectByName('eiffel-creeper-masts') as InstancedMesh;
    const cabins = work.group.getObjectByName('eiffel-creeper-cabins') as InstancedMesh;
    const counters = work.group.getObjectByName('eiffel-creeper-counters') as InstancedMesh;
    expect(masts.count).toBeGreaterThanOrEqual(4);
    expect(masts.count).toBeLessThanOrEqual(5);
    expect(cabins.count).toBe(masts.count);
    expect(counters.count).toBe(masts.count);
    const plantMat = cabins.material as MeshStandardMaterial;
    const boomMat = (work.group.getObjectByName('eiffel-creeper-booms') as InstancedMesh)
      .material as MeshStandardMaterial;
    expect(plantMat.metalness).toBeGreaterThan(0.64);
    expect(plantMat.emissiveIntensity).toBeLessThan(0.08);
    expect(masts.material).toBe(plantMat);
    expect(counters.material).toBe(plantMat);
    expect(boomMat.emissiveIntensity).toBeGreaterThan(0.4);
    expect(boomMat.color.getHexString()).toBe('e0c040');
    work.update(activeEiffelOperationsAt(EIFFEL_CONSTRUCTION, 0.32), 0.32);
    expect(masts.count).toBeGreaterThanOrEqual(4);
    expect(masts.count).toBeLessThanOrEqual(5);
    expect(cabins.count).toBe(masts.count);
    expect(counters.count).toBe(masts.count);
    const workers = work.group.getObjectByName('eiffel-workers') as InstancedMesh;
    const workerCloth = workers.material as MeshStandardMaterial;
    expect(workerCloth.emissiveIntensity).toBeLessThan(0.08);
    work.update(activeEiffelOperationsAt(EIFFEL_CONSTRUCTION, 0.58), 0.58);
    expect(workers.count).toBeGreaterThan(8);
    const tunic = new Color();
    let riveters = 0;
    for (let i = 0; i < workers.count; i += 1) {
      workers.getColorAt(i, tunic);
      if (tunic.r > 0.7 && tunic.r > tunic.g + 0.15 && tunic.b < 0.3) riveters += 1;
    }
    expect(riveters).toBeGreaterThan(0);
    let dayRed = 0;
    for (let i = 0; i < workers.count; i += 1) {
      workers.getColorAt(i, tunic);
      dayRed = Math.max(dayRed, tunic.r);
    }
    work.update(activeEiffelOperationsAt(EIFFEL_CONSTRUCTION, 0.92), 0.92);
    let duskRed = 0;
    for (let i = 0; i < workers.count; i += 1) {
      workers.getColorAt(i, tunic);
      duskRed = Math.max(duskRed, tunic.r);
    }
    expect(duskRed).toBeLessThan(dayRed * 0.85);
    work.dispose();
    environment.dispose();
  });
});
