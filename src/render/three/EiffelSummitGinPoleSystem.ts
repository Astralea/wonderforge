import { CylinderGeometry, SphereGeometry, MeshStandardMaterial, Quaternion, Vector3, BatchedMesh, Group, Matrix4, Mesh, type BufferGeometry, type Material, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { sampleEiffelSummitGinPoleClimb, eiffelSummitGinPoleRoleTransforms } from '../../engine/eiffelSummitGinPoleClimb';
import { sampleEiffelSummitOutboardEndpoint, sampleEiffelSummitOutboardAccess, sampleEiffelSummitOutboardCrankWorker } from '../../engine/eiffelSummitOutboardWorker';
import { sampleEiffelSummitOperationAccess } from '../../engine/eiffelSummitOperationAccess';
import { sampleEiffelSummitWorkerAccess } from '../../engine/eiffelSummitWorkerAccess';
import { sampleEiffelSummitCrankWorker, eiffelSummitWorkerRoles } from '../../engine/eiffelSummitWorker';

/** Isolated saved-Blender climbing-rig candidate; never installs itself in the film. */
export class EiffelSummitGinPoleSystem {
  readonly group = new Group();
  readonly ready: Promise<void>;
  private readonly geometries = new Set<BufferGeometry>();
  private readonly materials = new Set<Material>();
  private readonly roles = new Map<string, Object3D>();
  private readonly batches: { mesh: BatchedMesh; sources: { mesh: Mesh; id: number }[] }[] = [];
  private readonly inverse = new Matrix4();
  private readonly matrix = new Matrix4();
  private seconds = 0;
  private disposed = false;
  constructor(private readonly assetUrl = '/artifacts/eiffel-gin-pole-climb-2026-09-08/model/summit-gin-pole-climb.glb', private readonly mobile = false) {
    this.group.name = 'eiffel-summit-gin-pole-candidate'; this.group.visible = false;
    this.ready = this.load().catch(error => { this.dispose(); throw error; });
  }
  private async load() {
    let bytes: ArrayBuffer;
    try {
      const response = await fetch(this.assetUrl);
      if (!response.ok) throw Error('Missing saved Blender summit gin-pole candidate');
      bytes = await response.arrayBuffer();
    } catch (error) {
      if (typeof process === 'undefined' || !process.versions?.node) throw error;
      const { readFileSync } = await import('node:fs');
      const buffer = readFileSync(this.assetUrl.startsWith('/artifacts/') ? this.assetUrl.slice(1) : `public${this.assetUrl}`);
      bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }
    const asset = (await new GLTFLoader().parseAsync(bytes, '')).scene;
    const workerUrl = `/models/eiffel-long-load-first-floor/onward${this.mobile ? '-mobile' : ''}.glb`;
    let workerBytes: ArrayBuffer;
    try { const response = await fetch(workerUrl); if (!response.ok) throw Error('Missing worker source'); workerBytes = await response.arrayBuffer(); }
    catch(error) { if(typeof process==='undefined'||!process.versions?.node) throw error; const {readFileSync}=await import('node:fs'); const b=readFileSync(`public${workerUrl}`); workerBytes=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength); }
    const workers=(await new GLTFLoader().parseAsync(workerBytes,'')).scene;
    const selected: Object3D[]=[];
    workers.traverse(o=>{if(String(o.userData.wf_role??'').startsWith('pusher-'))selected.push(o);});
    for(const o of selected) asset.add(o);
    const retainedG=new Set<BufferGeometry>(),retainedM=new Set<Material>();
    asset.traverse(o=>{if(o instanceof Mesh){retainedG.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>retainedM.add(m));}});
    workers.traverse(o=>{if(o instanceof Mesh){if(!retainedG.has(o.geometry))o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(!retainedM.has(m))m.dispose();});}});
    const ropeMaterial=new MeshStandardMaterial({color:0x796245,roughness:1});
    const ropeSample=sampleEiffelSummitGinPoleClimb(0).drive.rope;
    const ropeGeometry=new CylinderGeometry(ropeSample.radius,ropeSample.radius,1,8);
    this.geometries.add(ropeGeometry);this.materials.add(ropeMaterial);
    const rope=new Mesh(ropeGeometry,ropeMaterial);rope.name='climbing-rope-span';rope.userData.wf_role='climbing-rope-span';asset.add(rope);
    const fixedRope=new Group();fixedRope.name='climbing-rope-fixed';fixedRope.userData.wf_role='climbing-rope-fixed';asset.add(fixedRope);
    // Exact sampler chords, with shared round joints. No spline changes tangent
    // points, and fixed reeving geometry is allocated only once.
    const jointGeometry=new SphereGeometry(ropeSample.radius,8,4);this.geometries.add(jointGeometry);
    ropeSample.fixedPoints.forEach((point,index)=>{
      const joint=new Mesh(jointGeometry,ropeMaterial);joint.name=`climbing-rope-joint-${index}`;joint.position.set(...point);fixedRope.add(joint);
      if(index===0)return;
      const segment=new Mesh(ropeGeometry,ropeMaterial);segment.name=`climbing-rope-fixed-span-${index-1}`;
      const a=new Vector3(...ropeSample.fixedPoints[index-1]!),b=new Vector3(...point),delta=b.clone().sub(a);
      segment.position.copy(a.add(b).multiplyScalar(.5));segment.quaternion.setFromUnitVectors(new Vector3(0,1,0),delta.clone().normalize());segment.scale.y=delta.length();fixedRope.add(segment);
    });
    const cohorts = new Map<string, { material: Material; meshes: Mesh[] }>();
    asset.traverse(object => {
      if (object.userData.wf_role) this.roles.set(object.userData.wf_role, object);
      if (!(object instanceof Mesh)) return;
      this.geometries.add(object.geometry);
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(m => this.materials.add(m));
      if (materials.length !== 1) throw Error('Gin-pole export must use one material per mesh');
      const material = materials[0]!;
      const key = `${material.uuid}:${Object.keys(object.geometry.attributes).sort().join(',')}:${!!object.geometry.index}`;
      const cohort = cohorts.get(key) ?? { material, meshes: [] as Mesh[] };
      cohort.meshes.push(object); cohorts.set(key, cohort);
    });
    if (this.disposed) { this.release(); return; }
    for (const role of ['moving-pole', 'climb-input-crank', 'guide-3-north-leaf', 'pusher-head']) {
      if (!this.roles.has(role)) throw Error(`Missing Blender gin-pole node ${role}`);
    }
    this.group.add(asset);
    for (const { material, meshes } of cohorts.values()) {
      const vertices = meshes.reduce((n, m) => n + m.geometry.attributes.position!.count, 0);
      const indices = meshes.reduce((n, m) => n + (m.geometry.index?.count ?? 0), 0);
      const batch = new BatchedMesh(meshes.length, vertices, indices, material);
      batch.name = `summit-gin-pole-batch-${this.batches.length}`;
      batch.frustumCulled = batch.sortObjects = false;
      batch.perObjectFrustumCulled = true;
      batch.castShadow = batch.receiveShadow = true;
      const sources = meshes.map(mesh => { mesh.visible = false; return { mesh, id: batch.addInstance(batch.addGeometry(mesh.geometry)) }; });
      this.group.add(batch); this.batches.push({ mesh: batch, sources });
    }
    this.update(this.seconds);
  }
  update(seconds: number) {
    if (this.disposed) return;
    this.seconds = seconds;
    const s = sampleEiffelSummitGinPoleClimb(seconds);
    for(const t of eiffelSummitGinPoleRoleTransforms(s)){
      const o=this.roles.get(t.role);if(!o)continue;
      if(t.position)o.position.set(...t.position);if(t.quaternion)o.quaternion.set(...t.quaternion);
    }
    for(const t of eiffelSummitWorkerRoles(sampleEiffelSummitCrankWorker(s.drive.crankAngle))){
      const o=this.roles.get(`pusher-${t.role}`);if(o){o.position.set(...t.position);o.quaternion.set(...t.quaternion);}
    }
    const rope=this.roles.get('climbing-rope-span');
    if(rope){const a=new Vector3(...s.drive.fairlead),b=new Vector3(...s.drive.movingLug),v=b.clone().sub(a);rope.position.copy(a.add(b).multiplyScalar(.5));rope.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0,1,0),v.clone().normalize()));rope.scale.set(1,v.length(),1);}
    this.group.updateMatrixWorld(true); this.inverse.copy(this.group.matrixWorld).invert();
    for (const batch of this.batches) for (const source of batch.sources) {
      batch.mesh.setMatrixAt(source.id, this.matrix.multiplyMatrices(this.inverse, source.mesh.matrixWorld));
    }
    this.group.userData.seconds = s.seconds;
    this.group.userData.rope={radius:s.drive.rope.radius,fixedLength:s.drive.rope.fixedLength,deployedLength:s.drive.rope.deployedLength,freeLength:s.drive.rope.freeLength};
    this.group.userData.crankAngle = s.drive.crankAngle; this.group.userData.phase=s.phase; this.group.userData.candidate=true;
  }
  /** Opt-in access preview; the existing 70-second mechanism API is unchanged. */
  updateAccess(seconds: number) {
    this.update(0);
    if(this.disposed)return;
    const sample=sampleEiffelSummitWorkerAccess(seconds);
    for(const t of eiffelSummitWorkerRoles(sample.targets)){
      const object=this.roles.get(`pusher-${t.role}`);if(object){object.position.set(...t.position);object.quaternion.set(...t.quaternion);}
    }
    this.group.updateMatrixWorld(true);this.inverse.copy(this.group.matrixWorld).invert();
    for(const batch of this.batches)for(const source of batch.sources)batch.mesh.setMatrixAt(source.id,this.matrix.multiplyMatrices(this.inverse,source.mesh.matrixWorld));
    this.group.userData.access={seconds:sample.seconds,phase:sample.phase,contacts:sample.contacts,moving:sample.moving};
  }
  /** New extended-control asset only: access followed by the mechanism preview. */
  updateOutboardSequence(seconds: number) {
    if(!this.assetUrl.includes('summit-cargo-rig.glb'))throw Error('Outboard worker requires the new extended-control asset');
    const mechanicalSeconds=Math.max(0,seconds-80);this.update(mechanicalSeconds);if(this.disposed)return;
    const access=sampleEiffelSummitOutboardAccess(Math.min(80,seconds));
    const targets=seconds<=80?access.targets:sampleEiffelSummitOutboardCrankWorker(sampleEiffelSummitGinPoleClimb(mechanicalSeconds).drive.crankAngle);
    for(const t of eiffelSummitWorkerRoles(targets)){const object=this.roles.get(`pusher-${t.role}`);if(object){object.position.set(...t.position);object.quaternion.set(...t.quaternion);}}
    const jib=this.roles.get('cargo-jib-pitch');if(jib)jib.rotation.set(0,0,78*Math.PI/180);
    this.group.updateMatrixWorld(true);this.inverse.copy(this.group.matrixWorld).invert();
    for(const batch of this.batches)for(const source of batch.sources)batch.mesh.setMatrixAt(source.id,this.matrix.multiplyMatrices(this.inverse,source.mesh.matrixWorld));
    this.group.userData.outboard={seconds,phase:seconds<=80?access.phase:'mechanism-demonstration',contacts:seconds<=80?access.contacts:['foot-0','foot-1','hand-1','crank-grip']};
  }
  /** Static-pole endpoint contact review; not a claim of a completed handoff. */
  updateOutboardEndpoint(angle: number) {
    if(!this.assetUrl.includes('summit-cargo-rig.glb'))throw Error('Outboard worker requires the new extended-control asset');
    this.update(0);if(this.disposed)return;
    for(const t of eiffelSummitWorkerRoles(sampleEiffelSummitOutboardEndpoint(angle))){const o=this.roles.get(`pusher-${t.role}`);if(o){o.position.set(...t.position);o.quaternion.set(...t.quaternion);}}
    const input=this.roles.get('climb-input-crank');if(input)input.rotation.set(angle,0,0);
    for(const role of['climb-output-gear','climb-winch-drum','climb-ratchet-wheel']){const o=this.roles.get(role);if(o)o.rotation.set(-angle/2,0,0);}
    const jib=this.roles.get('cargo-jib-pitch');if(jib)jib.rotation.set(0,0,78*Math.PI/180);
    this.group.updateMatrixWorld(true);this.inverse.copy(this.group.matrixWorld).invert();for(const b of this.batches)for(const source of b.sources)b.mesh.setMatrixAt(source.id,this.matrix.multiplyMatrices(this.inverse,source.mesh.matrixWorld));
    this.group.userData.endpoint={angle,scope:'Upper control contact check; access transfer pending'};
  }
  /** Revised saved-operation-asset access only; no cargo or guide operation implied. */
  updateOperationAccess(seconds: number) {
    if (!this.assetUrl.includes('summit-operation-rig.glb')) {
      throw Error('Operation access requires the revised saved operation rig');
    }
    this.update(0);
    if (this.disposed) return;
    const sample = sampleEiffelSummitOperationAccess(seconds);
    for (const pose of eiffelSummitWorkerRoles(sample.targets)) {
      const object = this.roles.get(`pusher-${pose.role}`);
      if (object) { object.position.set(...pose.position); object.quaternion.set(...pose.quaternion); }
    }
    const jib = this.roles.get('cargo-jib-pitch');
    if (jib) jib.rotation.set(0, 0, 78 * Math.PI / 180);
    this.group.updateMatrixWorld(true);
    this.inverse.copy(this.group.matrixWorld).invert();
    for (const batch of this.batches) for (const source of batch.sources) {
      batch.mesh.setMatrixAt(source.id, this.matrix.multiplyMatrices(this.inverse, source.mesh.matrixWorld));
    }
    this.group.userData.access = {
      seconds: sample.seconds, phase: sample.phase, contacts: sample.contacts,
      moving: sample.moving, scope: 'Bottom-rung access to stopped crank; arrival and guide operation omitted',
    };
  }
  private release() {
    this.geometries.forEach(g => g.dispose()); this.geometries.clear();
    this.materials.forEach(m => m.dispose()); this.materials.clear();
    this.batches.forEach(b => b.mesh.dispose()); this.batches.length = 0;
    this.roles.clear(); this.group.clear();
  }
  dispose() { this.disposed = true; this.release(); this.group.removeFromParent(); }
}
