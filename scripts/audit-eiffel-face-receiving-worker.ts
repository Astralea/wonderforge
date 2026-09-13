import {sampleEiffelFaceReceivingWorker as worker} from '../src/engine/eiffelFaceReceivingWorker';
import {sampleEiffelFacePackageTransfer as sample} from '../src/engine/eiffelFacePackageTransfer';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3,Mesh} from 'three';
import {eiffelAxisBox,eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import {eiffelConvexBox,eiffelConvexPenetration,eiffelConvexTranslationSweep} from '../src/engine/eiffelConvex';
import {eiffelReceiverBeamBox} from '../src/engine/eiffelUpperClearance';
import {createEiffelProductionPlan} from '../src/engine/eiffelProductionConstruction';
import {composeRigidPoses,invertRigidPose,transformRigidPoint,rotateRigidVector,type RigidVec3 as V,type RigidPose} from '../src/engine/eiffelRigid';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const folder='artifacts/eiffel-face-package-2026-09-08/',meta=read(folder+'model/manifest.json'),measure=read(folder+'package-measurements.json');
const routes=read('artifacts/eiffel-joint-campaign-2026-09-07/campaign-routes.json'),manifest=read('public/models/eiffel-construction-kit/tower-kit.manifest.json');
const geometry=read('artifacts/eiffel-integration-2026-09-07/crane-primitives.json'),old=read('artifacts/eiffel-integration-2026-09-07/guyenet-ne-station.json'),joint=read('artifacts/eiffel-joint-campaign-2026-09-07/joint-support.json');
const bytes=readFileSync(folder+'model/face-package.glb');if(createHash('sha256').update(bytes).digest('hex')!==measure.sourceGLBSHA256)throw Error('Package mass is stale');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);
const bound=new Box3().setFromObject(gltf.scene),localBounds={min:bound.min.toArray() as V,max:bound.max.toArray() as V};
const plan=createEiffelProductionPlan(manifest),seated=new Set(routes.loads.map(l=>l.part.id));
const fixed=manifest.parts.filter(p=>p.id!=='lower-ne-02-m015-c000'&&(plan.byPart.get(p.id)!.end<=routes.freeze||seated.has(p.id))).map(p=>({id:p.id,shape:eiffelConvexBox(eiffelSolidBox(p,p.finalPose))}));
for(const b of [...old.proposedStructure,...joint.beams])fixed.push({id:b.id,shape:eiffelConvexBox(eiffelReceiverBeamBox(b.a,b.b,b.halfWidth))});
for(const b of joint.boxes)fixed.push({id:b.id,shape:eiffelConvexBox(eiffelAxisBox(b.center,b.size))});
const qy=(a:number)=>[0,Math.sin(a/2),0,Math.cos(a/2)] as const,qx=(a:number)=>[Math.sin(a/2),0,0,Math.cos(a/2)] as const;
const root:RigidPose={position:routes.station.root,quaternion:qy(-Math.PI/4)},heel=routes.station.heel;
const delta=composeRigidPoses(routes.loads[0].route.pickup,invertRigidPose(routes.loads[0].part.finalPose)),base=transformRigidPoint(delta,meta.sourceOrigin);
const primitives=geometry.primitives.map(p=>({...p,box:p.kind==='beam'?eiffelReceiverBeamBox(p.a,p.b,p.halfWidth):eiffelAxisBox(p.center,p.kind==='box'?p.size:p.axis==='x'?[p.length,p.radius*2,p.radius*2]:[p.radius*2,p.length,p.radius*2])}));
function clashes(shape:ReturnType<typeof eiffelConvexBox>){return fixed.flatMap(s=>{const depth=eiffelConvexPenetration(shape,s.shape);return depth>1e-5?[{fixed:s.id,depth}]:[]});}

