import { describe, expect, it, vi } from 'vitest';
import { BufferGeometry, Float32BufferAttribute, Mesh, Raycaster, Vector3 } from 'three';
import { COLOSSEUM_URBAN_CONTEXT as C } from '../src/data/colosseumUrbanContext';
import { COLOSSEUM_AQUEDUCT as A } from '../src/data/colosseumAqueduct';
import { caelianLotFoundation, createCaelianStreetFronts } from '../src/engine/colosseumUrbanContext';
import { colosseumTerrainHeightAt as ground } from '../src/engine/colosseumTerrain';
import { ColosseumUrbanContext } from '../src/render/three/ColosseumUrbanContext';

interface Part { id: string; firstVertex: number; vertexCount: number }
function vertices(mesh: Mesh, id: string): Vector3[] {
  const part = (mesh.geometry.userData.parts as Part[]).find(p => p.id === id)!;
  expect(part, id).toBeDefined();
  return Array.from({ length: part.vertexCount }, (_, index) => new Vector3().fromBufferAttribute(mesh.geometry.attributes.position!, part.firstVertex + index));
}
function partMesh(mesh: Mesh, id: string): Mesh {
  const geometry = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(vertices(mesh, id).flatMap(v => v.toArray()), 3));
  const part = new Mesh(geometry, mesh.material);
  part.updateMatrixWorld();
  return part;
}

describe('connected Caelian context production geometry', () => {
  it('draws every named street directly on the production terrain outside the working floor', () => {
    const context = new ColosseumUrbanContext();
    try {
      const mesh = context.group.getObjectByName('colosseum-urban-streets') as Mesh;
      const p = mesh.geometry.attributes.position!;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        expect(y - ground(x,z)).toBeCloseTo(.08, 4);
        expect(Math.hypot(x,z)).toBeGreaterThan(140);
      }
      for (const street of C.streets) expect(vertices(mesh, street.id).length).toBeGreaterThan(6);
      const normals = mesh.geometry.attributes.normal!;
      for (let i = 0; i < normals.count; i++) expect(normals.getY(i)).toBeGreaterThan(.8);
    } finally { context.dispose(); }
  });

  it('connects the north street to the court with grounded, level treads and a clear forecourt', () => {
    const context = new ColosseumUrbanContext();
    try {
      const mesh = context.group.getObjectByName('colosseum-urban-court-and-portico') as Mesh;
      const stairs = vertices(mesh, 'precinct-north-stair');
      const approach = C.streets.find(s => s.id === 'precinct-north-approach')!.points[0]!;
      const north = C.precinct.center[1] + C.precinct.depth / 2;
      expect(Math.max(...stairs.map(p => p.z))).toBeCloseTo(approach[1], 4);
      expect(Math.min(...stairs.map(p => p.z))).toBeCloseTo(north, 4);
      expect(Math.max(...stairs.map(p => p.y))).toBeCloseTo(C.precinct.top, 4);
      let previous = ground(...approach) + .08;
      for (let i = 0; i < stairs.length; i += 24) {
        const top = stairs.slice(i, i + 6);
        const height = top[0]!.y;
        expect(height - previous).toBeGreaterThan(0);
        expect(height - previous).toBeLessThanOrEqual(.20001);
        for (const p of top) {
          expect(p.y).toBe(height);
          expect(p.y - ground(p.x,p.z)).toBeGreaterThan(0);
        }
        // Both exposed side walls land at the production ground at all corners.
        for (const n of [12,13,15,18,19,21]) {
          const p = stairs[i + n]!;
          if (p.y === height) continue;
          expect(p.y - ground(p.x,p.z)).toBeCloseTo(-.06, 4);
        }
        previous = height;
      }
      const court = new Raycaster(new Vector3(C.precinct.center[0], 60, north - 12), new Vector3(0,-1,0));
      mesh.updateMatrixWorld();
      expect(court.intersectObject(mesh)[0]!.point.y).toBeCloseTo(C.precinct.top, 4);
    } finally { context.dispose(); }
  });

  it('gives every street-front Blender lot a level foundation down to its actual transformed corners', () => {
    const context = new ColosseumUrbanContext();
    try {
      const mesh = context.group.getObjectByName('colosseum-urban-retaining-masonry') as Mesh;
      createCaelianStreetFronts().forEach((lot, index) => {
        const { top, corners } = caelianLotFoundation(lot);
        const points = vertices(mesh, `street-front-foundation-${index}`);
        for (const corner of corners) {
          const matching = points.filter(p => Math.hypot(p.x - corner.x, p.z - corner.z) < .0001);
          expect(matching.length).toBeGreaterThan(2);
          expect(Math.min(...matching.map(p => p.y))).toBeCloseTo(corner.ground - .06, 4);
          expect(Math.max(...matching.map(p => p.y))).toBeCloseTo(top, 4);
        }
        const footing = partMesh(mesh, `street-front-foundation-${index}`);
        const ray = new Raycaster(new Vector3(lot.x, top + 2, lot.z), new Vector3(0,-1,0));
        expect(ray.intersectObject(footing)[0]!.point.y).toBeCloseTo(top, 4);
        footing.geometry.dispose();
      });
    } finally { context.dispose(); }
  });

  it('continues the closed aqueduct channel into the precinct east wall, with a recessed receiver', () => {
    const context = new ColosseumUrbanContext();
    try {
      const mesh = context.group.getObjectByName('colosseum-urban-retaining-masonry') as Mesh;
      const points = vertices(mesh, 'aqueduct-covered-wall-entry');
      const [x,z] = C.watercourse.receiver;
      const east = C.precinct.center[0] + C.precinct.width / 2;
      expect(Math.min(...points.map(p => p.x))).toBeLessThan(east - .8);
      const end = points.filter(p => Math.abs((p.x - x) * A.direction[0] + (p.z - z) * A.direction[1]) < .0001);
      expect(end.length).toBeGreaterThan(6);
      const bottom = A.springingHeight - A.pierWidth / 2 * A.grade + A.spandrelTop;
      expect(Math.min(...end.map(p => p.y))).toBeCloseTo(bottom, 4);
      expect(Math.max(...end.map(p => p.y))).toBeCloseTo(bottom + A.channelHeight + A.capHeight, 4);
      const recess = vertices(mesh, 'aqueduct-receiving-recess');
      expect(Math.min(...recess.map(p => p.x))).toBeLessThan(east - 2);
      expect(Math.max(...recess.map(p => p.x))).toBeCloseTo(east, 4);
    } finally { context.dispose(); }
  });

  it('keeps a low open-court silhouette in four bounded static batches and disposes once', () => {
    const context = new ColosseumUrbanContext();
    let triangles = 0;
    const disposal = [];
    expect(context.group.children).toHaveLength(4);
    for (const object of context.group.children) {
      expect(object).toBeInstanceOf(Mesh);
      const mesh = object as Mesh;
      expect(mesh.castShadow).toBe(false);
      triangles += mesh.geometry.attributes.position!.count / 3;
      expect(mesh.geometry.boundingBox!.max.y).toBeLessThan(48);
      disposal.push(vi.spyOn(mesh.geometry, 'dispose'));
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) disposal.push(vi.spyOn(material, 'dispose'));
    }
    expect(triangles).toBeLessThanOrEqual(3800);
    context.dispose();
    context.dispose();
    disposal.forEach(spy => expect(spy).toHaveBeenCalledOnce());
  });
});
