import { afterEach, describe, expect, it, vi } from 'vitest';
import { BatchedMesh, BoxGeometry, Group, Matrix4, Mesh, PerspectiveCamera, Vector3 } from 'three';
import { hasMajorEquipmentShadow } from '../src/render/three/eiffelEquipmentShadow';
import { EiffelLongLoadFilmSystem } from '../src/render/three/EiffelLongLoadFilmSystem';
import { EiffelSecondFloorRelaySystem } from '../src/render/three/EiffelSecondFloorRelaySystem';
import { EiffelWorld } from '../src/render/three/EiffelWorld';
import { sampleEiffelSecondFloorRelayRoute } from '../src/engine/eiffelSecondFloorRelayRoute';
import { readFileSync } from 'node:fs';

type Batch = { mesh: BatchedMesh; majorShadow: boolean; sources: { object?: Mesh; mesh?: Mesh; id: number }[] };
const active: {dispose(): void}[] = [];
afterEach(() => { for (const system of active.splice(0)) system.dispose(); });
function batches(system: unknown) { return (system as {batches: Batch[]}).batches; }
function poses(system: unknown) {
  return batches(system).map(batch => ({ geometry: batch.mesh.geometry, material: batch.mesh.material,
    visible: batch.mesh.visible, receiveShadow: batch.mesh.receiveShadow,
    matrices: batch.sources.map(source => batch.mesh.getMatrixAt(source.id, new Matrix4()).toArray()),
    sourceMatrices: batch.sources.map(source => (source.object ?? source.mesh)!.matrixWorld.toArray()),
    instanceVisibility: batch.sources.map(source => batch.mesh.getVisibleAt(source.id)) }));
}

describe('Eiffel wide-film equipment caster detail', () => {
  it('keeps major transport sections, mixed batches and thin actual payloads', () => {
    const fine = new Mesh(new BoxGeometry(.1, .2, 10)), major = new Mesh(new BoxGeometry(.3, .4, 10));
    expect(hasMajorEquipmentShadow([fine])).toBe(false);
    expect(hasMajorEquipmentShadow([fine, major])).toBe(true);
    const parent = new Group(); parent.scale.set(-2, 2, 1); parent.add(fine);
    expect(hasMajorEquipmentShadow([fine])).toBe(true);
    parent.scale.set(1,1,1); parent.userData.wf_role = 'actual-payload';
    expect(hasMajorEquipmentShadow([fine])).toBe(true);
    fine.geometry.dispose(); major.geometry.dispose();
  });

  it('removes the measured fine equipment casters while retaining geometry, poses and near/detailed shadows', async () => {
    const long = new EiffelLongLoadFilmSystem(true), relay = new EiffelSecondFloorRelaySystem('/models/eiffel-second-floor-relay/relay.glb');
    active.push(long, relay);
    // View selection may precede the asynchronous source parse.
    long.setShadowDetail(false); relay.setShadowDetail(false);
    await Promise.all([long.ready, relay.ready]);
    expect([...batches(long), ...batches(relay)].some(batch => !batch.mesh.castShadow)).toBe(true);
    expect(batches(long)).toHaveLength(12); expect(batches(relay)).toHaveLength(19);
    const removed = new Set<string>();
    for (const system of [long, relay]) {
      for (const batch of batches(system)) {
        const major = hasMajorEquipmentShadow(batch.sources.map(source => (source.object ?? source.mesh)!));
        expect(batch.mesh.castShadow).toBe(major);
        if (!major) removed.add(batch.mesh.name);
      }
    }
    const observed = JSON.parse(readFileSync('artifacts/eiffel-modeling-2026-09-12/mobile-cost-150.json', 'utf8'));
    const saved = observed.costs.meshes as {name: string; shadow: {triangles: number}}[];
    expect(saved.filter(mesh => removed.has(mesh.name)).reduce((sum, mesh) => sum + mesh.shadow.triangles, 0)).toBe(34728);
    // The narrow actual tower member must keep its shadow in the mixed asset.
    const payloadBatch = batches(long).find(batch => batch.sources.some(source => source.object?.userData.wf_role === 'actual-payload'))!;
    expect(payloadBatch.mesh.castShadow).toBe(true);
    for (const seconds of [0, 60, 122, 60, 0]) {
      long.update(seconds); relay.update(sampleEiffelSecondFloorRelayRoute(seconds));
      for (const system of [long, relay]) {
        const before = poses(system);
        for (const detailed of [true, false, true]) {
          system.setShadowDetail(detailed);
          expect(poses(system)).toEqual(before);
          for (const batch of batches(system)) expect(batch.mesh.castShadow).toBe(detailed || batch.majorShadow);
        }
      }
    }
  });

  it('keeps the 190m approach coarse and restores the close work shadows only in the short film', () => {
    const longLoad = { setShadowDetail: vi.fn() }, secondFloorRelay = { setShadowDetail: vi.fn() };
    const world = Object.create(EiffelWorld.prototype) as EiffelWorld;
    Object.assign(world, { environment: { setCrowdCamera: vi.fn() }, stones: { setShadowCamera: vi.fn() },
      longLoadDrive: { setShadowCamera: vi.fn() }, longLoad, secondFloorRelay,
      equipmentShadowCenter: new Vector3(0, 156, 0) });
    const camera = new PerspectiveCamera();
    for (const [distance, short, full] of [[600,true,false],[190,true,false],[179,true,true],[180,true,false],[600,false,true],[91,true,true]] as const) {
      camera.position.set(0,156,distance); world.setCrowdCamera(camera,844,short);
      expect(longLoad.setShadowDetail).toHaveBeenLastCalledWith(full);
      expect(secondFloorRelay.setShadowDetail).toHaveBeenLastCalledWith(full);
    }
  });
});
