import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { sampleEiffelJointFastening } from '../../engine/eiffelJointFastening';

/** Permanent hardware has the same ground-to-joint provenance as its carrier
 * member. The worker/support can leave after fastening; these plates remain. */
export class EiffelJointFasteningSystem {
 readonly group=new T.Group();
 readonly ready:Promise<void>;
 private asset?:T.Group;
 private readonly roles=new Map<string,T.Object3D>();
 private seconds=0;
 private disposed=false;
 private readonly worker=new T.Group();
 private readonly geometry=new T.BoxGeometry(1,1,1);
 private readonly materials=[new T.MeshStandardMaterial({color:'#42525d',roughness:1}),new T.MeshStandardMaterial({color:'#b08a68',roughness:1}),new T.MeshStandardMaterial({color:'#41443d',roughness:.85})];
 private readonly parts=new Map<string,T.Mesh>();
 private readonly batches:{mesh:T.InstancedMesh;sources:T.Mesh[]}[]=[];
 private readonly hardwareBatches:{mesh:T.Mesh;sources:{mesh:T.Mesh;geometry:T.BufferGeometry;offset:number}[]}[]=[];
 private hardwareEpoch='';
 constructor(){
  this.group.name='eiffel-delivered-splice';this.group.add(this.worker);
  for(const [name,index] of [['torso',0],['pelvis',0],['head',1],['hat',2],['tool',2],['tool-jaw',2],...Array.from({length:2},(_,i)=>[`foot${i}`,2]),...Array.from({length:4},(_,i)=>[`leg${i}`,0]),...Array.from({length:4},(_,i)=>[`arm${i}`,0]),...Array.from({length:2},(_,i)=>[`hand${i}`,1])] as [string,number][]){
   const m=new T.Mesh(this.geometry,this.materials[index]);this.parts.set(name,m);this.worker.add(m);m.visible=false;
  }
  for(const material of this.materials){const sources=[...this.parts.values()].filter(m=>m.material===material),mesh=new T.InstancedMesh(this.geometry,material,sources.length);mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=true;this.worker.add(mesh);this.batches.push({mesh,sources});}
  this.ready=this.load().then(()=>{if(!this.disposed)this.update(this.seconds,true);});
 }
 private async load(){
  let bytes:ArrayBuffer;
  try{const r=await fetch('/models/eiffel-joint-campaign/splice.glb');if(!r.ok)throw Error('Missing Blender splice');bytes=await r.arrayBuffer();}
  catch(error){if(typeof process==='undefined'||!process.versions?.node)throw error;const {readFileSync}=await import('node:fs');const b=readFileSync('public/models/eiffel-joint-campaign/splice.glb');bytes=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}
  const gltf=await new GLTFLoader().parseAsync(bytes,'');this.asset=gltf.scene;
  gltf.scene.traverse(o=>{if(typeof o.userData.wf_role==='string')this.roles.set(o.userData.wf_role,o);if(o instanceof T.Mesh)o.castShadow=o.receiveShadow=true;});
  if(this.disposed){this.releaseAsset();return;}
  this.group.add(gltf.scene);
  // These few hundred steel vertices are cheap to transform on the CPU. Keep
  // independently editable source nodes, but submit their two materials once
  // each instead of eight separate draws (and eight shadow submissions).
  const cohorts=new Map<T.Material,T.Mesh[]>();
  gltf.scene.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)){const list=cohorts.get(o.material)??[];list.push(o);cohorts.set(o.material,list);}});
  for(const [material,meshes]of cohorts){let count=0;const sources=meshes.map(mesh=>{const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone(),offset=count;count+=geometry.getAttribute('position').count;mesh.visible=false;return{mesh,geometry,offset};});
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(count*3),3));geometry.setAttribute('normal',new T.BufferAttribute(new Float32Array(count*3),3));
   const mesh=new T.Mesh(geometry,material);mesh.name=`splice-hardware-batch-${this.hardwareBatches.length}`;mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=true;this.group.add(mesh);this.hardwareBatches.push({mesh,sources});
  }
 }
 private box(name:string,p:readonly number[],size:readonly number[]){const m=this.parts.get(name)!;m.position.set(p[0]!,p[1]!,p[2]!);m.scale.set(size[0]!,size[1]!,size[2]!);m.quaternion.identity();}
 private segment(name:string,a:readonly number[],b:readonly number[],width:number,depth=width){const m=this.parts.get(name)!,d=new T.Vector3(b[0]!-a[0]!,b[1]!-a[1]!,b[2]!-a[2]!);m.position.set((a[0]!+b[0]!)/2,(a[1]!+b[1]!)/2,(a[2]!+b[2]!)/2);m.scale.set(width,d.length(),depth);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());}
 update(seconds:number,showWorker=true){
  this.seconds=seconds;const s=sampleEiffelJointFastening(seconds);this.worker.visible=showWorker;
  if(this.asset){this.asset.position.set(...s.delta.position);this.asset.quaternion.set(...s.delta.quaternion);
   s.progress.forEach((p,i)=>{const node=this.roles.get(`splice-plate-${i}`);if(node)node.position.z=-40.295236587524414-.4+.4*p;});
  }
  const inv=new T.Matrix4(),m=new T.Matrix4();
  if(showWorker){
  const w=s.worker;
  this.segment('torso',w.torso[0],w.torso[1],.32,.22);this.box('pelvis',[w.hip[0]!,w.hip[1]!+.1,w.hip[2]!],[.24,.28,.26]);
  this.box('head',w.head.center,w.head.size);this.box('hat',[w.head.center[0],w.head.center[1]+.16,w.head.center[2]],[.3,.08,.26]);
  w.feet.forEach((f,i)=>this.box(`foot${i}`,f.center,f.size));
  w.legs.forEach((l,i)=>{this.segment(`leg${i*2}`,l.start,l.joint,.11);this.segment(`leg${i*2+1}`,l.joint,l.end,.11);});
  w.arms.forEach((a,i)=>{this.segment(`arm${i*2}`,a.shoulder,a.elbow,.065);this.segment(`arm${i*2+1}`,a.elbow,a.hand,.065);this.box(`hand${i}`,a.hand,[.06,.06,.06]);});
  this.segment('tool',s.tool.handleTip,s.tool.jawStart,.032);
  this.segment('tool-jaw',s.tool.jawStart,s.tool.contactPoint,.022);
  if(!s.tool.engaged){
    this.parts.get('tool')!.scale.set(0,0,0);
    this.parts.get('tool-jaw')!.scale.set(0,0,0);
  }
  this.worker.updateMatrixWorld(true);inv.copy(this.worker.matrixWorld).invert();
  for(const b of this.batches){b.sources.forEach((o,i)=>b.mesh.setMatrixAt(i,m.multiplyMatrices(inv,o.matrixWorld)));b.mesh.instanceMatrix.needsUpdate=true;}
  }
  this.group.updateMatrixWorld(true);
  const epoch=`${s.delta.position.join()}|${s.delta.quaternion.join()}|${s.progress.join()}`;
  if(epoch!==this.hardwareEpoch){
   this.hardwareEpoch=epoch;inv.copy(this.group.matrixWorld).invert();const point=new T.Vector3(),normal=new T.Vector3(),normalMatrix=new T.Matrix3();
   for(const batch of this.hardwareBatches){const positions=batch.mesh.geometry.getAttribute('position'),normals=batch.mesh.geometry.getAttribute('normal');
    for(const source of batch.sources){m.multiplyMatrices(inv,source.mesh.matrixWorld);normalMatrix.getNormalMatrix(m);const p=source.geometry.getAttribute('position'),n=source.geometry.getAttribute('normal');
     for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(m);normal.fromBufferAttribute(n,i).applyNormalMatrix(normalMatrix);positions.setXYZ(source.offset+i,point.x,point.y,point.z);normals.setXYZ(source.offset+i,normal.x,normal.y,normal.z);}}
    positions.needsUpdate=normals.needsUpdate=true;
   }
  }
  this.group.userData.connected=s.connected;this.group.userData.plateProvenance='first-ground-cart';
 }
 private releaseAsset(){const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();this.asset?.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
 dispose(){this.disposed=true;this.releaseAsset();this.geometry.dispose();this.materials.forEach(m=>m.dispose());this.batches.forEach(b=>b.mesh.dispose());this.hardwareBatches.forEach(b=>{b.mesh.geometry.dispose();b.sources.forEach(s=>s.geometry.dispose());});this.group.removeFromParent();}
}
