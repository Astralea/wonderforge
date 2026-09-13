import { describe, expect, it, vi } from 'vitest';
import {
  Box3,
  Color,
  Group,
  BatchedMesh,
  InstancedMesh,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
} from 'three';
import type { Wonder } from '../src/data/types';
import { EIFFEL_TRAFFIC_ACTORS } from '../src/data/eiffelTraffic';
import { sampleEiffelSky } from '../src/data/eiffelSky';
import { EIFFEL_SEINE_WATER_Y, eiffelTerrainHeightAt } from '../src/engine/eiffelTerrain';
import { eiffelTrafficPoseAt } from '../src/engine/eiffelTraffic';
import * as ParisAssets from '../src/render/three/eiffelParis';
import { EiffelEnvironment } from '../src/render/three/EiffelEnvironment';
import {
  EIFFEL_SKY_BLUE_ELEVATION,
  EIFFEL_SUN_ANGULAR_RADIUS,
} from '../src/render/three/EiffelSkyDome';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';

const fixtureWonder: Wonder = {
  id: 'eiffel-rebuilt-environment-fixture',
  name: 'Fixture',
  location: 'Paris',
  region: 'France',
  era: 'industrial',
  completedYear: 1889,
  endsAtNight: true,
  quote: { text: 'q', author: 'a' },
  description: 'd',
  facts: ['a', 'b', 'c'],
  palette: { ground: '#7a6a55', primary: '#c9b18a', accent: '#8a6f4d', sky: '#87b5d6' },
  structure: { stages: [{ name: 's', parts: [] }] },
};

const instancePosition = new Vector3();
const instanceMatrix = new Matrix4();

