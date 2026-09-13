import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Box3, Matrix3, Mesh, Vector3, type Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { eiffelTerrainHeightAt } from '../src/engine/eiffelTerrain';
import { eiffelConvexPenetration, eiffelConvexSolid } from '../src/engine/eiffelConvex';
import type { RigidVec3 } from '../src/engine/eiffelRigid';

// Candidate admission is explicit; after promotion the default tests public.
// The preserved comparison source is never rewritten by this test.
const folder = process.env.PARIS_NEAR_MODEL_DIR ?? 'public/models/paris-1889';
const beforeFolder = 'artifacts/paris-street-variety-2026-09-08/before';
const tolerance = 0.0001; // Float32 export at the farthest near-city x=595m.
type XZ = [number, number];
type Bounds = [number, number, number, number];
interface Wing {
  id: string;
  block: string;
  center: XZ;
  size: [number, number, number];
  bounds: Bounds;
  supportY: number;
  baseY: number;
  eaveY: number;
  ridgeY: number;
  roof: 'mansard' | 'gable' | 'hip' | 'low-hip';
  role: 'residential' | 'service';
}
interface Parcel { id: string; center: XZ; bounds: Bounds; typology: string; wings: Wing[] }
interface Manifest {
  blocks: Parcel[];
  southBankParcels: Parcel[];
  buildings: Wing[];
  cityTriangles: number;
  northBankParcels: unknown[];
  northBankStreets: unknown[];
  northBankSurfacePieces: unknown[];
  plantings: {x: number; z: number; radius: number; height: number}[];
}
interface Triangle {
  role: string;
  p: Vector3[];
  // Canonical world coordinates, normals, UVs and optional vertex colors.
  corners: number[][];
}
const manifest = JSON.parse(readFileSync(resolve(folder, 'paris.manifest.json'), 'utf8')) as Manifest;
const previous = JSON.parse(readFileSync(resolve(beforeFolder, 'paris.manifest.json'), 'utf8')) as Manifest;
let city: Group, beforeCity: Group;
let triangles: Triangle[], beforeTriangles: Triangle[];
let blocks: Map<string, Triangle[]>;

async function load(path: string) {
  const bytes = readFileSync(path);
  const scene = (await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
  )).scene;
  scene.updateMatrixWorld(true);
  return scene;
}
function dispose(scene?: Group) {
  scene?.traverse(object => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
  });
}
function readTriangles(scene: Group): Triangle[] {
  const result: Triangle[] = [];
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const geometry = object.geometry, position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv');
    const color = geometry.getAttribute('color'), index = geometry.index;
    const normalMatrix = new Matrix3().getNormalMatrix(object.matrixWorld);
    for (let offset = 0; offset < (index?.count ?? position.count); offset += 3) {
      const p: Vector3[] = [], corners: number[][] = [];
      for (let k = 0; k < 3; k++) {
        const i = index ? index.getX(offset + k) : offset + k;
        const point = new Vector3().fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
        p.push(point);
        const n = normal ? new Vector3().fromBufferAttribute(normal, i).applyMatrix3(normalMatrix).normalize() : new Vector3();
        const values = [...point.toArray(), ...n.toArray()];
        if (uv) values.push(uv.getX(i), uv.getY(i));
        if (color) for (let c = 0; c < color.itemSize; c++) values.push(color.getComponent(i, c));
        corners.push(values);
      }
      result.push({role: String(object.userData.wf_material), p, corners});
    }
  });
  return result;
}
const inside = (p: Vector3, bounds: Bounds, pad = tolerance) =>
  p.x >= bounds[0] - pad && p.x <= bounds[2] + pad && p.z >= bounds[1] - pad && p.z <= bounds[3] + pad;
const bodyCorners = (wing: Wing) => [wing.supportY, wing.eaveY].flatMap(y =>
  [wing.bounds[0], wing.bounds[2]].flatMap(x => [wing.bounds[1], wing.bounds[3]].map(z => new Vector3(x, y, z))));