const design=read('artifacts/eiffel-face-transfer-2026-09-08/receiver-design.json');
const supportSolids=[];
for(const [i,k] of design.knees.entries()){
 supportSolids.push({id:'receiver-knee-'+i,shape:eiffelConvexBox(eiffelReceiverBeamBox(k.a,k.b,k.halfWidth))});
 const a=k.a;supportSolids.push({id:'receiver-foot-'+i,shape:eiffelConvexBox(eiffelAxisBox([a[0],15.97,a[2]],[.16,.5,.16]))});
}
for(const z of [-43.73,-42.47])supportSolids.push({id:'receiver-header-'+z,shape:eiffelConvexBox(eiffelAxisBox([52,18,z],[.86,.16,.16]))});
supportSolids.push({id:'receiver-deck',shape:eiffelConvexBox(eiffelAxisBox(design.deck.center,design.deck.size))});
const w=read('artifacts/eiffel-face-installation-2026-09-08/worker-platform-design.json');
const workerSupports=[];for(const [i,k] of w.knees.entries()){workerSupports.push({id:'worker-knee-'+i,shape:eiffelConvexBox(eiffelReceiverBeamBox(k.a,k.b,.08))});workerSupports.push({id:'worker-foot-'+i,shape:eiffelConvexBox(eiffelAxisBox([k.a[0],15.97,k.a[2]],[.16,.5,.16]))});}
for(const z of [-43.58,-42.62])workerSupports.push({id:'worker-header-'+z,shape:eiffelConvexBox(eiffelAxisBox([52.8,17.5,z],[.7,.16,.16]))});
workerSupports.push({id:'worker-deck',shape:eiffelConvexBox(eiffelAxisBox(w.deck.center,w.deck.size))});
for(const x of [52.48,53.12])for(const z of [-43.62,-42.58])workerSupports.push({id:'guard-post-'+x+'-'+z,shape:eiffelConvexBox(eiffelAxisBox([x,18.16,z],[.06,1.16,.06]))});
for(const z of [-43.62,-42.58])workerSupports.push({id:'guard-rail-'+z,shape:eiffelConvexBox(eiffelAxisBox([52.8,18.68,z],[.7,.06,.06]))});
workerSupports.push({id:'guard-outer-rail',shape:eiffelConvexBox(eiffelAxisBox([53.12,18.68,-43.1],[.06,.06,1.1]))});
writeFileSync('artifacts/eiffel-face-installation-2026-09-08/worker-platform-occupancy.json',JSON.stringify(workerSupports.map(p=>({id:p.id,vertices:p.shape.vertices})),null,2)+'\n');
const workerSupportHits=workerSupports.flatMap(p=>[...clashes(p.shape),...supportSolids.flatMap(s=>{const depth=eiffelConvexPenetration(p.shape,s.shape);return depth>1e-5?[{fixed:s.id,depth}]:[]})].map(h=>({moving:p.id,...h})));
supportSolids.push(...workerSupports);
const supportHits=supportSolids.flatMap(p=>clashes(p.shape).map(h=>({moving:p.id,...h})));

