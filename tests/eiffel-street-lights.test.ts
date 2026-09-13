import { readFileSync } from 'node:fs';
import { Box3, BufferGeometry, DoubleSide, Float32BufferAttribute, InstancedMesh,
  Matrix4, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { EIFFEL_STREET_LAMPS, EIFFEL_STREET_LAMP_POOL_RADIUS } from '../src/engine/eiffelStreetLights';
import { EiffelStreetLights } from '../src/render/three/EiffelStreetLights';
import { eiffelTrafficPoseAt, roundedRouteLength } from '../src/engine/eiffelTraffic';
import { EIFFEL_TRAFFIC_ACTORS, EIFFEL_TRAFFIC_ROUTES } from '../src/data/eiffelTraffic';

const manifest = JSON.parse(readFileSync('public/models/paris-1889/paris.manifest.json', 'utf8'));
/** Read the shipped mesh's exact accessors without needing browser image APIs.
 * This fixture rejects transformed nodes rather than silently ignoring them. */
function cityGeometry(material: string): BufferGeometry {
  const bytes = readFileSync('public/models/paris-1889/paris-city.glb');
  const jsonLength = bytes.readUInt32LE(12), gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const binary = 28 + jsonLength;
  const node = gltf.nodes.find((item: { extras?: { wf_material?: string } }) => item.extras?.wf_material === material);
  expect(node.translation ?? [0, 0, 0]).toEqual([0, 0, 0]);
  expect(node.rotation ?? [0, 0, 0, 1]).toEqual([0, 0, 0, 1]);
  expect(node.scale ?? [1, 1, 1]).toEqual([1, 1, 1]); expect(node.matrix).toBeUndefined();
  const primitive = gltf.meshes[node.mesh].primitives[0];
  const read = (index: number, components: number): number[] => {
    const accessor = gltf.accessors[index], view = gltf.bufferViews[accessor.bufferView];
    const size = accessor.componentType === 5123 ? 2 : 4;
    const start = binary + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const values: number[] = [];
    for (let i = 0; i < accessor.count; i++) for (let k = 0; k < components; k++) {
      const offset = start + i * (view.byteStride ?? size * components) + k * size;
      values.push(accessor.componentType === 5126 ? bytes.readFloatLE(offset)
        : accessor.componentType === 5123 ? bytes.readUInt16LE(offset) : bytes.readUInt32LE(offset));
    }
    return values;
  };
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(read(primitive.attributes.POSITION, 3), 3));
  geometry.setIndex(read(primitive.indices, 1)); return geometry;
}