function wallTriangles(wing: Wing) {
  return blocks.get(wing.block)!.filter(t => t.role === (wing.role === 'service' ? 'brick' : 'masonry-facade') &&
    t.p.every(p => inside(p, wing.bounds) && p.y >= wing.supportY - tolerance && p.y <= wing.eaveY + tolerance) &&
    // A touching neighbor contributes another party-wall plane. Attribute the
    // full-height rectangle using its actual lower/upper source levels.
    t.p.every(p => Math.abs(p.y - wing.supportY) < tolerance || Math.abs(p.y - wing.eaveY) < tolerance) &&
    ([0, 2] as const).some(axis => [wing.bounds[axis === 0 ? 0 : 1], wing.bounds[axis === 0 ? 2 : 3]].some(value =>
      t.p.every(p => Math.abs(p.getComponent(axis) - value) < tolerance))));
}
function exportedBody(wing: Wing) {
  const source = wallTriangles(wing).flatMap(t => t.p);
  return bodyCorners(wing).map(p => {
    const actual = source.find(v => v.distanceTo(p) <= tolerance);
    expect(actual, `${wing.id}: exported body corner ${p.toArray().join(',')}`).toBeDefined();
    return actual!.clone();
  });
}
function roofTriangles(wing: Wing) {
  return blocks.get(wing.block)!.filter(t => ['zinc', 'slate'].includes(t.role) &&
    t.p.every(p => inside(p, wing.bounds) && p.y >= wing.eaveY - tolerance && p.y <= wing.ridgeY + tolerance) &&
    // Ignore vertical gable ends shared with a taller adjoining wing.
    Math.abs(t.p[1]!.clone().sub(t.p[0]!).cross(t.p[2]!.clone().sub(t.p[0]!)).y) > 1e-5);
}
function triangleDigest(items: Triangle[]) {
  // Sorting changes neither triangle winding nor any represented number. This
  // permits GLB/material batching to reorder triangles, never move a corner.
  const keys = items.map(t => {
    const corners = t.corners.map(v => JSON.stringify(v.map(n => Object.is(n, -0) ? 0 : n)));
    const variants = [0, 1, 2].map(k => corners.slice(k).concat(corners.slice(0, k)).join('|'));
    return `${t.role}:${variants.sort()[0]}`;
  }).sort();
  return {count: keys.length, sha256: createHash('sha256').update(keys.join('\n')).digest('hex')};
}
// These broad review bounds isolate the old near-city streets, rather than
// reproducing the new street builder's reservation or grid formulas.
const nearStreet = (t: Triangle) => t.p.every(p => Math.abs(p.x) >= 178 - tolerance &&
  Math.abs(p.x) <= 618 + tolerance && p.z >= -24 - tolerance && p.z <= 520 + tolerance);
const projected = (n: number) => Math.round(n * 1e6) / 1e6;
function sourceRectangles(items: Triangle[], requireSingleCover: boolean): Bounds[] {
  const groups = new Map<string, {bounds: Bounds; triangles: XZ[][]}>();
  for (const triangle of items) {
    const points = triangle.p.map(p => [projected(p.x), projected(p.z)] as XZ);
    const bounds: Bounds = [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])),
      Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))];
    const key = bounds.join(':');
    const group = groups.get(key) ?? {bounds, triangles: []};
    group.triangles.push(points); groups.set(key, group);
  }
  for (const {bounds: [x1, z1, x2, z2], triangles: faces} of groups.values()) {
    expect(x2 - x1).toBeGreaterThan(0); expect(z2 - z1).toBeGreaterThan(0);
    const unique = [...new Map(faces.map(face => [face.map(p => p.join(':')).sort().join('|'), face])).values()];
    // Read actual exported triangles as rectangles only after proving their
    // two complementary halves. Duplicate halves cannot masquerade as coverage.
    expect(unique).toHaveLength(2);
    if (requireSingleCover) expect(faces).toHaveLength(2);
    for (const face of unique) for (const [x, z] of face)
      expect((x === x1 || x === x2) && (z === z1 || z === z2)).toBe(true);
    const shared = unique[0]!.filter(p => unique[1]!.some(q => p[0] === q[0] && p[1] === q[1]));
    expect(shared).toHaveLength(2);
    expect(shared[0]![0]).not.toBe(shared[1]![0]); expect(shared[0]![1]).not.toBe(shared[1]![1]);
  }
  return [...groups.values()].map(group => group.bounds);
}
function zUnion(rectangles: Bounds[], x: number, rejectOverlap = false): XZ[] {
  const intervals = rectangles.filter(r => x > r[0] && x < r[2]).map(r => [r[1], r[3]] as XZ).sort((a, b) => a[0] - b[0]);
  const merged: XZ[] = [];
  for (const [low, high] of intervals) {
    const last = merged.at(-1);
    if (!last || low > last[1] + 1e-6) merged.push([low, high]);
    else {
      if (rejectOverlap) expect(low, `positive-area street overlap at x=${x}`).toBeGreaterThanOrEqual(last[1] - 1e-6);
      last[1] = Math.max(last[1], high);
    }
  }
  return merged;
}
const boxFaces = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];

