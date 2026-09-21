import { describe, expect, it, vi } from 'vitest';
import { BufferGeometry, InstancedMesh, Matrix4, Mesh, PerspectiveCamera, Raycaster, Vector3 } from 'three';
import { readFile } from 'node:fs/promises';
import { COLOSSEUM_AQUEDUCT as A } from '../src/data/colosseumAqueduct';
import { AQUEDUCT_LENGTH, AQUEDUCT_PITCH, aqueductPierAt, aqueductPointAt } from '../src/engine/colosseumAqueduct';
import { colosseumTerrainHeightAt } from '../src/engine/colosseumTerrain';
import { ColosseumAqueduct, loadAqueductKit } from '../src/render/three/ColosseumAqueduct';

describe('Neronian aqueduct asset and hydraulic alignment', () => {
  it('uses a continuous gentle conduit grade and grounded, unscaled arch spans', async () => {
    const aqueduct = new ColosseumAqueduct();
    await aqueduct.ready;
    expect(aqueduct.group.userData.asset).toBe('blender');
    const piers = aqueduct.group.getObjectByName('colosseum-aqueduct-piers') as InstancedMesh;
    const arches = aqueduct.group.getObjectByName('colosseum-aqueduct-arches') as InstancedMesh;
    const matrix = new Matrix4();
    expect(piers.count).toBe(28);
    expect(arches.count).toBe(27);
    for (let i = 0; i < A.pierCount; i++) {
      const pier = aqueductPierAt(i);
      piers.getMatrixAt(i, matrix);
      const bottom = new Vector3(0, 0, 0).applyMatrix4(matrix);
      const top = new Vector3(0, 1, 0).applyMatrix4(matrix);
      expect(bottom.y).toBeLessThan(colosseumTerrainHeightAt(bottom.x, bottom.z));
      expect(top.y).toBeCloseTo(pier.springing, 4);
      if (i === A.pierCount - 1) continue;
      arches.getMatrixAt(i, matrix);
      const left = new Vector3(-AQUEDUCT_PITCH / 2, 0, 0).applyMatrix4(matrix);
      const right = new Vector3(AQUEDUCT_PITCH / 2, 0, 0).applyMatrix4(matrix);
      const next = aqueductPierAt(i + 1);
      expect(left.x).toBeCloseTo(pier.x, 4);
      expect(left.z).toBeCloseTo(pier.z, 4);
      expect(left.y).toBeCloseTo(pier.springing, 4);
      expect(right.x).toBeCloseTo(next.x, 4);
      expect(right.z).toBeCloseTo(next.z, 4);
      expect(right.y).toBeCloseTo(next.springing, 4);
    }
    const channel = aqueduct.group.getObjectByName('colosseum-aqueduct-channel') as Mesh;
    const left = new Vector3(-AQUEDUCT_LENGTH / 2, 0, 0).applyMatrix4(channel.matrix);
    const right = new Vector3(AQUEDUCT_LENGTH / 2, 0, 0).applyMatrix4(channel.matrix);
    expect(right.y - left.y).toBeCloseTo(AQUEDUCT_LENGTH * A.grade, 5);
    expect(left.y).toBeCloseTo(aqueductPointAt(0).springing + A.spandrelTop, 4);
    aqueduct.dispose();
  });

  it('imports genuine semicircular openings and load-bearing spandrels at both detail levels', async () => {
    const kit = await loadAqueductKit();
    for (const geometry of [kit.arch, kit.archPortrait]) {
      const mesh = new Mesh(geometry);
      mesh.updateMatrixWorld();
      const hit = (x: number, y: number) => new Raycaster(new Vector3(x, y, 5), new Vector3(0, 0, -1)).intersectObject(mesh).length;
      expect(hit(0, 1)).toBe(0);
      expect(hit(0, A.archRise + 0.35)).toBeGreaterThan(0);
      expect(hit(A.clearSpan / 2 - 0.04, 1.5)).toBeGreaterThan(0);
      geometry.computeBoundingBox();
      expect(geometry.boundingBox!.max.x - geometry.boundingBox!.min.x).toBeCloseTo(AQUEDUCT_PITCH, 4);
      expect(geometry.boundingBox!.max.y).toBeCloseTo(A.spandrelTop, 4);
    }
    Object.values(kit).forEach(geometry => geometry.dispose());
  });

  it('switches detail without changing span transforms and owns every GPU resource', async () => {
    const aqueduct = new ColosseumAqueduct();
    await aqueduct.ready;
    const arches = aqueduct.group.getObjectByName('colosseum-aqueduct-arches') as InstancedMesh;
    const transforms = Array.from(arches.instanceMatrix.array);
    const camera = new PerspectiveCamera(35, 390 / 844);
    aqueduct.update(camera);
    let triangles = 0;
    aqueduct.group.traverse(object => {
      if (!(object instanceof Mesh)) return;
      triangles += (object.geometry.index?.count ?? object.geometry.attributes.position!.count) / 3 * (object instanceof InstancedMesh ? object.count : 1);
      expect(object.castShadow).toBe(false);
    });
    // Near Blender arches plus the deliberately flat, shadow-free distant continuation.
    expect(triangles).toBeLessThanOrEqual(2424 + 3000);
    const portrait = arches.geometry;
    const disposal = vi.spyOn(portrait, 'dispose');
    camera.aspect = 1.6;
    aqueduct.update(camera);
    expect(arches.geometry).not.toBe(portrait);
    expect(Array.from(arches.instanceMatrix.array)).toEqual(transforms);
    aqueduct.dispose();
    expect(disposal).toHaveBeenCalledOnce();
  });

  it('retains the grounded fallback when a delivered model is invalid', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('invalid glb'));
    try {
      const aqueduct = new ColosseumAqueduct();
      await aqueduct.ready;
      expect(aqueduct.group.userData.asset).toBe('fallback');
      const piers = aqueduct.group.getObjectByName('colosseum-aqueduct-piers') as InstancedMesh;
      expect(piers.count).toBe(A.pierCount);
      aqueduct.dispose();
    } finally { fetchMock.mockRestore(); }
  });

  it('disposes late imported geometry without replacing an already disposed scene', async () => {
    const bytes = await readFile(`${process.cwd()}/public${A.glb}`);
    let finish!: (response: Response) => void;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const dispose = vi.spyOn(BufferGeometry.prototype, 'dispose');
    try {
      const aqueduct = new ColosseumAqueduct();
      const arches = aqueduct.group.getObjectByName('colosseum-aqueduct-arches') as InstancedMesh;
      const geometry = arches.geometry;
      aqueduct.dispose();
      const calls = dispose.mock.calls.length;
      finish(new Response(bytes));
      await aqueduct.ready;
      expect(arches.geometry).toBe(geometry);
      expect(aqueduct.group.userData.asset).toBe('fallback');
      expect(dispose.mock.calls.length).toBeGreaterThanOrEqual(calls + 10);
    } finally { fetchMock.mockRestore(); dispose.mockRestore(); }
  });
});
