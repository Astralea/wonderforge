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
const reports=[];
for(const [dx,dz] of [[1.5,-.5],[1.5,-1]]){
 const pickup:RigidPose={position:[base[0]+dx,.858,base[2]+dz],quaternion:qy(-Math.PI/30)};
 const high:RigidPose={...pickup,position:[pickup.position[0],22.065,pickup.position[2]]};
 const com=transformRigidPoint(pickup,measure.centerOfMass),hookLocal:V=[measure.centerOfMass[0],1.35,measure.centerOfMass[2]],hook=transformRigidPoint(pickup,hookLocal);
 const x=hook[0]-heel[0],z=hook[2]-heel[2],reach=Math.hypot(x,z),yaw=Math.atan2((x+z)*Math.SQRT1_2,(-x+z)*Math.SQRT1_2),rise=Math.sqrt(180-reach**2),tieRise=Math.sqrt(148-reach**2);
 const tip:V=[hook[0],heel[1]+rise,hook[2]],vertical:V=[0,high.position[1]-pickup.position[1],0];
 const payloadHits=clashes(eiffelConvexTranslationSweep(eiffelConvexBox(eiffelSolidBox({localBounds},pickup)),vertical));
 const bridleHits=[];
 for(const [i,eye] of meta.liftingEyes.entries()){
  // Full leg envelope. End-link/eye internal contact needs its own audit.
  const endpoint=transformRigidPoint(pickup,[eye[0],.304,eye[2]]);
  const shape=eiffelConvexBox(eiffelReceiverBeamBox(hook,endpoint,.012));
  bridleHits.push(...clashes(eiffelConvexTranslationSweep(shape,vertical)).map(hit=>({leg:i,...hit})));
 }
 const hoistRopeHits=clashes(eiffelConvexBox(eiffelReceiverBeamBox(hook,tip,.022)));
 const craneHits=new Map();
 const guideSelfHits=new Map();
 for(let i=0;i<=20;i++){
  const y=hook[1]+vertical[1]*i/20,length=tip[1]-y,poses=new Map<string,RigidPose>();
  for(const role of geometry.roles){let position=role.position,quaternion=qx(role.rotationX||0) as readonly[number,number,number,number];
   if(role.role==='rotor')quaternion=qy(yaw);if(role.role==='jib')quaternion=qx(Math.asin(reach/Math.sqrt(180)));
   if(role.role==='slider')position=[position[0],rise-tieRise,position[2]];
   if(role.role.startsWith('tie-')){position=[position[0],rise-tieRise,position[2]];quaternion=qx(Math.asin(reach/Math.sqrt(148)));}
   if(role.role==='hoist-drum')quaternion=qx(-length/.26);
   poses.set(role.role,composeRigidPoses(role.parent?poses.get(role.parent)!:root,{position,quaternion}));
  }
  const articulated=primitives.map(p=>{const pose=poses.get(p.role)!;return {...p,shape:eiffelConvexBox({center:transformRigidPoint(pose,p.box.center),half:p.box.half,axes:p.box.axes.map(a=>rotateRigidVector(pose.quaternion,a))})};});
  for(const p of articulated){const shape=p.shape;
   for(const hit of clashes(shape)){const key=p.id+'|'+hit.fixed,prev=craneHits.get(key);if(!prev||hit.depth>prev.depth)craneHits.set(key,{moving:p.id,...hit,hoistFraction:i/20});}
  }
  if(i===0){
   const fixedRoles=new Set(['guides','head-anchor','main-screw','safety-base','safety-heads','haul-nut']);
   const movingRoles=new Set(['rotor','jib','slider','tie-left','tie-right']);
   for(const moving of articulated.filter(p=>movingRoles.has(p.role)))for(const fixed of articulated.filter(p=>fixedRoles.has(p.role))){
    const depth=eiffelConvexPenetration(moving.shape,fixed.shape);if(depth>1e-5)guideSelfHits.set(moving.id+'|'+fixed.id,{moving:moving.id,fixed:fixed.id,depth});
   }
  }
 }
 reports.push({offset:[dx,dz],pickup,high,localBounds,centerOfMassAtPickup:com,hookLocal,reach,yawDegrees:yaw*180/Math.PI,tip,minHoistRopeLength:tip[1]-(hook[1]+vertical[1]),outsidePreviousReviewedSector:yaw>121.65*Math.PI/180,payloadHits,bridleHits,hoistRopeHits,craneHits:[...craneHits.values()],guideSelfHits:[...guideSelfHits.values()]});
}
const result={productionAdmitted:false,sourceGLBSHA256:measure.sourceGLBSHA256,fixedSolids:fixed.length,cranePrimitives:primitives.length,scope:'Exact whole straight sweeps of the actual package bounding envelope and four conservative upper-leg envelopes; full hoist rope; 21 articulated crane poses against completed tower and 245 support solids. Working members are additionally checked against fixed guides/anchors/screw. End links, other crane self-intersections, cart/crew, onward transfer and installation excluded.',reports};
writeFileSync(folder+'crane-column-audit.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
gltf.scene.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});
