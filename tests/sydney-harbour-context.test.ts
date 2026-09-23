import { describe, expect, it } from 'vitest';
import {
  SYDNEY_HARBOUR_CONTEXT,
  sydneyDistanceToRoute,
} from '../src/data/sydneyHarbourContext';
import {
  createSydneyHarbourLots,
  sydneyFootprintsOverlap,
} from '../src/engine/sydneyHarbourLots';
import {
  SYDNEY_BRIDGE,
  sydneyBridgeToWorld,
  sydneyBuildingToWorld,
  sydneyTerrainHeightAt,
} from '../src/engine/sydneyTerrain';

describe('Sydney harbour relationships, Spec 49', () => {
  const lots = createSydneyHarbourLots();
  it('declares sourced period districts, metre-scale geography and excluded later skyline', () => {
    expect(SYDNEY_HARBOUR_CONTEXT.year).toBe(1966);
    for (const district of SYDNEY_HARBOUR_CONTEXT.districts)
      expect(
        SYDNEY_HARBOUR_CONTEXT.sources.some((s) => s.id === district.source),
      ).toBe(true);
    expect(SYDNEY_HARBOUR_CONTEXT.interpretation).toContain('not compressed');
    expect(SYDNEY_HARBOUR_CONTEXT.exclusions).toContain('Sydney Tower');
  });
  it('keeps the main arch over water and connects both bearings continuously to inland streets', () => {
    const b = SYDNEY_BRIDGE;
    for (let z = b.northZ + 35; z < b.southZ - 35; z += 2) {
      const p = sydneyBridgeToWorld(0, z);
      expect(sydneyTerrainHeightAt(p.x, p.z)).toBe(0);
    }
    for (const route of SYDNEY_HARBOUR_CONTEXT.routes.filter(
      (r) => r.mode === 'bridge-approach',
    )) {
      const a = route.points[0]!,
        b = route.points[1]!;
      expect(
        SYDNEY_HARBOUR_CONTEXT.districts.some((d) => d.id === route.to),
      ).toBe(true);
      for (let i = 0; i <= 100; i++) {
        const u = i / 100;
        for (const side of [-12, 0, 12])
          expect(
            sydneyTerrainHeightAt(
              a[0] + (b[0] - a[0]) * u + side,
              a[1] + (b[1] - a[1]) * u,
            ),
          ).toBeGreaterThan(1);
      }
    }
    for (const z of [-b.pylonZ, b.pylonZ])
      for (const x of [-31, 31])
        for (const dx of [-7.5, 7.5])
          for (const dz of [-10, 10]) {
            const p = sydneyBridgeToWorld(x + dx, z + dz);
            expect(sydneyTerrainHeightAt(p.x, p.z)).toBeGreaterThan(1);
          }
  });
  it('keeps Farm Cove open and extends actual mainland beyond the composition', () => {
    for (const [x, z] of [
      [90, -40],
      [130, 0],
      [180, 20],
      [250, -15],
    ])
      expect(sydneyTerrainHeightAt(x!, z!)).toBe(0);
    for (const [x, z] of [
      [650, 450],
      [-700, 900],
      [100, -900],
      [-400, -1900],
      [200, 2600],
    ])
      expect(sydneyTerrainHeightAt(x!, z!)).toBeGreaterThan(1);
  });
  it('matches independently digitized map controls without harbour compression', () => {
    expect(SYDNEY_BRIDGE.x).toBeCloseTo(-414, 0);
    expect(SYDNEY_BRIDGE.z).toBeCloseTo(-524, 0);
    expect(SYDNEY_BRIDGE.southZ - SYDNEY_BRIDGE.northZ).toBe(503);
    expect(SYDNEY_BRIDGE.deckY + SYDNEY_BRIDGE.archRise + 9).toBe(134);
    // Reference pixels from NSW SIX, not sampler-generated expectations.
    for (const [x, z] of [
      [0, -150],
      [0, -350],
      [200, -250],
      [310, 600],
      [400, 300],
      [-320, 350],
    ])
      expect(sydneyTerrainHeightAt(x!, z!), `${x},${z}`).toBe(0);
    for (const [x, z] of [
      [0, -60],
      [-30, 150],
      [-60, 230],
      [-370, 510],
      [330, -530],
    ])
      expect(sydneyTerrainHeightAt(x!, z!), `${x},${z}`).toBeGreaterThan(1);
    // Sole immediate land connection runs south; east/west/north are water.
    for (let z = 100; z <= 250; z += 5)
      expect(sydneyTerrainHeightAt(-40, z)).toBeGreaterThan(1);
    for (const [x, z] of [
      [105, 0],
      [-105, 0],
      [0, -110],
    ])
      expect(sydneyTerrainHeightAt(x!, z!)).toBe(0);
    for (const x of [-55, 35])
      for (const z of [140, 170]) {
        const p = sydneyBuildingToWorld(x, z);
        expect(sydneyTerrainHeightAt(p.x, p.z)).toBeGreaterThan(1);
      }
  });
  it('grounds every route cross section, including the working access to the casting yard', () => {
    for (const route of SYDNEY_HARBOUR_CONTEXT.routes.filter(
      (r) => r.mode === 'ground',
    ))
      for (let j = 1; j < route.points.length; j++) {
        const a = route.points[j - 1]!,
          b = route.points[j]!,
          dx = b[0] - a[0],
          dz = b[1] - a[1],
          len = Math.hypot(dx, dz);
        for (let i = 0; i <= 100; i++)
          for (const side of [-0.5, 0, 0.5]) {
            const x = a[0] + (dx * i) / 100 + (dz / len) * route.width * side,
              z = a[1] + (dz * i) / 100 - (dx / len) * route.width * side;
            expect(sydneyTerrainHeightAt(x, z), route.id).toBeGreaterThan(0.2);
          }
      }
  });
  it('shares transformed lot extents with support, worksite exclusions, neighbours and streets', () => {
    expect(lots.length).toBeGreaterThan(150);
    for (const [i, lot] of lots.entries()) {
      const district = SYDNEY_HARBOUR_CONTEXT.districts.find(
        (d) => d.id === lot.district,
      )!.footprint;
      expect(lot.footprint.minX).toBeGreaterThanOrEqual(district.minX);
      expect(lot.footprint.maxX).toBeLessThanOrEqual(district.maxX);
      expect(lot.footprint.minZ).toBeGreaterThanOrEqual(district.minZ);
      expect(lot.footprint.maxZ).toBeLessThanOrEqual(district.maxZ);
      for (const f of SYDNEY_HARBOUR_CONTEXT.protectedFootprints)
        expect(sydneyFootprintsOverlap(lot.footprint, f, 3)).toBe(false);
      for (const route of SYDNEY_HARBOUR_CONTEXT.routes) {
        const hw = (lot.footprint.maxX - lot.footprint.minX) / 2,
          hd = (lot.footprint.maxZ - lot.footprint.minZ) / 2;
        expect(
          sydneyDistanceToRoute(lot.x, lot.z, route),
        ).toBeGreaterThanOrEqual(route.width / 2 + Math.hypot(hw, hd) + 2);
      }
      for (const x of [lot.footprint.minX, lot.footprint.maxX])
        for (const z of [lot.footprint.minZ, lot.footprint.maxZ]) {
          const y = sydneyTerrainHeightAt(x, z);
          expect(y).toBeGreaterThanOrEqual(1);
          if (lot.kind !== 'fig')
            expect(lot.supportY).toBeGreaterThanOrEqual(y);
          expect(lot.foundationBottom).toBeLessThanOrEqual(y);
        }
      for (const neighbour of lots.slice(i + 1))
        expect(
          sydneyFootprintsOverlap(
            lot.footprint,
            neighbour.footprint,
            lot.kind === 'fig' &&
              neighbour.kind === 'fig' &&
              lot.district === 'garden' &&
              neighbour.district === 'garden'
              ? -3
              : 0,
          ),
        ).toBe(false);
    }
    expect(createSydneyHarbourLots()).toEqual(lots);
  });
  it('makes office towers exceptional above a varied low masonry street fabric', () => {
    const offices = lots.filter((l) => l.kind === 'office');
    expect(offices.length).toBeGreaterThan(12);
    expect(
      offices.filter((l) => l.storeys >= 12).length / offices.length,
    ).toBeLessThan(0.2);
    expect(new Set(offices.map((l) => l.storeys)).size).toBeGreaterThan(4);
    expect(lots.filter((l) => l.kind === 'shed').length).toBeGreaterThan(6);
    expect(lots.filter((l) => l.kind === 'fig').length).toBeGreaterThan(20);
  });
  it('joins each pile-supported quay wharf to the mainland while leaving its head over water', () => {
    for (const pier of SYDNEY_HARBOUR_CONTEXT.wharves) {
      expect(
        sydneyTerrainHeightAt(pier.x, pier.z + pier.length / 2),
      ).toBeGreaterThan(1);
      expect(sydneyTerrainHeightAt(pier.x, pier.z - pier.length / 2)).toBe(0);
    }
  });
});

