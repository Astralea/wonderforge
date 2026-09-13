import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EIFFEL_GROUND_STATIONS, type EiffelGroundStationId } from '../../engine/eiffelGroundStations';
import { EIFFEL_GROUND_PLANT_PRESENT, sampleEiffelRetiringStation, type EiffelGroundPlantRetirement } from '../../engine/eiffelGroundPlantRetirement';
import { sampleEiffelGroundLiftPilot } from '../../engine/eiffelGroundLiftPilot';
import {
  EIFFEL_GROUND_STATION_ERECTION_READY,
  EIFFEL_GROUND_STATION_SUPPORT_MEMBERS,
  type EiffelGroundStationErectionSample,
  type EiffelGroundStationSupportMember,
} from '../../engine/eiffelGroundStationErection';
import type { EiffelGuyenetDescription } from '../../engine/eiffelGuyenet';
import { EiffelGuyenetRig } from './EiffelGuyenetRig';
import { sampleEiffelFoundationCrew } from '../../engine/eiffelFoundationCrew';
import { sampleEiffelGroundRiggers } from '../../engine/eiffelGroundRiggers';

/** Visible equipment for the continuous ground-arrival passage. The tower kit
 * owns the cargo; this system never creates a second copy of its iron member.
 */
export class EiffelGroundLiftSystem {
  readonly group = new T.Group();
  readonly ready: Promise<void>;
  private rig?: EiffelGuyenetRig;
  private seconds = 0;
  private disposed = false;
  private fourStations = false;
  private suppressed = new Set<number>();
  private erection: EiffelGroundStationErectionSample = EIFFEL_GROUND_STATION_ERECTION_READY;
  private retirement: EiffelGroundPlantRetirement = EIFFEL_GROUND_PLANT_PRESENT;
  private readonly cart = new T.Group();
  private readonly supportBatches: { mesh: T.InstancedMesh; material: EiffelGroundStationSupportMember['material'] }[] = [];
  private readonly supportMatrix = new T.Matrix4();
  private readonly basisX = new T.Vector3();
  private readonly basisY = new T.Vector3();
  private readonly basisZ = new T.Vector3();
  private readonly wheels: T.Object3D[] = [];
  private readonly people: { root:T.Group; torso:T.Mesh; head:T.Mesh; hat:T.Mesh; feet:T.Mesh[]; legs:T.Mesh[]; arms:T.Mesh[] }[] = [];
  private readonly riggers: { root:T.Group; torso:T.Mesh; pelvis:T.Mesh; neck:T.Mesh; head:T.Mesh; hat:T.Mesh; feet:T.Mesh[]; legs:T.Mesh[]; arms:T.Mesh[]; hands:T.Mesh[] }[] = [];
  private readonly ropes: T.Mesh[] = [];
  private readonly batches: { mesh:T.InstancedMesh; sources:T.Mesh[] }[] = [];
  private readonly rigBatches: { mesh:T.BatchedMesh; sources:T.Mesh[] }[] = [];
  private readonly stationRotations = EIFFEL_GROUND_STATIONS.map(s=>new T.Matrix4().makeRotationY(s.quarterTurns*Math.PI/2));
  private readonly inverse = new T.Matrix4();
  private readonly instance = new T.Matrix4();
  private readonly geometries = new Set<T.BufferGeometry>();
  private readonly materials = new Set<T.Material>();
  private readonly hook: T.Mesh;
  private readonly wood = this.material('#876746', .92);
  private readonly iron = this.material('#494940', .76);
  private readonly cloth = this.material('#435565', .97);
  private readonly skin = this.material('#b08a68', .97);
  private readonly ropeMaterial = this.material('#403b2e', 1);
  private readonly unitBox = this.geometry(new T.BoxGeometry(1,1,1));
  private readonly up = new T.Vector3(0,1,0);