fixed.push(...supportSolids);
const exactStraightHits=[];
for(const [start,end] of [[0,42],[48,64],[64,76]]){
 const a=sample(start),b=sample(end),delta=b.pose.position.map((v,k)=>v-a.pose.position[k]!) as unknown as V;
 const shapes=[{id:'package',shape:eiffelConvexBox(eiffelSolidBox({localBounds},a.pose))},...meta.liftingEyes.map((eye,i)=>({id:'leg-'+i,shape:eiffelConvexBox(eiffelReceiverBeamBox(a.hook,transformRigidPoint(a.pose,[eye[0],.304,eye[2]]),.012))}))];
 for(const p of shapes)exactStraightHits.push(...clashes(eiffelConvexTranslationSweep(p.shape,delta)).map(h=>({start,end,moving:p.id,...h})));
}
const craneHits=new Map(),guideSelfHits=new Map(),payloadHits=[],bridleHits=[],hoistRopeHits=[],workerHits=[],workerCraneHits=[];
for(let i=0;i<=410;i++){
 for(const p of worker(i/5).primitives){const shape=eiffelConvexBox(p.kind==='box'?eiffelAxisBox(p.center,p.size):eiffelReceiverBeamBox(p.a,p.b,p.halfWidth));workerHits.push(...clashes(shape).map(h=>({seconds:i/5,moving:p.id,...h})));}
 const state=sample(i/5),reach=state.crane.reach,yaw=state.crane.yaw,rise=Math.sqrt(180-reach*reach),tieRise=Math.sqrt(148-reach*reach);
 const payload=eiffelConvexBox(eiffelSolidBox({localBounds},state.pose));
 payloadHits.push(...clashes(payload).map(h=>({seconds:i/5,...h})));
 for(const eye of meta.liftingEyes){const end=transformRigidPoint(state.pose,[eye[0],.304,eye[2]]);bridleHits.push(...clashes(eiffelConvexBox(eiffelReceiverBeamBox(state.hook,end,.012))).map(h=>({seconds:i/5,...h})));}
 hoistRopeHits.push(...clashes(eiffelConvexBox(eiffelReceiverBeamBox(state.hook,state.crane.tip,.022))).map(h=>({seconds:i/5,...h})));
  const length=state.crane.hoistRopeLength,poses=new Map<string,RigidPose>();
  for(const role of geometry.roles){let position=role.position,quaternion=qx(role.rotationX||0) as readonly[number,number,number,number];
   if(role.role==='rotor')quaternion=qy(yaw);if(role.role==='jib')quaternion=qx(Math.asin(reach/Math.sqrt(180)));
   if(role.role==='slider')position=[position[0],rise-tieRise,position[2]];
   if(role.role.startsWith('tie-')){position=[position[0],rise-tieRise,position[2]];quaternion=qx(Math.asin(reach/Math.sqrt(148)));}
   if(role.role==='hoist-drum')quaternion=qx(-length/.26);
   poses.set(role.role,composeRigidPoses(role.parent?poses.get(role.parent)!:root,{position,quaternion}));
  }
  const articulated=primitives.map(p=>{const pose=poses.get(p.role)!;return {...p,shape:eiffelConvexBox({center:transformRigidPoint(pose,p.box.center),half:p.box.half,axes:p.box.axes.map(a=>rotateRigidVector(pose.quaternion,a))})};});
  for(const w of worker(i/5).primitives){const shape=eiffelConvexBox(w.kind==='box'?eiffelAxisBox(w.center,w.size):eiffelReceiverBeamBox(w.a,w.b,w.halfWidth));for(const crane of articulated){const depth=eiffelConvexPenetration(shape,crane.shape);if(depth>1e-5)workerCraneHits.push({seconds:i/5,worker:w.id,crane:crane.id,depth});}}
  for(const p of articulated){const shape=p.shape;
   for(const hit of clashes(shape)){const key=p.id+'|'+hit.fixed,prev=craneHits.get(key);if(!prev||hit.depth>prev.depth)craneHits.set(key,{moving:p.id,...hit,seconds:i/5});}
  }
  if(true){
   const fixedRoles=new Set(['guides','head-anchor','main-screw','safety-base','safety-heads','haul-nut']);
   const movingRoles=new Set(['rotor','jib','slider','tie-left','tie-right']);
   for(const moving of articulated.filter(p=>movingRoles.has(p.role)))for(const fixed of articulated.filter(p=>fixedRoles.has(p.role))){
    const depth=eiffelConvexPenetration(moving.shape,fixed.shape);if(depth>1e-5)guideSelfHits.set(moving.id+'|'+fixed.id,{moving:moving.id,fixed:fixed.id,depth});
   }
  }
}
const result={productionAdmitted:false,scope:'411 poses at 0.2 s. Worker primitives versus fixed context and articulated crane. Worker-versus-payload full-body clearance is excluded; active hand contact is tested separately against the actual GLB rail.  Payload envelope, upper legs, hoist rope and 623 crane primitives versus frozen tower and both support frames. Guide self-pairs checked at every pose. Additionally exact whole straight sweeps of payload and upper legs for lift, lateral translation and descent. Not continuous rotational/slew certification or exact eye contacts.',workerSupportHits,workerHits,workerCraneHits,exactStraightHits,supportHits,payloadHits,bridleHits,hoistRopeHits,craneHits:[...craneHits.values()],guideSelfHits:[...guideSelfHits.values()]};
writeFileSync('artifacts/eiffel-face-installation-2026-09-08/receiver-worker-audit.json',JSON.stringify(result,null,2)+'\n');console.log(Object.fromEntries(Object.entries(result).map(([k,v])=>[k,Array.isArray(v)?{count:v.length,first:v.slice(0,10)}:v])));