it('keeps renderer context within a bounded static triangle budget and corrects terrace roof eaves', async () => {
  const { Mesh, InstancedMesh, MeshStandardMaterial } = await import('three');
  const { SydneyEnvironment } =
    await import('../src/render/three/SydneyEnvironment');
  const library = {
    water: new MeshStandardMaterial(),
    whitewash: new MeshStandardMaterial(),
  };
  const env = new SydneyEnvironment(library as never);
  await env.ready;
  const counts: Array<{ name: string; triangles: number }> = [];
  env.group.traverse((o) => {
    if (o instanceof Mesh && o.visible) {
      const n =
        ((o.geometry.index?.count ?? o.geometry.attributes.position!.count) /
          3) *
        (o instanceof InstancedMesh ? o.count : 1);
      counts.push({
        name: o.name || `anonymous-${o.geometry.attributes.position!.count}`,
        triangles: n * (o.castShadow ? 2 : 1),
      });
    }
  });

  // Spec 13 city context pass (2026-09-24) raised the ceiling from 115k.
  expect(counts.reduce((a, b) => a + b.triangles, 0)).toBeLessThan(150000);
  const piers = env.group.getObjectByName(
    'sydney-bridge-pylons-and-piers',
  ) as InstanceType<typeof InstancedMesh>;
  const {
    Matrix4: PylonMatrix,
    Vector3: PylonVector,
    Quaternion,
  } = await import('three');
  const pylonMatrix = new PylonMatrix(),
    position = new PylonVector(),
    scale = new PylonVector(),
    rotation = new Quaternion();
  let pylons = 0;
  for (let i = 0; i < piers.count; i++) {
    piers.getMatrixAt(i, pylonMatrix);
    pylonMatrix.decompose(position, rotation, scale);
    if (Math.abs(scale.y - 66) < 0.01 && Math.abs(scale.x - 15) < 0.01) {
      pylons++;
      expect(Math.abs(position.x)).toBe(31);
      expect([-SYDNEY_BRIDGE.pylonZ, SYDNEY_BRIDGE.pylonZ]).toContain(
        position.z,
      );
    }
  }
  expect(pylons).toBe(4);
  const roof = env.group.getObjectByName(
    'sydney-context-terrace-roofs',
  ) as InstanceType<typeof InstancedMesh>;
  const body = env.group.getObjectByName(
    'sydney-context-terraces',
  ) as InstanceType<typeof InstancedMesh>;
  const { Matrix4, Vector3 } = await import('three');
  roof.geometry.computeBoundingBox();
  body.geometry.computeBoundingBox();
  const m = new Matrix4();
  const terraceLots = createSydneyHarbourLots().filter(
    (l) => l.kind === 'terrace',
  );
  for (const [name, form] of [
    ['sydney-context-terrace-roofs', 'villa'],
    ['sydney-context-terrace-gables', 'row'],
    ['sydney-context-terrace-flats', 'flats'],
  ] as const) {
    const roofMesh = env.group.getObjectByName(name) as InstanceType<
      typeof InstancedMesh
    >;
    roofMesh.geometry.computeBoundingBox();
    const indices = terraceLots.flatMap((lot, i) =>
      lot.form === form ? [i] : [],
    );
    expect(roofMesh.count).toBe(indices.length);
    expect(roofMesh.count).toBeGreaterThan(2);
    for (let i = 0; i < roofMesh.count; i++) {
      roofMesh.getMatrixAt(i, m);
      const roofBottom = new Vector3(
        0,
        roofMesh.geometry.boundingBox!.min.y,
        0,
      ).applyMatrix4(m).y;
      body.getMatrixAt(indices[i]!, m);
      const wallTop = new Vector3(
        0,
        body.geometry.boundingBox!.max.y,
        0,
      ).applyMatrix4(m).y;
      expect(Math.abs(roofBottom - wallTop)).toBeLessThan(0.001);
    }
  }
  // Kit vertex colors must not poison uncolored plaster boxes.
  expect(
    (body.material as InstanceType<typeof MeshStandardMaterial>).vertexColors,
  ).toBe(false);
  const normals = roof.geometry.attributes.normal!;
  for (let i = 0; i < normals.count; i++)
    expect(normals.getY(i)).toBeGreaterThan(0);
  expect(env.group.getObjectByName('sydney-podium-kit')).toBeUndefined();
  expect(env.group.getObjectByName('sydney-curtain-glass')).toBeUndefined();
  env.dispose();
  library.water.dispose();
  library.whitewash.dispose();
});

