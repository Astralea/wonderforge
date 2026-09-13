import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sampleEiffelFoundationCrew } from '../../engine/eiffelFoundationCrew';
import { sampleEiffelJointCampaign } from '../../engine/eiffelJointCampaign';
import { sampleEiffelJointRiggers } from '../../engine/eiffelJointRiggers';
import { EIFFEL_GROUND_STATION_CRANE_ROLES } from '../../engine/eiffelGroundStationErection';
import type { EiffelGuyenetDescription } from '../../engine/eiffelGuyenet';
import { EiffelGuyenetRig } from './EiffelGuyenetRig';

/** Equipment for the two-load joint campaign. The construction kit remains the
 * sole owner of both moving iron loads. */
export class EiffelJointCampaignSystem {
  readonly group = new T.Group();
  readonly ready: Promise<void>;
  private readonly carts: { root: T.Object3D; wheels: T.Object3D[] }[] = [];
  private readonly crew: { torso:T.Mesh; head:T.Mesh; hat:T.Mesh; feet:T.Mesh[]; legs:T.Mesh[]; arms:T.Mesh[] }[] = [];
  private readonly slingers: { root:T.Group; torso:T.Mesh; pelvis:T.Mesh; neck:T.Mesh; head:T.Mesh; hat:T.Mesh; feet:T.Mesh[]; legs:T.Mesh[]; arms:T.Mesh[]; hands:T.Mesh[] }[] = [];
  private readonly ropes: T.Mesh[] = [];
  private readonly basketSegments: T.Mesh[] = [];
  private readonly batches: { mesh:T.InstancedMesh; sources:T.Mesh[] }[] = [];
  private readonly geometries = new Set<T.BufferGeometry>();
  private readonly materials = new Set<T.Material>();
  private readonly inverse = new T.Matrix4();
  private readonly instance = new T.Matrix4();
  private readonly up = new T.Vector3(0, 1, 0);
  private readonly unitBox = this.geometry(new T.BoxGeometry(1, 1, 1));
  private readonly iron = this.material('#494940', .76);
  private readonly cloth = this.material('#435565', .97);
  private readonly skin = this.material('#b08a68', .97);
  private readonly ropeMaterial = this.material('#403b2e', 1);
  private readonly hook: T.Mesh;
  private rig?: EiffelGuyenetRig;
  private seconds = 0;
  private retirement = 0;
  private supportCount = 0;
  private readonly supportBatches: { mesh:T.Mesh; ends:readonly { rank:number; end:number }[] }[] = [];
  private readonly craneInstances: { mesh:T.BatchedMesh; instance:number; rank:number }[] = [];
  private readonly guideInstances: { mesh:T.BatchedMesh; instance:number; rank:number; id:string; minY:number; source:T.Mesh }[] = [];
  private readonly looseEquipment: T.Mesh[] = [];
  private disposed = false;

  constructor() {
    this.group.name = 'eiffel-joint-campaign-equipment';
    for (let cart = 0; cart < 2; cart++) for (let person = 0; person < 2; person++) {
      const root = new T.Group(); root.name = `joint-cart-${cart}-pusher-${person}`; this.group.add(root);
      const torso=this.box(root,[.38,.6,.24],this.cloth),head=this.box(root,[.23,.27,.23],this.skin),hat=this.box(root,[.32,.09,.28],this.iron);
      const feet=[0,1].map(()=>this.box(root,[.14,.12,.28],this.iron)),legs=[0,1].map(()=>this.box(root,[.12,1,.14],this.cloth)),arms=[0,1].map(()=>this.box(root,[.095,1,.095],this.cloth));
      arms.forEach((arm,index)=>arm.name=`joint-cart-${cart}-pusher-${person}-arm-${index}`);
      this.crew.push({torso,head,hat,feet,legs,arms});
    }
    for(let index=0;index<2;index++){
      const root=new T.Group();root.name=`joint-slinger-${index}`;this.group.add(root);
      const torso=this.box(root,[.3,1,.22],this.cloth),pelvis=this.box(root,[.24,.28,.26],this.cloth),neck=this.box(root,[.1,1,.1],this.skin),head=this.box(root,[.22,.24,.22],this.skin),hat=this.box(root,[.3,.08,.26],this.iron);
      const feet=[0,1].map(()=>this.box(root,[.28,.12,.14],this.iron)),legs=[0,1,2,3].map(()=>this.box(root,[.11,1,.11],this.cloth)),arms=[0,1,2,3].map(()=>this.box(root,[.09,1,.09],this.cloth)),hands=[0,1].map(()=>this.box(root,[.08,.08,.08],this.skin));
      hands.forEach((hand,i)=>hand.name=`joint-slinger-${index}-hand-${i}`);this.slingers.push({root,torso,pelvis,neck,head,hat,feet,legs,arms,hands});
    }
    const ropeGeometry=this.geometry(new T.CylinderGeometry(.022,.022,1,6));
    for(let i=0;i<5;i++){const rope=new T.Mesh(ropeGeometry,this.ropeMaterial);rope.name=`joint-campaign-rope-${i}`;rope.frustumCulled=false;this.ropes.push(rope);this.group.add(rope);}
    const basketGeometry=this.geometry(new T.CylinderGeometry(.015,.015,1,6));
    const initialLoops=sampleEiffelJointCampaign(0).basketLoops;
    for(let i=0;i<initialLoops.reduce((sum,loop)=>sum+loop.points.length-1,0);i++){const segment=new T.Mesh(basketGeometry,this.ropeMaterial);segment.name=`joint-campaign-basket-segment-${i}`;segment.frustumCulled=false;this.basketSegments.push(segment);this.group.add(segment);}
    this.hook=this.box(this.group,[.14,.2,.14],this.iron);this.hook.name='joint-campaign-hook';
    this.ready=this.load().then(()=>{if(this.disposed)return;this.createBatches();this.prepareRetirement();this.update(this.seconds,this.retirement);});
  }

