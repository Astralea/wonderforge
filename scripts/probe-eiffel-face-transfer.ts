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

const candidates=[];
const high={position:[53.543,22.065,-45.8],quaternion:[0,0,0,1]} as RigidPose;
const first=read(folder+'crane-column-audit.json').reports[0];high.position=first.high.position;
for(const x of [50.2,50.5,50.8,51.1,51.4,51.7,52,52.3])for(const z of [-44,-43.7,-43.4,-43.1,-42.8,-42.5,-42.2])for(const deckY of [17.6,17.9,18.2]){
 const seat:RigidPose={position:[x,deckY+.288,z],quaternion:[0,0,0,1]},raised:RigidPose={...seat,position:[x,22.065,z]};
 const clearBox=(pose:RigidPose,delta:V)=>clashes(eiffelConvexTranslationSweep(eiffelConvexBox(eiffelSolidBox({localBounds},pose)),delta));
 const horizontal=clearBox(high,[x-high.position[0],0,z-high.position[2]]);
 const lowering=clearBox(raised,[0,seat.position[1]-22.065,0]);
 const deck={center:[x,deckY-.06,z] as V,size:[.86,.12,1.4] as V};const deckHits=clashes(eiffelConvexBox(eiffelAxisBox(deck.center,deck.size)));
 const hook:V=[x+measure.centerOfMass[0],seat.position[1]+1.35,z+measure.centerOfMass[2]];
 const dx=hook[0]-heel[0],dz=hook[2]-heel[2],reach=Math.hypot(dx,dz),yaw=Math.atan2((dx+dz)*Math.SQRT1_2,(-dx+dz)*Math.SQRT1_2)*180/Math.PI;
 if(horizontal.length===0&&lowering.length===0&&deckHits.length===0&&reach>=5.5&&reach<=12&&yaw>=60&&yaw<=128.5)candidates.push({seat,deck,reach,yaw,distanceToJoint:Math.hypot(x-meta.sourceOrigin[0],z-meta.sourceOrigin[2])});
}
candidates.sort((a,b)=>a.distanceToJoint-b.distanceToJoint);
writeFileSync('artifacts/eiffel-face-transfer-2026-09-08/placement-search.json',JSON.stringify({scope:'Package envelope and deck versus fixed context only; preliminary location search, no crane/rope/support admission.',candidates},null,2)+'\n');console.log(JSON.stringify(candidates.slice(0,15),null,2),candidates.length);
