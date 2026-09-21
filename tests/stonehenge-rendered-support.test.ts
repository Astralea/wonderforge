import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Raycaster, Vector3 } from 'three';
import { STONEHENGE_CONSTRUCTION } from '../src/data/stonehengeConstruction';
import type { StonehengeStone } from '../src/data/stonehengeTypes';
import { stonehenge } from '../src/data/wonders/stonehenge';
import { stonehengeConstructionStateAt } from '../src/engine/stonehengeConstruction';
import { stonehengeTerrainHeightAt } from '../src/engine/stonehengeTerrain';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import { StonehengeStoneSystem } from '../src/render/three/StonehengeStoneSystem';
import { StonehengeWorld } from '../src/render/three/StonehengeWorld';
import { lightStateAt } from '../src/engine/daynight';
import { sampleStonehengeSky, stonehengeSunDirectionAt } from '../src/data/stonehengeSky';
import { StonehengeWorkSystem } from '../src/render/three/StonehengeWorkSystem';

const matrixAt = (mesh: InstancedMesh, index: number) => {
  const matrix = new Matrix4();
  mesh.getMatrixAt(index, matrix);
  return matrix;
};
const boundsAt = (mesh: InstancedMesh, index: number) => {
  const matrix = matrixAt(mesh, index);
  const points = [-.5, .5].flatMap(x => [-.5, .5].flatMap(y =>
    [-.5, .5].map(z => new Vector3(x, y, z).applyMatrix4(matrix))));
  return { min: Math.min(...points.map(p => p.y)), max: Math.max(...points.map(p => p.y)) };
};
const routeFor = (stone: StonehengeStone) => STONEHENGE_CONSTRUCTION.routes.find(r => r.id === stone.routeId)!;

