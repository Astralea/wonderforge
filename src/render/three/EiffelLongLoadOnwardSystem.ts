import { BatchedMesh, Group, Matrix4, Mesh, Quaternion, Vector3, type BufferGeometry, type Material, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Absolute rigid pose in the exported node's parent coordinate system. */
export interface EiffelOnwardRolePose {
  readonly role: string;
  readonly position?: readonly [number, number, number];
  readonly quaternion?: readonly [number, number, number, number];
}
export interface EiffelOnwardRenderSample {
  readonly seconds: number;
  readonly roles: readonly EiffelOnwardRolePose[];
}

/** Exact saved addon hardware/crew. The existing film system owns the cargo. */
export class EiffelLongLoadOnwardSystem {
  readonly group = new Group();
  readonly ready: Promise<void>;
  private readonly geometries = new Set<BufferGeometry>();
  private readonly materials = new Set<Material>();
  private readonly roles = new Map<string, { object: Object3D; position: Vector3; quaternion: Quaternion }>();
  private readonly batches: { mesh: BatchedMesh; sources: { mesh: Mesh; id: number }[] }[] = [];
  private readonly inverse = new Matrix4();
  private readonly matrix = new Matrix4();
  private sample: EiffelOnwardRenderSample = { seconds: 0, roles: [] };
  private disposed = false;
  private loaded = false;

  constructor(assetUrl: string, private readonly requiredRoles: readonly string[] = []) {
    this.group.name = 'eiffel-long-load-onward';
    this.group.userData.assetUrl = assetUrl;
    this.group.visible = false;
    this.ready = this.load(assetUrl).catch(error => { this.dispose(); throw error; });
  }
  private async load(url: string): Promise<void> {
    let bytes: ArrayBuffer;
    try {
      const response = await fetch(url);
      if (!response.ok) throw Error(`Missing onward Blender addon: ${url}`);
      bytes = await response.arrayBuffer();
    } catch (error) {
      if (typeof process === 'undefined' || !process.versions?.node) throw error;
      const { readFileSync } = await import('node:fs');
      const buffer = readFileSync(`public${url}`);
      bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }
    const asset = (await new GLTFLoader().parseAsync(bytes, '')).scene;
    // Collect ownership before validating roles so a malformed export also releases everything.
    asset.traverse(object => {
      if (!(object instanceof Mesh)) return;
      this.geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) this.materials.add(material);
    });
    if (this.disposed) { this.release(); return; }
    const cohorts = new Map<string, { material: Material; meshes: Mesh[] }>();
    asset.traverse(object => {
      const role = object.userData.wf_role;
      if (typeof role === 'string') {
        if (this.roles.has(role)) throw Error(`Duplicate onward role: ${role}`);
        this.roles.set(role, { object, position: object.position.clone(), quaternion: object.quaternion.clone() });
      }
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.length !== 1) throw Error('Onward export requires one material per source mesh');
      const material = materials[0]!;
      const key = `${material.uuid}:${Object.keys(object.geometry.attributes).sort().join(',')}:${!!object.geometry.index}`;
      const cohort = cohorts.get(key) ?? { material, meshes: [] as Mesh[] };
      cohort.meshes.push(object); cohorts.set(key, cohort);
    });
    for (const role of this.requiredRoles) if (!this.roles.has(role)) throw Error(`Missing onward role: ${role}`);
    this.group.add(asset);
    let triangles = 0, sourceMeshes = 0;
    for (const { material, meshes } of cohorts.values()) {
      const vertices = meshes.reduce((n, m) => n + m.geometry.attributes.position!.count, 0);
      const indices = meshes.reduce((n, m) => n + (m.geometry.index?.count ?? 0), 0);
      const batch = new BatchedMesh(meshes.length, vertices, indices, material);
      batch.name = `onward-export-batch-${this.batches.length}`;
      batch.frustumCulled = batch.sortObjects = false;
      batch.perObjectFrustumCulled = true;
      batch.castShadow = batch.receiveShadow = true;
      const sources = meshes.map(mesh => {
        mesh.visible = false;
        triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position!.count) / 3;
        sourceMeshes++;
        return { mesh, id: batch.addInstance(batch.addGeometry(mesh.geometry)) };
      });
      this.group.add(batch); this.batches.push({ mesh: batch, sources });
    }
    Object.assign(this.group.userData, { sourceTriangles: triangles, sourceMeshCount: sourceMeshes, batchCount: this.batches.length });
    this.loaded = true;
    this.update(this.sample);
  }
  update(sample: EiffelOnwardRenderSample): void {
    if (this.disposed) return;
    this.sample = sample;
    if (!this.loaded) return;
    for (const { object, position, quaternion } of this.roles.values()) {
      object.position.copy(position); object.quaternion.copy(quaternion);
    }
    for (const pose of sample.roles) {
      const role = this.roles.get(pose.role);
      if (!role) throw Error(`Unknown onward pose role: ${pose.role}`);
      if (pose.position) role.object.position.set(...pose.position);
      if (pose.quaternion) role.object.quaternion.set(...pose.quaternion);
    }
    this.group.updateMatrixWorld(true);
    this.inverse.copy(this.group.matrixWorld).invert();
    for (const batch of this.batches) for (const source of batch.sources) {
      batch.mesh.setMatrixAt(source.id, this.matrix.multiplyMatrices(this.inverse, source.mesh.matrixWorld));
    }
    this.group.userData.seconds = sample.seconds;
    this.group.userData.appliedRoles = sample.roles.map(pose => pose.role);
    this.group.userData.rolePoses = sample.roles.map(pose => { const object=this.roles.get(pose.role)!.object; return {role:pose.role,position:object.position.toArray(),quaternion:object.quaternion.toArray(),worldPosition:object.getWorldPosition(new Vector3()).toArray(),worldQuaternion:object.getWorldQuaternion(new Quaternion()).toArray()}; });
  }
  private release(): void {
    this.batches.forEach(batch => batch.mesh.dispose()); this.batches.length = 0;
    this.geometries.forEach(geometry => geometry.dispose()); this.geometries.clear();
    this.materials.forEach(material => material.dispose()); this.materials.clear();
    this.roles.clear(); this.group.clear();
  }
  dispose(): void { this.disposed = true; this.release(); this.group.removeFromParent(); }
}