describe('actual Blender near-Paris block typologies', () => {
  beforeAll(async () => {
    [city, beforeCity] = await Promise.all([
      load(resolve(folder, 'paris-city.glb')), load(resolve(beforeFolder, 'paris-city.glb')),
    ]);
    triangles = readTriangles(city); beforeTriangles = readTriangles(beforeCity);
    blocks = new Map(manifest.blocks.map(block => [block.id,
      triangles.filter(t => t.p.every(p => inside(p, block.bounds, 0.1))),
    ]));
  }, 30_000);
  afterAll(() => { dispose(city); dispose(beforeCity); });

  it('exports forty parcels with five equally represented massing families and complete wing records', () => {
    expect(manifest.blocks).toHaveLength(40);
    expect(manifest.southBankParcels).toEqual(manifest.blocks);
    const families: Record<string, number> = {};
    for (const block of manifest.blocks) families[block.typology] = (families[block.typology] ?? 0) + 1;
    expect(families).toEqual({'rear-workshop': 8, 'paired-courts': 8, 'open-service-court': 8, 'stepped-frontage': 8, 'mixed-low-rear': 8});
    const wings = manifest.blocks.flatMap(block => block.wings);
    expect(manifest.buildings).toEqual(wings);
    expect(new Set(wings.map(w => w.id)).size).toBe(wings.length);
    expect(new Set(wings.map(w => w.roof))).toEqual(new Set(['mansard', 'gable', 'hip', 'low-hip']));
    expect(triangles).toHaveLength(manifest.cityTriangles);
    expect(triangles.length).toBeLessThan(240_000); // Source gate only; composed GPU caps remain separate.
    for (const block of manifest.blocks) {
      expect(block.bounds).toEqual(previous.blocks.find(b => b.id === block.id)!.bounds);
      expect(block.wings.length).toBeGreaterThanOrEqual(8);
      for (const wing of block.wings) {
        const actual = exportedBody(wing);
        expect(actual.every(p => inside(p, block.bounds)), wing.id).toBe(true);
      }
    }
  });

  it('has complete actual wall surfaces, supported plinth corners and exported roof anchors for every wing', () => {
    for (const wing of manifest.buildings) {
      exportedBody(wing);
      const walls = wallTriangles(wing), [width, depth, height] = wing.size;
      // Surface coverage catches a missing face even when all eight corners
      // survive in neighboring triangles. Internal party contacts are allowed.
      for (const [axis, plane, expectedArea] of [
        [0, wing.bounds[0], depth * height], [0, wing.bounds[2], depth * height],
        [2, wing.bounds[1], width * height], [2, wing.bounds[3], width * height],
      ]) {
        const faces = walls.filter(t => t.p.every(p => Math.abs(p.getComponent(axis!) - plane!) < tolerance));
        const area = faces.reduce((sum, t) => sum + t.p[1]!.clone().sub(t.p[0]!).cross(t.p[2]!.clone().sub(t.p[0]!)).length() / 2, 0);
        expect(Math.abs(area - expectedArea!), `${wing.id}: complete wall plane ${axis}/${plane}`).toBeLessThan(0.015);
      }
      const stone = blocks.get(wing.block)!.filter(t => t.role === 'stone-warm').flatMap(t => t.p);
      const roofs = roofTriangles(wing).flatMap(t => t.p);
      expect(roofs.length, `${wing.id}: real roof`).toBeGreaterThan(5);
      const ground: number[] = [];
      for (const x of [wing.bounds[0], wing.bounds[2]]) for (const z of [wing.bounds[1], wing.bounds[3]]) {
        ground.push(eiffelTerrainHeightAt(x, z));
        for (const y of [wing.baseY, wing.supportY]) {
          expect(stone.some(p => p.distanceTo(new Vector3(x, y, z)) < tolerance), `${wing.id}: plinth corner ${x}/${y}/${z}`).toBe(true);
        }
        expect(roofs.some(p => p.distanceTo(new Vector3(x, wing.eaveY, z)) < tolerance), `${wing.id}: roof eave`).toBe(true);
        expect(wing.baseY, `${wing.id}: plinth embeds in actual shared terrain`).toBeLessThan(eiffelTerrainHeightAt(x, z));
      }
      expect(Math.abs(wing.supportY - (Math.max(...ground) + 0.24))).toBeLessThan(tolerance);
      expect(Math.abs(Math.max(...roofs.map(p => p.y)) - wing.ridgeY)).toBeLessThan(tolerance);
    }
  }, 30_000);

  it('proves the four roof profiles from actual exported vertex levels and ridge extents', () => {
    for (const wing of manifest.buildings) {
      const vertices = roofTriangles(wing).flatMap(t => t.p);
      const top = vertices.filter(p => Math.abs(p.y - wing.ridgeY) < tolerance);
      const yLevels = new Set(vertices.map(p => Math.round((p.y - wing.eaveY) * 1000)));
      const topBounds = new Box3().setFromPoints(top);
      if (wing.roof === 'gable') {
        expect(topBounds.max.z - topBounds.min.z, wing.id).toBeLessThan(tolerance);
        expect(Math.abs(topBounds.max.x - topBounds.min.x - wing.size[0]), wing.id).toBeLessThan(tolerance);
        expect(yLevels.size, wing.id).toBe(2);
      } else {
        expect(topBounds.max.x - topBounds.min.x, wing.id).toBeGreaterThan(0.1);
        expect(topBounds.max.z - topBounds.min.z, wing.id).toBeGreaterThan(0.1);
        expect(top.every(p => p.x > wing.bounds[0] && p.x < wing.bounds[2] && p.z > wing.bounds[1] && p.z < wing.bounds[3]), wing.id).toBe(true);
        expect(yLevels.size, wing.id).toBe(wing.roof === 'mansard' ? 3 : 2);
        if (wing.roof === 'mansard') expect(vertices.some(p => Math.abs(p.y - wing.eaveY - 2.9) < tolerance), wing.id).toBe(true);
        if (wing.roof === 'low-hip') expect(wing.ridgeY - wing.eaveY).toBeCloseTo(2.7, 4);
        if (wing.roof === 'hip') expect(wing.ridgeY - wing.eaveY).toBeCloseTo(4, 4);
      }
    }
  });

  it('distinguishes all five block forms using actual occupied footprints and heights', () => {
    for (const block of manifest.blocks) {
      const bodies = block.wings.map(wing => ({wing, bounds: new Box3().setFromPoints(exportedBody(wing))}));
      const at = (x: number, z: number) => bodies.filter(({bounds}) =>
        block.center[0] + x > bounds.min.x + tolerance && block.center[0] + x < bounds.max.x - tolerance &&
        block.center[1] + z > bounds.min.z + tolerance && block.center[1] + z < bounds.max.z - tolerance);
      const heightAt = (x: number, z: number) => {
        const occupied = at(x, z);
        expect(occupied, `${block.id}: occupancy at ${x},${z}`).toHaveLength(1);
        return occupied[0]!.bounds.max.y - occupied[0]!.bounds.min.y;
      };
      if (block.typology === 'rear-workshop') {
        expect(heightAt(-12, 0)).toBeCloseTo(7.1, 4);
        expect(at(-12, 15)).toHaveLength(0);
      } else if (block.typology === 'paired-courts') {
        for (const z of [-18, 0, 18]) expect(heightAt(-9, z)).toBeCloseTo(6.6, 4);
        expect(at(-20, 0)).toHaveLength(0);
        expect(at(10, 0)).toHaveLength(0);
      } else if (block.typology === 'open-service-court') {
        expect(heightAt(-11, 5)).toBeCloseTo(5.8, 4);
        expect(heightAt(35.5, -6)).toBeGreaterThan(10);
        expect(at(35.5, 10)).toHaveLength(0);
      } else if (block.typology === 'stepped-frontage') {
        const front = bodies.filter(({wing}) => wing.center[1] < block.center[1] - 20);
        expect(front).toHaveLength(3);
        const setbacks = front.map(({bounds}) => Math.round((bounds.min.z - block.bounds[1]) * 10));
        expect(setbacks.sort()).toEqual([0, 0, 24]);
      } else if (block.typology === 'mixed-low-rear') {
        const rear = bodies.filter(({wing}) => wing.center[1] > block.center[1] + 20);
        expect(rear).toHaveLength(4);
        for (const {bounds} of rear) expect(bounds.max.y - bounds.min.y).toBeLessThan(9);
        expect(heightAt(-11, 2)).toBeCloseTo(5.4, 4);
      }
    }
  });

  it('exports the courtyard surface on shared terrain within the retained block reservations', () => {
    const yard = triangles.filter(t => t.role === 'courtyard-earth');
    expect(yard.length).toBeGreaterThan(1000);
    for (const triangle of yard) {
      expect(manifest.blocks.some(block => triangle.p.every(p => inside(p, block.bounds)))).toBe(true);
      for (const p of triangle.p) expect(Math.abs(p.y - eiffelTerrainHeightAt(p.x, p.z) - 0.06)).toBeLessThan(tolerance);
      const n = triangle.p[1]!.clone().sub(triangle.p[0]!).cross(triangle.p[2]!.clone().sub(triangle.p[0]!)).normalize();
      expect(n.y).toBeGreaterThan(0.94);
      for (let i = 0; i < 3; i++) expect(triangle.p[i]!.distanceTo(triangle.p[(i + 1) % 3]!)).toBeLessThan(5.8);
    }
  });

  it('has no positive-volume wing intersections, using solids reconstructed from exported wall corners', () => {
    for (const block of manifest.blocks) {
      const solids = block.wings.map(wing => {
        const actual = exportedBody(wing), bounds = new Box3().setFromPoints(actual);
        // Every roof is already confined to this horizontal body footprint;
        // extending the actual rectangular body upward is conservative.
        const vertices = [bounds.min.x, bounds.max.x].flatMap(x => [wing.baseY, wing.ridgeY + 0.98].flatMap(y =>
          [bounds.min.z, bounds.max.z].map(z => [x, y, z] as RigidVec3)));
        return {id: wing.id, solid: eiffelConvexSolid(vertices, boxFaces)};
      });
      for (let i = 0; i < solids.length; i++) for (let j = 0; j < i; j++) {
        expect(eiffelConvexPenetration(solids[i]!.solid, solids[j]!.solid), `${solids[i]!.id} versus ${solids[j]!.id}`).toBeLessThanOrEqual(tolerance);
      }
    }
  });

  it('retains street attributes outside the repaired near-city region and all north-bank triangles exactly', () => {
    for (const role of ['road', 'paving']) {
      const after = triangles.filter(t => t.role === role && !nearStreet(t)), before = beforeTriangles.filter(t => t.role === role && !nearStreet(t));
      expect(before.length).toBeGreaterThan(1000);
      expect(triangleDigest(after), role).toEqual(triangleDigest(before));
    }
    const north = (t: Triangle) => t.p.some(p => p.z < -380);
    expect(triangleDigest(triangles.filter(north))).toEqual(triangleDigest(beforeTriangles.filter(north)));
    expect(manifest.northBankParcels).toEqual(previous.northBankParcels);
    expect(manifest.northBankStreets).toEqual(previous.northBankStreets);
    expect(manifest.northBankSurfacePieces).toEqual(previous.northBankSurfacePieces);
  });

  it('repairs intersections with exactly the old exported planar coverage and no positive-area overlap', () => {
    for (const role of ['road', 'paving']) {
      const after = triangles.filter(t => t.role === role && nearStreet(t));
      const before = beforeTriangles.filter(t => t.role === role && nearStreet(t));
      expect(after.length).toBeGreaterThan(1000); expect(before.length).toBeGreaterThan(1000);
      const original = sourceRectangles(before, false), replacement = sourceRectangles(after, true);
      // Every x event comes from actual triangle boundaries in either export.
      // Equality on each open slab proves equality of their full planar union,
      // including holes and the outer perimeter (apart from zero-area edges).
      const events = [...new Set([...original, ...replacement].flatMap(r => [r[0], r[2]]))].sort((a, b) => a - b);
      for (let i = 1; i < events.length; i++) {
        const x = (events[i - 1]! + events[i]!) / 2;
        expect(zUnion(replacement, x, true), `${role}: footprint at x=${x}`).toEqual(zUnion(original, x));
      }
      const sharedHeights = new Map<string, number>();
      for (const t of after) {
        const normal = t.p[1]!.clone().sub(t.p[0]!).cross(t.p[2]!.clone().sub(t.p[0]!)).normalize();
        expect(normal.y).toBeGreaterThan(0.94);
        for (let i = 0; i < 3; i++) {
          const p = t.p[i]!;
          expect(Math.abs(p.y - eiffelTerrainHeightAt(p.x, p.z) - (role === 'road' ? 0.08 : 0.24))).toBeLessThan(tolerance);
          expect(p.distanceTo(t.p[(i + 1) % 3]!)).toBeLessThanOrEqual(8 * Math.SQRT2 + tolerance);
          const key = `${projected(p.x)}:${projected(p.z)}`, previousY = sharedHeights.get(key);
          if (previousY !== undefined) expect(p.y).toBe(previousY);
          sharedHeights.set(key, p.y);
        }
      }
    }
  }, 30_000);

  it('keeps the twenty retained courtyard-tree canopies clear of actual building and roof footprints', () => {
    const near = manifest.blocks.filter(b => Math.abs(b.center[0]) < 360);
    expect(near).toHaveLength(20);
    for (const block of near) {
      const x = block.center[0] + 10, z = block.center[1], radius = 3.1;
      expect(manifest.plantings.some(p => p.x === x && p.z === z && p.radius === radius), `${block.id}: retained tree datum`).toBe(true);
      // The actual trunk/foliage is retained as geometry, not just a keepout.
      const leaves = blocks.get(block.id)!.filter(t => ['leaf', 'leaf-light'].includes(t.role));
      expect(leaves.length, `${block.id}: exported tree canopy`).toBeGreaterThan(0);
      for (const wing of block.wings) {
        const actual = new Box3().setFromPoints([...exportedBody(wing), ...roofTriangles(wing).flatMap(t => t.p)]);
        const dx = Math.max(actual.min.x - x, 0, x - actual.max.x);
        const dz = Math.max(actual.min.z - z, 0, z - actual.max.z);
        expect(Math.hypot(dx, dz), `${wing.id}: circular canopy keepout`).toBeGreaterThanOrEqual(radius - tolerance);
      }
    }
  });
});
