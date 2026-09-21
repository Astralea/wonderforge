import { afterAll, describe, expect, it, vi } from 'vitest';
import { Group, InstancedMesh, Matrix4, Raycaster, Vector3 } from 'three';
import { GIZA_CONSTRUCTION as plan } from '../src/data/gizaConstruction';
import { pyramidsOfGiza } from '../src/data/wonders/pyramids-of-giza';
import { sampleGizaSky } from '../src/data/gizaSky';
import { constructionStateAt } from '../src/engine/construction';
import { lightStateAt } from '../src/engine/daynight';
import { GizaEnvironment } from '../src/render/three/Environment';
import { BlockSystem } from '../src/render/three/BlockSystem';
import { WorkerSystem } from '../src/render/three/WorkerSystem';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';

const materials = createMaterialLibrary(pyramidsOfGiza);
const environment = new GizaEnvironment(plan, materials);
const workers = new WorkerSystem(materials);
const blocks = new BlockSystem(plan, materials);
const earth = environment.group.getObjectByName('ramp-earthwork-terraces') as Group;
const runners = workers.group.getObjectByName('giza-sled-runners') as InstancedMesh;
const legs = workers.group.getObjectByName('giza-worker-legs') as InstancedMesh;
const decks = workers.group.getObjectByName('giza-sled-decks') as InstancedMesh;
const ray = new Raycaster();
const matrix = new Matrix4();

function transform(mesh: InstancedMesh, index: number, local: Vector3): Vector3 {
  mesh.getMatrixAt(index, matrix);
  return local.applyMatrix4(matrix).applyMatrix4(mesh.matrixWorld);
}
function surfaceY(point: Vector3): number {
  ray.set(new Vector3(point.x, 80, point.z), new Vector3(0, -1, 0));
  const hit = ray.intersectObject(earth)[0];
  expect(hit, `missing rendered support at ${point.toArray()}`).toBeDefined();
  return hit!.point.y;
}
function update(t: number): void {
  environment.update(t, lightStateAt(t, pyramidsOfGiza), new Vector3(0, 1, 0), sampleGizaSky(t));
  environment.group.updateMatrixWorld(true);
  earth.traverse((object) => { if (object instanceof InstancedMesh) object.computeBoundingSphere(); });
}
afterAll(() => {
  environment.dispose(); workers.dispose(); blocks.dispose();
  for (const material of materials.all) material.dispose();
});

