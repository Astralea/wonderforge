import { afterEach, describe, expect, it, vi } from 'vitest';
import { Box3, DoubleSide, InstancedMesh, Matrix4, MeshBasicMaterial, Vector3 } from 'three';
import { getWonder } from '../src/data';
import { COLOSSEUM_CONSTRUCTION } from '../src/data/colosseumConstruction';
import * as crewEngine from '../src/engine/colosseumCrew';
import { activeColosseumOperationsAt } from '../src/engine/colosseumConstruction';
import { ColosseumWorkSystem } from '../src/render/three/ColosseumWorkSystem';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';

const point = (mesh: InstancedMesh, index: number, p: Vector3) => {
  const matrix = new Matrix4(); mesh.getMatrixAt(index, matrix);
  return p.clone().applyMatrix4(matrix);
};
const bounds = (mesh: InstancedMesh, index: number) => {
  const box = new Box3(), vertices = mesh.geometry.attributes.position!;
  for (let i = 0; i < vertices.count; i++) box.expandByPoint(point(mesh, index, new Vector3().fromBufferAttribute(vertices, i)));
  return box;
};
const create = () => new ColosseumWorkSystem(createMaterialLibrary(getWonder('colosseum')!), COLOSSEUM_CONSTRUCTION);

afterEach(() => vi.restoreAllMocks());

describe('Colosseum worker foot-contact shadow silhouettes', () => {
  it('keeps two separate gait-following feet and joins the real leaned torso on both detail tiers', () => {
    const labour = vi.spyOn(crewEngine, 'colosseumLabourAt');
    const work = create();
    const contact = work.group.getObjectByName('colosseum-crew-contact-shadows') as InstancedMesh;
    const bodies = work.group.getObjectByName('colosseum-crew-bodies') as InstancedMesh;
    const legs = work.group.getObjectByName('colosseum-crew-legs') as InstancedMesh;
    for (const compact of [false, true]) for (const role of ['hauler', 'climber', 'deck-mason'] as const) {
      work.setCompactDetail(compact);
      for (const gait of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) for (const yaw of [0, 0.7, 2.3]) {
        labour.mockReturnValue({ crews: [{ id: 'probe', role, position: [8, 12, -5], yaw, lean: 0.38, gait, arm: 0.5 }], rigs: [] });
        work.update([], 0.06);
        expect(contact.count).toBe(2);
        expect(contact.castShadow).toBe(true);
        const bodyMatrix = new Matrix4(); bodies.getMatrixAt(0, bodyMatrix);
        const inverseBody = bodyMatrix.invert();
        for (let leg = 0; leg < 2; leg++) {
          const actualFoot = point(legs, leg, new Vector3(0, -0.31, 0));
          const proxyFoot = point(contact, leg, new Vector3(0, 0, 0));
          expect(proxyFoot.distanceTo(actualFoot)).toBeLessThan(0.00001);
          expect(bounds(contact, leg).min.y).toBeCloseTo(12, 5);
          const hipInTorso = point(contact, leg, new Vector3(0, 1, 0)).applyMatrix4(inverseBody);
          expect(Math.abs(hipInTorso.x)).toBeLessThan(0.00001);
          expect(Math.abs(hipInTorso.z)).toBeLessThan(0.00001);
          expect(hipInTorso.y).toBeGreaterThan(-0.49);
          expect(hipInTorso.y).toBeLessThan(0.49);
          // Every ground vertex stays inside the visible foot's pentagon's
          // inscribed circle; the proxy cannot invent a wide ground blob.
          const vertices = contact.geometry.attributes.position!;
          for (let i = 0; i < vertices.count; i++) if (vertices.getY(i) === 0) {
            const v = point(contact, leg, new Vector3().fromBufferAttribute(vertices, i));
            expect(v.distanceTo(actualFoot)).toBeLessThan(0.085 * 4.4 * Math.cos(Math.PI / 5));
          }
        }
        const footGap = point(contact, 0, new Vector3()).distanceTo(point(contact, 1, new Vector3()));
        expect(footGap).toBeGreaterThan(2 * 0.065 * 4.4); // Still two distinct bases at zero stride.
      }
    }
    work.dispose();
  });

  it('provides nonzero directional ground-contact silhouette at any horizontal light bearing', () => {
    const labour = vi.spyOn(crewEngine, 'colosseumLabourAt');
    labour.mockReturnValue({ crews: [{ id: 'probe', role: 'hauler', position: [0, 0, 0], yaw: 0.4, lean: 0.3, gait: 1.2, arm: 0 }], rigs: [] });
    const work = create(); work.setCompactDetail(true); work.update([], 0.06);
    const contact = work.group.getObjectByName('colosseum-crew-contact-shadows') as InstancedMesh;
    const vertices = contact.geometry.attributes.position!;
    for (let degrees = 0; degrees < 360; degrees += 10) {
      const bearing = degrees * Math.PI / 180, altitude = 1.4 * Math.PI / 180;
      const light = new Vector3(Math.cos(bearing) * Math.cos(altitude), Math.sin(altitude), Math.sin(bearing) * Math.cos(altitude));
      for (let leg = 0; leg < 2; leg++) {
        let area = 0;
        for (let face = 0; face < 2; face++) {
          const triangle = [0, 1, 2].map(v => {
            const position = point(contact, leg, new Vector3().fromBufferAttribute(vertices, face * 3 + v));
            return position.addScaledVector(light, -position.y / light.y);
          });
          area += new Vector3().subVectors(triangle[1]!, triangle[0]!).cross(new Vector3().subVectors(triangle[2]!, triangle[0]!)).length() / 2;
        }
        expect(area).toBeGreaterThan(5);
      }
    }
    work.dispose();
  });

  it('adds at most eight submitted triangles per worker and clears counts on empty/reversed frames', () => {
    const work = create(); work.setCompactDetail(true);
    const contact = work.group.getObjectByName('colosseum-crew-contact-shadows') as InstancedMesh;
    const bodies = work.group.getObjectByName('colosseum-crew-bodies') as InstancedMesh;
    const triangleCount = (contact.geometry.index?.count ?? contact.geometry.attributes.position!.count) / 3;
    let maximumWorkers = 0;
    for (const t of [0, 0.06, 0.32, 0.58, 0.8377777777777777, 0.86, 1, 0.06]) {
      work.update(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, t), t);
      maximumWorkers = Math.max(maximumWorkers, bodies.count);
      expect(contact.count).toBe(bodies.count * 2);
      expect(triangleCount * contact.count * 2).toBeLessThanOrEqual(bodies.count * 8);
    }
    expect(maximumWorkers).toBeGreaterThan(20);
    work.update([], 1);
    expect(contact.count).toBe(0);
    work.dispose();
  });

  it('writes no visible color or depth, casts from either side and disposes owned resources', () => {
    const work = create();
    const contact = work.group.getObjectByName('colosseum-crew-contact-shadows') as InstancedMesh;
    const material = contact.material as MeshBasicMaterial;
    expect(material.colorWrite).toBe(false);
    expect(material.depthWrite).toBe(false);
    expect(material.side).toBe(DoubleSide);
    expect(material.shadowSide).toBe(DoubleSide);
    const geometryDispose = vi.spyOn(contact.geometry, 'dispose'), materialDispose = vi.spyOn(material, 'dispose'), meshDispose = vi.spyOn(contact, 'dispose');
    work.dispose();
    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
    expect(meshDispose).toHaveBeenCalledOnce();
  });
});
