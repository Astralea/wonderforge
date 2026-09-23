import { describe, expect, it } from 'vitest';
import {
  Box3,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { SYDNEY_BOAT_ROUTES, sydneyBoatsAt } from '../src/engine/sydneyBoats';
import {
  SYDNEY_BRIDGE,
  SYDNEY_WATER_Y,
  sydneyTerrainHeightAt,
} from '../src/engine/sydneyTerrain';
import { SYDNEY_HARBOUR_CONTEXT } from '../src/data/sydneyHarbourContext';
import { SydneyEnvironment } from '../src/render/three/SydneyEnvironment';

// Actual renderer matrices and geometry are the clearance oracle: a route
// centre alone cannot detect a bow crossing a quay or a detached mast.
function boatMeshes(env: SydneyEnvironment): InstancedMesh[] {
  return [
    'sydney-harbour-hulls',
    'sydney-harbour-cabins',
    'sydney-harbour-masts',
  ].map((name) => env.group.getObjectByName(name) as InstancedMesh);
}
function update(env: SydneyEnvironment, t: number): void {
  env.update(t, { emissive: 0 } as never, {} as never);
}

describe('Sydney navigable workboat voyages', () => {
  it('reconstructs deterministic, continuous voyages with forward-facing bows and no end wrap', () => {
    expect(sydneyBoatsAt(0.58)).toEqual(sydneyBoatsAt(0.58));
    expect(sydneyBoatsAt(-1)).toEqual(sydneyBoatsAt(0));
    expect(sydneyBoatsAt(2)).toEqual(sydneyBoatsAt(1));
    for (let i = 0; i < SYDNEY_BOAT_ROUTES.length; i++) {
      const route = SYDNEY_BOAT_ROUTES[i]!;
      const start = sydneyBoatsAt(0)[i]!,
        end = sydneyBoatsAt(1)[i]!;
      const distance = Math.hypot(
        end.position[0] - start.position[0],
        end.position[2] - start.position[2],
      );
      if (route.berthYaw === undefined) expect(distance).toBeGreaterThan(60);
      else expect(distance).toBe(0);
      for (let step = 0; step < 600; step++) {
        const t = step / 600,
          a = sydneyBoatsAt(t)[i]!,
          b = sydneyBoatsAt(t + 1 / 600)[i]!;
        const dx = b.position[0] - a.position[0],
          dz = b.position[2] - a.position[2];
        expect(Math.hypot(dx, dz)).toBeLessThan(0.31); // ≤3.1 m/s in the 60-second film.
        expect(a.position[1]).toBe(SYDNEY_WATER_Y + 0.03);
        if (distance > 0)
          expect(
            (dx * Math.cos(a.yaw) - dz * Math.sin(a.yaw)) / Math.hypot(dx, dz),
          ).toBeGreaterThan(0.999);
      }
    }
  });

  it('keeps full rendered hull/cabin/mast extents in water, clear of shores, wharves, bridge and other boats', async () => {
    const whitewash = new MeshStandardMaterial(),
      water = new MeshStandardMaterial();
    const env = new SydneyEnvironment({ whitewash, water } as never);
    try {
      const meshes = boatMeshes(env);
      const originalGeometry = meshes.map((m) => m.geometry);
      await env.ready;
      expect(meshes.map((m) => m.geometry)).toEqual(originalGeometry); // Kit upgrade preserves these boat assets.
      for (const mesh of meshes) expect(mesh.frustumCulled).toBe(false);
      let maximumGround = 0,
        minimumGap = Infinity;
      for (let step = 0; step <= 300; step++) {
        const t = step / 300;
        update(env, t);
        const boxes: Box3[] = [];
        for (let i = 0; i < SYDNEY_BOAT_ROUTES.length; i++) {
          const box = new Box3();
          for (const mesh of meshes) {
            const matrix = new Matrix4();
            mesh.getMatrixAt(i, matrix);
            const vertices = mesh.geometry.getAttribute('position');
            for (let j = 0; j < vertices.count; j++)
              box.expandByPoint(
                new Vector3()
                  .fromBufferAttribute(vertices, j)
                  .applyMatrix4(matrix),
              );
          }
          expect(box.min.y).toBeLessThan(SYDNEY_WATER_Y);
          expect(box.max.y).toBeGreaterThan(SYDNEY_WATER_Y);
          // The original keel deck is y=.19; both cabin and mast sit on it.
          for (const mesh of meshes.slice(1)) {
            const matrix = new Matrix4();
            mesh.getMatrixAt(i, matrix);
            mesh.geometry.computeBoundingBox();
            const part = mesh.geometry
              .boundingBox!.clone()
              .applyMatrix4(matrix);
            expect(part.min.y).toBeCloseTo(SYDNEY_WATER_Y + 0.03 + 0.19, 5);
          }
          // Grid the conservative full world AABB, including its interior and
          // one metre shoreline buffer, not just favourable mesh vertices.
          const expanded = box.clone().expandByScalar(1);
          for (
            let x = expanded.min.x;
            x <= expanded.max.x + 0.001;
            x += (expanded.max.x - expanded.min.x) / 30
          )
            for (
              let z = expanded.min.z;
              z <= expanded.max.z + 0.001;
              z += (expanded.max.z - expanded.min.z) / 16
            )
              maximumGround = Math.max(
                maximumGround,
                sydneyTerrainHeightAt(x, z),
              );
          for (const pier of SYDNEY_HARBOUR_CONTEXT.wharves) {
            const wharf = new Box3(
              new Vector3(
                pier.x - pier.width / 2,
                -3,
                pier.z - pier.length / 2,
              ),
              new Vector3(
                pier.x + pier.width / 2,
                2.2,
                pier.z + pier.length / 2,
              ),
            );
            expect(expanded.intersectsBox(wharf)).toBe(false);
          }
          // Routes stay entirely east of all bridge deck, pylons and approaches.
          expect(expanded.min.x).toBeGreaterThan(SYDNEY_BRIDGE.x + 40);
          const hullMatrix = new Matrix4(),
            mastMatrix = new Matrix4();
          meshes[0]!.getMatrixAt(i, hullMatrix);
          meshes[2]!.getMatrixAt(i, mastMatrix);
          const mastOrigin = new Vector3()
            .setFromMatrixPosition(mastMatrix)
            .applyMatrix4(hullMatrix.clone().invert());
          expect(mastOrigin.x).toBeCloseTo(-1.4 / 16, 5);
          expect(mastOrigin.y).toBeCloseTo(3.79, 5);
          expect(mastOrigin.z).toBeCloseTo(0, 5);
          boxes.push(box);
        }
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i]!,
              b = boxes[j]!;
            const gap = Math.hypot(
              Math.max(0, a.min.x - b.max.x, b.min.x - a.max.x),
              Math.max(0, a.min.z - b.max.z, b.min.z - a.max.z),
            );
            minimumGap = Math.min(minimumGap, gap);
          }
      }
      expect(maximumGround).toBe(SYDNEY_WATER_Y);
      expect(minimumGap).toBeGreaterThan(3);
      update(env, 0.58);
      const first = meshes.map((m) => [...m.instanceMatrix.array]);
      update(env, 0.12);
      update(env, 0.58);
      expect(meshes.map((m) => [...m.instanceMatrix.array])).toEqual(first);
    } finally {
      env.dispose();
      whitewash.dispose();
      water.dispose();
    }
  });
});
