import { describe, expect, it } from 'vitest';
import { BoxGeometry, BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { removeInternalBoxFaces } from '../src/render/three/removeInternalBoxFaces';

function boxes(secondX = 1, secondY = 0) {
  return mergeGeometries([new BoxGeometry(1, 1, 1), new BoxGeometry(1, 1, 1).translate(secondX, secondY, 0)], true)!;
}
function rayX(geometry: BufferGeometry, originX: number) {
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
  return new Raycaster(new Vector3(originX, 0.17, 0.13), new Vector3(1, 0, 0)).intersectObject(mesh).map(hit => hit.point.x);
}

describe('removeInternalBoxFaces', () => {
  it('removes the internal pair while retaining exterior ray intersections and source data', () => {
    const source = boxes();
    const { geometry, removedTriangles } = removeInternalBoxFaces(source);
    expect(removedTriangles).toBe(4);
    expect(geometry.index!.count).toBe(60);
    expect(source.index!.count).toBe(72);
    expect(rayX(source, 0)).toEqual([0.5, 0.5, 1.5]);
    expect(rayX(geometry, 0)).toEqual([1.5]);
    expect(rayX(geometry, -2)).toEqual([-0.5, 1.5]);
    expect(geometry.groups).toEqual([
      { start: 0, count: 30, materialIndex: 0 },
      { start: 30, count: 30, materialIndex: 1 },
    ]);
  });

  it.each([[1.01, 0], [1, 0.25], [1.0000001, 0]])('preserves separated or partially overlapping faces (%s, %s)', (x, y) => {
    const source = boxes(x, y);
    const result = removeInternalBoxFaces(source);
    expect(result.removedTriangles).toBe(0);
    expect(Array.from(result.geometry.index!.array)).toEqual(Array.from(source.index!.array));
  });

  it('preserves duplicate same-facing surfaces', () => {
    const source = boxes(0);
    expect(removeInternalBoxFaces(source).removedTriangles).toBe(0);
  });

  it('rejects two copies of one triangle instead of a complete rectangle', () => {
    const source = new BufferGeometry();
    source.setAttribute('position', new BufferAttribute(new Float32Array([
      0,0,0, 0,1,0, 0,1,1,
      0,0,0, 0,1,0, 0,1,1,
      0,0,0, 0,1,1, 0,1,0,
      0,0,0, 0,0,1, 0,1,1,
    ]), 3));
    expect(removeInternalBoxFaces(source).removedTriangles).toBe(0);
  });

  it.each([false, true])('clones every attribute for indexed/nonindexed input (%s)', nonindexed => {
    const source = nonindexed ? boxes().toNonIndexed() : boxes();
    source.setAttribute('customWeight', new BufferAttribute(new Float32Array(source.getAttribute('position').count).fill(0.25), 1));
    const result = removeInternalBoxFaces(source);
    expect(result.removedTriangles).toBe(4);
    expect(result.geometry.index).not.toBeNull();
    for (const name of Object.keys(source.attributes)) {
      expect(result.geometry.getAttribute(name)).not.toBe(source.getAttribute(name));
      expect(Array.from(result.geometry.getAttribute(name).array)).toEqual(Array.from(source.getAttribute(name).array));
    }
    result.geometry.getAttribute('customWeight').setX(0, 0.75);
    expect(source.getAttribute('customWeight').getX(0)).toBe(0.25);
  });

  it('preserves unsupported skin, morph, and partial-triangle draw ranges', () => {
    const skinned = boxes();
    skinned.setAttribute('skinIndex', new BufferAttribute(new Uint16Array(4 * skinned.getAttribute('position').count), 4));
    const morphed = boxes();
    morphed.morphAttributes.position = [morphed.getAttribute('position').clone()];
    const clipped = boxes(); clipped.setDrawRange(1, 20);
    for (const source of [skinned, morphed, clipped]) {
      const result = removeInternalBoxFaces(source);
      expect(result.removedTriangles).toBe(0);
      expect(result.geometry.drawRange).toEqual(source.drawRange);
      expect(result.geometry.groups).toEqual(source.groups);
    }
  });

  it('retains the exposed face when only the second box is drawn', () => {
    const source = boxes(); source.setDrawRange(36, 36);
    const result = removeInternalBoxFaces(source);
    expect(result.removedTriangles).toBe(0);
    expect(result.geometry.drawRange).toEqual({ start: 36, count: 36 });
    expect(rayX(result.geometry, 0)).toEqual([0.5, 1.5]);
  });

  it('accepts a finite draw range that covers both entire boxes', () => {
    const source = boxes(); source.setDrawRange(0, 72);
    const result = removeInternalBoxFaces(source);
    expect(result.removedTriangles).toBe(4);
    expect(result.geometry.drawRange).toEqual({ start: 0, count: 60 });
  });

  it('retains the exposed face when material groups omit one of the boxes', () => {
    const source = boxes(); source.clearGroups(); source.addGroup(36, 36, 0);
    const result = removeInternalBoxFaces(source);
    expect(result.removedTriangles).toBe(0);
    expect(result.geometry.groups).toEqual(source.groups);
    const mesh = new Mesh(result.geometry, [new MeshBasicMaterial({ side: DoubleSide })]);
    const hits = new Raycaster(new Vector3(0, 0.17, 0.13), new Vector3(1, 0, 0)).intersectObject(mesh);
    expect(hits.map(hit => hit.point.x)).toEqual([0.5, 1.5]);
  });

  it('preserves overlapping group coverage', () => {
    const source = boxes(); source.addGroup(0, 6, 2);
    const result = removeInternalBoxFaces(source);
    expect(result.removedTriangles).toBe(0);
    expect(result.geometry.groups).toEqual(source.groups);
  });

  it('supports opposed rectangular faces on every axis', () => {
    for (const axis of ['x', 'y', 'z'] as const) {
      const delta = new Vector3(); delta[axis] = 1;
      const source = mergeGeometries([new BoxGeometry(1, 1, 1), new BoxGeometry(1, 1, 1).translate(delta.x, delta.y, delta.z)])!;
      expect(removeInternalBoxFaces(source).removedTriangles).toBe(4);
    }
  });
});
