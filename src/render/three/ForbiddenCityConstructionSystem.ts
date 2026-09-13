import { BatchedMesh, Group, Matrix4, Mesh, Quaternion, Vector3, type BufferGeometry, type Material, type Object3D } from 'three';
import type { ForbiddenCityManifest, PalaceQuaternion, PalaceVec3 } from '../../data/forbiddenCityTypes';
import type { ForbiddenCityConstructionSample } from '../../engine/forbiddenCityConstruction';
import { disposeForbiddenCityRoot } from './forbiddenCityAssets';

interface InstanceRecord { readonly id: number; readonly source: Matrix4; readonly local?: Matrix4; readonly partId?: string; readonly role?: string }
interface Batch { readonly mesh: BatchedMesh; readonly records: readonly InstanceRecord[] }

const matrixFromPose = (pose: { readonly position: PalaceVec3; readonly quaternion: PalaceQuaternion }) => new Matrix4().compose(new Vector3(...pose.position), new Quaternion(...pose.quaternion), new Vector3(1, 1, 1));

function roleOwner(object: Object3D): string | undefined {
  for (let cursor: Object3D | null = object; cursor; cursor = cursor.parent) {
    const role = cursor.userData.wf_role;
    if (typeof role === 'string' && role) return role;
  }
  return undefined;
}

/** Exact source meshes batched by imported material. Structural instances are
 * transformed by pose * inverse(finalPose) * sourceMatrix; apparatus submeshes
 * retain their authored matrix relative to the nearest stable wf_role root. */
export class ForbiddenCityConstructionSystem {
  readonly group = new Group();
  private readonly batches: Batch[] = [];
  private readonly materials = new Set<Material>();
  private disposed = false;

  constructor(kit: Group, construction: Group, readonly manifest: ForbiddenCityManifest) {
    this.group.name = 'forbidden-city-construction';
    const parts = new Map(manifest.parts.map(part => [part.id, part]));
    const build = (sourceRoot: Group, kind: 'part' | 'role') => {
      sourceRoot.updateMatrixWorld(true);
      const records = new Map<Material, { mesh: Mesh; id: string; source: Matrix4; local?: Matrix4 }[]>();
      sourceRoot.traverse(object => {
        if (!(object instanceof Mesh)) return;
        if (Array.isArray(object.material)) throw Error(`Forbidden City ${kind} ${object.name} requires one material`);
        const id = kind === 'part' ? String(object.userData.wf_part ?? '') : roleOwner(object);
        if (!id) throw Error(`Forbidden City ${kind} mesh ${object.name} lacks stable identity`);
        if (kind === 'part' && !parts.has(id)) throw Error(`Forbidden City kit mesh maps unknown part ${id}`);
        let local: Matrix4 | undefined;
        if (kind === 'role') {
          let owner: Object3D | null = object;
          while (owner && owner.userData.wf_role !== id) owner = owner.parent;
          if (!owner) throw Error(`Forbidden City role ${id} has no owner`);
          local = owner.matrixWorld.clone().invert().multiply(object.matrixWorld);
        }
        const list = records.get(object.material) ?? [];
        list.push({ mesh: object, id, source: object.matrixWorld.clone(), local }); records.set(object.material, list);
      });
      for (const [material, sources] of records) {
        const unique = [...new Map(sources.map(source => [source.mesh.geometry.uuid, source.mesh.geometry])).values()];
        const maxVertices = unique.reduce((sum, geometry) => sum + geometry.getAttribute('position').count, 0);
        const maxIndices = unique.reduce((sum, geometry) => sum + (geometry.index?.count ?? 0), 0);
        const mesh = new BatchedMesh(sources.length, maxVertices, maxIndices, material);
        const geometryIds = new Map<BufferGeometry, number>();
        for (const geometry of unique) geometryIds.set(geometry, mesh.addGeometry(geometry));
        const instances = sources.map(source => {
          const id = mesh.addInstance(geometryIds.get(source.mesh.geometry)!);
          mesh.setVisibleAt(id, false);
          return { id, source: source.source, local: source.local, ...(kind === 'part' ? { partId: source.id } : { role: source.id }) };
        });
        mesh.name = `forbidden-city-${kind}-batch-${this.batches.length}`;
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.perObjectFrustumCulled = true; mesh.sortObjects = false;
        this.materials.add(material); this.batches.push({ mesh, records: instances }); this.group.add(mesh);
      }
    };
    build(kit, 'part'); build(construction, 'role');
    disposeForbiddenCityRoot(kit, false); disposeForbiddenCityRoot(construction, false);
    if (this.batches.length > 90) throw Error(`Forbidden City construction exceeds 90 draw batches: ${this.batches.length}`);
    this.group.userData.batchCount = this.batches.length;
    this.group.userData.partCount = manifest.parts.length;
  }

  update(frame: ForbiddenCityConstructionSample): void {
    if (!Number.isFinite(frame.seconds)) throw Error('Forbidden City construction time must be finite');
    const parts = new Map(frame.parts.map(part => [part.partId, part]));
    const roles = new Map(frame.roles.map(role => [role.role, role]));
    const finalInverse = new Map(this.manifest.parts.map(part => [part.id, matrixFromPose({ position: part.finalPosition, quaternion: part.finalRotation }).invert()]));
    for (const batch of this.batches) {
      for (const record of batch.records) {
        if (record.partId) {
          const state = parts.get(record.partId);
          batch.mesh.setVisibleAt(record.id, !!state && state.phase !== 'queued');
          if (state && state.phase !== 'queued') batch.mesh.setMatrixAt(record.id, matrixFromPose(state.pose).multiply(finalInverse.get(record.partId)!).multiply(record.source));
        } else {
          const state = roles.get(record.role!);
          batch.mesh.setVisibleAt(record.id, !!state?.visible);
          if (state?.visible) batch.mesh.setMatrixAt(record.id, matrixFromPose(state.pose).multiply(record.local!));
        }
      }
    }
    this.group.userData.seconds = frame.seconds;
    this.group.userData.activeCount = frame.activeCount;
    this.group.userData.seatedCount = frame.seatedCount;
    this.group.userData.admission = frame.admission;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const batch of this.batches) { batch.mesh.dispose(); batch.mesh.geometry.dispose(); }
    for (const material of this.materials) material.dispose();
    this.group.clear(); this.batches.length = 0;
  }
}