describe('rebuilt Eiffel environment', () => {
  it('keeps the full rotated Seine channel submerged and all four foundation pads level', () => {
    for (const x of [-650, -325, 0, 325, 650]) {
      const centerZ = -175 - Math.tan(0.08) * x;
      for (const across of [-44, -22, 0, 22, 44]) {
        const bed = eiffelTerrainHeightAt(x, centerZ + across);
        expect(bed, `river bed at x=${x}, across=${across}`).toBeLessThan(EIFFEL_SEINE_WATER_Y - 0.5);
      }
    }

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const padHeights: number[] = [];
        for (const x of [40.5, 51.5, 62.5]) {
          for (const z of [40.5, 51.5, 62.5]) {
            padHeights.push(eiffelTerrainHeightAt(sx * x, sz * z));
          }
        }
        expect(Math.max(...padHeights) - Math.min(...padHeights)).toBeLessThan(1e-9);
        for (const height of padHeights) expect(height).toBeCloseTo(0, 9);
      }
    }
  });

  it('keeps only the procedural quay trees and recovers city scatter on asset failure', async () => {
    const failedCity = vi.spyOn(ParisAssets, 'loadEiffelParisCity').mockRejectedValueOnce(new Error('city unavailable'));
    const environment = new EiffelEnvironment(createMaterialLibrary(fixtureWonder), true);
    await environment.ready; failedCity.mockRestore();
    const chimneys = environment.group.getObjectByName('eiffel-haussmann-chimneys') as InstancedMesh;
    const trees = environment.group.getObjectByName('eiffel-plane-trees') as InstancedMesh;
    trees.geometry.computeBoundingBox();
    const crownSize = trees.geometry.boundingBox!.getSize(new Vector3());
    expect(crownSize.y / crownSize.x).toBeGreaterThan(0.45);
    expect(trees.count).toBeGreaterThan(50);
    expect(trees.count).toBeLessThan(90);
    const quadrants = [0, 0, 0, 0];
    for (let i = 0; i < chimneys.count; i += 1) {
      chimneys.getMatrixAt(i, instanceMatrix);
      instancePosition.setFromMatrixPosition(instanceMatrix);
      quadrants[(instancePosition.x >= 0 ? 1 : 0) + (instancePosition.z >= 0 ? 2 : 0)]! += 1;
    }
    expect(chimneys.count).toBeGreaterThan(220);
    for (const count of quadrants) expect(count).toBeGreaterThan(16);

    for (let i = 0; i < trees.count; i += 1) {
      trees.getMatrixAt(i, instanceMatrix);
      instancePosition.setFromMatrixPosition(instanceMatrix);
      const localRiverZ = Math.sin(0.08) * instancePosition.x
        + Math.cos(0.08) * (instancePosition.z + 175);
      expect(Math.abs(localRiverZ)).toBeGreaterThan(51);
      expect(Math.abs(localRiverZ)).toBeLessThan(78);
      expect(instancePosition.z).toBeLessThan(-75);
      if (Math.abs(instancePosition.x) >= 190 && Math.abs(localRiverZ) >= 82) {
        const nearestX = 242 + Math.round((Math.abs(instancePosition.x) - 242) / 104) * 104;
        const nearestZ = 40 + Math.round((instancePosition.z - 40) / 104) * 104;
        expect(Math.abs(Math.abs(instancePosition.x) - nearestX)).toBeLessThan(29);
        expect(Math.abs(instancePosition.z - nearestZ)).toBeLessThan(23);
      }
    }
    const bridge = environment.group.getObjectByName('eiffel-pont-d-iena-stonework') as InstancedMesh;
    expect(bridge.userData.archCount).toBe(5);
    expect(bridge.userData.voussoirsPerArch).toBe(9);
    expect(environment.group.getObjectByName('eiffel-pont-d-iena-railings')).toBeTruthy();
    const seine = environment.group.getObjectByName('eiffel-seine') as Mesh;
    expect(seine.position.y).toBe(EIFFEL_SEINE_WATER_Y);
    const foam = environment.group.getObjectByName('eiffel-seine-foam') as InstancedMesh;
    foam.getMatrixAt(0, instanceMatrix);
    expect(instancePosition.setFromMatrixPosition(instanceMatrix).y).toBeCloseTo(EIFFEL_SEINE_WATER_Y + 0.07, 5);
    const pools = environment.group.getObjectByName('eiffel-expo-reflecting-pools') as InstancedMesh;
    expect(pools.count).toBe(2);
    const expectedPools = [{ z: 230, width: 20, length: 68 }, { z: 310, width: 18, length: 24 }];
    expectedPools.forEach((pool, index) => {
      pools.getMatrixAt(index, instanceMatrix);
      const poolScale = new Vector3();
      instanceMatrix.decompose(instancePosition, new Quaternion(), poolScale);
      expect(instancePosition.y).toBeCloseTo(eiffelTerrainHeightAt(0, pool.z) + 0.32, 6);
      expect(poolScale.x).toBe(pool.width);
      expect(poolScale.z).toBe(pool.length);
    });
    const barges = environment.group.getObjectByName('eiffel-seine-barges') as InstancedMesh;
    barges.getMatrixAt(0, instanceMatrix);
    expect(instancePosition.setFromMatrixPosition(instanceMatrix).y).toBeCloseTo(EIFFEL_SEINE_WATER_Y + 0.8, 5);
    const lantern = environment.group.getObjectByName('eiffel-night-lantern') as Mesh;
    expect(lantern.position.y).toBeCloseTo(296.7, 4);
    lantern.geometry.computeBoundingSphere();
    expect(lantern.geometry.boundingSphere!.radius).toBeLessThan(0.7);
    environment.dispose();
  });

  it('gives fallback street and side facade windows their authored world-space width', async () => {
    const failedCity = vi.spyOn(ParisAssets, 'loadEiffelParisCity').mockRejectedValueOnce(new Error('city unavailable'));
    const environment = new EiffelEnvironment(createMaterialLibrary(fixtureWonder), true);
    await environment.ready; failedCity.mockRestore();
    const windows = environment.group.getObjectByName('eiffel-haussmann-windows') as InstancedMesh;
    expect(windows.castShadow).toBe(false);
    windows.geometry.computeBoundingBox();
    const localBounds = windows.geometry.boundingBox!;
    const extent = new Vector3();
    let streetFacing = 0;
    let sideFacing = 0;
    for (let i = 0; i < windows.count; i += 1) {
      windows.getMatrixAt(i, instanceMatrix);
      const worldBounds = new Box3().copy(localBounds).applyMatrix4(instanceMatrix);
      worldBounds.getSize(extent);
      expect(extent.y).toBeGreaterThan(2);
      if (extent.x > 2 && extent.x > extent.z * 3) streetFacing += 1;
      if (extent.z > 2 && extent.z > extent.x * 3) sideFacing += 1;
    }
    expect(streetFacing).toBeGreaterThan(100);
    expect(sideFacing).toBeGreaterThan(100);
    environment.dispose();
  });

  it('centers distant bridges on the rotated Seine', () => {
    const environment = new EiffelEnvironment(createMaterialLibrary(fixtureWonder), true);
    const stonework = environment.group.getObjectByName('eiffel-pont-d-iena-stonework') as InstancedMesh;
    const scale = new Vector3();
    const rotation = new Quaternion();
    let distantDecks = 0;
    for (let i = 0; i < stonework.count; i += 1) {
      stonework.getMatrixAt(i, instanceMatrix);
      instanceMatrix.decompose(instancePosition, rotation, scale);
      if (Math.abs(instancePosition.x) < 400 || scale.z < 100) continue;
      const localRiverZ = Math.sin(0.08) * instancePosition.x
        + Math.cos(0.08) * (instancePosition.z + 175);
      expect(Math.abs(localRiverZ)).toBeLessThan(0.1);
      distantDecks += 1;
    }
    expect(distantDecks).toBe(2);
    environment.dispose();
  });

  it('disposes the asynchronously chunked Paris environment', async () => {
    const environment = new EiffelEnvironment(createMaterialLibrary(fixtureWonder), true);
    await environment.ready;
    const city = environment.group.getObjectByName('eiffel-paris-1889-city') as Group;
    expect(environment.group.getObjectByName('eiffel-champ-allees')).toBeUndefined();
    expect(environment.group.getObjectByName('eiffel-ecole-militaire')).toBeUndefined();
    const cell = city.children[0] as BatchedMesh;
    expect(cell).toBeInstanceOf(BatchedMesh);
    const batchDispose = vi.spyOn(cell, 'dispose');
    const geometryDispose = vi.spyOn(cell.geometry, 'dispose');
    const material = Array.isArray(cell.material) ? cell.material[0]! : cell.material;
    const materialDispose = vi.spyOn(material, 'dispose');
    environment.dispose();
    expect(batchDispose).toHaveBeenCalledOnce();
    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
  },15_000);

  it('grounds animated soles, hooves and wheels using their transformed vertices', async () => {
    const environment = new EiffelEnvironment(createMaterialLibrary(fixtureWonder), true);
    await environment.ready;
    expect(environment.parisSource).toBe('blender');
    expect(environment.lifeSource).toBe('blender');
    const t = 0.37;
    environment.update(t, {} as never, {} as never);
    const contactMin = new Map<string, number>();
    const kinds = ['pedestrian-man', 'pedestrian-woman', 'cart', 'carriage', 'horse'] as const;
    environment.group.traverse((object) => {
      if (!(object instanceof BatchedMesh) || !object.name.startsWith('eiffel-traffic-near-')) return;
      const vertices = object.geometry.attributes.position!;
      const parts = object.userData.trafficParts as Array<{
        kind: typeof kinds[number]; articulation: 'wheel' | 'leg' | 'arm' | null;
        geometryId: number; instanceIds: number[];
      }>;
      for (const part of parts) {
        const contactPart = part.kind === 'horse' || part.kind.startsWith('pedestrian') ? 'leg' : 'wheel';
        if (part.articulation !== contactPart) continue;
        const specs = part.kind === 'horse'
          ? EIFFEL_TRAFFIC_ACTORS.filter((actor) => (actor.kind === 'cart' || actor.kind === 'carriage') && actor.lod !== 'far')
          : EIFFEL_TRAFFIC_ACTORS.filter((actor) => actor.kind === part.kind && actor.lod !== 'far');
        const range = object.getGeometryRangeAt(part.geometryId)!;
        for (let index = 0; index < part.instanceIds.length; index += 1) {
          object.getMatrixAt(part.instanceIds[index]!, instanceMatrix);
          let minY = Infinity;
          for (let vertexIndex = range.vertexStart; vertexIndex < range.vertexStart + range.vertexCount; vertexIndex += 1) {
            instancePosition.fromBufferAttribute(vertices, vertexIndex).applyMatrix4(instanceMatrix);
            minY = Math.min(minY, instancePosition.y);
          }
          const key = `${part.kind}:${index}`;
          contactMin.set(key, Math.min(contactMin.get(key) ?? Infinity, minY));
          const pose = eiffelTrafficPoseAt(specs[index]!, t);
          const expectedY = part.kind === 'horse'
            ? eiffelTerrainHeightAt(
                pose.position[0] + Math.sin(pose.yaw) * 3.55,
                pose.position[2] + Math.cos(pose.yaw) * 3.55,
              ) + pose.position[1] - eiffelTerrainHeightAt(pose.position[0], pose.position[2])
            : pose.position[1];
          expect(contactMin.get(key)!).toBeGreaterThanOrEqual(expectedY - 1e-6);
        }
      }
    });
    const detailedPedestrians = EIFFEL_TRAFFIC_ACTORS.filter((actor) =>
      actor.kind.startsWith('pedestrian') && actor.lod !== 'far',
    ).length;
    const detailedVehicles = EIFFEL_TRAFFIC_ACTORS.filter((actor) =>
      (actor.kind === 'cart' || actor.kind === 'carriage') && actor.lod !== 'far',
    ).length;
    expect(contactMin.size).toBe(detailedPedestrians + detailedVehicles * 2);
    for (const [key, minY] of contactMin) {
      const [kind, rawIndex] = key.split(':') as [typeof kinds[number], string];
      const specs = kind === 'horse'
        ? EIFFEL_TRAFFIC_ACTORS.filter((actor) => (actor.kind === 'cart' || actor.kind === 'carriage') && actor.lod !== 'far')
        : EIFFEL_TRAFFIC_ACTORS.filter((actor) => actor.kind === kind && actor.lod !== 'far');
      const pose = eiffelTrafficPoseAt(specs[Number(rawIndex)]!, t);
      const expectedY = kind === 'horse'
        ? eiffelTerrainHeightAt(
            pose.position[0] + Math.sin(pose.yaw) * 3.55,
            pose.position[2] + Math.cos(pose.yaw) * 3.55,
          ) + pose.position[1] - eiffelTerrainHeightAt(pose.position[0], pose.position[2])
        : pose.position[1];
      expect(minY).toBeCloseTo(expectedY, 5);
    }
    const nearMeshes = ['people', 'wagons', 'horses', 'vessels'].map((name) =>
      environment.group.getObjectByName(`eiffel-traffic-near-${name}`) as BatchedMesh,
    );
    for (const mesh of nearMeshes) expect(mesh.perObjectFrustumCulled).toBe(true);
    const detailedDispose = vi.spyOn(nearMeshes[0]!, 'dispose');
    environment.dispose();
    expect(detailedDispose).toHaveBeenCalledOnce();
  });

  it('renders the far crowd at real scale with per-object culling and a bounded triangle cost', async () => {
    const environment = new EiffelEnvironment(createMaterialLibrary(fixtureWonder), true);
    await environment.ready;
    const people = environment.group.getObjectByName('eiffel-traffic-far-people') as BatchedMesh;
    const heads = environment.group.getObjectByName('eiffel-traffic-far-heads') as BatchedMesh;
    const vehicles = environment.group.getObjectByName('eiffel-traffic-far-vehicles') as BatchedMesh;
    const horses = environment.group.getObjectByName('eiffel-traffic-far-horses') as BatchedMesh;
    const wheels = environment.group.getObjectByName('eiffel-traffic-far-wheels') as BatchedMesh;
    const farPeople = EIFFEL_TRAFFIC_ACTORS.filter((actor) => actor.kind.startsWith('pedestrian') && actor.lod === 'far');
    const farVehicles = EIFFEL_TRAFFIC_ACTORS.filter((actor) =>
      (actor.kind === 'cart' || actor.kind === 'carriage') && actor.lod === 'far',
    );
    expect(people.instanceCount).toBe(farPeople.length);
    expect(vehicles.instanceCount).toBe(farVehicles.length);
    expect(horses.instanceCount).toBe(farVehicles.length);
    expect(wheels.instanceCount).toBe(farVehicles.length * 4);
    expect(heads.instanceCount).toBe(farPeople.length);
    for (const mesh of [people, heads, vehicles, horses, wheels]) {
      expect(mesh.perObjectFrustumCulled).toBe(true);
      expect(mesh.castShadow).toBe(false);
    }
    const personGeometryId = people.getGeometryIdAt(0);
    const personBounds = people.getBoundingBoxAt(personGeometryId, new Box3())!;
    expect(personBounds.min.y).toBeCloseTo(0, 6);
    expect(personBounds.max.y).toBeCloseTo(1.5, 6);
    const headBounds = heads.getBoundingBoxAt(heads.getGeometryIdAt(0), new Box3())!;
    expect(headBounds.max.y).toBeGreaterThan(1.8);
    expect(headBounds.max.y).toBeLessThan(1.9);
    const garmentColors = new Set<string>();
    for (let index = 0; index < 6; index += 1) garmentColors.add(people.getColorAt(index, new Color()).getHexString());
    expect(garmentColors.size).toBe(6);
    expect(heads.getColorAt(0, new Color()).getHexString()).not.toBe(people.getColorAt(0, new Color()).getHexString());
    const submittedTriangles = [people, heads, vehicles, horses, wheels].reduce((sum, mesh) => {
      const range = mesh.getGeometryRangeAt(mesh.getGeometryIdAt(0))!;
      return sum + range.count / 3 * mesh.instanceCount;
    }, 0);
    expect(submittedTriangles).toBeLessThan(25_000);
    const t = 0.43;
    environment.update(t, {} as never, {} as never);
    const firstFarVehicle = farVehicles[0]!;
    const expectedRoadY = eiffelTrafficPoseAt(firstFarVehicle, t).position[1];
    const wheelRange = wheels.getGeometryRangeAt(wheels.getGeometryIdAt(0))!;
    const wheelPositions = wheels.geometry.attributes.position!;
    const wheelIndices = wheels.geometry.index!;
    wheels.getMatrixAt(0, instanceMatrix);
    let wheelBottom = Infinity;
    for (let offset = wheelRange.indexStart; offset < wheelRange.indexStart + wheelRange.indexCount; offset += 1) {
      const vertexIndex = wheelIndices.getX(offset);
      instancePosition.fromBufferAttribute(wheelPositions, vertexIndex).applyMatrix4(instanceMatrix);
      wheelBottom = Math.min(wheelBottom, instancePosition.y);
    }
    expect(wheelBottom).toBeCloseTo(expectedRoadY, 5);
    environment.dispose();
  });

  it('keeps authored steam-boat vertices clear of every bridge stone', async () => {
    const environment = new EiffelEnvironment(createMaterialLibrary(fixtureWonder), true);
    await environment.ready;
    const boats = environment.group.getObjectByName('eiffel-traffic-near-vessels') as BatchedMesh;
    const stonework = environment.group.getObjectByName('eiffel-pont-d-iena-stonework') as InstancedMesh;
    const boatVertices = boats.geometry.attributes.position!;
    const steamPart = (boats.userData.trafficParts as Array<{
      kind: string; articulation: string | null; geometryId: number; instanceIds: number[];
    }>).find((part) => part.kind === 'steam-boat' && part.articulation === null)!;
    const boatRange = boats.getGeometryRangeAt(steamPart.geometryId)!;
    const stoneMatrices: Matrix4[] = [];
    for (let stone = 0; stone < stonework.count; stone += 1) {
      stonework.getMatrixAt(stone, instanceMatrix);
      stoneMatrices.push(instanceMatrix.clone().invert());
    }
    let crossingsChecked = 0;
    let collisions = 0;
    const localVertex = new Vector3();
    for (let step = 0; step <= 240; step += 1) {
      const t = step / 240;
      const steamSpecs = EIFFEL_TRAFFIC_ACTORS.filter((actor) => actor.kind === 'steam-boat');
      const nearCrossing = steamSpecs.map((spec) => {
        const x = eiffelTrafficPoseAt(spec, t).position[0];
        return [0, -430, 430].some((bridgeX) => Math.abs(x - bridgeX) < 9);
      });
      if (!nearCrossing.some(Boolean)) continue;
      environment.update(t, {} as never, {} as never);
      for (let boat = 0; boat < steamPart.instanceIds.length; boat += 1) {
        if (!nearCrossing[boat]) continue;
        crossingsChecked += 1;
        boats.getMatrixAt(steamPart.instanceIds[boat]!, instanceMatrix);
        for (let vertexIndex = boatRange.vertexStart; vertexIndex < boatRange.vertexStart + boatRange.vertexCount; vertexIndex += 1) {
          const worldVertex = instancePosition.fromBufferAttribute(boatVertices, vertexIndex).applyMatrix4(instanceMatrix);
          for (const inverseStone of stoneMatrices) {
            localVertex.copy(worldVertex).applyMatrix4(inverseStone);
            if (Math.abs(localVertex.x) < 0.499
              && Math.abs(localVertex.y) < 0.499
              && Math.abs(localVertex.z) < 0.499) collisions += 1;
          }
        }
      }
    }
    expect(collisions).toBe(0);
    expect(crossingsChecked).toBeGreaterThan(12);
    const moorings = environment.group.getObjectByName('eiffel-barge-mooring-lines') as InstancedMesh;
    expect(moorings.count).toBe(6);
    environment.dispose();
  });

  it('uses the real apparent solar radius rather than an oversized graphic disc', () => {
    expect(EIFFEL_SUN_ANGULAR_RADIUS * 180 / Math.PI).toBeGreaterThan(0.25);
    expect(EIFFEL_SUN_ANGULAR_RADIUS * 180 / Math.PI).toBeLessThan(0.28);
  });

  it('keeps temperate blue above a restrained neutral river haze', () => {
    expect(EIFFEL_SKY_BLUE_ELEVATION * 180 / Math.PI).toBeLessThan(3.1);
    for (const t of [0.32, 0.58, 0.92]) {
      const horizon = new Color(sampleEiffelSky(t).horizon);
      expect(horizon.b).toBeGreaterThan(horizon.r);
    }
  });
});
