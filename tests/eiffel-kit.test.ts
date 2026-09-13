import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { Box3, Group, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import { invertRigidPose, transformRigidPoint, type RigidVec3 } from '../src/engine/eiffelRigid';

const manifest = JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json', 'utf8')) as EiffelKitManifest;
let scene: Group;
async function asset(path: string): Promise<Group> {
  const bytes = readFileSync(path);
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  gltf.scene.updateMatrixWorld(true);
  return gltf.scene;
}
beforeAll(async () => { scene = await asset('public/models/eiffel-construction-kit/tower-kit.glb'); }, 30_000);

describe('bounded Blender Eiffel construction kit', () => {
  it('maps every real exported vertex to its canonical rigid cargo frame', () => {
    const parts = new Map(manifest.parts.map(p => [p.id, p]));
    const seen = new Set<string>();
    const point = new Vector3();
    scene.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const p = parts.get(object.userData.wf_part)!;
      expect(p, object.name).toBeDefined();
      expect(seen.has(p.id), p.id).toBe(false);
      seen.add(p.id);
      const inverse = invertRigidPose(p.finalPose);
      const positions = object.geometry.getAttribute('position');
      const actual = new Box3();
      const canonical = new Box3();
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
        actual.expandByPoint(point);
        const local = transformRigidPoint(inverse, point.toArray() as [number, number, number]);
        canonical.expandByPoint(new Vector3(...local));
        const restored = transformRigidPoint(p.finalPose, local);
        expect(Math.hypot(...restored.map((v, axis) => v - point.getComponent(axis)))).toBeLessThan(.0001);
      }
      for (let axis = 0; axis < 3; axis++) {
        expect(Math.abs(actual.min.getComponent(axis) - p.boundsMin[axis]), p.id).toBeLessThan(.001);
        expect(Math.abs(actual.max.getComponent(axis) - p.boundsMax[axis]), p.id).toBeLessThan(.001);
        expect(Math.abs(canonical.min.getComponent(axis) - p.localBounds.min[axis]), p.id).toBeLessThan(.001);
        expect(Math.abs(canonical.max.getComponent(axis) - p.localBounds.max[axis]), p.id).toBeLessThan(.001);
      }
      // Horizontal carriage uses the measured transformed geometry bottom.
      const carriage = { position: [42, .85 - canonical.min.y, 88] as RigidVec3, quaternion: [0, 0, 0, 1] as const };
      expect(transformRigidPoint(carriage, canonical.min.toArray() as [number, number, number])[1]).toBeCloseTo(.85, 6);
      expect(canonical.max.x - canonical.min.x, p.id).toBeLessThanOrEqual(2.601);
      expect(canonical.max.y - canonical.min.y, p.id).toBeLessThanOrEqual(2.601);
      expect(canonical.max.z - canonical.min.z, p.id).toBeLessThanOrEqual(6.001);
    });
    expect(seen.size).toBe(manifest.parts.length);
    expect(manifest.metadata.constructionReady).toBe(false);
  }, 30_000);

  it('preserves every pre-stage-54 source group envelope after subdivision', async () => {
    const source = await asset('artifacts/eiffel-mechanics-2026-09-06/blender/source-generation/model/tower-rebuilt.glb');
    const partById = new Map(manifest.parts.map(p => [p.id, p]));
    // The exact carried stair mesh is covered by eiffel-summit-revision; its
    // source group also contains the intentionally revised stage-59 newel.
    const preservedGroups = new Set(manifest.parts.filter(p => p.stage < 54).map(p => p.sourceGroup));
    const collect = (root: Group, kit: boolean) => {
      const groups = new Map<string, { bounds: Box3; volume: number }>();
      root.traverse(object => {
        if (!(object instanceof Mesh)) return;
        const id = kit ? partById.get(object.userData.wf_part)!.sourceGroup : String(object.userData.wf_part);
        if (id.startsWith('foundation-') || !preservedGroups.has(id)) return;
        if (!groups.has(id)) groups.set(id, { bounds: new Box3(), volume: 0 });
        const group = groups.get(id)!;
        object.geometry.computeBoundingBox();
        group.bounds.union(object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld));
        const size = object.geometry.boundingBox!.getSize(new Vector3());
        if ([size.x, size.y, size.z].every(v => Math.abs(v - 1) < 1e-6)) group.volume += Math.abs(object.matrixWorld.determinant());
      });
      return groups;
    };
    const before = collect(source, false);
    const after = collect(scene, true);
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [id, original] of before) {
      const rebuilt = after.get(id)!;
      expect(Math.abs(original.volume - rebuilt.volume), id).toBeLessThan(.002);
      for (const key of ['min', 'max'] as const) for (let axis = 0; axis < 3; axis++) {
        expect(Math.abs(original.bounds[key].getComponent(axis) - rebuilt.bounds[key].getComponent(axis)), id).toBeLessThan(.002);
      }
    }
  }, 30_000);

  it('builds sixteen masonry bearings from courses within the original 125m footprint', () => {
    const stones = manifest.parts.filter(p => p.group === 'foundation' && p.material === 'masonry');
    const groups = new Set(stones.map(p => p.sourceGroup));
    expect(groups.size).toBe(16);
    expect(Math.min(...stones.map(p => p.boundsMin[0]))).toBeCloseTo(-62.5, 5);
    expect(Math.max(...stones.map(p => p.boundsMax[0]))).toBeCloseTo(62.5, 5);
    expect(Math.min(...stones.map(p => p.boundsMin[2]))).toBeCloseTo(-62.5, 5);
    expect(Math.max(...stones.map(p => p.boundsMax[2]))).toBeCloseTo(62.5, 5);
    for (const id of groups) {
      const units = stones.filter(p => p.sourceGroup === id);
      expect(Math.min(...units.map(p => p.boundsMin[1]))).toBeCloseTo(0, 5);
      expect(Math.max(...units.map(p => p.boundsMax[1]))).toBeCloseTo(3.84, 5);
      for (const stone of units) {
        const volume = stone.transportSize.reduce((a, b) => a * b, 1);
        expect(volume * 2400).toBeLessThanOrEqual(3000);
        expect(stone.stage).toBeLessThan(1);
      }
    }
  });
});
