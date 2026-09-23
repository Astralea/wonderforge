import {
  BoxGeometry,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import {
  SYDNEY_SAILS,
  sydneyPatchVertices,
  SYDNEY_FINISH_DETAILS,
} from '../../data/sydneyShells';
import type {
  SydneyConstructionPlan,
  SydneyPart,
  SydneyPartKind,
} from '../../data/sydneyTypes';
import {
  activeSydneyOperationsAt,
  type ActiveSydneyOperation,
} from '../../engine/sydneyConstruction';
import type { MaterialLibrary } from './MaterialLibrary';
import { injectMaterialRecipe } from './proceduralDetail';
export { createSailGeometry } from './sydneySails';

export function createSydneyPartGeometry(
  _kind: SydneyPartKind,
): BufferGeometry {
  // Unit form-bay proxy only; roof production always uses the shared surface.
  return new BoxGeometry(1, 1, 1);
}
export function sydneyPartVertices(part: SydneyPart): number[] {
  if (part.authoredVertices) return part.authoredVertices;
  if (part.surface)
    return sydneyPatchVertices(SYDNEY_SAILS[part.sail]!, part.surface);
  const box = new BoxGeometry(...part.dimensions).toNonIndexed();
  const a = box.getAttribute('position');
  const result: number[] = [];
  for (let i = 0; i < a.count; i++)
    result.push(
      a.getX(i) + part.finalPosition[0],
      a.getY(i) + part.finalPosition[1],
      a.getZ(i) + part.finalPosition[2],
    );
  box.dispose();
  return result;
}
interface Batch {
  mesh: Mesh;
  ends: Array<{ t: number; count: number }>;
}
/** Three immutable seated batches + a bounded dynamic buffer. Geometry and
 * support bounds have one authority; no async replacement or footprint swap. */
export class SydneyStoneSystem {
  readonly group = new Group();
  readonly ready = Promise.resolve();
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: MeshStandardMaterial[] = [];
  private readonly batches: Batch[] = [];
  private readonly active: Record<'rib' | 'sail', Mesh>;
  private readonly vertices = new Map<string, number[]>();
  private readonly normals = new Map<string, number[]>();
  private readonly tile: MeshStandardMaterial;
  private readonly glass: MeshStandardMaterial;
  constructor(
    private readonly plan: SydneyConstructionPlan,
    _library: MaterialLibrary,
  ) {
    this.group.name = 'sydney-physical-stone-system';
    const granite = new MeshStandardMaterial({
      color: '#c3aaa0',
      roughness: 0.86,
    });
    injectMaterialRecipe(granite, 'granite');
    const concrete = new MeshStandardMaterial({
      color: '#c7beb0',
      roughness: 0.78,
      side: DoubleSide,
    });
    this.tile = new MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.42,
      side: DoubleSide,
    });
    injectMaterialRecipe(this.tile, 'hoganas-tile');
    this.materials.push(granite, concrete, this.tile);
    const mats = { block: granite, rib: concrete, sail: this.tile };
    for (const kind of ['block', 'rib', 'sail'] as const) {
      const seatTime = (p: SydneyPart) =>
        p.start + p.duration * (p.graph === 'shell' ? 0.9 : 1);
      const parts = plan.parts
        .filter((p) => p.kind === kind)
        .sort((a, b) => seatTime(a) - seatTime(b));
      const positions: number[] = [],
        colors: number[] = [],
        normals: number[] = [];
      const ends: Batch['ends'] = [];
      for (const p of parts) {
        const vertices = sydneyPartVertices(p);
        this.vertices.set(p.id, vertices);
        const temp = new BufferGeometry();
        temp.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        temp.computeVertexNormals();
        const normal = Array.from(temp.getAttribute('normal').array);
        temp.dispose();
        if (p.surface) {
          const s = SYDNEY_SAILS[p.sail]!;
          const centre = new Vector3(
            ...s.sphereCenters[p.surface.side === -1 ? 0 : 1],
          );
          // First two 2x2 grids are outer/inner skins; edge rims retain face normals.
          for (let i = 0; i < 48; i++) {
            const n = new Vector3(
              vertices[i * 3],
              vertices[i * 3 + 1],
              vertices[i * 3 + 2],
            )
              .sub(centre)
              .normalize()
              .multiplyScalar(i < 24 ? 1 : -1);
            normal[i * 3] = n.x;
            normal[i * 3 + 1] = n.y;
            normal[i * 3 + 2] = n.z;
          }
        }
        this.normals.set(p.id, normal);
        for (const n of normal) normals.push(n);
        const authoredFlank = p.kind === 'sail' && !!p.authoredVertices;
        const color = new Color(
          authoredFlank
            ? '#ffffff'
            : p.kind === 'sail'
            ? p.bay % 3 === 0
              ? '#fffef9'
              : '#efede4'
            : '#ffffff',
        );
        // Partitioning a continuous authored flank into crane loads must not
        // turn its surface into random per-load patches in the finished film.
        if (!authoredFlank) color.multiplyScalar(1 + p.colorVariation * 0.07);
        for (const v of vertices) positions.push(v);
        for (let i = 0; i < vertices.length / 3; i++)
          colors.push(color.r, color.g, color.b);
        ends.push({ t: seatTime(p), count: positions.length / 3 });
      }
      const geometry = this.geometry(positions);
      geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
      geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
      mats[kind].vertexColors = true;
      const mesh = new Mesh(geometry, mats[kind]);
      mesh.name = `sydney-parts-${kind}`;
      mesh.castShadow = true;
      mesh.receiveShadow = kind !== 'sail';
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.batches.push({ mesh, ends });
    }
    const activeMaterial = (mat: MeshStandardMaterial) => {
      const clone = mat.clone();
      clone.vertexColors = false;
      this.materials.push(clone);
      return clone;
    };
    const activeMesh = (kind: 'rib' | 'sail') => {
      const largestPart = Math.max(
        216,
        ...plan.parts
          .filter((p) => p.kind === kind)
          .map((p) => this.vertices.get(p.id)!.length / 3),
      );
      const geometry = this.geometry(
        new Array(plan.maxActive * largestPart * 3).fill(0),
      );
      const mesh = new Mesh(geometry, activeMaterial(mats[kind]));
      mesh.name = `sydney-${kind}-active`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      return mesh;
    };
    this.active = { rib: activeMesh('rib'), sail: activeMesh('sail') };
    this.glass = new MeshStandardMaterial({
      color: '#243d44',
      roughness: 0.26,
      metalness: 0.32,
      side: DoubleSide,
      emissive: '#ffbf69',
      emissiveIntensity: 0,
    });
    const bronze = new MeshStandardMaterial({
      color: '#655948',
      roughness: 0.55,
      metalness: 0.4,
    });
    this.materials.push(this.glass, bronze);
    // Blender authored folded glazing, frames and architectural detail.
    // Per-material batches retain each record's explicit reveal boundary.
    const detailMaterials = {
      glass: this.glass,
      bronze,
      concrete,
      granite,
      tile: this.tile,
    };
    for (const material of [
      'glass',
      'bronze',
      'concrete',
      'granite',
      'tile',
    ] as const) {
      const positions: number[] = [];
      const ends: Batch['ends'] = [];
      for (const detail of SYDNEY_FINISH_DETAILS.filter(
        (d) => d.material === material,
      ).sort((a, b) => a.reveal - b.reveal)) {
        // Avoid spread argument limits on authored meshes.
        for (const value of detail.vertices) positions.push(value);
        ends.push({ t: detail.reveal, count: positions.length / 3 });
      }
      if (!positions.length) continue;
      const geometry = this.geometry(positions);
      if (detailMaterials[material].vertexColors)
        geometry.setAttribute(
          'color',
          new Float32BufferAttribute(new Array(positions.length).fill(1), 3),
        );
      const mesh = new Mesh(geometry, detailMaterials[material]);
      mesh.name = `sydney-authored-${material}`;
      mesh.castShadow = material !== 'glass';
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.batches.push({ mesh, ends });
    }
  }
  private geometry(vertices: number[]): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    g.computeVertexNormals();
    this.geometries.push(g);
    return g;
  }
  update(t: number, emissive = 0): ActiveSydneyOperation[] {
    this.tile.emissive.set('#d8e9ff');
    this.tile.emissiveIntensity = emissive * 0.24;
    this.glass.emissiveIntensity = emissive * 0.72;
    for (const { mesh, ends } of this.batches) {
      let lo = 0,
        hi = ends.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (ends[mid]!.t <= t) lo = mid + 1;
        else hi = mid;
      }
      mesh.geometry.setDrawRange(0, lo ? ends[lo - 1]!.count : 0);
    }
    const operations = activeSydneyOperationsAt(this.plan, t);
    for (const kind of ['rib', 'sail'] as const) {
      const mesh = this.active[kind],
        attribute = mesh.geometry.getAttribute('position'),
        normalAttribute = mesh.geometry.getAttribute('normal');
      let cursor = 0;
      for (const op of operations) {
        if (op.part.kind !== kind) continue;
        const vertices = this.vertices.get(op.part.id)!,
          normals = this.normals.get(op.part.id)!;
        const delta = new Vector3(...op.state.position).sub(
          new Vector3(...op.part.finalPosition),
        );
        for (let i = 0; i < vertices.length; i += 3) {
          attribute.setXYZ(
            cursor,
            vertices[i]! + delta.x,
            vertices[i + 1]! + delta.y,
            vertices[i + 2]! + delta.z,
          );
          normalAttribute.setXYZ(
            cursor++,
            normals[i]!,
            normals[i + 1]!,
            normals[i + 2]!,
          );
        }
      }
      attribute.needsUpdate = true;
      normalAttribute.needsUpdate = true;
      mesh.geometry.setDrawRange(0, cursor);
    }
    return operations;
  }
  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
  }
}
