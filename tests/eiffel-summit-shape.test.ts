import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Box3, Group, Mesh, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { EiffelKitManifest, EiffelKitPart } from '../src/data/eiffelKitTypes';

// Spec 17 shape checks use the production export's transformed vertices.
// These are completed-shape gates, not support, transport or capacity proofs.
const folder = 'public/models/eiffel-construction-kit/';
const manifest = JSON.parse(readFileSync(`${folder}tower-kit.manifest.json`, 'utf8')) as EiffelKitManifest;
const tolerance = 2e-4; // Float32 coordinates at approximately 300 m elevation.
interface ActualPart {
  part: EiffelKitPart;
  mesh: Mesh;
  vertices: Vector3[];
  bounds: Box3;
}
let scene: Group | undefined;
const actual = new Map<string, ActualPart>();

beforeAll(async () => {
  const bytes = readFileSync(`${folder}tower-kit.glb`);
  scene = (await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
  )).scene;
  scene.updateMatrixWorld(true);
  const byId = new Map(manifest.parts.map(part => [part.id, part]));
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const part = byId.get(String(object.userData.wf_part));
    if (!part || part.stage < 54) return;
    if (actual.has(part.id)) throw new Error(`Duplicate summit mesh: ${part.id}`);
    const positions = object.geometry.getAttribute('position');
    const vertices = Array.from({ length: positions.count }, (_, i) =>
      new Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld));
    actual.set(part.id, { part, mesh: object, vertices, bounds: new Box3().setFromPoints(vertices) });
  });
}, 30_000);