  private material(color:string,roughness:number){const material=new T.MeshStandardMaterial({color,roughness});this.materials.add(material);return material;}
  private geometry<G extends T.BufferGeometry>(geometry:G):G{this.geometries.add(geometry);return geometry;}
  private box(parent:T.Object3D,size:readonly number[],material:T.Material){const mesh=new T.Mesh(this.unitBox,material);mesh.scale.set(size[0]!,size[1]!,size[2]!);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  private async bytes(url:string){try{const response=await fetch(url);if(!response.ok)throw Error(`Missing ${url}`);return await response.arrayBuffer();}catch(error){if(typeof process==='undefined'||!process.versions?.node)throw error;const {readFileSync}=await import('node:fs');const buffer=readFileSync(`public${url}`);return buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);}}
  private async load(){
    const loader=new GLTFLoader(),[supportGltf,cartGltf,craneGltf]=await Promise.all([
      this.bytes('/models/eiffel-joint-campaign/support.glb').then(bytes=>loader.parseAsync(bytes,'')),
      this.bytes('/models/eiffel-joint-campaign/cart.glb').then(bytes=>loader.parseAsync(bytes,'')),
      this.bytes('/models/eiffel-guyenet-ne/crane.glb').then(bytes=>loader.parseAsync(bytes,'')),
    ]);
    if(this.disposed){for(const scene of [supportGltf.scene,cartGltf.scene,craneGltf.scene])scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const material of Array.isArray(o.material)?o.material:[o.material])material.dispose();}});return;}
    this.mergeSupport(supportGltf.scene);
    let template:T.Object3D|undefined;cartGltf.scene.traverse(o=>{if(o.userData.wf_role==='joint-cart')template=o;});if(!template)throw Error('Joint campaign cart root missing');
    template.traverse(o=>{if(o instanceof T.Mesh){this.geometries.add(o.geometry);if(Array.isArray(o.material))o.material.forEach(m=>this.materials.add(m));else this.materials.add(o.material);}});
    for(let i=0;i<2;i++){const root=template.clone(true);root.name=`joint-cart-${i}`;const wheels:T.Object3D[]=[];root.traverse(o=>{if(typeof o.userData.wf_role==='string'&&o.userData.wf_role.startsWith('cart-wheel-'))wheels.push(o);if(o.userData.wf_material==='timber'&&o.name.includes('body-timber'))o.name=`joint-cart-${i}-body-timber`;});if(wheels.length!==4)throw Error(`Joint cart ${i} has ${wheels.length} wheels`);this.group.add(root);this.carts.push({root,wheels});}
    let description:EiffelGuyenetDescription|undefined;craneGltf.scene.traverse(o=>{if(typeof o.userData.wf_description==='string')description=JSON.parse(o.userData.wf_description);});
    if(!description)throw Error('Installed crane description missing');this.splitGuideMembers(craneGltf.scene);this.rig=new EiffelGuyenetRig(craneGltf.scene,description,[Math.PI/3,121.65*Math.PI/180]);this.group.add(this.rig.group);
  }
  private splitGuideMembers(scene:T.Object3D){
    const merged:T.Mesh[]=[];
    scene.traverse(object=>{if(object.userData.wf_role==='guides')object.traverse(child=>{if(child instanceof T.Mesh)merged.push(child);});});
    // Blender exported the falsework as material-merged cuboids. Recover the
    // authored full cuboids before batching, without changing their vertices.
    for(const source of merged){
      const positions=source.geometry.getAttribute('position'),index=source.geometry.index;
      if(!index||positions.count%24!==0||index.count!==positions.count/24*36)throw Error('Joint guide cuboid topology changed');
      for(let member=0;member<positions.count/24;member++){
        const geometry=new T.BufferGeometry();
        for(const [name,attribute] of Object.entries(source.geometry.attributes)){
          if(!(attribute instanceof T.BufferAttribute))throw Error('Joint guide attribute must be non-interleaved');
          geometry.setAttribute(name,new T.BufferAttribute(attribute.array.slice(member*24*attribute.itemSize,(member+1)*24*attribute.itemSize),attribute.itemSize,attribute.normalized));
        }
        const indices:number[]=[];
        for(let i=member*36;i<(member+1)*36;i++){
          const vertex=index.getX(i)-member*24;
          if(vertex<0||vertex>=24)throw Error('Joint guide source crosses cuboid boundary');
          indices.push(vertex);
        }
        geometry.setIndex(indices);
        const mesh=new T.Mesh(geometry,source.material);mesh.name=`${source.name}-member-${member}`;
        mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);
        mesh.userData={...source.userData,wf_guide_support:true};source.parent!.add(mesh);
      }
      source.removeFromParent();source.geometry.dispose();
    }
  }
  private mergeSupport(scene:T.Object3D){
    scene.updateMatrixWorld(true);
    const parts:{ geometry:T.BufferGeometry; material:T.Material; id:string; minY:number }[]=[];
    scene.traverse(object=>{
      if(!(object instanceof T.Mesh)||Array.isArray(object.material))return;
      const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
      geometry.computeBoundingBox();
      parts.push({geometry,material:object.material,id:object.name,minY:geometry.boundingBox!.min.y});
      this.materials.add(object.material);
    });
    // Keep complete Blender meshes, ordered by their lowest transformed vertex.
    // Each material prefix can then withdraw the highest member without editing
    // any vertex, changing scale, or adding a draw call.
    parts.sort((a,b)=>a.minY-b.minY||a.id.localeCompare(b.id));
    this.supportCount=parts.length;
    const cohorts=new Map<T.Material,{ geometry:T.BufferGeometry; rank:number; id:string; minY:number }[]>();
    parts.forEach((part,rank)=>{const list=cohorts.get(part.material)??[];list.push({...part,rank});cohorts.set(part.material,list);});
    for(const [material,members] of cohorts){
      const geometry=mergeGeometries(members.map(member=>member.geometry),false);
      if(!geometry)throw Error('Joint support geometry merge failed');
      let end=0;
      const ends=members.map(member=>({rank:member.rank,id:member.id,minY:member.minY,end:end+=(member.geometry.index?.count??member.geometry.getAttribute('position').count)}));
      members.forEach(member=>member.geometry.dispose());this.geometries.add(geometry);
      const mesh=new T.Mesh(geometry,material);mesh.name=`joint-support-${material.name}`;
      mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
      mesh.userData.retirementSources=ends;
      this.group.add(mesh);this.supportBatches.push({mesh,ends});
    }
  }
  private prepareRetirement(){
    const rigObjects=new Set<T.Object3D>();this.rig?.group.traverse(object=>rigObjects.add(object));
    const supportMeshes=new Set(this.supportBatches.map(batch=>batch.mesh));
    this.group.traverse(object=>{
      if(object instanceof T.Mesh&&object.visible&&!rigObjects.has(object)&&!supportMeshes.has(object))this.looseEquipment.push(object);
    });
    // The guides role includes 219 falsework members, not one crane assembly.
    const roles:readonly string[]=[...EIFFEL_GROUND_STATION_CRANE_ROLES,'guides'];
    if(this.rig){const crane=sampleEiffelJointCampaign(this.seconds).crane;this.rig.group.position.set(...crane.root);this.rig.group.rotation.y=crane.rootYaw;this.rig.group.updateMatrixWorld(true);}
    const batches=new Map<T.Material,T.BatchedMesh>();
    this.rig?.group.traverse(object=>{if(object instanceof T.BatchedMesh&&!Array.isArray(object.material))batches.set(object.material,object);});
    this.rig?.group.traverse(object=>{
      if(!(object instanceof T.Mesh)||object instanceof T.BatchedMesh||Array.isArray(object.material))return;
      let node:T.Object3D|null=object;
      while(node&&!roles.includes(String(node.userData.wf_role)))node=node.parent;
      if(!node)throw Error(`Joint crane mesh lacks retirement assembly: ${object.name}`);
      const mesh=batches.get(object.material),instance=object.userData.wf_batch_instance as number;
      if(!mesh||!Number.isInteger(instance))throw Error(`Joint crane batch missing: ${object.name}`);
      if(node.userData.wf_role==='guides'){
        object.geometry.computeBoundingBox();
        const minY=object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld).min.y;
        const entry={mesh,instance,rank:0,id:object.name,minY,source:object};this.guideInstances.push(entry);
      }else this.craneInstances.push({mesh,instance,rank:roles.indexOf(String(node.userData.wf_role))});
    });
    const allSupports=[...this.supportBatches.flatMap(batch=>batch.ends),...this.guideInstances] as {rank:number;id:string;minY:number}[];
    allSupports.sort((a,b)=>a.minY-b.minY||a.id.localeCompare(b.id));
    allSupports.forEach((source,rank)=>source.rank=rank);this.supportCount=allSupports.length;
    for(const {source,rank,id,minY,instance} of this.guideInstances)source.userData.retirementSource={rank,id,minY,instance};
  }
  private updateRetirement(){
    const craneAssemblyCount=EIFFEL_GROUND_STATION_CRANE_ROLES.length;
    const craneRemaining=Math.ceil(craneAssemblyCount*(1-Math.min(1,this.retirement/.25)));
    for(const instance of this.craneInstances)instance.mesh.setVisibleAt(instance.instance,instance.rank<craneRemaining);
    for(const mesh of this.looseEquipment)mesh.visible=this.retirement===0;
    const supportProgress=Math.max(0,(this.retirement-.25)/.75);
    const supportRemaining=Math.ceil(this.supportCount*(1-supportProgress));
    for(const instance of this.guideInstances)instance.mesh.setVisibleAt(instance.instance,instance.rank<supportRemaining);
    for(const {mesh,ends} of this.supportBatches){
      let count=0;
      for(const member of ends){if(member.rank>=supportRemaining)break;count=member.end;}
      mesh.geometry.setDrawRange(0,count);
    }
    this.group.userData.retirement=this.retirement;
    this.group.userData.retainedSupportCount=supportRemaining;
    this.group.userData.retainedCraneAssemblyCount=craneRemaining;
  }
  private createBatches(){
    const rigObjects=new Set<T.Object3D>();this.rig?.group.traverse(o=>rigObjects.add(o));
    const cohorts=new Map<string,T.Mesh[]>();this.group.traverse(o=>{if(!rigObjects.has(o)&&o instanceof T.Mesh&&!Array.isArray(o.material)){const key=o.geometry.uuid+o.material.uuid,list=cohorts.get(key)??[];list.push(o);cohorts.set(key,list);}});
    for(const sources of cohorts.values()){if(sources.length<2)continue;const mesh=new T.InstancedMesh(sources[0]!.geometry,sources[0]!.material,sources.length);mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=true;sources.forEach(o=>o.visible=false);this.group.add(mesh);this.batches.push({mesh,sources});}
  }
  private segment(mesh:T.Mesh,a:readonly number[],b:readonly number[]){const delta=new T.Vector3(b[0]!-a[0]!,b[1]!-a[1]!,b[2]!-a[2]!),length=delta.length();mesh.position.set((a[0]!+b[0]!)/2,(a[1]!+b[1]!)/2,(a[2]!+b[2]!)/2);mesh.scale.y=length;mesh.quaternion.setFromUnitVectors(this.up,delta.divideScalar(length||1));}
  update(seconds:number,retirement=0){
    if(!Number.isFinite(retirement))throw Error('Joint plant retirement must be finite');
    this.retirement=Math.max(0,Math.min(1,retirement));
    this.seconds=seconds;const sample=sampleEiffelJointCampaign(seconds);
    sample.carriers.forEach((carrier,index)=>{const cart=this.carts[index];if(!cart)return;cart.root.position.set(carrier.bedPose.position[0],0,carrier.bedPose.position[2]);cart.root.quaternion.set(...carrier.bedPose.quaternion);cart.wheels.forEach(wheel=>wheel.rotation.x=carrier.wheelAngle);
      const workers=sampleEiffelFoundationCrew({center:carrier.bedPose.position,size:[carrier.bedSize[2],carrier.bedSize[1],carrier.bedSize[0]],steering:{yaw:Math.PI/2-carrier.steeringYaw,distance:carrier.distance,walking:carrier.moving}});
      workers.crew.forEach((pose,person)=>{const rendered=this.crew[index*2+person]!;rendered.torso.position.set(...pose.torso);rendered.head.position.set(...pose.head);rendered.hat.position.set(pose.head[0],pose.head[1]+.17,pose.head[2]);pose.feet.forEach((foot,i)=>{rendered.feet[i]!.position.set(...foot.center);this.segment(rendered.legs[i]!,foot.center,foot.hip);rendered.legs[i]!.scale.x=.12;rendered.legs[i]!.scale.z=.14;});pose.arms.forEach((arm,i)=>{this.segment(rendered.arms[i]!,arm.shoulder,arm.hand);rendered.arms[i]!.scale.x=rendered.arms[i]!.scale.z=.095;});});
    });
    sampleEiffelJointRiggers(seconds).workers.forEach((pose,index)=>{const person=this.slingers[index]!;this.segment(person.torso,pose.torso[0],pose.torso[1]);person.torso.scale.x=.3;person.torso.scale.z=.22;person.pelvis.position.set(pose.hip[0],pose.hip[1]+.1,pose.hip[2]);this.segment(person.neck,pose.shoulderCenter,pose.head.center);person.neck.scale.x=person.neck.scale.z=.1;person.head.position.set(...pose.head.center);person.hat.position.set(pose.head.center[0],pose.head.center[1]+.16,pose.head.center[2]);
      [pose.leftFoot,pose.rightFoot].forEach((foot,i)=>{person.feet[i]!.position.set(...foot.center);person.feet[i]!.scale.set(...foot.size);person.feet[i]!.quaternion.set(...foot.quaternion);const leg=i===0?pose.leftLeg:pose.rightLeg;this.segment(person.legs[i*2]!,leg.start,leg.joint);this.segment(person.legs[i*2+1]!,leg.joint,leg.end);for(const mesh of [person.legs[i*2]!,person.legs[i*2+1]!])mesh.scale.x=mesh.scale.z=.11;});
      [pose.arms.left,pose.arms.right].forEach((arm,i)=>{this.segment(person.arms[i*2]!,arm.shoulder,arm.elbow);this.segment(person.arms[i*2+1]!,arm.elbow,arm.hand);for(const mesh of [person.arms[i*2]!,person.arms[i*2+1]!])mesh.scale.x=mesh.scale.z=.09;person.hands[i]!.position.set(...arm.hand);});person.root.userData.contact=pose.contact;});
    if(this.rig){this.rig.group.position.set(...sample.crane.root);this.rig.group.rotation.y=sample.crane.rootYaw;this.rig.update(0,sample.crane.reach,sample.crane.yaw);this.rig.setHoistLength(sample.crane.hoistRopeLength);const tip=this.rig.tip();this.segment(this.ropes[0]!,tip.toArray(),sample.crane.hook);this.group.userData.tipResidual=tip.distanceTo(new T.Vector3(...sample.crane.boomTip));}
    this.hook.position.set(...sample.crane.hook);sample.rigging.slings.forEach((sling,i)=>{this.segment(this.ropes[1+i*2]!,sling.points[0],sling.points[1]);this.segment(this.ropes[2+i*2]!,sling.points[1],sling.points[2]);});
    let basketIndex=0;for(const loop of sample.basketLoops)for(let i=1;i<loop.points.length;i++)this.segment(this.basketSegments[basketIndex++]!,loop.points[i-1]!,loop.points[i]!);if(basketIndex!==this.basketSegments.length)throw Error('Joint campaign basket topology changed');
    this.group.userData.seconds=sample.seconds;this.group.userData.phase=sample.campaignPhase;this.group.updateMatrixWorld(true);this.inverse.copy(this.group.matrixWorld).invert();for(const batch of this.batches){batch.sources.forEach((source,i)=>batch.mesh.setMatrixAt(i,this.instance.multiplyMatrices(this.inverse,source.matrixWorld)));batch.mesh.instanceMatrix.needsUpdate=true;}
    this.updateRetirement();
  }
  dispose(){this.disposed=true;this.rig?.dispose();this.batches.forEach(b=>b.mesh.dispose());this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.group.removeFromParent();}
}
