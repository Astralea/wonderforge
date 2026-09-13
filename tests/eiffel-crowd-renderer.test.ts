import { expect, it } from 'vitest';
import { BatchedMesh, BufferGeometry, Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { getWonder } from '../src/data';
import { EIFFEL_TRAFFIC_ACTORS, type EiffelTrafficActor } from '../src/data/eiffelTraffic';
import { eiffelTrafficPoseAt } from '../src/engine/eiffelTraffic';
import { EiffelEnvironment } from '../src/render/three/EiffelEnvironment';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';

type Inspect = {
  trafficBatches: Array<{ kind: string; specs: EiffelTrafficActor[]; mesh: BatchedMesh;
    instanceIds: number[]; geometry: BufferGeometry; articulation: string | null }>;
  farTraffic: { people: { specs: EiffelTrafficActor[]; ids: number[]; headIds: number[];
    mesh: BatchedMesh; headMesh: BatchedMesh } };
};

it('reassigns actual fixed slots to a close formerly-far walker with exact complement, sole contact and reverse identity', async () => {
  const materials = createMaterialLibrary(getWonder('eiffel-tower'));
  const env = new EiffelEnvironment(materials, true);
  await env.ready;
  expect(env.lifeSource).toBe('blender');
  const inspect = env as unknown as Inspect;
  const pedestrianParts = inspect.trafficBatches.filter(b => b.kind.startsWith('pedestrian'));
  const triangles = () => pedestrianParts.reduce((sum, b) => sum + b.instanceIds.length * b.geometry.attributes.position!.count / 3, 0);
  const originalTriangles = triangles();
  for (const mesh of [pedestrianParts[0]!.mesh, inspect.farTraffic.people.mesh, inspect.farTraffic.people.headMesh]) {
    expect(mesh.perObjectFrustumCulled).toBe(true);
    expect(mesh.frustumCulled).toBe(false);
  }
  const originalFarSlots = inspect.farTraffic.people.ids.length;
  const target = EIFFEL_TRAFFIC_ACTORS.find(a => a.kind === 'pedestrian-man' && a.lod === 'far' && a.routeId.startsWith('tower-boundary'))!;
  expect(target).toBeDefined();
  expect(env.crowdDiagnostics.selectedIds).not.toContain(target.id);
  const t = .37;
  const pose = eiffelTrafficPoseAt(target, t, true);
  const camera = new PerspectiveCamera(40, 390 / 844, .1, 2000);
  camera.position.set(pose.position[0], pose.position[1] + 2.1, pose.position[2] + 8);
  camera.lookAt(new Vector3(...pose.position).add(new Vector3(0, .9, 0)));
  env.update(t, {} as never, {} as never);
  env.setCrowdCamera(camera);
  expect(env.crowdDiagnostics.selectedIds).toContain(target.id);
  const snapshot = () => {
    const ids = new Set<string>();
    const matrices: Record<string, number[][]> = {};
    for (const batch of pedestrianParts) {
      expect(batch.specs.length).toBe(batch.instanceIds.length);
      batch.specs.forEach((actor, i) => {
        ids.add(actor.id);
        const matrix = new Matrix4(); batch.mesh.getMatrixAt(batch.instanceIds[i]!, matrix);
        expect(matrix.determinant()).toBeCloseTo(1, 6);
        (matrices[actor.id] ??= []).push([...matrix.elements]);
      });
    }
    const far = inspect.farTraffic.people;
    expect(far.ids.length).toBe(originalFarSlots);
    expect(far.specs.length).toBe(far.ids.length);
    for (const actor of far.specs) expect(ids.has(actor.id)).toBe(false);
    const combined = [...ids, ...far.specs.map(a => a.id)];
    expect(new Set(combined).size).toBe(combined.length);
    expect(combined.sort()).toEqual(EIFFEL_TRAFFIC_ACTORS.filter(a => a.kind.startsWith('pedestrian')).map(a => a.id).sort());
    expect(triangles()).toBe(originalTriangles);
    expect([...ids].sort()).toEqual(env.crowdDiagnostics.selectedIds);
    return matrices;
  };
  const first = snapshot();
  let soleY = Infinity;
  const vertex = new Vector3();
  for (const batch of pedestrianParts.filter(b => b.kind === target.kind && b.articulation === 'leg')) {
    const slot = batch.specs.findIndex(a => a.id === target.id);
    const matrix = new Matrix4(); batch.mesh.getMatrixAt(batch.instanceIds[slot]!, matrix);
    for (let i = 0; i < batch.geometry.attributes.position!.count; i++) {
      vertex.fromBufferAttribute(batch.geometry.attributes.position!, i).applyMatrix4(matrix);
      soleY = Math.min(soleY, vertex.y);
    }
  }
  expect(soleY).toBeCloseTo(pose.position[1], 5);
  env.update(.83, {} as never, {} as never); env.setCrowdCamera(camera); snapshot();
  env.update(t, {} as never, {} as never); env.setCrowdCamera(camera);
  expect(snapshot()).toEqual(first);
  // A paused orbit refresh must run selection without advancing the actor clock.
  camera.position.x += 600; camera.lookAt(0, 0, 0); env.setCrowdCamera(camera); snapshot();
  camera.position.set(pose.position[0], pose.position[1] + 2.1, pose.position[2] + 8);
  camera.lookAt(new Vector3(...pose.position).add(new Vector3(0, .9, 0)));
  env.setCrowdCamera(camera); expect(snapshot()).toEqual(first);
  env.dispose(); for (const material of materials.all) material.dispose();
}, 15000);