describe('existing 1889 street gas lamps', () => {
  it('aligns all glow apertures with real shipped lanterns and grounded pole vertices', () => {
    const cream = cityGeometry('cream'), iron = cityGeometry('iron');
    const lights = new EiffelStreetLights(); lights.group.updateMatrixWorld(true);
    const apertures = lights.group.getObjectByName('eiffel-gas-apertures') as InstancedMesh;
    apertures.geometry.computeBoundingBox();
    const point = new Vector3(), matrix = new Matrix4(), world = new Matrix4();
    for (let index = 0; index < EIFFEL_STREET_LAMPS.length; index++) {
      const lamp = EIFFEL_STREET_LAMPS[index]!;
      const bounds = new Box3(); let count = 0;
      const position = cream.getAttribute('position');
      for (let vertex = 0; vertex < position.count; vertex++) {
        point.fromBufferAttribute(position, vertex);
        if (Math.abs(point.x - lamp.base[0]) < .24 && Math.abs(point.z - lamp.base[2]) < .24
          && Math.abs(point.y - lamp.apertureY) < .3) { bounds.expandByPoint(point); count++; }
      }
      expect(count, lamp.id).toBeGreaterThanOrEqual(8);
      expect(bounds.getSize(new Vector3()).toArray()).toEqual(expect.arrayContaining([
        expect.closeTo(.45, 3), expect.closeTo(.55, 3), expect.closeTo(.45, 3),
      ]));
      apertures.getMatrixAt(index, matrix); world.multiplyMatrices(apertures.matrixWorld, matrix);
      const overlay = apertures.geometry.boundingBox!.clone().applyMatrix4(world);
      for (const axis of ['x', 'y', 'z'] as const) {
        expect(bounds.min[axis] - overlay.min[axis]).toBeCloseTo(.003, 4);
        expect(overlay.max[axis] - bounds.max[axis]).toBeCloseTo(.003, 4);
      }
      const pole = iron.getAttribute('position'); let bottom = Infinity;
      for (let vertex = 0; vertex < pole.count; vertex++) {
        point.fromBufferAttribute(pole, vertex);
        if (Math.abs(point.x - lamp.base[0]) < .09 && Math.abs(point.z - lamp.base[2]) < .09
          && point.y < lamp.apertureY - .5) bottom = Math.min(bottom, point.y);
      }
      expect(bottom, lamp.id).toBeCloseTo(lamp.base[1], 5);
    }
    lights.dispose(); cream.dispose(); iron.dispose();
  });

  it('keeps the lamp envelope on paving and clear of buildings, trees, water and every traffic route', () => {
    const radius = EIFFEL_STREET_LAMP_POOL_RADIUS;
    const buildings = [...manifest.buildings, ...manifest.riverfrontBuildings,
      ...manifest.landmarks.map((b: { center: number[]; size: number[] }) => ({ bounds:
        [b.center[0]! - b.size[0]! / 2, b.center[1]! - b.size[1]! / 2,
          b.center[0]! + b.size[0]! / 2, b.center[1]! + b.size[1]! / 2] }))];
    const clearRect = (x: number, z: number, bounds: number[], margin: number) =>
      x + margin < bounds[0]! || x - margin > bounds[2]! || z + margin < bounds[1]! || z - margin > bounds[3]!;
    for (const lamp of EIFFEL_STREET_LAMPS) {
      const [x, , z] = lamp.base;
      expect(manifest.southBankStreets.some((s: { material: string; bounds: number[] }) =>
        s.material === 'paving' && x - radius >= s.bounds[0]! && x + radius <= s.bounds[2]!
        && z - radius >= s.bounds[1]! && z + radius <= s.bounds[3]!)).toBe(true);
      for (const b of buildings) expect(clearRect(x, z, b.bounds, 1.6), lamp.id).toBe(true);
      for (const tree of manifest.plantings) expect(Math.hypot(tree.x - x, tree.z - z)).toBeGreaterThan(tree.radius + .3);
      expect(clearRect(x, z, manifest.siteLayout.constructionGround.bounds, 1.6)).toBe(true);
      expect(clearRect(x, z, manifest.siteLayout.workyard.bounds, 1.6)).toBe(true);
      expect(Math.abs(Math.sin(.08) * x + Math.cos(.08) * (z + 175))).toBeGreaterThan(74);
    }
    for (const route of EIFFEL_TRAFFIC_ROUTES) {
      if (route.surface === 'water') continue;
      const actors = EIFFEL_TRAFFIC_ACTORS.filter(actor => actor.routeId === route.id);
      const distinct = [...new Map(actors.map(actor => [`${actor.kind}-${actor.lateralOffset ?? 0}`, actor])).values()];
      for (const actor of distinct) {
        const nearest = EIFFEL_STREET_LAMPS.map(() => Infinity);
        // Envelope samples cover a full route independent of an actor's speed,
        // including halted groups; one metre spacing and a .5m guard avoid gaps.
        const steps = Math.ceil(roundedRouteLength(route));
        for (let step = 0; step < steps; step++) {
          const p = eiffelTrafficPoseAt({ ...actor, speed: 0, phase: step / steps }, 0);
          const clearance = actor.kind === 'carriage' || actor.kind === 'cart' ? 2.5 : 1;
          EIFFEL_STREET_LAMPS.forEach((lamp, index) => {
            nearest[index] = Math.min(nearest[index]!, Math.hypot(p.position[0] - lamp.base[0], p.position[2] - lamp.base[2]) - clearance);
          });
        }
        nearest.forEach(distance => expect(distance, route.id).toBeGreaterThan(0));
      }
    }
  });

  it('fits actual exported pavement triangles and leaves finite authored instances unchanged through reverse seeks', () => {
    const lights = new EiffelStreetLights(), paving = cityGeometry('paving');
    const material = new MeshBasicMaterial({ side: DoubleSide }), pavement = new Mesh(paving, material);
    pavement.updateMatrixWorld(true); lights.group.updateMatrixWorld(true);
    const pool = lights.group.getObjectByName('eiffel-gas-ground-pools') as Mesh;
    const positions = pool.geometry.getAttribute('position'), ray = new Raycaster(), point = new Vector3();
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(pool.matrixWorld);
      ray.set(new Vector3(point.x, point.y + 1, point.z), new Vector3(0, -1, 0));
      const hits = ray.intersectObject(pavement); expect(hits.length).toBeGreaterThan(0);
      expect(point.y - hits[0]!.point.y).toBeGreaterThan(0);
      expect(point.y - hits[0]!.point.y).toBeLessThan(.03);
    }
    const meshes = lights.group.children.filter((o): o is InstancedMesh => o instanceof InstancedMesh);
    const before = meshes.map(mesh => Array.from(mesh.instanceMatrix.array));
    for (const mesh of meshes) for (let i = 0; i < mesh.count; i++) {
      const matrix = new Matrix4(); mesh.getMatrixAt(i, matrix);
      expect(matrix.elements.every(Number.isFinite)).toBe(true);
      expect(new Vector3().setFromMatrixPosition(matrix).length()).toBeGreaterThan(180);
    }
    lights.setCityAvailable(true);
    for (const t of [0, .3, 1, .5, 0, 1, .3]) lights.update(t);
    expect(lights.group.userData.nightAmount).toBe(.3);
    meshes.forEach((mesh, index) => expect(Array.from(mesh.instanceMatrix.array)).toEqual(before[index]));
    lights.dispose(); paving.dispose(); material.dispose();
  });

  it('bounds costs, follows reversible night intensity, hides missing city and disposes all resources exactly once', () => {
    const lights = new EiffelStreetLights();
    expect(lights.group.visible).toBe(false);
    expect(lights.group.children).toHaveLength(3);
    const meshes = lights.group.children as Mesh[];
    expect(meshes.reduce((sum, mesh) => sum + (mesh.geometry.index!.count / 3)
      * (mesh instanceof InstancedMesh ? mesh.count : 1), 0)).toBeLessThan(1800);
    const dispose = [...meshes.map(m => vi.spyOn(m.geometry, 'dispose')),
      ...meshes.map(m => vi.spyOn(m.material as MeshBasicMaterial, 'dispose')),
      ...meshes.filter((m): m is InstancedMesh => m instanceof InstancedMesh).map(m => vi.spyOn(m, 'dispose'))];
    lights.update(1); expect(lights.group.visible).toBe(false);
    lights.setCityAvailable(true); expect(lights.group.visible).toBe(true);
    const night = { ...lights.group.userData };
    lights.update(.5); expect(lights.group.userData.poolOpacity).toBe(night.poolOpacity / 2);
    lights.update(0); expect(lights.group.visible).toBe(false);
    lights.update(1); expect(lights.group.userData).toEqual(night);
    lights.update(99); expect(lights.group.userData.nightAmount).toBe(1);
    for (const bad of [-1, NaN, Infinity]) { lights.update(bad); expect(lights.group.visible).toBe(false); }
    lights.update(1); lights.setCityAvailable(false); expect(lights.group.visible).toBe(false);
    lights.dispose(); lights.dispose();
    dispose.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
    expect(lights.group.children).toHaveLength(0);
  });
});