describe('Stonehenge rendered load paths (Spec 10 repair)', () => {
  it('stays below 120k submitted triangles including a conservative full shadow pass', () => {
    const materials = createMaterialLibrary(stonehenge);
    const world = new StonehengeWorld(materials);
    for (let frame = 0; frame <= 200; frame++) {
      const t = frame / 200;
      world.update(t, lightStateAt(t, stonehenge), new Vector3(...stonehengeSunDirectionAt(t)), sampleStonehengeSky(t));
      let triangles = 0;
      world.group.traverseVisible(object => {
        if (!('isMesh' in object) || !object.isMesh) return;
        const mesh = object as InstancedMesh;
        const vertices = mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count;
        triangles += vertices / 3 * (mesh.isInstancedMesh ? mesh.count : 1) * (mesh.castShadow ? 2 : 1);
      });
      expect(triangles, `t=${t}`).toBeLessThanOrEqual(120_000);
    }
    world.dispose(); materials.all.forEach(m => m.dispose());
  });

  it('binds the actual upright butt and first rope endpoint to the same rigid stone pose', () => {
    const materials = createMaterialLibrary(stonehenge);
    const work = new StonehengeWorkSystem(materials, STONEHENGE_CONSTRUCTION);
    for (const stone of STONEHENGE_CONSTRUCTION.stones.filter(s => s.role === 'upright')) {
      const stones = new StonehengeStoneSystem({ ...STONEHENGE_CONSTRUCTION, stones: [stone] }, materials);
      for (const phase of [4.02, 4.8, 5.2, 5.98]) {
        const t = stone.start + stone.duration * phase / 8;
        const operations = stones.update(t);
        const state = operations[0]!.state;
        work.update(operations, t);
        const active = stones.group.children.find(child => child.name.startsWith('stonehenge-active-')) as InstancedMesh;
        const pose = matrixAt(active, 0);
        const butt = new Vector3(0, -.5, 0).applyMatrix4(pose);
        const head = new Vector3(0, .5, 0).applyMatrix4(pose);
        expect(butt.distanceTo(new Vector3(...state.heelPosition!)), stone.id).toBeLessThan(1e-5);
        const ropes = work.group.getObjectByName('stonehenge-work-ropes') as InstancedMesh;
        const attachment = new Vector3(0, -.5, 0).applyMatrix4(matrixAt(ropes, 0));
        expect(attachment.distanceTo(head), `${stone.id} rope`).toBeLessThan(1e-5);
      }
      stones.dispose();
    }
    work.dispose(); materials.all.forEach(m => m.dispose());
  });

  it('keeps real fixed-size crib timbers grounded and supporting the lintel through traverse and settle', () => {
    const materials = createMaterialLibrary(stonehenge);
    const work = new StonehengeWorkSystem(materials, STONEHENGE_CONSTRUCTION);
    for (const stone of STONEHENGE_CONSTRUCTION.stones.filter(s => s.role === 'lintel')) {
      let memberSize: Vector3 | undefined;
      for (const phase of [4.02, 4.3, 5, 5.8, 6.001, 6.5, 6.99, 7.3, 7.99]) {
        const t = stone.start + stone.duration * phase / 8;
        const route = routeFor(stone);
        const state = stonehengeConstructionStateAt(stone, route, t);
        work.update([{ stone, route, state }], t);
        const crib = work.group.getObjectByName('stonehenge-work-cribs') as InstancedMesh;
        const guides = work.group.getObjectByName('stonehenge-work-guides') as InstancedMesh;
        const levers = work.group.getObjectByName('stonehenge-work-levers') as InstancedMesh;
        expect(crib.count, `${stone.id} ${phase} grounded crib`).toBeGreaterThan(0);
        const layers = Array.from({ length: crib.count / 2 }, (_, index) => boundsAt(crib, index * 2));
        const first = new Vector3().setFromMatrixPosition(matrixAt(crib, 0));
        expect(Math.abs(layers[0]!.min - stonehengeTerrainHeightAt(first.x, first.z))).toBeLessThan(.03);
        for (let layer = 1; layer < layers.length; layer++) {
          expect(Math.abs(layers[layer]!.min - layers[layer - 1]!.max)).toBeLessThan(1e-5);
        }
        for (let index = 0; index < crib.count; index++) {
          const scale = new Vector3().setFromMatrixScale(matrixAt(crib, index));
          expect(scale.y).toBeCloseTo(.16, 5);
          if (index === 0) {
            if (memberSize) expect(scale.distanceTo(memberSize)).toBeLessThan(1e-5);
            else memberSize = scale;
          }
        }
        expect(guides.count).toBe(2);
        expect(levers.count).toBe(2);
        for (let index = 0; index < 2; index++) {
          const guide = boundsAt(guides, index), lever = boundsAt(levers, index);
          expect(Math.abs(guide.min - layers.at(-1)!.max)).toBeLessThan(1e-5);
          expect(Math.abs(lever.min - guide.max)).toBeLessThan(.015);
          expect(Math.abs(lever.max - (state.position[1] - stone.dimensions[1] / 2)), `${stone.id} ${phase} soffit`).toBeLessThan(.03);
        }
      }
    }
    work.dispose(); materials.all.forEach(m => m.dispose());
  });

  it('seats the real lintel bearing footprint over both actual upright heads', () => {
    const materials = createMaterialLibrary(stonehenge);
    for (const stone of STONEHENGE_CONSTRUCTION.stones.filter(s => s.role === 'lintel')) {
      const stones = new StonehengeStoneSystem({ ...STONEHENGE_CONSTRUCTION, stones: [stone] }, materials);
      stones.update(1); stones.group.updateMatrixWorld(true);
      const mesh = stones.group.children.find(child => child.name.startsWith('stonehenge-settled-')) as InstancedMesh;
      mesh.computeBoundingSphere();
      for (const supportId of stone.supportIds) {
        const support = STONEHENGE_CONSTRUCTION.stones.find(s => s.id === supportId)!;
        const top = support.finalPosition[1] + support.dimensions[1] / 2;
        const ray = new Raycaster(new Vector3(support.finalPosition[0], top - .1, support.finalPosition[2]), new Vector3(0, 1, 0));
        const hit = ray.intersectObject(mesh, false)[0];
        expect(hit, `${stone.id} must cover ${supportId}`).toBeDefined();
        expect(Math.abs(hit!.point.y - top), `${stone.id} bearing height`).toBeLessThan(.03);
      }
      stones.dispose();
    }
    materials.all.forEach(m => m.dispose());
  });
});
