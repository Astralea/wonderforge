import { readFileSync, statSync } from 'node:fs';
import { Box3, Matrix4, Quaternion, Ray, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';

// This gate is deliberately against the preserved before/candidate exports.
// It does not rewrite or supersede an earlier asset seal or certify joint capacity.
const folder = 'artifacts/eiffel-summit-assembly-2026-09-08/kit-joint-revision';
const mastId = 'summit-crown-m072-c000';
const stairId = 'summit-access-stair-m000-c003';
const nextId = 'summit-crown-m072-c001';
const compactId = 'summit-crown/member-072';
const floorIds = Array.from({ length: 12 }, (_, i) => `summit-crown-m${String(49 + i * 2).padStart(3, '0')}-c000`);
const tolerance = 1e-4;
interface Node {
  mesh?: number; children?: number[]; extras?: Record<string, unknown>;
  translation?: number[]; rotation?: number[]; scale?: number[]; matrix?: number[];
}
interface Document {
  nodes: Node[];
  meshes: { primitives: { attributes: Record<string, number>; indices?: number; mode?: number }[] }[];
  accessors: { bufferView: number; byteOffset?: number; componentType: number; count: number; type: string }[];
  bufferViews: { buffer: number; byteOffset?: number; byteLength: number; byteStride?: number }[];
  [key: string]: unknown;
}
function readGlb(path: string) {
  const bytes = readFileSync(path);
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
  expect(bytes.readUInt32LE(4)).toBe(2);
  expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  const size = bytes.readUInt32LE(12);
  expect(bytes.readUInt32LE(16)).toBe(0x4e4f534a);
  const document = JSON.parse(bytes.subarray(20, 20 + size).toString()) as Document;
  const tail = bytes.subarray(20 + size);
  expect(tail.readUInt32LE(4)).toBe(0x004e4942);
  expect(tail.readUInt32LE(0) + 8).toBe(tail.length);
  return { document, tail, binary: tail.subarray(8) };
}
type Glb = ReturnType<typeof readGlb>;
const before = readGlb(`${folder}/before/tower-kit.glb`);
const candidate = readGlb(`${folder}/model/tower-kit.glb`);
const compactBefore = readGlb(`${folder}/before/tower-kit-seated.glb`);
const compact = readGlb(`${folder}/model/tower-kit-seated.glb`);
const oldManifest = JSON.parse(readFileSync(`${folder}/before/tower-kit.manifest.json`, 'utf8')) as EiffelKitManifest;
const manifest = JSON.parse(readFileSync(`${folder}/model/tower-kit.manifest.json`, 'utf8')) as EiffelKitManifest;
function nodeIndex(glb: Glb, key: string, value: string) {
  const matches = glb.document.nodes.flatMap((node, i) => node.extras?.[key] === value ? [i] : []);
  expect(matches, `${key}=${value}`).toHaveLength(1);
  return matches[0]!;
}
function accessor(glb: Glb, id: number): number[][] {
  const a = glb.document.accessors[id]!, view = glb.document.bufferViews[a.bufferView]!;
  expect(view.buffer).toBe(0);
  const components = ({ SCALAR: 1, VEC3: 3 } as Record<string, number>)[a.type]!;
  expect(components).toBeGreaterThan(0);
  const size = ({ 5126: 4, 5125: 4, 5123: 2, 5121: 1 } as Record<number, number>)[a.componentType]!;
  expect(size).toBeGreaterThan(0);
  const offset = (view.byteOffset ?? 0) + (a.byteOffset ?? 0), stride = view.byteStride ?? size * components;
  const read = (at: number) => a.componentType === 5126 ? glb.binary.readFloatLE(at)
    : a.componentType === 5125 ? glb.binary.readUInt32LE(at)
      : a.componentType === 5123 ? glb.binary.readUInt16LE(at) : glb.binary.readUInt8(at);
  return Array.from({ length: a.count }, (_, i) => Array.from({ length: components }, (_, j) => read(offset + i * stride + j * size)));
}
function worldMatrix(glb: Glb, index: number): Matrix4 {
  const node = glb.document.nodes[index]!;
  const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
    new Vector3().fromArray(node.translation ?? [0, 0, 0]),
    new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]),
    new Vector3().fromArray(node.scale ?? [1, 1, 1]),
  );
  const parent = glb.document.nodes.findIndex(n => n.children?.includes(index));
  return parent < 0 ? local : worldMatrix(glb, parent).multiply(local);
}
function actual(glb: Glb, key: string, id: string) {
  const index = nodeIndex(glb, key, id), node = glb.document.nodes[index]!, matrix = worldMatrix(glb, index);
  const triangles: Vector3[][] = [];
  for (const primitive of glb.document.meshes[node.mesh!]!.primitives) {
    expect(primitive.mode ?? 4).toBe(4);
    const vertices = accessor(glb, primitive.attributes.POSITION!).map(point => new Vector3().fromArray(point).applyMatrix4(matrix));
    const indices = primitive.indices === undefined ? vertices.map((_, i) => i) : accessor(glb, primitive.indices).map(row => row[0]!);
    for (let i = 0; i < indices.length; i += 3) triangles.push([0, 1, 2].map(j => vertices[indices[i + j]!]!));
  }
  return { triangles, bounds: new Box3().setFromPoints(triangles.flat()) };
}
function rayHeight(shape: ReturnType<typeof actual>, x: number, z: number, from: number, direction: number) {
  const ray = new Ray(new Vector3(x, from, z), new Vector3(0, direction, 0));
  const hits = shape.triangles.flatMap(triangle => {
    const hit = ray.intersectTriangle(triangle[0]!, triangle[1]!, triangle[2]!, false, new Vector3());
    return hit ? [hit.y] : [];
  });
  expect(hits.length, `actual triangle ray ${x},${z}`).toBeGreaterThan(0);
  return direction > 0 ? Math.min(...hits) : Math.max(...hits);
}
function contact(lower: ReturnType<typeof actual>, upper: ReturnType<typeof actual>, label: string) {
  const gap = upper.bounds.min.y - lower.bounds.max.y;
  expect(Math.abs(gap), `${label} actual solid separation/contact`).toBeLessThan(tolerance);
  const minX = Math.max(lower.bounds.min.x, upper.bounds.min.x), maxX = Math.min(lower.bounds.max.x, upper.bounds.max.x);
  const minZ = Math.max(lower.bounds.min.z, upper.bounds.min.z), maxZ = Math.min(lower.bounds.max.z, upper.bounds.max.z);
  expect((maxX - minX) * (maxZ - minZ), `${label} contact area`).toBeGreaterThan(.0224);
  // Actual end-face triangle rays throughout the shared footprint, not origins.
  for (let ix = 0; ix <= 6; ix++) for (let iz = 0; iz <= 6; iz++) {
    const x = minX + 1e-5 + ix / 6 * (maxX - minX - 2e-5);
    const z = minZ + 1e-5 + iz / 6 * (maxZ - minZ - 2e-5);
    const top = rayHeight(lower, x, z, lower.bounds.max.y + 1, -1);
    const bottom = rayHeight(upper, x, z, upper.bounds.min.y - 1, 1);
    expect(Math.abs(bottom - top), `${label} face gap ${x},${z}`).toBeLessThan(tolerance);
  }
}
function floorHub(glb: Glb, compactAsset = false) {
  const members = floorIds.map(id => actual(glb, compactAsset ? 'wf_source' : 'wf_part', compactAsset ? `summit-crown/member-${id.slice(14, 17)}` : id));
  const triangles = members.flatMap(member => member.triangles);
  return { members, triangles, bounds: new Box3().setFromPoints(triangles.flat()) };
}
type Point2 = [number, number];
const side = (a: Point2, b: Point2, p: Point2) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
function clip(polygon: Point2[], a: Point2, b: Point2, sign: number): Point2[] {
  const output: Point2[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i]!, q = polygon[(i + 1) % polygon.length]!, dp = side(a, b, p) * sign, dq = side(a, b, q) * sign;
    if (dp >= 0) output.push(p);
    if ((dp >= 0) !== (dq >= 0)) {
      const u = dp / (dp - dq);
      output.push([p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]);
    }
  }
  return output;
}
function area(polygon: Point2[]) {
  return Math.abs(polygon.reduce((sum, p, i) => { const q = polygon[(i + 1) % polygon.length]!; return sum + p[0] * q[1] - p[1] * q[0]; }, 0)) / 2;
}
function assertCompleteFloorFootprint(hub: ReturnType<typeof floorHub>, mast: ReturnType<typeof actual>) {
  const { min, max } = mast.bounds;
  let uncovered: Point2[][] = [[[min.x, min.z], [max.x, min.z], [max.x, max.z], [min.x, max.z]]];
  const tops = hub.triangles.filter(triangle => triangle.every(p => Math.abs(p.y - hub.bounds.max.y) < tolerance));
  expect(tops).toHaveLength(24);
  // Subtract the union of the actual 24 top-face triangles from the complete
  // mast square. This catches holes between rays and overlaps without double counting.
  for (const triangle of tops) {
    const t = triangle.map(p => [p.x, p.z] as Point2);
    if (side(t[0]!, t[1]!, t[2]!) < 0) t.reverse();
    uncovered = uncovered.flatMap(polygon => {
      let inside = polygon;
      const outside: Point2[][] = [];
      for (let i = 0; i < 3 && inside.length; i++) {
        const a = t[i]!, b = t[(i + 1) % 3]!, piece = clip(inside, a, b, -1);
        if (area(piece) > 1e-15) outside.push(piece);
        inside = clip(inside, a, b, 1);
      }
      return outside;
    });
  }
  expect(uncovered.reduce((sum, polygon) => sum + area(polygon), 0), 'actual floor triangle union covers complete 0.18m square').toBeLessThan(1e-9);
}
function triangleCount(glb: Glb) {
  return glb.document.nodes.reduce((sum, node) => sum + (node.mesh === undefined ? 0 : glb.document.meshes[node.mesh]!.primitives.reduce((subtotal, p) => subtotal + glb.document.accessors[p.indices ?? p.attributes.POSITION!]!.count / 3, 0)), 0);
}

