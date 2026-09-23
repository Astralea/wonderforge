import model from './generated/sydneyBlenderModel.json';
import type { Vec3 } from './constructionTypes';
import type { SydneyPartGroup } from './sydneyTypes';

export interface SydneySailDef {
  id: number;
  name: string;
  group: Exclude<SydneyPartGroup, 'podium'>;
  position: Vec3;
  rotation: Vec3;
  dimensions: Vec3;
  ribCount: number;
  height: number;
  yaw: number;
  centreX: number;
  centreY: number;
  length: number;
  rows: number;
  cols: number;
  points: number[];
  normals: number[];
  sphereCenters: [Vec3, Vec3];
}
export interface SydneyPodiumMesh {
  id: string;
  vertices: number[];
  position: Vec3;
  dimensions: Vec3;
}
export interface SydneyDetailMesh {
  name: string;
  material: 'glass' | 'bronze' | 'concrete' | 'granite' | 'tile';
  vertices: number[];
  reveal: number;
  shellId?: number;
  neighbourShellId?: number;
}
export interface SydneyBlenderModel {
  version: 3;
  authoring: string;
  units: 'metres';
  radius: number;
  deck: number;
  shells: SydneySailDef[];
  podium: SydneyPodiumMesh[];
  details: SydneyDetailMesh[];
}
/** The authored export is the sole geometry authority; there is no procedural
 * substitute when a model is missing or has an incompatible schema. */
export const SYDNEY_BLENDER_MODEL = model as unknown as SydneyBlenderModel;
if (
  SYDNEY_BLENDER_MODEL.version !== 3 ||
  SYDNEY_BLENDER_MODEL.units !== 'metres'
)
  throw new Error('Sydney requires the version 3 Blender metre-space export');
export const SYDNEY_SPHERE_RADIUS = SYDNEY_BLENDER_MODEL.radius;
export const SYDNEY_PODIUM_DECK = SYDNEY_BLENDER_MODEL.deck;
export const SYDNEY_SAILS = SYDNEY_BLENDER_MODEL.shells;
export const SYDNEY_PODIUM_MESHES = SYDNEY_BLENDER_MODEL.podium;
export const SYDNEY_DETAILS = SYDNEY_BLENDER_MODEL.details;
export const SYDNEY_STRUCTURAL_DETAILS = SYDNEY_DETAILS.filter(
  (d) => d.material === 'tile' && d.name.includes('-side-infill-'),
);
export const SYDNEY_FINISH_DETAILS = SYDNEY_DETAILS.filter(
  (d) => !SYDNEY_STRUCTURAL_DETAILS.includes(d),
);
for (const [index, sail] of SYDNEY_SAILS.entries()) {
  const expected = 2 * sail.rows * sail.cols * 3;
  if (
    sail.id !== index ||
    sail.rows !== 65 ||
    sail.cols !== 33 ||
    sail.points.length !== expected ||
    sail.normals.length !== expected
  )
    throw new Error(`Invalid Sydney authored shell grid: ${sail.id}`);
}

/** Highest upward surface of an authored podium triangle at a world X/Z.
 * A missing hit is deliberately undefined, never an invented rectangular deck. */
export function sydneyPodiumHeightAt(x: number, z: number): number | undefined {
  let height: number | undefined;
  for (const mesh of SYDNEY_PODIUM_MESHES) {
    if (
      Math.abs(x - mesh.position[0]) > mesh.dimensions[0] / 2 + 1e-6 ||
      Math.abs(z - mesh.position[2]) > mesh.dimensions[2] / 2 + 1e-6
    )
      continue;
    const p = mesh.vertices;
    for (let i = 0; i < p.length; i += 9) {
      const ax = p[i]!,
        ay = p[i + 1]!,
        az = p[i + 2]!;
      const bx = p[i + 3]!,
        by = p[i + 4]!,
        bz = p[i + 5]!;
      const cx = p[i + 6]!,
        cy = p[i + 7]!,
        cz = p[i + 8]!;
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-10) continue;
      const a = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det;
      const b = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det;
      const c = 1 - a - b;
      if (Math.min(a, b, c) < -1e-7) continue;
      const y = a * ay + b * by + c * cy;
      if (height === undefined || y > height) height = y;
    }
  }
  return height;
}

