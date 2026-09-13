import { hasMajorEquipmentShadow } from './eiffelEquipmentShadow';
import { BatchedMesh, Group, Matrix4, Mesh, Quaternion, Vector3, type BufferGeometry, type Material, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { EiffelSecondFloorRelaySample } from '../../engine/eiffelSecondFloorRelay';

/** Saved relay equipment only. The transported stair remains owned by EiffelLongLoadFilmSystem. */
export class EiffelSecondFloorRelaySystem {
  readonly group = new Group();
  readonly ready: Promise<void>;
  private readonly roles = new Map<string, Object3D>();
  private readonly batches: { mesh: BatchedMesh; majorShadow: boolean; sources: { mesh: Mesh; id: number }[] }[] = [];
  private readonly geometries = new Set<BufferGeometry>();
  private readonly materials = new Set<Material>();
  private readonly inverse = new Matrix4();
  private readonly matrix = new Matrix4();
  private readonly initialQuaternions = new Map<Object3D, Quaternion>();
  private sample?: EiffelSecondFloorRelaySample;
  private disposed = false;
  private detailedShadows = true;

  constructor(readonly assetUrl = '/artifacts/eiffel-second-floor-relay-2026-09-08/model/second-floor-relay.glb') {
    this.group.name = 'eiffel-second-floor-relay-candidate';
    this.group.visible = false;
    this.ready = this.load().catch(error => { this.dispose(); throw error; });
  }

  private async bytes(): Promise<ArrayBuffer> {
    try { const response = await fetch(this.assetUrl); if (!response.ok) throw Error(`Missing relay asset ${this.assetUrl}`); return await response.arrayBuffer(); }
    catch (error) { if (typeof process === 'undefined' || !process.versions?.node) throw error; const { readFileSync } = await import('node:fs'); const path=this.assetUrl.startsWith('/models/')?`public${this.assetUrl}`:this.assetUrl.startsWith('/artifacts/')?this.assetUrl.slice(1):this.assetUrl;const b = readFileSync(path); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); }
  }

  private async load(): Promise<void> {
    const asset = (await new GLTFLoader().parseAsync(await this.bytes(), '')).scene;
    const cohorts = new Map<string, { material: Material; meshes: Mesh[] }>();
    const materialCohorts = new Set<string>();
    asset.traverse(object => {
      const role = String(object.userData.wf_role ?? '');
      if (role) { this.roles.set(role, object); this.initialQuaternions.set(object, object.quaternion.clone()); }
      if (!(object instanceof Mesh)) return;
      this.geometries.add(object.geometry);
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.length !== 1) throw Error('Relay export must use one material per mesh');
      this.materials.add(materials[0]!);
      const serialized = materials[0]!.toJSON() as Record<string, unknown>;
      delete serialized.metadata; delete serialized.uuid; delete serialized.name;
      const materialKey = JSON.stringify(serialized);
      materialCohorts.add(materialKey);
      const key = `${materialKey}:${Object.keys(object.geometry.attributes).sort().join(',')}:${!!object.geometry.index}`;
      const cohort = cohorts.get(key) ?? { material: materials[0]!, meshes: [] as Mesh[] };
      cohort.meshes.push(object); cohorts.set(key, cohort);
    });
    for (const role of ['relay-trolley', 'relay-moving-sheave', 'relay-drum', 'relay-fixed-sheave', 'relay-upper-cart', 'relay-clevis']) if (!this.roles.has(role)) throw Error(`Relay export missing ${role}`);
    if (this.disposed) { asset.traverse(o => { if (o instanceof Mesh) o.geometry.dispose(); }); return; }
    this.group.add(asset);
    for (const { material, meshes } of cohorts.values()) {
      const batch = new BatchedMesh(meshes.length, meshes.reduce((n,m)=>n+m.geometry.attributes.position!.count,0), meshes.reduce((n,m)=>n+(m.geometry.index?.count??0),0), material);
      batch.name = `second-floor-relay-batch-${this.batches.length}`; batch.frustumCulled = batch.sortObjects = false; batch.perObjectFrustumCulled = true; batch.castShadow = batch.receiveShadow = true;
      const sources = meshes.map(mesh => { const id=batch.addInstance(batch.addGeometry(mesh.geometry)); mesh.visible=false; return {mesh,id}; });
      this.group.add(batch); this.batches.push({mesh:batch,majorShadow:hasMajorEquipmentShadow(meshes),sources});
    }
    this.group.userData.sourceMeshCount = [...cohorts.values()].reduce((n,c)=>n+c.meshes.length,0);
    this.group.userData.batchCount = this.batches.length;
    this.group.userData.materialCohortCount = materialCohorts.size;
    this.setShadowDetail(this.detailedShadows);
    if (this.sample) this.update(this.sample);
  }

  /** Wide short-film views keep mixed/support and payload batches intact. */
  setShadowDetail(detailed: boolean): void {
    this.detailedShadows = detailed;
    for (const batch of this.batches) batch.mesh.castShadow = detailed || batch.majorShadow;
    this.group.userData.shadowDetail = detailed ? 'source' : 'major-equipment';
  }

  update(sample: EiffelSecondFloorRelaySample): void {
    this.sample = sample; if (this.disposed || this.batches.length === 0) return;
    for (const pose of sample.hardwareRoles) { const object=this.roles.get(pose.role); if(!object) continue; if(pose.position)object.position.set(...pose.position); if(pose.quaternion)object.quaternion.copy(this.initialQuaternions.get(object)!).multiply(new Quaternion(...pose.quaternion)); }
    this.group.updateMatrixWorld(true); this.inverse.copy(this.group.matrixWorld).invert();
    for(const batch of this.batches)for(const source of batch.sources)batch.mesh.setMatrixAt(source.id,this.matrix.multiplyMatrices(this.inverse,source.mesh.matrixWorld));
    Object.assign(this.group.userData,{seconds:sample.seconds,phase:sample.phase,partId:sample.partId,seated:false,driveAdmitted:sample.secondHoist.driveAdmitted});
  }

  roleWorldPosition(role:string): readonly [number,number,number] | null { const object=this.roles.get(role); if(!object)return null; object.updateWorldMatrix(true,false); const p=object.getWorldPosition(new Vector3()); return [p.x,p.y,p.z]; }
  dispose():void { if(this.disposed)return; this.disposed=true; for(const b of this.batches)b.mesh.dispose(); this.batches.length=0; this.geometries.forEach(g=>g.dispose()); this.materials.forEach(m=>m.dispose()); this.roles.clear(); this.group.clear(); this.group.removeFromParent(); }
}