it('isolates asynchronously loaded kit colors from every uncolored fallback and harbour mesh', async () => {
  const { Mesh, MeshStandardMaterial } = await import('three');
  const { SydneyEnvironment } =
    await import('../src/render/three/SydneyEnvironment');
  // A second instance exercises the cached loader as well as the initial async path.
  for (let pass = 0; pass < 2; pass++) {
    const library = {
      water: new MeshStandardMaterial(),
      whitewash: new MeshStandardMaterial(),
    };
    const env = new SydneyEnvironment(library as never);
    const hull = env.group.getObjectByName(
      'sydney-harbour-hulls',
    ) as InstanceType<typeof Mesh>;
    const hullMaterial = hull.material as InstanceType<
      typeof MeshStandardMaterial
    >;
    const assertColorContract = () =>
      env.group.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const material of materials)
          if (material instanceof MeshStandardMaterial && material.vertexColors)
            expect(
              object.geometry.hasAttribute('color'),
              object.name || object.type,
            ).toBe(true);
      });
    assertColorContract();
    await env.ready;
    assertColorContract();
    expect(hull.material).toBe(hullMaterial);
    expect(hullMaterial.vertexColors).toBe(false);
    for (const name of ['sydney-context-figs', 'sydney-context-offices']) {
      const mesh = env.group.getObjectByName(name) as InstanceType<typeof Mesh>;
      const material = mesh.material as InstanceType<
        typeof MeshStandardMaterial
      >;
      expect(material.vertexColors).toBe(true);
      expect(material.color.getHexString()).toBe('ffffff');
      expect(material).not.toBe(hullMaterial);
    }
    env.dispose();
    library.water.dispose();
    library.whitewash.dispose();
  }
});

