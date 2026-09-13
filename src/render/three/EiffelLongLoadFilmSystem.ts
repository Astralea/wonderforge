import { hasMajorEquipmentShadow } from './eiffelEquipmentShadow';
import { BatchedMesh, BufferAttribute, BufferGeometry, CylinderGeometry, Group, InstancedMesh, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3, type Material, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { sampleEiffelLongLoadFilm } from '../../engine/eiffelLongLoadFilm';
import { EiffelLongLoadOnwardSystem } from './EiffelLongLoadOnwardSystem';
import onwardDesign from '../../../artifacts/eiffel-long-load-onward-2026-09-08/design.json';
import { assertEiffelSecondFloorRelaySample, type EiffelSecondFloorRelaySample } from '../../engine/eiffelSecondFloorRelay';
import type { RigidVec3 } from '../../engine/eiffelRigid';

export const EIFFEL_LONG_LOAD_FILM_ASSETS = {
  receiver: '/models/eiffel-long-load-first-floor/receiver-driven.glb',
  bridge: '/models/eiffel-long-load-first-floor/bridge.glb',
  carrier: '/models/eiffel-long-load-first-floor/carrier.glb',
  sling: '/models/eiffel-long-load-first-floor/closed-sling.glb',
} as const;

/** Actual Blender equipment and cargo for the bounded first-floor delivery.
 * The main kit owns the tower; this class never loads a second tower model.
 */
export class EiffelLongLoadFilmSystem {
  readonly group = new Group();
  readonly ready: Promise<void>;
  private readonly geometries = new Set<BufferGeometry>();
  private readonly materials = new Set<Material>();
  private readonly batches: { mesh: BatchedMesh; majorShadow: boolean; sources: { object: Mesh; id: number }[] }[] = [];
  private readonly roles = new Map<string, Object3D>();
  private readonly onward: EiffelLongLoadOnwardSystem;
  private readonly cartWheelInitial = new Map<Object3D, Quaternion>();
  private cart?: Object3D;
  private readonly wheelInitial = new Map<Object3D, Quaternion>();
  private readonly rope: InstancedMesh;
  private readonly relayRope: InstancedMesh;
  private readonly relayRopeLine: LineSegments;
  private readonly inverse = new Matrix4();
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly direction = new Vector3();
  private readonly scale = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly up = new Vector3(0, 1, 0);
  private carrier?: Group;
  private sling?: Group;
  private seconds = 0;
  private disposed = false;
  private ropeReleased = false;
  private loaded = false;
  private detailedShadows = true;

  constructor(private readonly mobile = false) {
    this.group.name = 'eiffel-long-load-first-floor';
    this.group.visible = false;
    const geometry = new CylinderGeometry(.008, .008, 1, 8, 1, true);
    const material = new MeshStandardMaterial({ color: '#332b20', roughness: .9 });
    this.geometries.add(geometry); this.materials.add(material);
    this.rope = new InstancedMesh(geometry, material, 64);
    this.rope.name = 'long-load-hoist-rope'; this.rope.count = 0;
    this.rope.frustumCulled = false; this.rope.castShadow = true;
    this.group.add(this.rope);
    this.relayRope = new InstancedMesh(geometry, material, 64);
    this.relayRope.name = 'second-floor-relay-rope'; this.relayRope.count = 0;
    this.relayRope.frustumCulled = false; this.relayRope.castShadow = true;
    this.group.add(this.relayRope);
    const lineGeometry=new BufferGeometry();lineGeometry.setAttribute('position',new BufferAttribute(new Float32Array(64*6),3));lineGeometry.setDrawRange(0,0);const lineMaterial=new LineBasicMaterial({color:'#332b20'});this.geometries.add(lineGeometry);this.materials.add(lineMaterial);this.relayRopeLine=new LineSegments(lineGeometry,lineMaterial);this.relayRopeLine.name='second-floor-relay-rope-centerline';this.relayRopeLine.frustumCulled=false;this.group.add(this.relayRopeLine);
    this.onward = new EiffelLongLoadOnwardSystem(mobile ? '/models/eiffel-long-load-first-floor/onward-mobile.glb' : '/models/eiffel-long-load-first-floor/onward.glb', ['opening-clevis','clevis-pin','clevis-keeper','sling-parking-saddle','hatch-handle','cart-chock','fastening-wrench',...onwardDesign.bolts.roles,...onwardDesign.workers.prefixes.flatMap(prefix=>onwardDesign.workers.parts.map(part=>`${prefix}-${part.id}`))]);
    this.onward.group.visible = true;
    this.group.add(this.onward.group);
    this.ready = Promise.all([this.load(),this.onward.ready]).then(() => { this.update(this.seconds); }).catch(error => { this.dispose(); throw error; });
  }

  get assets() {
    return {...EIFFEL_LONG_LOAD_FILM_ASSETS,bridge:this.mobile ? '/models/eiffel-long-load-first-floor/bridge-mobile.glb' : EIFFEL_LONG_LOAD_FILM_ASSETS.bridge,sling:this.mobile ? '/models/eiffel-long-load-first-floor/closed-sling-mobile.glb' : EIFFEL_LONG_LOAD_FILM_ASSETS.sling};
  }

  private async read(url: string): Promise<ArrayBuffer> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Missing long-load asset: ${url}`);
      return await response.arrayBuffer();
    } catch (error) {
      if (typeof process === 'undefined' || !process.versions?.node) throw error;
      const { readFileSync } = await import('node:fs');
      const bytes = readFileSync(`public${url}`);
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }
  }

  private collect(root: Group): void {
    root.traverse(object => {
      if (!(object instanceof Mesh)) return;
      this.geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) this.materials.add(material);
    });
  }

  private async load(): Promise<void> {
    // Wait for every parse before disposal, including a sibling load failure.
    const results = await Promise.allSettled(Object.values(this.assets).map(async url => {
      const root = (await new GLTFLoader().parseAsync(await this.read(url), '')).scene;
      this.collect(root);
      return root;
    }));
    const failed = results.find(result => result.status === 'rejected');
    if (this.disposed || failed) {
      this.dispose();
      if (failed?.status === 'rejected') throw failed.reason;
      return;
    }
    const roots = results.map(result => (result as PromiseFulfilledResult<Group>).value);
    const [receiver, bridge, carrier, sling] = roots;
    this.carrier = carrier; this.sling = sling;
    receiver!.traverse(object => { if (object.userData.wf_role) this.roles.set(object.userData.wf_role, object); });
    for (const role of ['trolley', 'drum', 'sheave']) if (!this.roles.has(role)) throw new Error(`Long-load receiver missing ${role}`);
    let hatch: Object3D | undefined;
    bridge!.traverse(object => { if (object.userData.wf_role === 'freight-hatch') hatch = object; });
    if (!hatch) throw new Error('Long-load bridge missing freight hatch');
    bridge!.traverse(object => { if (object.userData.wf_role === 'stock-cart') this.cart = object; });
    if (!this.cart) throw new Error('Long-load bridge missing stock cart');
    this.cart.traverse(object => { if (object.userData.wf_role === 'cart-wheel') this.cartWheelInitial.set(object,object.quaternion.clone()); });
    if (this.cartWheelInitial.size !== 4) throw new Error('Long-load bridge must retain four cart wheels');
    hatch.rotation.x = Math.PI / 2;
    this.roles.set('freight-hatch', hatch);
    this.roles.get('trolley')!.traverse(object => {
      if (object.name.startsWith('trolley-wheel')) this.wheelInitial.set(object, object.quaternion.clone());
    });
    this.group.add(...roots);
    this.group.updateMatrixWorld(true);
    const cohorts = new Map<string, { material: Material; sources: Mesh[] }>();
    let triangles = 0;
    for (const root of roots) root.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.length !== 1) throw new Error('Long-load batching requires one exported material per source mesh');
      const material = materials[0]!;
      const key = `${material.uuid}:${Object.keys(object.geometry.attributes).sort().join(',')}:${!!object.geometry.index}`;
      const cohort = cohorts.get(key) ?? { material, sources: [] as Mesh[] };
      cohort.sources.push(object); cohorts.set(key, cohort);
      triangles += (object.geometry.index?.count ?? object.geometry.attributes.position!.count) / 3;
    });
    for (const { material, sources } of cohorts.values()) {
      const vertexCount = sources.reduce((n, source) => n + source.geometry.attributes.position!.count, 0);
      const indexCount = sources.reduce((n, source) => n + (source.geometry.index?.count ?? 0), 0);
      const mesh = new BatchedMesh(sources.length, vertexCount, indexCount, material);
      mesh.name = `long-load-export-batch-${this.batches.length}`;
      mesh.frustumCulled = mesh.sortObjects = false;
      mesh.perObjectFrustumCulled = true;
      mesh.castShadow = mesh.receiveShadow = true;
      const entries = sources.map(object => {
        const id = mesh.addInstance(mesh.addGeometry(object.geometry));
        object.userData.longLoadBatch = { batch: this.batches.length, instance: id };
        object.visible = false;
        return { object, id };
      });
      this.group.add(mesh); this.batches.push({ mesh, majorShadow: hasMajorEquipmentShadow(sources), sources: entries });
    }
    this.group.userData.sourceTriangles = triangles;
    this.group.userData.sourceMeshCount = this.batches.reduce((n, batch) => n + batch.sources.length, 0);
    this.group.userData.batchCount = this.batches.length;
    this.loaded = true;
    this.setShadowDetail(this.detailedShadows);
    this.update(this.seconds);
  }

  /** Wide short-film views keep mixed/support and payload batches intact. */
  setShadowDetail(detailed: boolean): void {
    this.detailedShadows = detailed;
    for (const batch of this.batches) batch.mesh.castShadow = detailed || batch.majorShadow;
    this.group.userData.shadowDetail = detailed ? 'source' : 'major-equipment';
  }

  update(seconds: number): void {
    this.seconds = seconds;
    if (!this.loaded || this.disposed) return;
    const sample = sampleEiffelLongLoadFilm(seconds);
    const onward = sample.onward;
    const delivery = 'cart' in onward ? onward : null;
    this.roles.get('freight-hatch')!.rotation.x = delivery?.hatchAngle ?? Math.PI / 2;
    this.cart!.position.set(...(delivery?.cart.position ?? onwardDesign.cartOrigin as [number,number,number]));
    this.rotation.setFromAxisAngle(this.up, delivery?.cart.wheelAngle ?? 0);
    for (const [wheel,original] of this.cartWheelInitial) wheel.quaternion.copy(original).multiply(this.rotation);
    this.onward.update({seconds:sample.seconds,roles:onward.roles});
    this.carrier!.position.set(...sample.carrierOrigin);
    this.sling!.position.set(...sample.masterOrigin);
    this.roles.get('trolley')!.position.z = sample.trolleyZ;
    this.roles.get('drum')!.rotation.x = sample.drumAngle;
    this.roles.get('sheave')!.rotation.x = sample.sheaveAngle;
    this.rotation.setFromAxisAngle(this.up, sample.wheelAngle);
    for (const [wheel, original] of this.wheelInitial) wheel.quaternion.copy(original).multiply(this.rotation);
    this.updateRope(sample.worldRope);
    this.relayRope.count=0;this.relayRopeLine.geometry.setDrawRange(0,0);
    this.refreshBatches();
    Object.assign(this.group.userData, { seconds: sample.seconds, partId: sample.partId, ownsPayload: true, hookReleased: delivery?.hookReleased ?? false,
      onward: {phase:onward.phase,cartDistance:delivery?.cart.distance ?? 0,hatchAngle:delivery?.hatchAngle ?? Math.PI/2,slingSupport:delivery?.slingSupport ?? 'hoist',connector:delivery?.connector ?? null,fastening:delivery?.fastening ?? null},
      carrierOrigin: [...sample.carrierOrigin], masterOrigin: [...sample.masterOrigin], seated:false, relay:null });
  }

  /** Pre-place the independent upper hoist line without taking ownership of
   * the payload, cart, crew, or first-hoist equipment. */
  prepareRelayRope(points:readonly RigidVec3[]):void {if(!this.loaded||this.disposed)return;this.updateRelayRope(points);}

  /** Future relay ownership hook. No relay is sampled or displayed unless its
   * typed state is supplied explicitly by a caller. */
  updateRelay(sample:EiffelSecondFloorRelaySample):void {
    assertEiffelSecondFloorRelaySample(sample);
    if(!this.loaded||this.disposed)return;
    this.carrier!.position.set(...sample.carrierPose.position);this.carrier!.quaternion.set(...sample.carrierPose.quaternion);
    this.sling!.position.set(...sample.masterLinkPose.position);this.sling!.quaternion.set(...sample.masterLinkPose.quaternion);
    if(sample.cartPose){this.cart!.position.set(...sample.cartPose.position);this.cart!.quaternion.set(...sample.cartPose.quaternion);}
    // Relay-prefixed roles belong to the separate saved relay asset. Only the
    // retained first-floor hardware/actor roles are owned by this system.
    this.onward.update({seconds:sample.seconds,roles:sample.hardwareRoles.filter(pose=>!pose.role.startsWith('relay-'))});
    this.updateRelayRope(sample.secondHoist.worldRope);this.refreshBatches();
    Object.assign(this.group.userData,{seconds:sample.seconds,partId:sample.partId,ownsPayload:true,seated:false,relay:{phase:sample.phase,carrierSupport:sample.carrierSupport,slingSupport:sample.slingSupport,cartSupport:sample.cartSupport,cartAttached:sample.cartAttached,fastening:sample.fastening,secondHoist:sample.secondHoist},carrierOrigin:[...sample.carrierPose.position],masterOrigin:[...sample.masterLinkPose.position]});
  }

  private updateRope(points:readonly RigidVec3[]):void {
    const segments = points.length - 1;
    if (segments > 64) throw new Error('Long-load rope segment capacity exceeded');
    this.rope.count = segments;
    for (let i = 0; i < segments; i++) {
      const a = points[i]!, b = points[i + 1]!;
      this.position.set((a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2);
      this.direction.set(b[0]-a[0], b[1]-a[1], b[2]-a[2]);
      const length = this.direction.length();
      this.rotation.setFromUnitVectors(this.up, this.direction.divideScalar(length || 1));
      this.scale.set(1, length, 1);
      this.rope.setMatrixAt(i, this.matrix.compose(this.position, this.rotation, this.scale));
    }
    this.rope.instanceMatrix.needsUpdate = true;
  }

  private updateRelayRope(points:readonly RigidVec3[]):void {
    const segments=Math.max(0,points.length-1);if(segments>64)throw Error('Second-floor relay rope segment capacity exceeded');this.relayRope.count=segments;
    const positions=this.relayRopeLine.geometry.getAttribute('position') as BufferAttribute;let lineSegments=0;for(let i=0;i<segments;i++){const a=points[i]!,b=points[i+1]!;this.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);this.direction.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const length=this.direction.length();this.rotation.setFromUnitVectors(this.up,this.direction.divideScalar(length||1));this.scale.set(1,length,1);this.relayRope.setMatrixAt(i,this.matrix.compose(this.position,this.rotation,this.scale));if(length>.4){positions.setXYZ(lineSegments*2,...a);positions.setXYZ(lineSegments*2+1,...b);lineSegments++;}}this.relayRope.instanceMatrix.needsUpdate=true;positions.needsUpdate=true;this.relayRopeLine.geometry.setDrawRange(0,lineSegments*2);
  }

  private refreshBatches():void {
    this.group.updateMatrixWorld(true);
    this.inverse.copy(this.group.matrixWorld).invert();
    for (const batch of this.batches) for (const { object, id } of batch.sources) {
      batch.mesh.setMatrixAt(id, this.matrix.copy(this.inverse).multiply(object.matrixWorld));
    }
  }

  get diagnostics(): Record<string, unknown> {
    return { ...this.group.userData, profile:this.mobile ? 'mobile' : 'desktop',assets:this.assets, visible:this.group.visible, addon:{...this.onward.group.userData} };
  }

  dispose(): void {
    this.disposed = true;
    this.onward?.dispose();
    for (const batch of this.batches) batch.mesh.dispose();
    this.batches.length = 0;
    if (!this.ropeReleased) { this.rope.dispose(); this.relayRope.dispose(); this.ropeReleased = true; }
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.geometries.clear(); this.materials.clear(); this.group.clear();
  }
}