describe('Giza rendered incline contact', () => {
  it('supports actual rigid runners, every foot, and the rigid stone on all five ramps, forward and reverse', () => {
    for (const route of plan.routes.filter((item) => item.rampSurface)) {
      const candidates = plan.blocks.filter((block) => block.routeId === route.id);
      for (const course of [1, Math.floor(Math.max(...candidates.map((block) => block.course)) / 2), Math.max(...candidates.map((block) => block.course))]) {
        const block = candidates.find((item) => item.course === course)!;
        const samples = [0.000001, 0.04, 0.09, 0.12, 0.5, 0.85, 0.91, 0.96, 0.999999];
        for (const progress of [...samples, ...[...samples].reverse()]) {
          const t = block.start + block.duration * (5 + progress) / 8;
          const state = constructionStateAt(block, route, t);
          update(t);
          workers.update([{ block, route, state }], t);
          workers.group.updateMatrixWorld(true);
          for (let runner = 0; runner < runners.count; runner += 1) {
            let smallestGap = Infinity;
            for (let sample = 0; sample <= 100; sample += 1) {
              const foot = transform(runners, runner, new Vector3(0, -0.5, sample / 100 - 0.5));
              const gap = foot.y - surfaceY(foot);
              expect(gap, `${block.id} runner penetration at ${progress}`).toBeGreaterThan(-0.003);
              smallestGap = Math.min(smallestGap, Math.abs(gap));
            }
            expect(smallestGap, `${block.id} runner bearing at ${progress}`).toBeLessThan(0.03);
            if (progress > 0.2 && progress < 0.8) {
              for (const end of [-0.5, 0.5]) {
                const foot = transform(runners, runner, new Vector3(0, -0.5, end));
                expect(Math.abs(foot.y - surfaceY(foot))).toBeLessThan(0.03);
              }
            }
          }
          for (let leg = 0; leg < legs.count; leg += 1) {
            const foot = transform(legs, leg, new Vector3(0, -0.31, 0));
            expect(Math.abs(foot.y - surfaceY(foot)), `${block.id} leg ${leg} at ${progress}`).toBeLessThan(0.03);
          }
          const active = blocks.update(t);
          blocks.group.updateMatrixWorld(true);
          const index = active.filter((item) => item.block.material === block.material).findIndex((item) => item.block.id === block.id);
          const stones = blocks.group.getObjectByName(`active-${block.material}-construction-stones`) as InstancedMesh;
          const stoneBottom = transform(stones, index, new Vector3(0, -0.5, 0));
          const deckTop = transform(decks, 0, new Vector3(0, 0.5, 0));
          expect(stoneBottom.distanceTo(deckTop), `${block.id} stone/deck`).toBeLessThan(0.0001);
        }
      }
    }
  }, 20_000);

  it('keeps every actual terminal incline below 15 degrees', () => {
    for (const route of plan.routes.filter((item) => item.rampSurface)) {
      const block = plan.blocks.filter((item) => item.routeId === route.id).at(-1)!;
      update(block.start + block.duration * 5.5 / 8);
      const mesh = earth.getObjectByName(`${route.id}-continuous-haul-surface`) as InstancedMesh;
      const vertices = mesh.geometry.getAttribute('position');
      for (let row = 0; row < vertices.count / 4 - 1; row += 1) {
        const a = transform(mesh, 0, new Vector3().fromBufferAttribute(vertices, row * 4));
        const b = transform(mesh, 0, new Vector3().fromBufferAttribute(vertices, (row + 1) * 4));
        const degrees = Math.atan2(Math.abs(b.y - a.y), Math.hypot(b.x - a.x, b.z - a.z)) * 180 / Math.PI;
        expect(degrees, `${route.id} actual triangle slope`).toBeLessThanOrEqual(15);
      }
    }
  });

  it('keeps actual approach corridors out of every other occupied earthwork', () => {
    for (const route of plan.routes.filter((item) => item.rampSurface)) {
      const candidates = plan.blocks.filter((block) => block.routeId === route.id);
      for (const block of [candidates[0]!, candidates[Math.floor(candidates.length / 2)]!, candidates.at(-1)!]) {
        for (const phase of [3, 4]) {
          for (let sample = 0; sample <= 16; sample += 1) {
            const t = block.start + block.duration * (phase + (sample + 0.01) / 17) / 8;
            const state = constructionStateAt(block, route, t);
            update(t);
            for (const lateral of [-0.8, 0, 0.8]) {
              const x = state.groundPosition[0] + Math.cos(state.yaw) * lateral;
              const z = state.groundPosition[2] - Math.sin(state.yaw) * lateral;
              ray.set(new Vector3(x, 80, z), new Vector3(0, -1, 0));
              for (const hit of ray.intersectObject(earth)) {
                if (hit.object.name.startsWith(`${route.id}-`)) continue;
                expect(hit.point.y - state.groundY, `${route.id} crosses ${hit.object.name} at ${t}`).toBeLessThan(0.03);
              }
            }
          }
        }
      }
    }
  });

  it('roots raised-earthwork foundations and approach embankments in the actual ground plane', () => {
    const foundations = environment.group.getObjectByName('ramp-grounded-foundations') as InstancedMesh;
    expect(foundations.count).toBeGreaterThan(0);
    for (let i = 0; i < foundations.count; i += 1) {
      const bottom = transform(foundations, i, new Vector3(0, -0.5, 0));
      expect(bottom.y).toBeCloseTo(-0.08, 5);
    }
    for (const route of plan.routes.filter((item) => item.rampSurface)) {
      const name = route.id === 'khufu-south' ? 'wetted-two-lane-haul-road'
        : route.id === 'khufu-east' ? 'eastern-haul-road' : `${route.id}-haul-road`;
      const road = environment.group.getObjectByName(name) as import('three').Mesh;
      road.geometry.computeBoundingBox();
      expect(road.geometry.boundingBox!.min.y).toBeCloseTo(-0.08, 5);
    }
  });

  it('does not lift an occupied ramp through a load at a course transition', () => {
    for (const route of plan.routes.filter((item) => item.rampSurface)) {
      for (const block of plan.blocks.filter((item) => item.routeId === route.id)) {
        const t = block.start + block.duration * 5.5 / 8;
        const course = route.rampSurface!.courses[block.course]!;
        expect(t).toBeGreaterThanOrEqual(course.readyAt);
        const next = route.rampSurface!.courses[block.course + 1];
        if (next) expect(block.start + block.duration).toBeLessThanOrEqual(next.start + 1e-12);
      }
    }
  });
});

describe('Giza static buffers and ownership', () => {
  it('does not rewrite settled core buffers on unchanged/reveal frames and restores reverse seeks', () => {
    blocks.update(1);
    const core = blocks.group.getObjectByName('khufu-supported-stacked-core-fill') as InstancedMesh;
    const version = core.instanceMatrix.version;
    const count = core.count;
    blocks.update(1);
    blocks.update(0.99);
    expect(core.instanceMatrix.version).toBe(version);
    blocks.update(0.4);
    expect(core.instanceMatrix.version).toBeGreaterThan(version);
    blocks.update(1);
    expect(core.count).toBe(count);
  });

  it('disposes every owned instance mesh', () => {
    const owned = [new BlockSystem(plan, materials), new WorkerSystem(materials), new GizaEnvironment(plan, materials)];
    for (const owner of owned) {
      const spies: ReturnType<typeof vi.spyOn>[] = [];
      owner.group.traverse((object) => { if (object instanceof InstancedMesh) spies.push(vi.spyOn(object, 'dispose')); });
      owner.dispose();
      expect(spies.length).toBeGreaterThan(0);
      for (const spy of spies) expect(spy).toHaveBeenCalledOnce();
    }
  });
});
