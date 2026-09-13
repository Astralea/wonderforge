import { BufferGeometry } from 'three';

type Triangle = { offset: number; corners: number[] };
type Face = { positive: Triangle[]; negative: Triangle[] };

/**
 * Removes only exact, opposed rectangular face pairs in an already merged box
 * batch. No welding or epsilon snapping: partial overlaps remain untouched.
 * Each side must be exactly two nonduplicate triangles covering one rectangle.
 * Input geometry is retained; the caller owns the returned geometry and all its
 * cloned attributes. Vertices are not compacted, so every attribute is preserved.
 * Use only on solids that will stay joined; this is not a general mesh boolean.
 */
export function removeInternalBoxFaces(source: BufferGeometry): {
  geometry: BufferGeometry; removedTriangles: number;
} {
  const geometry = source.clone();
  const position = source.getAttribute('position');
  if (!position) return { geometry, removedTriangles: 0 };
  const count = source.index?.count ?? position.count;
  const indices = Array.from({ length: count }, (_, i) => source.index?.getX(i) ?? i);
  // A face is internal only while both solids are rendered. Partial draw ranges
  // and missing/overlapping group coverage cannot establish that condition.
  const aligned = (n: number) => Number.isInteger(n) && n >= 0 && n % 3 === 0;
  const range = source.drawRange;
  const groups = [...source.groups].sort((a, b) => a.start - b.start);
  let groupEnd = 0;
  const completeGroups = groups.every(group => {
    if (!aligned(group.start) || !aligned(group.count) || group.start !== groupEnd) return false;
    groupEnd += group.count;
    return groupEnd <= count;
  }) && (groups.length === 0 || groupEnd === count);
  if (source.getAttribute('skinIndex') || source.getAttribute('skinWeight')
    || Object.values(source.morphAttributes).some(attributes => attributes.length > 0)
    || count % 3 !== 0 || range.start !== 0
    || (range.count !== Infinity && (!aligned(range.count) || range.count < count))
    || !completeGroups) {
    geometry.setIndex(indices);
    return { geometry, removedTriangles: 0 };
  }
  const faces = new Map<string, Face>();
  for (let offset = 0; offset + 2 < count; offset += 3) {
    const points = indices.slice(offset, offset + 3).map(i => [position.getX(i), position.getY(i), position.getZ(i)]);
    if (points.some(p => p.some(v => !Number.isFinite(v)))) continue;
    const axis = [0, 1, 2].find(a => points.every(p => p[a] === points[0][a]));
    if (axis === undefined) continue;
    // Cyclic projection preserves the sign of the axis-normal component.
    const u = (axis + 1) % 3, v = (axis + 2) % 3;
    const minU = Math.min(...points.map(p => p[u])), maxU = Math.max(...points.map(p => p[u]));
    const minV = Math.min(...points.map(p => p[v])), maxV = Math.max(...points.map(p => p[v]));
    if (minU === maxU || minV === maxV) continue;
    if (points.some(p => (p[u] !== minU && p[u] !== maxU) || (p[v] !== minV && p[v] !== maxV))) continue;
    const corners = points.map(p => (p[u] === maxU ? 1 : 0) + (p[v] === maxV ? 2 : 0));
    if (new Set(corners).size !== 3) continue;
    const signedArea = (points[1][u] - points[0][u]) * (points[2][v] - points[0][v])
      - (points[1][v] - points[0][v]) * (points[2][u] - points[0][u]);
    const key = JSON.stringify([axis, points[0][axis], minU, maxU, minV, maxV]);
    const face = faces.get(key) ?? { positive: [], negative: [] };
    face[signedArea > 0 ? 'positive' : 'negative'].push({ offset, corners });
    faces.set(key, face);
  }
  function isRectangle(triangles: Triangle[]): boolean {
    if (triangles.length !== 2) return false;
    const shared = triangles[0].corners.filter(c => triangles[1].corners.includes(c));
    // Opposite rectangle corners must be the common diagonal, not an edge.
    return shared.length === 2 && (shared[0] ^ shared[1]) === 3
      && new Set(triangles.flatMap(t => t.corners)).size === 4;
  }
  const removed = new Set<number>();
  for (const face of faces.values()) {
    if (isRectangle(face.positive) && isRectangle(face.negative)) {
      for (const triangle of [...face.positive, ...face.negative]) removed.add(triangle.offset);
    }
  }
  const retained: number[] = [];
  // Prefix mapping also preserves material groups and an existing draw range.
  const prefix = [0];
  for (let i = 0; i < count; i++) {
    if (!removed.has(i - i % 3)) retained.push(indices[i]);
    prefix.push(retained.length);
  }
  geometry.setIndex(retained);
  geometry.clearGroups();
  const mapOffset = (i: number) => prefix[Math.max(0, Math.min(count, i))];
  for (const group of source.groups) {
    const start = mapOffset(group.start), end = mapOffset(group.start + group.count);
    if (end > start) geometry.addGroup(start, end - start, group.materialIndex);
  }
  const start = mapOffset(source.drawRange.start);
  geometry.setDrawRange(start, mapOffset(source.drawRange.start + source.drawRange.count) - start);
  return { geometry, removedTriangles: removed.size };
}