  constructor() {
    this.group.name='eiffel-continuous-ground-lift';
    const s=sampleEiffelGroundLiftPilot(0);
    this.group.add(this.cart);
    this.box(this.cart,s.carrier.bedSize,[0,s.carrier.bedPose.position[1],0],this.wood);
    const wheelG=this.geometry(new T.CylinderGeometry(.4,.4,.14,12));
    wheelG.rotateZ(Math.PI/2);
    for(const x of [-.75,.75])for(const z of [-1.65,1.65]) {
      const wheel=new T.Mesh(wheelG,this.iron);wheel.position.set(x,.4,z);wheel.castShadow=true;
      this.cart.add(wheel);this.wheels.push(wheel);
      this.box(this.cart,[.14,s.carrier.bedTopY-.4,.18],[x,(s.carrier.bedTopY+.4)/2-.1,z],this.wood);
    }
    for(const z of [-1.65,1.65])this.box(this.cart,[1.7,.12,.12],[0,.4,z],this.iron);
    for(const x of [-.55,.55])this.box(this.cart,[.085,.085,1.2],[x,.98,-2.95],this.wood);
    // The shared push-crew sampler places four hands along this crossbar.
    // Longitudinal handles alone leave the inner hands pushing empty air.
    const pushBar=this.box(this.cart,[1.28,.085,.085],[0,1.05,-s.carrier.bedSize[2]/2-.42],this.wood);
    pushBar.name='ground-cart-push-crossbar';
    for(const side of [-1,1]) {
      const root=new T.Group();this.group.add(root);
      const torso=this.box(root,[.38,.6,.24],[0,1.16,.11],this.cloth);torso.rotation.x=.16;
      const head=this.box(root,[.23,.27,.23],[0,1.66,.12],this.skin);
      const hat=this.box(root,[.32,.09,.28],[0,1.83,.12],this.iron);
      const feet=[-1,1].map(()=>this.box(root,[.14,.12,.28],[0,.06,0],this.iron));
      const legs=[-1,1].map(()=>this.box(root,[.12,.62,.14],[0,.42,0],this.cloth));
      const arms=[-1,1].map(()=>this.box(root,[.095,.56,.095],[0,1.13,.3],this.cloth));
      root.userData.side=side;this.people.push({root,torso,head,hat,feet,legs,arms});
    }
    for(let i=0;i<2;i++) {
      const root=new T.Group();root.name=`ground-slinger-${i}`;this.group.add(root);
      const torso=this.box(root,[.32,.6,.22],[0,0,0],this.cloth);
      const pelvis=this.box(root,[.24,.28,.26],[0,0,0],this.cloth);
      const neck=this.box(root,[.1,.2,.1],[0,0,0],this.skin);
      const head=this.box(root,[.22,.24,.22],[0,0,0],this.skin);
      const hat=this.box(root,[.3,.08,.26],[0,0,0],this.iron);
      const feet=[0,1].map(()=>this.box(root,[.14,.12,.28],[0,0,0],this.iron));
      const legs=[0,1,2,3].map(()=>this.box(root,[.11,1,.11],[0,0,0],this.cloth));
      const arms=[0,1,2,3].map(()=>this.box(root,[.09,1,.09],[0,0,0],this.cloth));
      const hands=[0,1].map(()=>this.box(root,[.08,.08,.08],[0,0,0],this.skin));
      hands.forEach((hand,j)=>hand.name=`ground-slinger-${i}-hand-${j}`);
      this.riggers.push({root,torso,pelvis,neck,head,hat,feet,legs,arms,hands});
    }
    const ropeG=this.geometry(new T.CylinderGeometry(.022,.022,1,6));
    for(let i=0;i<5;i++){const r=new T.Mesh(ropeG,this.ropeMaterial);r.frustumCulled=false;this.ropes.push(r);this.group.add(r);}
    this.hook=this.box(this.group,[.14,.2,.14],[0,0,0],this.iron);
    // Keep articulated source transforms, but submit repeated crew/cart/cable
    // geometry once per material. Bounds are dynamic throughout the passage.
    const cohorts=new Map<string,T.Mesh[]>();
    this.group.traverse(o=>{if(o instanceof T.Mesh && !Array.isArray(o.material)){
      const key=o.geometry.uuid+o.material.uuid;const list=cohorts.get(key)??[];list.push(o);cohorts.set(key,list);
    }});
    for(const sources of cohorts.values()){
      const batch=new T.InstancedMesh(sources[0].geometry,sources[0].material,sources.length*EIFFEL_GROUND_STATIONS.length);
      batch.count=sources.length;
      batch.frustumCulled=false;batch.castShadow=batch.receiveShadow=true;
      sources.forEach(o=>o.visible=false);this.group.add(batch);this.batches.push({mesh:batch,sources});
    }
    const timber=this.material('#876746', .92),iron=this.material('#494940', .76);
    const capacity=EIFFEL_GROUND_STATION_SUPPORT_MEMBERS.length*EIFFEL_GROUND_STATIONS.length;
    for (const [materialKind, material] of [['timber', timber], ['iron', iron]] as const) {
      const mesh=new T.InstancedMesh(this.unitBox, material, capacity);
      mesh.name=`ground-station-support-${materialKind}`;
      mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=true;
      this.group.add(mesh);this.supportBatches.push({mesh,material:materialKind});
    }
    this.update(0);
    this.ready=this.load().then(()=>{if(!this.disposed)this.update(this.seconds,this.erection,this.retirement);});
  }
  private material(color:string,roughness:number){const m=new T.MeshStandardMaterial({color,roughness});this.materials.add(m);return m;}
  private geometry<G extends T.BufferGeometry>(g:G):G{this.geometries.add(g);return g;}
  private box(parent:T.Object3D,size:readonly number[],p:readonly number[],m:T.Material){
    const o=new T.Mesh(this.unitBox,m);o.scale.set(size[0],size[1],size[2]);o.position.set(p[0],p[1],p[2]);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
  }
  private async load(){
    let bytes:ArrayBuffer;
    try {const response=await fetch('/models/eiffel-guyenet-ne/crane.glb');if(!response.ok)throw Error('Missing installed crane');bytes=await response.arrayBuffer();}
    catch(error){
      if(typeof process==='undefined'||!process.versions?.node)throw error;
      const {readFileSync}=await import('node:fs');const b=readFileSync('public/models/eiffel-guyenet-ne/crane.glb');bytes=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
    }
    const gltf=await new GLTFLoader().parseAsync(bytes,'');
    let description:EiffelGuyenetDescription|undefined;
    gltf.scene.traverse(o=>{if(typeof o.userData.wf_description==='string')description=JSON.parse(o.userData.wf_description);});
    if(!description)throw Error('Installed crane description missing');
    // The installed station's sampled 121.65-degree sector is audited separately
    // from the generic crane component. Never widen the generic default sector.
    const rig=new EiffelGuyenetRig(gltf.scene,description,[Math.PI/3,121.65*Math.PI/180]);
    if(this.disposed){rig.dispose();return;}
    this.rig=rig;this.group.add(rig.group);
    // Keep one articulated source asset. Pack its unique geometry once per
    // material, then place four instances of every source in those same draws.
    const cohorts=new Map<T.Material,T.Mesh[]>();
    rig.group.traverse(object=>{
      if(object instanceof T.BatchedMesh){object.visible=false;return;}
      if(!(object instanceof T.Mesh))return;
      if(Array.isArray(object.material))throw Error('Ground station requires single-material source meshes');
      const sources=cohorts.get(object.material)??[];sources.push(object);cohorts.set(object.material,sources);
    });
    for(const [material,sources] of cohorts){
      const geometries=[...new Set(sources.map(source=>source.geometry))];
      const mesh=new T.BatchedMesh(sources.length*EIFFEL_GROUND_STATIONS.length,
        geometries.reduce((sum,g)=>sum+g.getAttribute('position').count,0),
        geometries.reduce((sum,g)=>sum+(g.index?.count??0),0),material);
      const ids=new Map(geometries.map(g=>[g,mesh.addGeometry(g)]));
      for(let station=0;station<EIFFEL_GROUND_STATIONS.length;station++)for(const source of sources)mesh.addInstance(ids.get(source.geometry)!);
      sources.forEach(source=>source.visible=false);
      mesh.name=`ground-four-station-batch-${this.rigBatches.length}`;
      mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
      mesh.perObjectFrustumCulled=true;mesh.sortObjects=false;
      this.rigBatches.push({mesh,sources});this.group.add(mesh);
    }
    this.setFourStations(this.fourStations);
  }
  /** Detailed retains the original single-payload passage. Cinematic must bind
   * all four actual kit deliveries before enabling the additional stations. */
  setFourStations(enabled:boolean){
    if(this.fourStations===enabled && this.group.userData.stationCount!==undefined)return;
    this.fourStations=enabled;
    this.applyStationVisibility();
    this.group.userData.stationCount=enabled?EIFFEL_GROUND_STATIONS.length:1;
  }
  /** Hide a station that a later chapter already occupies, without dismantling the others. */
  setSuppressedStations(ids:readonly EiffelGroundStationId[]){
    const next=new Set(ids.map(id=>EIFFEL_GROUND_STATIONS.findIndex(station=>station.id===id)).filter(index=>index>=0));
    if(next.size===this.suppressed.size && [...next].every(id=>this.suppressed.has(id)))return;
    this.suppressed=next;
    this.applyStationVisibility();
  }
  private visibleStationSlots(){
    const limit=this.fourStations?EIFFEL_GROUND_STATIONS.length:1;
    return EIFFEL_GROUND_STATIONS.map((_,index)=>index).filter(index=>index<limit&&!this.suppressed.has(index)&&this.retirement[EIFFEL_GROUND_STATIONS[index]!.id]<1);
  }
  private stationState(index:number){
    const progress=this.retirement[EIFFEL_GROUND_STATIONS[index]!.id];
    return progress>0?sampleEiffelRetiringStation(progress):this.erection;
  }
  private roleOf(object:T.Object3D){
    let cursor:T.Object3D|null=object;
    while(cursor){if(typeof cursor.userData.wf_role==='string')return cursor.userData.wf_role as string;cursor=cursor.parent;}
    return '';
  }
  private memberMatrix(member:EiffelGroundStationSupportMember,target:T.Matrix4){
    const scale=(axis:readonly number[],half:number,into:T.Vector3)=>into.set(axis[0]*half*2,axis[1]*half*2,axis[2]*half*2);
    scale(member.axes[0],member.half[0],this.basisX);
    scale(member.axes[1],member.half[1],this.basisY);
    scale(member.axes[2],member.half[2],this.basisZ);
    return target.makeBasis(this.basisX,this.basisY,this.basisZ).setPosition(member.center[0],member.center[1],member.center[2]);
  }
  private applyStationVisibility(){
    const slots=this.visibleStationSlots();
    const states=EIFFEL_GROUND_STATIONS.map((_,index)=>this.stationState(index));
    const service=slots.filter(index=>states[index]!.operational).length;
    for(const {mesh,sources} of this.batches)mesh.count=sources.length*service;
    const shown=new Set(slots);
    for(const {mesh,sources} of this.rigBatches)for(let station=0;station<EIFFEL_GROUND_STATIONS.length;station++)for(let i=0;i<sources.length;i++){
      const state=states[station]!;
      const role=this.roleOf(sources[i]);
      mesh.setVisibleAt(station*sources.length+i,shown.has(station)&&(role==='guides'?state.authoredFalsework:state.craneRoles.includes(role)));
    }
    this.group.userData.visibleStationCount=service;
    this.group.userData.retirement=slots.map(index=>({id:EIFFEL_GROUND_STATIONS[index]!.id,progress:this.retirement[EIFFEL_GROUND_STATIONS[index]!.id],supportCount:states[index]!.seatedSupportCount,craneRoles:states[index]!.craneRoles}));
    for(const {mesh,material} of this.supportBatches){
      let count=0;
      for(const station of slots){
        const state=states[station]!;
        if(state.authoredFalsework)continue;
        for(const member of EIFFEL_GROUND_STATION_SUPPORT_MEMBERS.slice(0,state.seatedSupportCount)){
          if(member.material!==material)continue;
          this.memberMatrix(member,this.supportMatrix);
          mesh.setMatrixAt(count++,this.instance.copy(this.supportMatrix).premultiply(this.stationRotations[station]!));
        }
      }
      mesh.count=count;
      mesh.instanceMatrix.needsUpdate=true;
    }
  }
  private segment(mesh:T.Mesh,a:readonly number[],b:readonly number[]){
    const delta=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const length=delta.length();
    mesh.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);
    mesh.scale.set(1,length,1);mesh.quaternion.setFromUnitVectors(this.up,delta.divideScalar(length||1));
  }
  update(seconds:number,erection?:EiffelGroundStationErectionSample,retirement: EiffelGroundPlantRetirement=EIFFEL_GROUND_PLANT_PRESENT){
    this.seconds=seconds;this.retirement=retirement;if(erection)this.erection=erection;const s=sampleEiffelGroundLiftPilot(seconds);
    this.cart.position.set(s.carrier.bedPose.position[0],0,s.carrier.bedPose.position[2]);
    this.wheels.forEach(w=>w.rotation.x=s.carrier.wheelAngle);
    const crew=sampleEiffelFoundationCrew({center:s.carrier.bedPose.position,
      size:[s.carrier.bedSize[2],s.carrier.bedSize[1],s.carrier.bedSize[0]],
      steering:{yaw:Math.PI/2,distance:s.carrier.distance,walking:s.carrier.moving}});
    this.people.forEach((person,index)=>{
      const pose=crew.crew[index];person.torso.position.set(...pose.torso);person.head.position.set(...pose.head);
      person.hat.position.set(pose.head[0],pose.head[1]+.17,pose.head[2]);
      pose.feet.forEach((foot,i)=>{person.feet[i].position.set(...foot.center);
        this.segment(person.legs[i],foot.center,foot.hip);person.legs[i].scale.x=.12;person.legs[i].scale.z=.12;});
      pose.arms.forEach((arm,i)=>{this.segment(person.arms[i],arm.shoulder,arm.hand);person.arms[i].scale.x=.095;person.arms[i].scale.z=.095;});
    });
    const riggers=sampleEiffelGroundRiggers(seconds);
    riggers.workers.forEach((pose,index)=>{
      const person=this.riggers[index];
      this.segment(person.torso,pose.torso[0],pose.torso[1]);person.torso.scale.x=.32;person.torso.scale.z=.22;
      person.pelvis.position.set(pose.hip[0],pose.hip[1]+.1,pose.hip[2]);
      this.segment(person.neck,pose.shoulderCenter,pose.head.center);person.neck.scale.x=.1;person.neck.scale.z=.1;
      person.head.position.set(...pose.head.center);person.hat.position.set(pose.head.center[0],pose.head.center[1]+.16,pose.head.center[2]);
      [pose.leftFoot,pose.rightFoot].forEach((foot,i)=>{
        person.feet[i].position.set(...foot.center);person.feet[i].scale.set(...foot.size);person.feet[i].quaternion.set(...foot.quaternion);
        const leg=i===0?pose.leftLeg:pose.rightLeg;
        this.segment(person.legs[i*2],leg.start,leg.joint);this.segment(person.legs[i*2+1],leg.joint,leg.end);
        for(const mesh of [person.legs[i*2],person.legs[i*2+1]]){mesh.scale.x=.11;mesh.scale.z=.11;}
      });
      [pose.arms.left,pose.arms.right].forEach((arm,i)=>{
        this.segment(person.arms[i*2],arm.shoulder,arm.elbow);
        this.segment(person.arms[i*2+1],arm.elbow,arm.hand);
        for(const mesh of [person.arms[i*2],person.arms[i*2+1]]){mesh.scale.x=.09;mesh.scale.z=.09;}
        person.hands[i].position.set(...arm.hand);
      });
      person.root.userData.contact=pose.contact;
    });
    if(this.rig){
      this.rig.group.position.set(...s.crane.root);this.rig.group.rotation.y=s.crane.rootYaw;
      if(this.erection.operational){this.rig.update(0,s.crane.reach,s.crane.yaw);this.rig.setHoistLength(s.crane.hoistRopeLength);}
      else {this.rig.update(0,5.5,Math.PI/2);this.rig.setHoistLength(2);}
      const actualTip=this.rig.tip();this.segment(this.ropes[0],actualTip.toArray(),s.crane.hook);
      this.group.userData.tipResidual=actualTip.distanceTo(new T.Vector3(...s.crane.boomTip));
    }
    this.hook.position.set(...s.crane.hook);
    s.rigging.slings.forEach((sling,i)=>{this.segment(this.ropes[1+i*2],sling.points[0],sling.points[1]);this.segment(this.ropes[2+i*2],sling.points[1],sling.points[2]);});
    this.group.userData.phase=s.phase;this.group.userData.seconds=seconds;
    this.group.userData.erection={seated:this.erection.seatedSupportCount,operational:this.erection.operational,authoredFalsework:this.erection.authoredFalsework,craneRoles:this.erection.craneRoles};
    this.group.updateMatrixWorld(true);
    this.inverse.copy(this.group.matrixWorld).invert();
    const slots=this.visibleStationSlots().filter(index=>this.stationState(index).operational);
    for(const {mesh,sources} of this.batches){
      slots.forEach((station,packed)=>sources.forEach((source,i)=>
        mesh.setMatrixAt(packed*sources.length+i,this.instance.multiplyMatrices(this.inverse,source.matrixWorld).premultiply(this.stationRotations[station]!))));
      mesh.instanceMatrix.needsUpdate=true;
    }
    for(const {mesh,sources} of this.rigBatches){
      this.stationRotations.forEach((rotation,station)=>sources.forEach((source,i)=>
        mesh.setMatrixAt(station*sources.length+i,this.instance.multiplyMatrices(this.inverse,source.matrixWorld).premultiply(rotation))));
    }
    this.applyStationVisibility();
  }
  dispose(){this.disposed=true;this.rigBatches.forEach(b=>b.mesh.dispose());this.rig?.dispose();this.batches.forEach(b=>b.mesh.dispose());this.supportBatches.forEach(b=>b.mesh.dispose());this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.group.removeFromParent();}
}