it('joins the mapped quay into a dry continuous coping and submerged vertical face', async () => {
  const { Mesh, MeshStandardMaterial } = await import('three');
  const { SydneyEnvironment } =
    await import('../src/render/three/SydneyEnvironment');
  const env = new SydneyEnvironment({
    water: new MeshStandardMaterial(),
    whitewash: new MeshStandardMaterial(),
  } as never);
  await env.ready;
  const wall = env.group.getObjectByName(
    'sydney-continuous-quay-wall',
  ) as InstanceType<typeof Mesh>;
  expect(wall).toBeTruthy();
  const p = wall.geometry.getAttribute('position'),
    normal = wall.geometry.getAttribute('normal');
  expect(p.count).toBeGreaterThan(1000);
  let joined = 0;
  // Each section emits a vertical face followed by upward-facing dry coping.
  for (let i = 0; i < p.count; i += 12) {
    expect(p.getY(i)).toBeCloseTo(-1.2, 5);
    expect(p.getY(i + 1)).toBeGreaterThan(2);
    expect(p.getY(i + 2)).toBeGreaterThan(2);
    expect(normal.getY(i + 6)).toBeGreaterThan(0.5);
    // Face bottom/top share XZ: the new wall is vertical, never a land slope.
    expect(p.getX(i)).toBe(p.getX(i + 1));
    expect(p.getZ(i)).toBe(p.getZ(i + 1));
    if (
      i + 12 < p.count &&
      Math.hypot(
        p.getX(i + 2) - p.getX(i + 13),
        p.getZ(i + 2) - p.getZ(i + 13),
      ) < 0.01
    ) {
      expect(p.getY(i + 2)).toBeCloseTo(p.getY(i + 13), 4);
      joined++;
    }
  }
  expect(joined).toBeGreaterThan((p.count / 12) * 0.95);
  env.dispose();
});

it('keeps sloped road faces six centimetres above the actual rendered terrain', async () => {
  const { Mesh, MeshStandardMaterial, Raycaster, Vector3 } =
    await import('three');
  const { SydneyEnvironment } =
    await import('../src/render/three/SydneyEnvironment');
  const env = new SydneyEnvironment({
    water: new MeshStandardMaterial(),
    whitewash: new MeshStandardMaterial(),
  } as never);
  await env.ready;
  const roads = env.group.getObjectByName(
    'sydney-terrain-conforming-roads',
  ) as InstanceType<typeof Mesh>;
  const terrain = env.group.getObjectByName(
    'sydney-peninsula-floor',
  ) as InstanceType<typeof Mesh>;
  const p = roads.geometry.getAttribute('position'),
    ray = new Raycaster();
  terrain.updateMatrixWorld(true);
  let nonflat = 0;
  for (let i = 0; i < p.count; i += 3) {
    const a = new Vector3().fromBufferAttribute(p, i),
      b = new Vector3().fromBufferAttribute(p, i + 1),
      c = new Vector3().fromBufferAttribute(p, i + 2);
    if (
      new Vector3()
        .subVectors(b, a)
        .cross(new Vector3().subVectors(c, a))
        .length() < 1e-6
    )
      continue;
    const centre = a
      .clone()
      .add(b)
      .add(c)
      .multiplyScalar(1 / 3);
    ray.set(new Vector3(centre.x, 200, centre.z), new Vector3(0, -1, 0));
    const hit = ray.intersectObject(terrain)[0];
    expect(hit, `road triangle${i / 3}`).toBeTruthy();
    expect(centre.y - hit!.point.y).toBeCloseTo(0.06, 3);
    if (Math.max(a.y, b.y, c.y) - Math.min(a.y, b.y, c.y) > 0.02) nonflat++;
  }
  expect(nonflat).toBeGreaterThan(50);
  env.dispose();
});