describe('actual exported crown-floor/mast butt-joint revision', () => {
  it.each([
    ['kit', before, candidate, 'wf_part', mastId],
    ['compact', compactBefore, compact, 'wf_source', compactId],
  ] as const)('changes only the intended %s node Y translation/scale and preserves every primitive byte', (_label, original, revised, key, id) => {
    const changedIndex = nodeIndex(original, key, id);
    expect(nodeIndex(revised, key, id)).toBe(changedIndex);
    expect(revised.tail.equals(original.tail), 'complete binary chunk equality').toBe(true);
    expect(revised.document.nodes).toHaveLength(original.document.nodes.length);
    const normalized = structuredClone(revised.document);
    const oldNode = original.document.nodes[changedIndex]!, changed = normalized.nodes[changedIndex]!;
    expect(changed.translation![1]).not.toBe(oldNode.translation![1]);
    expect(changed.scale![1]).toBeLessThan(oldNode.scale![1]!);
    changed.translation![1] = oldNode.translation![1]!;
    changed.scale![1] = oldNode.scale![1]!;
    expect(normalized).toEqual(original.document);
    expect(triangleCount(revised)).toBe(triangleCount(original));
  });

  it('preserves every unrelated manifest record and confines changes to the corrected geometry and provenance', () => {
    expect(manifest.parts).toHaveLength(oldManifest.parts.length);
    const changed = manifest.parts.find(part => part.id === mastId)!;
    const prior = oldManifest.parts.find(part => part.id === mastId)!;
    const allowed = ['center', 'boundsMin', 'boundsMax', 'finalPose', 'localBounds', 'transportSize', 'pickupLugs', 'connectionAnchors'];
    const normalizedPart = { ...changed } as Record<string, unknown>;
    for (const key of allowed) normalizedPart[key] = (prior as unknown as Record<string, unknown>)[key];
    expect(normalizedPart).toEqual(prior);
    expect(changed.finalPose.quaternion).toEqual(prior.finalPose.quaternion);
    const normalized = structuredClone(manifest) as unknown as { parts: unknown[]; metadata: Record<string, unknown> };
    normalized.parts = normalized.parts.map((part, i) => manifest.parts[i]!.id === mastId ? prior : part);
    expect(normalized.metadata.mastJointRevision).toMatchObject({ partId: mastId, supportPartIds: floorIds });
    delete normalized.metadata.mastJointRevision;
    expect(normalized).toEqual(oldManifest);
  });

  it('contacts both actual solid end faces within 0.1 mm with no greater solid overlap', () => {
    const lower = floorHub(candidate), mast = actual(candidate, 'wf_part', mastId), next = actual(candidate, 'wf_part', nextId);
    expect(lower.bounds.max.y).toBeCloseTo(300.6700134, 5);
    expect(next.bounds.min.y).toBeCloseTo(302.6666667, 5);
    assertCompleteFloorFootprint(lower, mast);
    contact(lower, mast, 'actual crown floor / c000');
    for (const member of lower.members) expect(member.bounds.max.y - mast.bounds.min.y, 'no radial floor member penetrates the mast').toBeLessThan(tolerance);
    expect(actual(candidate, 'wf_part', stairId).bounds.max.y - mast.bounds.min.y, 'stair column remains below the floor-supported mast').toBeLessThan(0);
    contact(mast, next, 'c000 / c001');
    expect(mast.bounds.getSize(new Vector3()).x).toBeCloseTo(.18, 6);
    expect(mast.bounds.getSize(new Vector3()).z).toBeCloseTo(.18, 6);
    expect(mast.triangles).toHaveLength(actual(before, 'wf_part', mastId).triangles.length);
    const oldMast = actual(before, 'wf_part', mastId);
    expect(lower.bounds.max.y - oldMast.bounds.min.y).toBeGreaterThan(2.66);
  });

  it('keeps the compact completed mast bottom at c000 and its original 312m top', () => {
    const mast = actual(candidate, 'wf_part', mastId), completed = actual(compact, 'wf_source', compactId);
    const old = actual(compactBefore, 'wf_source', compactId);
    expect(Math.abs(completed.bounds.min.y - mast.bounds.min.y)).toBeLessThan(tolerance);
    expect(Math.abs(completed.bounds.max.y - old.bounds.max.y)).toBeLessThan(tolerance);
    expect(completed.bounds.max.y).toBeCloseTo(312, 4);
    const lower = floorHub(compact, true);
    assertCompleteFloorFootprint(lower, completed);
    contact(lower, completed, 'compact crown floor / mast');
  });

  it('matches actual transformed bounds, end anchors and lifting points to the revised manifest', () => {
    const part = manifest.parts.find(row => row.id === mastId)!, shape = actual(candidate, 'wf_part', mastId);
    for (const [index, axis] of (['x', 'y', 'z'] as const).entries()) {
      expect(Math.abs(shape.bounds.min[axis] - part.boundsMin[index]!)).toBeLessThan(tolerance);
      expect(Math.abs(shape.bounds.max[axis] - part.boundsMax[index]!)).toBeLessThan(tolerance);
    }
    const pose = new Matrix4().compose(new Vector3(...part.finalPose.position), new Quaternion(...part.finalPose.quaternion), new Vector3(1, 1, 1));
    expect(part.connectionAnchors).toHaveLength(2);
    const anchors = part.connectionAnchors.map(point => new Vector3(...point).applyMatrix4(pose)).sort((a, b) => a.y - b.y);
    expect(Math.abs(anchors[0]!.y - shape.bounds.min.y)).toBeLessThan(tolerance);
    expect(Math.abs(anchors[1]!.y - shape.bounds.max.y)).toBeLessThan(tolerance);
    expect(part.transportSize[2]).toBeCloseTo(shape.bounds.max.y - shape.bounds.min.y, 5);
    for (const point of part.pickupLugs) {
      const world = new Vector3(...point).applyMatrix4(pose);
      expect(shape.bounds.clone().expandByScalar(tolerance).containsPoint(world), 'clamp lies on revised member').toBe(true);
    }
  });

  it('retains an actual Blender source file without treating its existence as a Blender reload proof', () => {
    const path = 'artifacts/eiffel-summit-assembly-2026-09-08/blender/eiffel-tower-mast-joint.blend';
    expect(statSync(path).size).toBeGreaterThan(1_000_000);
    expect(readFileSync(path).subarray(0, 7).toString()).toBe('BLENDER');
  });
});