export interface SydneySurfacePatch {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  side: -1 | 1;
  depth: number;
  offset?: number;
}
/** Bilinear sampling of Blender's world-space grid. u=0 is the single
 * pedestal, u=1 the ridge; v runs from rear to leading arch. */
function sampleGrid(
  sail: SydneySailDef,
  grid: number[],
  u: number,
  v: number,
  side: -1 | 1,
): Vec3 {
  const row = Math.max(0, Math.min(1, u)) * (sail.rows - 1);
  const col = Math.max(0, Math.min(1, v)) * (sail.cols - 1);
  const r = Math.min(sail.rows - 2, Math.floor(row));
  const c = Math.min(sail.cols - 2, Math.floor(col));
  const du = row - r,
    dv = col - c;
  const at = (i: number, j: number, axis: number) =>
    grid[(((side === -1 ? 0 : 1) * sail.rows + i) * sail.cols + j) * 3 + axis]!;
  return [0, 1, 2].map(
    (axis) =>
      at(r, c, axis) * (1 - du) * (1 - dv) +
      at(r + 1, c, axis) * du * (1 - dv) +
      at(r, c + 1, axis) * (1 - du) * dv +
      at(r + 1, c + 1, axis) * du * dv,
  ) as Vec3;
}
export function sydneyShellNormal(
  sail: SydneySailDef,
  u: number,
  v: number,
  side: -1 | 1,
): Vec3 {
  const normal = sampleGrid(sail, sail.normals, u, v, side);
  const length = Math.hypot(...normal);
  return normal.map((n) => n / length) as Vec3;
}
export function sydneyShellPoint(
  sail: SydneySailDef,
  u: number,
  v: number,
  side: -1 | 1,
  offset = 0,
): Vec3 {
  const point = sampleGrid(sail, sail.points, u, v, side);
  if (!offset) return point;
  const normal = sydneyShellNormal(sail, u, v, side);
  return point.map((p, axis) => p + normal[axis]! * offset) as Vec3;
}
/** Back-to-back shells share an authored sphere-intersection edge. Extruding
 * both skins normally would cross that joint. Miter each offset skin against
 * the spheres' radical plane, retaining the authored surface and solid depth
 * everywhere away from the joint. The two projected outer edges coincide. */
function miterJoint(sail: SydneySailDef, point: Vec3, side: -1 | 1): Vec3 {
  const foot = sydneyShellPoint(sail, 0, 0, side);
  let result = point;
  for (const other of SYDNEY_SAILS) {
    if (other.id === sail.id || other.group !== sail.group) continue;
    const otherFoot = sydneyShellPoint(other, 0, 0, side);
    if (Math.hypot(...foot.map((n, i) => n - otherFoot[i]!)) > 0.001) continue;
    const own = sail.sphereCenters[side === -1 ? 0 : 1],
      opposite = other.sphereCenters[side === -1 ? 0 : 1];
    const n = own.map((x, i) => x - opposite[i]!) as Vec3;
    const length = Math.hypot(...n);
    if (length < 0.001) continue;
    const normal = n.map((x) => x / length) as Vec3;
    const signed = result.reduce(
      (sum, x, i) => sum + (x - (own[i]! + opposite[i]!) / 2) * normal[i]!,
      0,
    );
    if (signed < 0)
      result = result.map((x, i) => x - signed * normal[i]!) as Vec3;
  }
  return result;
}
/** Bevel the derived cladding/rib thickness into authored flank seams. The
 * exact shared edge is a butt joint, not two normal extrusions occupying the
 * same space. Beyond a 0.75 m joint zone the full design depth is unchanged. */
