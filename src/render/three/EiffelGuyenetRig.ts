import * as THREE from 'three';
import { EIFFEL_GUYENET as D, eiffelGuyenetStationPoint, sampleEiffelGuyenetClimb, sampleEiffelGuyenetLuff, type EiffelGuyenetDescription } from '../../engine/eiffelGuyenet';

/** Articulates the original Blender asset. No structural mesh changes scale. */
export class EiffelGuyenetRig {
  readonly group: THREE.Group;
  readonly roles = new Map<string, THREE.Object3D>();
  private readonly batches: { mesh: THREE.BatchedMesh; sources: THREE.Mesh[] }[] = [];
  private readonly inverse = new THREE.Matrix4();
  private readonly relative = new THREE.Matrix4();
  constructor(asset: THREE.Group, private readonly description: EiffelGuyenetDescription = D,
    private readonly workingSector: readonly [number,number] = [Math.PI/3,Math.PI*2/3]) {
    this.group = asset;
    asset.traverse(o => {
      if (typeof o.userData.wf_role === 'string') this.roles.set(o.userData.wf_role, o);
      if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    for (const role of ['carriage','rotor','jib','slider','tie-left','tie-right','head-anchor','main-screw','safety-base','safety-heads'])
      if (!this.roles.has(role)) throw new Error(`Guyenet asset lacks ${role}`);
    this.createBatches();
    this.update(0, 8.5, Math.PI/2);
  }
  private createBatches() {
    const cohorts = new Map<THREE.Material, THREE.Mesh[]>();
    this.group.traverse(object => {
      if (!(object instanceof THREE.Mesh) || object instanceof THREE.BatchedMesh) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        const sources = cohorts.get(material) ?? []; sources.push(object); cohorts.set(material, sources);
      }
    });
    for (const [material, sources] of cohorts) {
      if (sources.some(source => Array.isArray(source.material))) throw new Error('Guyenet multi-material mesh requires authored groups');
      const geometries = [...new Set(sources.map(source => source.geometry))];
      const mesh = new THREE.BatchedMesh(sources.length,
        geometries.reduce((sum, geometry) => sum + geometry.getAttribute('position').count, 0),
        geometries.reduce((sum, geometry) => sum + (geometry.index?.count ?? 0), 0), material);
      const ids = new Map(geometries.map(geometry => [geometry, mesh.addGeometry(geometry)]));
      for (const source of sources) {
        const instance = mesh.addInstance(ids.get(source.geometry)!);
        source.userData.wf_batch_instance = instance;
        source.visible = false;
      }
      mesh.name = `guyenet-batch-${this.batches.length}`;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false; mesh.perObjectFrustumCulled = true; mesh.sortObjects = false;
      this.batches.push({ mesh, sources }); this.group.add(mesh);
    }
    this.group.userData.sourceMeshes = this.batches.reduce((sum, batch) => sum + batch.sources.length, 0);
    this.group.userData.materialBatches = this.batches.length;
  }
  private syncBatches() {
    this.group.updateMatrixWorld(true); this.inverse.copy(this.group.matrixWorld).invert();
    for (const { mesh, sources } of this.batches) for (const source of sources)
      mesh.setMatrixAt(source.userData.wf_batch_instance as number, this.relative.multiplyMatrices(this.inverse, source.matrixWorld));
  }
  node(role: string) { return this.roles.get(role)!; }
  update(climbTime: number, reach: number, slew: number) {
    if (!Number.isFinite(climbTime) || !Number.isFinite(slew)) throw new Error('Invalid crane pose');
    if (climbTime > 0 && (Math.abs(reach-5.5)>1e-8 || Math.abs(slew)>1e-8))
      throw new Error('Climbing requires the unloaded jib parked inward at5.5m reach');
    const parked=Math.abs(reach-5.5)<1e-8 && Math.abs(slew)<1e-8;
    if(!parked && (slew<this.workingSector[0]-1e-10 || slew>this.workingSector[1]+1e-10))
      throw new Error('Prototype working sector is60–120degrees; other sectors require guide clearance');
    const c = sampleEiffelGuyenetClimb(climbTime,this.description), l = sampleEiffelGuyenetLuff(reach,this.description);
    const nut=this.roles.get('haul-nut');
    // Authored100mm screw lead; rotating nut draws the rigid carriage along I.
    if(nut)nut.rotation.set(this.description.model.railTiltDegrees*Math.PI/180,(c.head-c.carriage-this.description.model.headRest)/.1*Math.PI*2,0);
    this.node('carriage').position.set(...eiffelGuyenetStationPoint(c.carriage,this.description));
    this.node('head-anchor').position.set(...eiffelGuyenetStationPoint(c.head,this.description));
    this.node('safety-base').position.set(...eiffelGuyenetStationPoint(c.safetyBase,this.description));
    this.node('safety-heads').position.set(...eiffelGuyenetStationPoint(c.safetyHead,this.description));
    this.node('rotor').rotation.set(0,slew,0);
    this.node('jib').rotation.set(l.angle,0,0);
    this.node('slider').position.y=l.slider;
    for (const role of ['tie-left','tie-right']) {
      const node=this.node(role);node.position.y=l.slider;node.rotation.set(l.tieAngle,0,0);
    }
    this.group.updateMatrixWorld(true);
    this.syncBatches();
    return c;
  }
  setHoistLength(length: number) {
    const drum=this.roles.get('hoist-drum');
    if(drum)drum.rotation.x=-length/.26;
    this.syncBatches();
  }
  tip(target = new THREE.Vector3()) {
    return this.node('jib').localToWorld(target.set(0,this.description.model.boomLength,0));
  }
  dispose() {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    for (const batch of this.batches) for (const source of batch.sources) {
      geometries.add(source.geometry); for (const material of Array.isArray(source.material) ? source.material : [source.material]) materials.add(material);
    }
    this.batches.forEach(batch => batch.mesh.dispose());
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
    this.group.removeFromParent();
  }
}