afterAll(() => {
  const geometries = new Set<Mesh['geometry']>();
  const materials = new Set<import('three').Material>();
  scene?.traverse(object => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
});

const group = (name: string) => [...actual.values()].filter(row => row.part.sourceGroup === name);
const center = (row: ActualPart) => row.bounds.getCenter(new Vector3());
const size = (row: ActualPart) => row.bounds.getSize(new Vector3());
const near = (value: number, expected: number, label: string, epsilon = tolerance) =>
  expect(Math.abs(value - expected), `${label}: ${value} versus ${expected}`).toBeLessThan(epsilon);
function projectedRange(vertices: readonly Vector3[], origin: Vector3, axis: Vector3): [number, number] {
  const values = vertices.map(vertex => vertex.clone().sub(origin).dot(axis));
  return [Math.min(...values), Math.max(...values)];
}
function endFaceCenters(row: ActualPart): Vector3[] {
  const positions = row.mesh.geometry.getAttribute('position');
  // The glTF exporter may permute local axes relative to the manifest's
  // canonical box, so locate the rail's long axis in the real vertex buffer.
  const axes = [0, 1, 2].map(axis => {
    const coordinates = Array.from({ length: positions.count }, (_, i) => positions.getComponent(i, axis));
    const worldLength = (Math.max(...coordinates) - Math.min(...coordinates))
      * new Vector3().setFromMatrixColumn(row.mesh.matrixWorld, axis).length();
    return { coordinates, worldLength };
  });
  const coordinates = axes.sort((a, b) => b.worldLength - a.worldLength)[0]!.coordinates;
  return [Math.min(...coordinates), Math.max(...coordinates)].map(end => {
    const vertices = row.vertices.filter((_, i) => Math.abs(coordinates[i]! - end) < 1e-6);
    expect(vertices.length, `${row.part.id} actual end face`).toBeGreaterThan(0);
    return vertices.reduce((sum, vertex) => sum.add(vertex), new Vector3()).divideScalar(vertices.length);
  });
}

type Point2 = readonly [number, number];
// Clip the actual triangle projection against the entire open square. Checking
// only triangle vertices would miss a large triangle spanning the whole hole.
function areaInsideSquare(triangle: Point2[], half: number): number {
  let polygon = triangle;
  for (const axis of [0, 1] as const) for (const sign of [-1, 1]) {
    const next: Point2[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!;
      const da = sign * a[axis] - half, db = sign * b[axis] - half;
      if (da <= 0) next.push(a);
      if ((da <= 0) !== (db <= 0)) {
        const t = da / (da - db);
        next.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    polygon = next;
  }
  return Math.abs(polygon.reduce((sum, a, i) => {
    const b = polygon[(i + 1) % polygon.length]!;
    return sum + a[0] * b[1] - a[1] * b[0];
  }, 0)) / 2;
}

function assertOpening(rows: ActualPart[], half: number, top: number, label: string) {
  const intrusions: string[] = [];
  for (const row of rows) {
    const index = row.mesh.geometry.index;
    const count = index?.count ?? row.vertices.length;
    for (let i = 0; i < count; i += 3) {
      const triangle = [0, 1, 2].map(offset => {
        const vertex = row.vertices[index ? index.getX(i + offset) : i + offset]!;
        return [vertex.x, vertex.z] as Point2;
      });
      if (areaInsideSquare(triangle, half - tolerance) > 1e-10) intrusions.push(`${row.part.id}:triangle-${i / 3}`);
    }
  }
  expect(intrusions, label).toEqual([]);
  const ray = new Raycaster();
  const meshes = rows.map(row => row.mesh);
  // Deleting a floor or simply enlarging its opening must not pass.
  for (const [x, z] of [[half + .03, 0], [-half - .03, 0], [0, half + .03], [0, -half - .03]]) {
    ray.set(new Vector3(x, top + .1, z), new Vector3(0, -1, 0));
    const hit = ray.intersectObjects(meshes, false)[0];
    expect(hit, `${label} surface outside edge ${x},${z}`).toBeDefined();
    near(hit!.point.y, top, `${label} actual outside surface`);
  }
}

describe('actual exported Eiffel summit shape', () => {
  it('agrees with the manifest for every summit mesh and source member', () => {
    const expected = manifest.parts.filter(part => part.stage >= 54);
    expect(actual.size).toBe(expected.length);
    for (const part of expected) {
      const row = actual.get(part.id);
      expect(row, part.id).toBeDefined();
      expect(row!.mesh.userData.wf_source, part.id).toBe(part.sourceMember);
      expect(row!.mesh.userData.wf_material, part.id).toBe(part.material);
      for (const [axis, key] of ['x', 'y', 'z'].entries()) {
        near(row!.bounds.min[key as 'x' | 'y' | 'z'], part.boundsMin[axis]!, `${part.id} min ${key}`);
        near(row!.bounds.max[key as 'x' | 'y' | 'z'], part.boundsMax[axis]!, `${part.id} max ${key}`);
      }
    }
  });

  it('has a 1.40 m crown rail centerline, explicit 60 mm rail, and a continuous mast to 312 m', () => {
    const crown = group('summit-crown');
    const rail = crown.filter(row => Math.abs(center(row).y - 301.65) < .001 && size(row).y < .061);
    expect(rail).toHaveLength(24);
    const railBounds = new Box3();
    for (const row of rail) {
      railBounds.union(row.bounds);
      near(size(row).y, .06, `${row.part.id} actual rail thickness`);
      for (const end of endFaceCenters(row)) {
        near(Math.hypot(end.x, end.z), .70, `${row.part.id} end radius`);
        near(end.y, 301.65, `${row.part.id} rail height`);
      }
    }
    // Polygonal rectangular rail corners differ slightly from a round 1.46 m envelope.
    near(railBounds.max.x - railBounds.min.x, 1.46, 'outside rail diameter X', .002);
    near(railBounds.max.z - railBounds.min.z, 1.46, 'outside rail diameter Z', .002);
    const mast = crown.filter(row => row.part.sourceMember === 'summit-crown/member-072')
      .sort((a, b) => a.bounds.min.y - b.bounds.min.y);
    expect(mast).toHaveLength(3);
    const floorHub = Array.from({ length: 12 }, (_, i) => actual.get(`summit-crown-m${String(49 + i * 2).padStart(3, '0')}-c000`));
    expect(floorHub.every(Boolean), 'actual crown floor supporting the mast').toBe(true);
    near(mast[0]!.bounds.min.y, Math.max(...floorHub.map(row => row!.bounds.max.y)), 'mast foot at crown floor hub top');
    near(mast.at(-1)!.bounds.max.y, 312, 'mast top');
    for (let i = 0; i < mast.length; i++) {
      near(center(mast[i]!).x, 0, 'mast center X');
      near(center(mast[i]!).z, 0, 'mast center Z');
      if (i) near(mast[i]!.bounds.min.y, mast[i - 1]!.bounds.max.y, 'mast split continuity');
    }
    near(Math.max(...crown.flatMap(row => row.vertices.map(vertex => vertex.y))), 312, 'completed crown maximum');
  });

  it('forms 28 real gallery bays on four 12 m faces and four 2 m diagonal faces', () => {
    const gallery = [...actual.values()].filter(row => row.part.sourceGroup.startsWith('summit-gallery-'));
    const groups = new Set(gallery.map(row => row.part.sourceGroup));
    expect(groups.size).toBe(28);
    const a = 6 + Math.SQRT2;
    const perimeter: Point2[] = [[6, -a], [a, -6], [a, 6], [6, a], [-6, a], [-a, 6], [-a, -6], [-6, -a]];
    const counts: number[] = [];
    for (let face = 0; face < 8; face++) {
      const start = new Vector3(perimeter[face]![0], 0, perimeter[face]![1]);
      const end = new Vector3(perimeter[(face + 1) % 8]![0], 0, perimeter[(face + 1) % 8]![1]);
      const length = start.distanceTo(end), count = face % 2 ? 6 : 1;
      near(length, count * 2, `gallery face ${face} length`);
      const tangent = end.clone().sub(start).normalize();
      const normal = new Vector3(-tangent.z, 0, tangent.x);
      counts.push(count);
      for (let bay = 0; bay < count; bay++) {
        const name = `summit-gallery-${face}-${bay}`;
        expect(groups.has(name), name).toBe(true);
        const rows = group(name), panes = rows.filter(row => row.part.material === 'window');
        expect(panes, `${name} actual glass pane`).toHaveLength(1);
        const midpoint = start.clone().addScaledVector(tangent, 2 * bay + 1);
        const pane = panes[0]!;
        const horizontal = projectedRange(pane.vertices, midpoint, tangent);
        const depth = projectedRange(pane.vertices, midpoint, normal);
        near(horizontal[0], -.92, `${name} left pane plane`);
        near(horizontal[1], .92, `${name} right pane plane`);
        near(depth[0], -.03, `${name} inner glass plane`);
        near(depth[1], .03, `${name} outer glass plane`);
        near(pane.bounds.min.y, 277.42, `${name} glazing sill`);
        near(pane.bounds.max.y, 279.62, `${name} glazing head`);
        const posts = rows.filter(row => size(row).y > 3.5 && size(row).x < .151 && size(row).z < .151)
          .sort((left, right) => center(left).dot(tangent) - center(right).dot(tangent));
        expect(posts, `${name} full-height boundary posts`).toHaveLength(2);
        for (let side = 0; side < 2; side++) {
          const expected = start.clone().addScaledVector(tangent, 2 * (bay + side));
          near(center(posts[side]!).x, expected.x, `${name} post ${side} X`);
          near(center(posts[side]!).z, expected.z, `${name} post ${side} Z`);
          near(posts[side]!.bounds.min.y, 276.54, `${name} post foot`);
          near(posts[side]!.bounds.max.y, 280.10, `${name} post top`);
        }
      }
    }
    expect(counts.filter(count => count === 6)).toHaveLength(4);
    expect(counts.filter(count => count === 1)).toHaveLength(4);
  });

  it('separates the eight-sided 1.25 m lodge from the sixteen-sided 1.15 m lantern at their actual heights', () => {
    for (const profile of [
      { prefix: 'beacon-lodge-', sides: 8, radius: 1.25, foot: 292.2, top: 295 },
      { prefix: 'beacon-window-', sides: 16, radius: 1.15, foot: 295, top: 298.25 },
    ]) {
      const rows = [...actual.values()].filter(row => row.part.sourceGroup.startsWith(profile.prefix));
      expect(new Set(rows.map(row => row.part.sourceGroup)).size, profile.prefix).toBe(profile.sides);
      const posts = rows.filter(row => size(row).y > 2.7 && size(row).x < .1 && size(row).z < .1);
      expect(posts, `${profile.prefix} actual perimeter posts`).toHaveLength(profile.sides);
      for (let i = 0; i < profile.sides; i++) {
        const name = `${profile.prefix}${String(i).padStart(2, '0')}`;
        const post = posts.find(row => row.part.sourceGroup === name);
        expect(post, name).toBeDefined();
        const angle = i * 2 * Math.PI / profile.sides;
        near(center(post!).x, profile.radius * Math.cos(angle), `${name} radial X`);
        near(center(post!).z, profile.radius * Math.sin(angle), `${name} radial Z`);
        near(post!.bounds.min.y, profile.foot, `${name} foot`);
        near(post!.bounds.max.y, profile.top, `${name} top`);
        expect(group(name).some(row => row.part.material === 'window'), `${name} glazing remains present`).toBe(true);
      }
    }
  });

  // 2.4 and 5.0 are half widths: these are 4.8 m and 10 m square openings.
  it.each([
    { stage: 54, half: 2.4, top: 276.54, deckCount: 72 },
    { stage: 56, half: 5.0, top: 280.59, deckCount: 68 },
  ])('keeps every actual stage-$stage deck triangle outside the central ±$half m opening', ({ stage, half, top, deckCount }) => {
    const deck = [...actual.values()].filter(row => row.part.stage === stage && row.part.material === 'deck');
    expect(deck, `stage ${stage} complete coalesced V3 deck`).toHaveLength(deckCount);
    assertOpening(deck, half, top, `stage ${stage} deck`);
  });

  it.each([
    { name: 'summit-apartment-floor', bottom: 280.15, top: 280.59, outer: 5.0 },
    { name: 'summit-apartment-roof', bottom: 283.15, top: 283.35, outer: 5.2 },
  ])('retains the actual $name around a 2.10 m square spiral opening', ({ name, bottom, top, outer }) => {
    // Deliberately exclude the access stair/spiral: only floor/roof solids are
    // forbidden from occupying the opening reserved for those access parts.
    const rows = group(name);
    expect(rows.length, name).toBeGreaterThan(0);
    expect(rows.every(row => row.part.stage === 57), name).toBe(true);
    const bounds = new Box3();
    rows.forEach(row => bounds.union(row.bounds));
    near(bounds.min.y, bottom, `${name} underside`);
    near(bounds.max.y, top, `${name} top`);
    for (const axis of ['x', 'z'] as const) {
      near(bounds.min[axis], -outer, `${name} negative outer edge ${axis}`);
      near(bounds.max[axis], outer, `${name} positive outer edge ${axis}`);
    }
    assertOpening(rows, 1.05, top, name);
  });
});