function flankJointOffset(
  sail: SydneySailDef,
  u: number,
  v: number,
  side: -1 | 1,
  offset: number,
): number {
  const point = sydneyShellPoint(sail, u, v, side);
  let factor = 1;
  for (const edge of [0, 1] as const) {
    const joined = SYDNEY_STRUCTURAL_DETAILS.some((d) =>
      edge === 0 ? d.neighbourShellId === sail.id : d.shellId === sail.id,
    );
    if (!joined) continue;
    const boundary = sydneyShellPoint(sail, u, edge, side);
    factor = Math.min(
      factor,
      Math.hypot(...point.map((x, i) => x - boundary[i]!)) / 0.75,
    );
  }
  return offset * Math.min(1, factor);
}
export function sydneyPatchVertices(
  sail: SydneySailDef,
  patch: SydneySurfacePatch,
  steps = 2,
): number[] {
  const vertices: number[] = [];
  const grid: Vec3[][] = [];
  for (const offset of [0, -patch.depth]) {
    const layer: Vec3[] = [];
    for (let i = 0; i <= steps; i++)
      for (let j = 0; j <= steps; j++) {
        layer.push(
          miterJoint(
            sail,
            sydneyShellPoint(
              sail,
              patch.u0 + ((patch.u1 - patch.u0) * i) / steps,
              patch.v0 + ((patch.v1 - patch.v0) * j) / steps,
              patch.side,
              flankJointOffset(
                sail,
                patch.u0 + ((patch.u1 - patch.u0) * i) / steps,
                patch.v0 + ((patch.v1 - patch.v0) * j) / steps,
                patch.side,
                offset + (patch.offset ?? 0),
              ),
            ),
            patch.side,
          ),
        );
      }
    grid.push(layer);
  }
  const tri = (a: Vec3, b: Vec3, c: Vec3) => {
    vertices.push(...a, ...b, ...c);
  };
  let reverseRim = false;
  for (let layer = 0; layer < 2; layer++)
    for (let i = 0; i < steps; i++)
      for (let j = 0; j < steps; j++) {
        const a = grid[layer]![i * (steps + 1) + j]!,
          b = grid[layer]![(i + 1) * (steps + 1) + j]!,
          c = grid[layer]![(i + 1) * (steps + 1) + j + 1]!,
          d = grid[layer]![i * (steps + 1) + j + 1]!;
        // Authored grids may be mirrored or yawed. Derive winding from the
        // supplied outward normal instead of assuming an analytic chart.
        const normal = sydneyShellNormal(
          sail,
          patch.u0 + ((patch.u1 - patch.u0) * (i + 0.5)) / steps,
          patch.v0 + ((patch.v1 - patch.v0) * (j + 0.5)) / steps,
          patch.side,
        );
        const ab = b.map((n, k) => n - a[k]!) as Vec3;
        const ac = c.map((n, k) => n - a[k]!) as Vec3;
        const dot =
          (ab[1] * ac[2] - ab[2] * ac[1]) * normal[0] +
          (ab[2] * ac[0] - ab[0] * ac[2]) * normal[1] +
          (ab[0] * ac[1] - ab[1] * ac[0]) * normal[2];
        if (layer === 0 && Math.abs(dot) > 1e-12) reverseRim = dot < 0;
        const flip = layer === 0 ? dot < 0 : dot > 0;
        if (flip) {
          tri(a, c, b);
          tri(a, d, c);
        } else {
          tri(a, b, c);
          tri(a, c, d);
        }
      }
  const rim: number[] = [];
  for (let i = 0; i <= steps; i++) rim.push(i * (steps + 1));
  for (let j = 1; j <= steps; j++) rim.push(steps * (steps + 1) + j);
  for (let i = steps - 1; i >= 0; i--) rim.push(i * (steps + 1) + steps);
  for (let j = steps - 1; j > 0; j--) rim.push(j);
  if (reverseRim) rim.reverse();
  for (let i = 0; i < rim.length; i++) {
    const a = rim[i]!,
      b = rim[(i + 1) % rim.length]!;
    tri(grid[0]![a]!, grid[1]![a]!, grid[1]![b]!);
    tri(grid[0]![a]!, grid[1]![b]!, grid[0]![b]!);
  }
  return vertices;
}
export function sydneyBounds(vertices: number[]): {
  position: Vec3;
  dimensions: Vec3;
} {
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  vertices.forEach((v, i) => {
    const axis = i % 3;
    min[axis] = Math.min(min[axis]!, v);
    max[axis] = Math.max(max[axis]!, v);
  });
  return {
    position: min.map((v, i) => (v + max[i]!) / 2) as Vec3,
    dimensions: min.map((v, i) => Math.max(0.01, max[i]! - v)) as Vec3,
  };
}
